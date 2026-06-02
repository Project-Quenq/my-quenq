import type { Hono } from "hono";
import { anchors } from "../../anchors.js";
import { requireAuth, requireProfile, visibleProfile } from "../../server/access.js";
import { csrfToken, destroySession, revokeOtherSessions } from "../../server/auth/session.js";
import { hashPassword, verifyPassword } from "../../server/auth/password.js";
import { exportAccountData } from "../../server/db/account.js";
import { addFavorite, favoriteUsers, removeFavorite } from "../../server/db/relationships.js";
import { requestVerification } from "../../server/db/email.js";
import {
  defaultNotificationPreferences,
  notificationPreferencesForUser,
  notifyFavorite,
  updateNotificationPreferences
} from "../../server/db/notifications/index.js";
import { proppedBlogsForViewer } from "../../server/db/blogs/index.js";
import { postImageFilenamesForAccount, proppedPostsForViewer } from "../../server/db/posts/index.js";
import { deleteAccount, getUserByEmail, updateEmail, updatePassword, updateProfile, updateTimeZone } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { formId, localBack, verifiedActionForm } from "../../server/http.js";
import { deletePostImages, deleteProfileImage, deleteProfileThemeSong } from "../../server/media/upload.js";
import { characterRangeLabel, limits, validEmail, validPassword } from "../../policy.js";
import { isSupportedTimeZone } from "../../timeZones.js";
import { notificationPreferenceTypeNames, type NotificationPreferences } from "../../notifications.js";
import type { CurrentUser } from "../../currentUser.js";
import { profilePath } from "../../paths.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { DeleteAccountPage, FavoritesPage, PropsPage, SettingsPage } from "../../views/account/index.js";

export function registerAccountRoutes(app: Hono<AppBindings>) {
  app.get("/account", (c) => c.redirect("/settings", 302));

  app.get("/settings", (c) => {
    const user = requireAuth(c);
    return settingsPage(c, user);
  });

  app.post("/settings", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "account.write");
    const update = await settingsUpdateFromForm(user, form);
    if (!update.ok) return settingsPage(c, user, update.message, 400, update.notificationPreferences);

    if (update.passwordHash) {
      updatePassword(user.id, update.passwordHash);
      revokeOtherSessions(c, user.id);
    }
    if (update.email !== user.email) {
      updateEmail(user.id, update.email);
      // await requestVerification(user.id);
    }
    if (update.timeZone !== user.timeZone) updateTimeZone(user.id, update.timeZone);
    updateProfile(user.id, { private: update.private });
    updateNotificationPreferences(user.id, update.notificationPreferences);
    return c.redirect("/settings");
  });

  app.get("/account/export.json", (c) => {
    const user = requireAuth(c);
    return c.json(exportAccountData(user.id));
  });

  app.get("/favorites", (c) => {
    const user = requireAuth(c);
    return c.html(<FavoritesPage user={user} csrf={csrfToken(c)} people={favoriteUsers(user.id, user)} />);
  });

  app.post("/favorites/add", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "relationship.write");
    const id = formId(form);
    const { profile } = visibleProfile(c, id);
    if (addFavorite(user.id, id)) notifyFavorite(user.id, id);
    return c.redirect(localBack(c, profilePath(profile), { fragment: anchors.profileActions }));
  });

  app.post("/favorites", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "relationship.write");
    removeFavorite(user.id, formId(form));
    return c.redirect(localBack(c, "/favorites"));
  });

  app.get("/props", (c) => {
    const user = requireAuth(c);
    return c.html(<PropsPage user={user} csrf={csrfToken(c)} posts={proppedPostsForViewer(user)} blogs={proppedBlogsForViewer(user)} />);
  });

  app.get("/account/delete", (c) => {
    const user = requireAuth(c);
    return c.html(<DeleteAccountPage user={user} csrf={csrfToken(c)} />);
  });

  app.post("/account/delete", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "account.write");
    const current = getUserByEmail(user.email);
    const password = field(form, "password");
    if (!current || password.length > limits.passwordMax || !(await verifyPassword(current.passwordHash, password))) {
      return c.html(<DeleteAccountPage user={user} csrf={csrfToken(c)} message="Password is incorrect." />, 400);
    }
    if (field(form, "confirm") !== "DELETE") {
      return c.html(<DeleteAccountPage user={user} csrf={csrfToken(c)} message="Type DELETE to confirm account deletion." />, 400);
    }
    const profile = requireProfile(user.id);
    const postImages = postImageFilenamesForAccount(user.id);
    deleteAccount(user.id);
    destroySession(c);
    await deleteProfileImage(profile.pfp);
    await deletePostImages(postImages);
    await deleteProfileThemeSong(profile.themeSong);
    return c.redirect("/");
  });
}

function settingsPage(c: AppContext, user: CurrentUser, message?: string, status: 200 | 400 = 200, notificationPreferences = notificationPreferencesForUser(user.id)) {
  return c.html(
    <SettingsPage
      user={user}
      csrf={csrfToken(c)}
      profile={requireProfile(user.id)}
      notificationPreferences={notificationPreferences}
      message={message}
    />,
    status
  );
}

type SettingsUpdate =
  | { ok: true; email: string; notificationPreferences: NotificationPreferences; passwordHash?: string; private: boolean; timeZone: string }
  | { ok: false; message: string; notificationPreferences: NotificationPreferences };

async function settingsUpdateFromForm(user: CurrentUser, form: Record<string, unknown>): Promise<SettingsUpdate> {
  const password = field(form, "password-new");
  const email = field(form, "email").toLowerCase();
  const notificationPreferences = notificationPreferencesFromForm(form);
  const visibility = field(form, "profile_visibility");
  const timeZone = field(form, "time_zone");

  if (password) {
    if (!validPassword(password) || password !== field(form, "password-confirm")) {
      return settingsError(`New passwords must match and be ${characterRangeLabel(limits.passwordMin, limits.passwordMax)}.`, notificationPreferences);
    }
    const current = getUserByEmail(user.email);
    const oldPassword = field(form, "password-old");
    if (!current || oldPassword.length > limits.passwordMax || !(await verifyPassword(current.passwordHash, oldPassword))) return settingsError("Old password is incorrect.", notificationPreferences);
  }
  if (!email) return settingsError("Email is required.", notificationPreferences);
  if (email !== user.email) {
    if (!validEmail(email)) return settingsError("Use a valid email address.", notificationPreferences);
    const existing = getUserByEmail(email);
    if (existing && existing.id !== user.id) return settingsError("That email is already in use.", notificationPreferences);
  }
  if (visibility !== "public" && visibility !== "private") return settingsError("Choose a profile visibility setting.", notificationPreferences);
  if (!isSupportedTimeZone(timeZone)) return settingsError("Choose a valid time zone.", notificationPreferences);

  return { ok: true, email, notificationPreferences, private: visibility === "private", timeZone, passwordHash: password ? await hashPassword(password) : undefined };
}

function notificationPreferencesFromForm(form: Record<string, unknown>) {
  const preferences = defaultNotificationPreferences();
  for (const type of notificationPreferenceTypeNames) {
    preferences[type] = field(form, `notification_${type}`) === "on";
  }
  return preferences;
}

function settingsError(message: string, notificationPreferences: NotificationPreferences): SettingsUpdate {
  return { ok: false, message, notificationPreferences };
}
