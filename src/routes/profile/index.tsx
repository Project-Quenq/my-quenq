import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth, requireProfile, visibleProfile } from "../../server/access.js";
import { csrfToken } from "../../server/auth/session.js";
import { blogsForUser } from "../../server/db/blogs/index.js";
import { brandingSettings } from "../../server/db/branding.js";
import { listGroups } from "../../server/db/groups.js";
import { feedPageForUser } from "../../server/db/posts/index.js";
import { friendCountFor, hasBlocked, pendingRequestsFor, visibleFriendsFor } from "../../server/db/relationships.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { incrementViews, newestUsers, profileByHandle } from "../../server/db/users.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, verifiedActionForm } from "../../server/http.js";
import { beforeParam, previewFromRows } from "../../server/pagination.js";
import { limits, validHandle } from "../../policy.js";
import { isSkinColorGenerateIntent, skinColorPaletteFromHtml, skinStyleCodeFromColorForm } from "../../skins/colorPalette.js";
import { SocialLinkValidationError } from "../../socialLinks.js";
import type { CurrentUser } from "../../currentUser.js";
import { profilePath } from "../../paths.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { BlogListPage } from "../../views/blogs/index.js";
import { HomePage } from "../../views/home/index.js";
import { PeoplePage } from "../../views/people/index.js";
import { ProfilePage } from "../../views/profile/index.js";
import { ProfileEditPage, ProfileStatusPage } from "../../views/profile/edit/index.js";
import { applyProfileEditSection, profileEditSection, profileWithSubmittedFields, updateProfileStatus } from "./edit/actions.js";
import { profilePageData } from "./profilePageData.js";

export function registerProfileRoutes(app: Hono<AppBindings>) {
  app.get("/home", (c) => {
    const user = requireAuth(c);
    const profile = requireProfile(user.id);
    const feedPage = feedPageForUser(user, { limit: limits.feedPosts });
    const newestPreview = previewFromRows(newestUsers(user, limits.newestPeople + 1), limits.newestPeople);
    const newestGroupsPreview = previewFromRows(listGroups(user, limits.newestCommunities + 1), limits.newestCommunities);
    return c.html(
      <HomePage
        user={user}
        csrf={csrfToken(c)}
        settings={siteSettings()}
        profile={profile}
        newest={newestPreview.items}
        newestGroups={newestGroupsPreview.items}
        newestHref={newestPreview.hasMore ? "/browse" : null}
        newestGroupsHref={newestGroupsPreview.hasMore ? "/groups" : null}
        friendCount={friendCountFor(user.id, user)}
        pending={pendingRequestsFor(user.id)}
        blogs={blogsForUser(user.id, user)}
        feedPosts={feedPage.items}
        feedHref={feedPage.nextCursor ? "/feed" : null}
      />
    );
  });

  app.get("/account/profile", (c) => {
    const user = requireAuth(c);
    return c.html(<ProfileEditPage user={user} csrf={csrfToken(c)} profile={requireProfile(user.id)} skinColorPaletteFallback={brandingSettings().palette} />);
  });

  app.post("/account/profile", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "profile.write");
    const section = field(form, "section");
    if (section === "skin" && isSkinColorGenerateIntent(form)) return profileSkinGenerate(c, user, form);

    try {
      await applyProfileEditSection(user, form, section);
    } catch (error) {
      if (error instanceof SocialLinkValidationError) return profileEditError(c, user, section, error.message, form);
      const message = badFormRequestMessage(error);
      if (message) return profileEditError(c, user, section, message, form);
      throw error;
    }
    return c.redirect(profileEditRedirect(section));
  });

  app.get("/account/status", (c) => {
    const user = requireAuth(c);
    return c.html(<ProfileStatusPage user={user} csrf={csrfToken(c)} profile={requireProfile(user.id)} />);
  });

  app.post("/account/status", async (c) => {
    const user = requireAuth(c);
    const form = await verifiedActionForm(c, "profile.write");
    updateProfileStatus(user.id, form);
    return c.redirect(profilePath(requireProfile(user.id)));
  });

  app.get("/u/:handle/friends", (c) => {
    const profile = profileForHandle(c);
    const { user } = visibleProfile(c, profile.id);
    return c.html(
      <PeoplePage
        user={user}
        title={`${profile.username}'s friends`}
        people={visibleFriendsFor(profile.id, user)}
        seo={
          profile.private
            ? { noindex: true }
            : { canonicalPath: `${profilePath(profile)}/friends`, description: `Browse ${profile.username}'s public friends.` }
        }
      />
    );
  });

  app.get("/u/:handle/blog", (c) => {
    const profile = profileForHandle(c);
    const { user } = visibleProfile(c, profile.id);
    return c.html(
      <BlogListPage
        user={user}
        title={`${profile.username}'s blog`}
        blogs={blogsForUser(profile.id, user, limits.listPage, "engagement")}
        seo={
          profile.private
            ? { noindex: true }
            : { canonicalPath: `${profilePath(profile)}/blog`, description: `Read ${profile.username}'s public blog entries.` }
        }
      />
    );
  });

  app.get("/u/:handle/wall", (c) => profilePage(c, profileForHandle(c).id, true));

  app.get("/u/:handle", (c) => profilePage(c, profileForHandle(c).id));
}

function profilePage(c: AppContext, id: number, fullWall = false) {
  const { profile, user, friendship } = visibleProfile(c, id);
  const before = c.req.query(beforeParam);
  const profileProps = profilePageData({
    user,
    csrf: csrfToken(c),
    profile,
    fullWall,
    before,
    friendship,
    blockedByMe: user ? hasBlocked(user.id, profile.id) : false
  });
  incrementViews(profile.id, user?.id);
  return c.html(<ProfilePage {...profileProps} />);
}

function profileEditError(c: AppContext, user: CurrentUser, section: string, message: string, form: Record<string, unknown>) {
  const profile = profileWithSubmittedFields(requireProfile(user.id), section, form);
  const palette = brandingSettings().palette;
  return c.html(
    <ProfileEditPage
      user={user}
      csrf={csrfToken(c)}
      profile={profile}
      skinColorPaletteFallback={palette}
      error={{ section: profileEditSection(section), message }}
    />,
    400
  );
}

function profileSkinGenerate(c: AppContext, user: CurrentUser, form: Record<string, unknown>) {
  const profile = requireProfile(user.id);
  const palette = brandingSettings().palette;
  const fallback = skinColorPaletteFromHtml(field(form, "skin") || profile.skinHtml, palette);
  return c.html(
    <ProfileEditPage
      user={user}
      csrf={csrfToken(c)}
      profile={{ ...profile, skinHtml: skinStyleCodeFromColorForm(form, fallback) }}
      skinColorPaletteFallback={palette}
    />
  );
}

function profileEditRedirect(section: string) {
  const targetId = profileEditSection(section);
  return targetId ? `/account/profile#${targetId}` : "/account/profile";
}

function profileForHandle(c: AppContext) {
  const handle = (c.req.param("handle") ?? "").toLowerCase();
  if (!validHandle(handle)) throw new HTTPException(404, { message: "User not found." });
  const profile = profileByHandle(handle);
  if (!profile) throw new HTTPException(404, { message: "User not found." });
  return profile;
}
