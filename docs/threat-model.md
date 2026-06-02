# Threat Model

my quenq intentionally allows user-controlled profiles. That makes security boundaries explicit and non-optional.

## Assets

- Account credentials.
- Session tokens.
- CSRF tokens.
- Email addresses.
- Profile data.
- Uploaded profile images, post images, and audio.
- Private profile visibility.
- Admin actions, reports, and automod rules.
- SQLite database and uploads directory.

## Actors

- Anonymous visitor.
- Signed-up user.
- Profile owner.
- Friend.
- Moderator.
- Admin.
- Instance operator.
- Malicious user.
- Compromised reverse proxy or host.

## Trust Boundaries

- Browser to Hono request.
- Cookie/session middleware to route handlers.
- Form parser to validators.
- Sanitizer to HTML renderer.
- Upload parser to filesystem.
- Route handler to SQLite query module.
- Admin-only routes.
- Reverse proxy to app process.

## Primary Risks

### Cross-Site Scripting

Risk: profile bio, skin HTML, posts, comments, blogs, private messages, and reports render user content.

Controls:

- sanitize before storage;
- restrict tags, attributes, schemes, and inline styles;
- allow skin CSS only through the skin sanitizer, which strips active code, unsafe URL schemes, arbitrary CSS attribute selectors, high-risk selector functions, and absolute/fixed/sticky positioning, while keeping page-level skin selectors variable-only and preserving documented profile skin hooks;
- allow skin resource URLs only when they are local paths or HTTPS URLs;
- allow iframe embeds only for host/path-validated mainstream player URLs, with fixed sandbox and referrer policy attributes;
- avoid rendering raw input;
- keep sanitizer tests near sanitizer code;
- render stored sanitized HTML through the shared `trustedHtml` boundary, and treat any direct `dangerouslySetInnerHTML` use as security-sensitive.

### CSRF

Risk: form-first app has many mutating POST routes.

Controls:

- form-based mutations require CSRF tokens;
- mutating form actions use per-action rate limits backed by short-lived SQLite counters keyed to accounts or submitted form subjects;
- invalid tokens return 403;
- cookies use SameSite=Lax;
- destructive forms stay POST-only.

Email verification is the exception: `/verify/:token` consumes a one-time token stored as a hash in SQLite because the token itself authorizes that action.

### Session Theft

Risk: stolen session token gives account access.

Controls:

- random opaque tokens;
- store only token hashes;
- HTTP-only cookie;
- secure cookies when base URL is HTTPS;
- revocation on logout.

### Upload Abuse

Risk: executable files, oversized files, or disguised content.

Controls:

- size cap;
- request body size cap before form parsing;
- allowed MIME and extension;
- file signature validation;
- local image normalization before storage;
- random filenames;
- separate upload buckets for profile images, post images, and theme songs;
- uploads stored under the configured upload directory;
- production deployment docs place uploads under `/var/lib/quenq/uploads`;
- local development defaults use `data/uploads`, which is ignored by git.

### Authorization Bypass

Risk: user mutates or reads resources they should not access.

Controls:

- route-level auth checks;
- owner/admin checks before edit/delete;
- moderator checks for report queue actions, with role hierarchy checks before staff can delete content or ban an author;
- admin-only automod rule management, with rule length limits, regex compile validation, scan length caps, default critical rule packs, evasion-aware text normalization, and review matches routed through the same moderated report queue;
- private profile checks on direct profile, profile friends, profile blog, and wall routes;
- group post creation, props, and comments require group membership;
- protected admin friendship and default group membership checks prevent users from disconnecting from the instance admin account or leaving group id `1`;
- per-entry blog privacy checks for public, friends-only, and private diary entries;
- admin routes require the `admin` role; report moderation routes require a staff role with moderation capability.

### Open Redirect

Risk: attacker abuses redirect after delete actions.

Controls:

- redirects from request headers are restricted to local paths or same-origin URLs.

### Third-Party Profile Resources

Risk: customized skins can cause visitor browsers to fetch HTTPS images, CSS backgrounds, Google Fonts resources, or whitelisted embedded players chosen by profile authors.

Controls:

- remote resources are limited to HTTPS URLs by the skin sanitizer;
- iframe embeds are limited to mainstream player URLs such as YouTube, SoundCloud, Vimeo, Spotify, Bandcamp, TikTok, and Dailymotion, rewritten or validated by the skin sanitizer, sandboxed, and constrained by CSP `frame-src`;
- ordinary user text fields do not allow image tags;
- instance operators can tighten `sanitizeSkinHtml` and CSP if they want local-only skin assets.

### Data Loss

Risk: SQLite file or uploads are lost or corrupted.

Controls:

- WAL mode;
- documented backup and restore;
- uploads and database kept in predictable directories.

## Residual Risks

- Sanitizer policy may need tightening as skin support expands.
- New features may miss moderation edge cases.
- Deleted data can remain in backups outside the app.