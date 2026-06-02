import type { Hono } from "hono";
import { getCountry, getTimezone } from "countries-and-timezones";
import { featuredCommunityGroups, listGroups } from "../../server/db/groups.js";
import {
  createUser,
  getProfile,
  getUserByEmail,
  HandleReservedError,
  markUserVerified,
  newestUsers,
  setUserRole,
  updatePassword
} from "../../server/db/users.js";
import { installBuiltinSkins } from "../../server/db/skins.js";
import { consumeResetToken, consumeVerificationToken, requestPasswordReset, requestVerification } from "../../server/db/email.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { createSession, csrfToken, currentUser, destroySession, revokeUserSessions } from "../../server/auth/session.js";
import { hashPassword, verifyPassword } from "../../server/auth/password.js";
import { scanAutomodSubmission, type AutomodSubmissionScan } from "../../server/db/automod.js";
import { field } from "../../server/forms.js";
import { badFormRequestMessage, verifiedActionForm, verifiedForm } from "../../server/http.js";
import { env } from "../../server/env.js";
import { smtpConfigured } from "../../server/email/smtp.js";
import { canonicalEmail, characterRangeLabel, limits, validEmail, validHandle, validPassword, validUsername } from "../../policy.js";
import { generateCaptcha, verifyCaptcha } from "../../server/captcha.js";
import type { CurrentUser } from "../../currentUser.js";
import type { AppBindings, AppContext } from "../../server/context.js";
import { LogoutPage, ResetApplyPage, ResetRequestPage, ResetUnavailablePage, SignUpPage, VerifyPage } from "../../views/auth/index.js";
import { LandingPage } from "../../views/home/index.js";

export function registerAuthRoutes(app: Hono<AppBindings>) {
  app.get("/", (c) => (currentUser(c) ? c.redirect("/home") : landing(c)));
  app.get("/login", landing);

  app.post("/login", async (c) => {
    const form = await verifiedActionForm(c, "auth.login", emailSubject);
    const viewer = currentUser(c);

    const email = field(form, "email").toLowerCase();
    const password = field(form, "password");
    const user = getUserByEmail(email);
    
    if (!user || user.bannedAt || password.length > limits.passwordMax || !(await verifyPassword(user.passwordHash, password))) {
      return landingPage(c, viewer, "Email or password is incorrect.", 400);
    }
    
    createSession(c, user.id);
    return c.redirect("/home");
  });

  app.get("/logout", (c) => {
    const user = currentUser(c);
    if (!user) return c.redirect("/");
    return c.html(<LogoutPage user={user} csrf={csrfToken(c)} />);
  });

  app.post("/logout", async (c) => {
    await verifiedForm(c);
    destroySession(c);
    return c.redirect("/");
  });

  app.get("/signup", (c) => {
    const settings = siteSettings();
    const blockedCountries = settings.registration.blockedCountries.split(",").filter(Boolean);
    const blockedTimezones = blockedCountries.flatMap(code => {
      const country = getCountry(code);
      return country ? country.timezones : [];
    });

    return c.html(
      <SignUpPage 
        user={currentUser(c)} 
        csrf={csrfToken(c)} 
        initialEmail={prefillEmail(c.req.query("email"))} 
        blockedTimezones={blockedTimezones}
        captchaSvg={generateCaptcha(c)}
      />
    );
  });

  app.post("/signup", async (c) => {
    const form = await verifiedActionForm(c, "auth.signup", emailSubject);
    const viewer = currentUser(c);
    const settings = siteSettings();
    
    // 1. Verify Captcha
    if (!verifyCaptcha(c, field(form, "captcha"))) {
      return signupPage(c, viewer, field(form, "email"), "Incorrect security code. Please try again.", 400, field(form, "handle"));
    }

    const userTz = field(form, "time_zone") || "UTC";

    if (userTz !== "UTC") {
      const tzData = getTimezone(userTz);
      if (tzData) {
        const blockedList = settings.registration.blockedCountries.split(",").filter(Boolean);
        const isBlocked = tzData.countries.some(countryCode => blockedList.includes(countryCode));
        if (isBlocked) {
          return c.html(<SignUpPage user={null} csrf={csrfToken(c)} blocked={true} captchaSvg={generateCaptcha(c)} />, 403);
        }
      }
    }

    const signup = await signupFromForm(form);
    if (!signup.ok) return signupPage(c, viewer, signup.email, signup.message, 400, signup.handle);

    let userId: number;
    try {
      userId = createUser({ ...signup.user, timeZone: userTz });
    } catch (error) {
      if (error instanceof HandleReservedError) {
        const message = error.reason === "reserved" ? "That handle is reserved." : "That handle is already in use.";
        return signupPage(c, viewer, signup.user.email, message, 400, signup.user.handle);
      }
      throw error;
    }
    
    signup.automod.createReports({ subjectType: "user", subjectId: userId, authorId: userId });
    if (userId === env.adminUserId) setUserRole(userId, "admin");
    installBuiltinSkins();
    // await requestVerification(userId);
    createSession(c, userId);
    return c.redirect("/account/profile");
  });

  app.get("/reset", (c) => {
    const user = currentUser(c);
    if (!smtpConfigured()) return c.html(<ResetUnavailablePage user={user} />);
    return c.html(<ResetRequestPage user={user} csrf={csrfToken(c)} />);
  });

  app.post("/reset", async (c) => {
    if (!smtpConfigured()) return c.html(<ResetUnavailablePage user={currentUser(c)} />);
    const form = await verifiedActionForm(c, "auth.reset", emailSubject);
    const user = currentUser(c);
    await requestPasswordReset(field(form, "email").toLowerCase());
    return c.html(<ResetRequestPage user={user} csrf={csrfToken(c)} message="If that account exists, a reset message was sent." />);
  });

  app.get("/reset/:token", (c) => c.html(<ResetApplyPage user={currentUser(c)} csrf={csrfToken(c)} token={c.req.param("token")} />));

  app.post("/reset/:token", async (c) => {
    const form = await verifiedActionForm(c, "auth.reset", `reset-token:${c.req.param("token")}`);
    const user = currentUser(c);
    const token = c.req.param("token");
    const password = field(form, "password");
    if (!validPassword(password) || password !== field(form, "confirm")) {
      return c.html(
        <ResetApplyPage
          user={user}
          csrf={csrfToken(c)}
          token={token}
          message={`Passwords must match and be ${characterRangeLabel(limits.passwordMin, limits.passwordMax)}.`}
        />,
        400
      );
    }
    const userId = consumeResetToken(token);
    if (!userId) return c.html(<ResetApplyPage user={user} csrf={csrfToken(c)} token={token} message="This reset link is invalid or expired." />, 400);
    updatePassword(userId, await hashPassword(password));
    revokeUserSessions(userId);
    if (user?.id === userId) destroySession(c);
    return c.redirect("/login");
  });

  app.get("/verify/:token", (c) => {
    const userId = consumeVerificationToken(c.req.param("token"));
    if (userId) markUserVerified(userId);
    return c.html(<VerifyPage user={currentUser(c)} message={userId ? "Account verified." : "Verification link is invalid or expired."} success={Boolean(userId)} />);
  });
}

function landing(c: AppContext) {
  const user = currentUser(c);
  return landingPage(c, user);
}

function prefillEmail(value: string | undefined) {
  return value?.trim().slice(0, limits.emailMax);
}

function landingPage(c: AppContext, user: CurrentUser | null, message?: string, status: 200 | 400 = 200) {
  return c.html(
    <LandingPage
      user={user}
      csrf={csrfToken(c)}
      settings={siteSettings()}
      admin={user ? null : getProfile(env.adminUserId) ?? null}
      newest={newestUsers(user)}
      newestGroups={user ? listGroups(user, limits.newestCommunities) : featuredCommunityGroups()}
      message={message}
      passwordResetAvailable={smtpConfigured()}
    />,
    status
  );
}

function signupPage(c: AppContext, user: CurrentUser | null, initialEmail?: string, message?: string, status: 200 | 400 = 200, initialHandle?: string) {
  return c.html(<SignUpPage user={user} csrf={csrfToken(c)} initialEmail={initialEmail} initialHandle={initialHandle} message={message} captchaSvg={generateCaptcha(c)} />, status);
}

type SignupResult =
  | { ok: true; automod: AutomodSubmissionScan; user: { username: string; email: string; handle: string; passwordHash: string; timeZone: string } }
  | { ok: false; email: string; handle: string; message: string };
type SignupAutomodResult =
  | { ok: true; submission: AutomodSubmissionScan }
  | { ok: false; message: string };

async function signupFromForm(form: Record<string, unknown>): Promise<SignupResult> {
  const username = field(form, "username");
  const handle = field(form, "handle").toLowerCase();
  const email = field(form, "email").toLowerCase();
  const password = field(form, "password");
  const timeZone = field(form, "time_zone") || "UTC";

  if (field(form, "terms") !== "accepted") {
    return signupError(email, handle, "You must be 13+ and agree to the terms, privacy, and rules to sign up.");
  }
  if (!validUsername(username) || !validHandle(handle) || !validEmail(email) || !validPassword(password) || password !== field(form, "confirm")) {
    return signupError(
      email,
      handle,
      `Use a display name with ${characterRangeLabel(limits.usernameMin, limits.usernameMax)}, ` +
        `a handle with ${characterRangeLabel(limits.handleMin, limits.handleMax)}, ` +
        `a valid email, and matching passwords of ${characterRangeLabel(limits.passwordMin, limits.passwordMax)}.`
    );
  }
  if (getUserByEmail(email)) return signupError(email, handle, "That email is already in use.");

  const automod = scanSignupProfile(username, handle);
  if (!automod.ok) return signupError(email, handle, automod.message);

  return { ok: true, automod: automod.submission, user: { username, email, handle, passwordHash: await hashPassword(password), timeZone } };
}

function signupError(email: string, handle: string, message: string): SignupResult {
  return { ok: false, email, handle, message };
}

function scanSignupProfile(username: string, handle: string): SignupAutomodResult {
  try {
    return { ok: true, submission: scanAutomodSubmission("profile", username, handle) };
  } catch (error) {
    const message = badFormRequestMessage(error);
    if (message) return { ok: false, message };
    throw error;
  }
}

function emailSubject(form: Record<string, unknown>) {
  const email = canonicalEmail(field(form, "email"));
  return `email:${email || "missing"}`;
}