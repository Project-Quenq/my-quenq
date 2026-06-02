# Architecture

## Runtime Shape

```text
browser
  -> Hono route
  -> session + CSRF middleware
  -> SQLite query/mutation module
  -> server-rendered JSX
  -> HTML response
```

There is no client app shell. Public pages render without required JavaScript.

## Main Modules

- `src/index.tsx` owns Hono setup, middleware, static file serving, error handling, database initialization, and route registration.
- `src/routes/<feature>/index.tsx` owns feature route registrars. Route-specific helpers live beside the registrar, `src/routes/people/` owns browse/search/friend/block routes, `src/routes/account/` owns signed-in account pages such as settings, favorites, props, export, and deletion, `src/routes/staff/` owns shared admin/moderation route helpers, and `src/routes/system/` owns operational endpoints such as `/robots.txt`, `/theme.css`, and `/branding.css`.
- `src/views/<feature>/` owns page markup for each product area. The folder `index.ts` or `index.tsx` is the public view export for that feature.
- `src/shell/index.ts` owns the app chrome public API. The shell is app-bound, so its layout, nav, footer, page frame, and split layout primitives can read or compose around site settings, roles, and rate-limit state.
- `src/automodPolicy.ts` owns automod scopes, pattern types, actions, and pattern/scan limits shared by DB code, routes, and staff UI.
- `src/currentUser.ts` owns the shared authenticated-user shape passed between auth, routes, views, and UI components.
- `src/messages.ts` owns private-message form contracts shared by message routes and views.
- `src/models.ts` owns shared product read models returned by DB modules and rendered by routes, views, and UI components.
- `src/notifications.ts` owns notification kind, subject, context, and display-label contracts shared by schema, DB creation logic, and notification views.
- `src/paths.ts` owns shared app route and media URL builders used by routes, views, and UI components.
- `src/project.ts` owns source-project metadata shown on site information pages and the footer.
- `src/policy.ts` owns shared limits, default media names, report subject policy, rate-limit defaults, and validation helpers.
- `src/roles.ts` owns named user roles and staff capability checks.
- `src/settings/` owns shared site and branding settings shapes, defaults, and settings-derived rendering helpers such as favicon SVG generation.
- `src/socialLinks.ts` owns supported profile social-link platforms plus validation and normalization.
- `src/text.ts` owns generic text-only helpers used across server code and server-rendered markup.
- `src/ui/actors.tsx`, `src/ui/avatars.tsx`, `src/ui/people.tsx`, `src/ui/comments.tsx`, `src/ui/discussion.tsx`, `src/ui/engagement.tsx`, `src/ui/forms.tsx`, `src/ui/html.ts`, and `src/ui/links.tsx` own reusable actor summaries, profile images, people cards, comments, discussion entries, props controls, CSRF inputs, trusted HTML rendering, and inline links.
- `src/ui/pagination.tsx` owns shared server-rendered pagination links.
- `src/ui/icons.tsx` owns the Lucide Static server-rendered icon wrapper.
- `src/theme/` owns color palette derivation and generated CSS for admin-controlled theme tokens.
- `src/skins/` owns the profile skin hook contract, sanitized skin rendering helpers, color-palette-to-skin helpers, and skin color-palette editor shared by profile editing, shared skin submission, profile rendering, and skin previews.
- `src/server/pagination.ts` owns opaque cursor encoding, cursor URL helpers, and shared page result shaping.
- `src/server/comments/actions.ts` owns shared comment form, automod, report, delete, and audit orchestration across posts, blogs, and skins.
- `src/server/db/settings.ts` owns the small `app_settings` key/value boundary used by branding, site settings, and rate-limit snapshots.
- `src/server/db/schema.ts` owns the SQLite schema.
- `src/server/db/*.ts` owns small single-file data modules. `src/server/db/relationships.ts` owns friendships, blocks, and favorite edges; `src/server/db/staffDashboard.ts` owns cross-table staff dashboard reads. Larger areas expose a public `index.ts`, such as `src/server/db/posts/index.ts`, `src/server/db/blogs/index.ts`, `src/server/db/messages/index.ts`, or `src/server/db/notifications/index.ts`, and keep SQL pieces beside it in the same feature folder.
- `src/server/auth/session.ts` owns cookie sessions and CSRF validation.
- `src/server/context.ts` owns Hono app bindings and request context types.
- `src/server/security/html.ts` owns the public sanitizer API; CSS, URL, embed, and HTTP header policy helpers live beside it in focused modules.
- `src/server/media/upload.ts` owns the public upload/delete API. `src/server/media/policy.ts`, `validation.ts`, and `processing.ts` keep accepted media types, signature checks, and image normalization behind that boundary.

## Product Areas

- Profiles, profile walls, the signed-in feed, and group posts use the post system in `src/server/db/posts/index.ts`. The feed, profile wall, and group post lists use read-time comment activity ordering in `src/server/db/posts/commentActivity.ts`; comment writes do not mutate post timestamps.
- Blogs and skins keep their own content tables and use shared comment rendering where they expose comments.
- Favorites are user-to-user relationship edges. Props are post/blog engagement records; `/props` is a viewer-filtered account page over existing post and blog prop tables, not a separate saved-item table.
- Notifications are first-party SQLite rows created by existing social form routes for wall posts, group posts, comments, props, favorites, accepted friend requests, and group additions. Notification reads and writes live under `src/server/db/notifications/`, with comment fan-out isolated in `src/server/db/notifications/comments.ts`. Private-message reads and writes live under `src/server/db/messages/`. Pending friend requests stay in their dedicated requests pages.
- Reports use `src/policy.ts` for allowed subject types and `src/server/db/moderation/subjects.ts` for subject lookup and deletion.
- Automod rules live in `src/server/db/automod.ts`: routes use `scanAutomodSubmission()` to scan sanitized UGC before persistence, reject content for `reject` matches, and carry checked text forward so normal system reports can be created for `review` matches after the subject row exists. Default critical rule packs live in `src/server/moderation/automodDefaults.ts` as readable newline-separated keyword lists and are installed once per database so admins can disable or delete them without startup restoring them. Matching uses `src/server/moderation/automodNormalize.ts` to fold common leetspeak, full-width text, homoglyphs, repeated characters, and separator bypasses before keyword or regex checks.
- Admin and moderator permissions use named roles only: `user`, `moderator`, and `admin`. Automod management is admin-only; moderators act through the report queue and role hierarchy checks.

## Database

SQLite runs in WAL mode. The app uses explicit `better-sqlite3` prepared statements instead of an ORM, keeping schema and query behavior in source.

The schema source of truth is `src/server/db/schema.ts`. Startup creates tables and indexes for a fresh database, and `pnpm db:init` can be used for explicit setup. Schema changes should update the schema source, account export, moderation subjects, automod policy, and docs together.

Chronological list pages use keyset pagination through opaque `before` cursors. Keep SQL ownership in the feature DB module, fetch `limit + 1` rows, and use `src/server/pagination.ts` to shape the page and produce the next cursor. Prefer this pattern over offset pagination for mutable feeds, walls, groups, messages, notifications, and moderation queues.

## Auth

Passwords are hashed with Argon2id. Sessions use random opaque tokens. Only token hashes are stored in SQLite.

Staff privileges are capability-based. Route and visibility decisions use named roles (`user`, `moderator`, `admin`) through `src/roles.ts`.

## HTML Safety

Profile customization is the highest-risk product feature. User text and skin HTML must pass through sanitizer functions before storage. Raw untrusted input must not be the render source. Skins allow sanitized passive CSS and local or HTTPS resource URLs. Active code, unscoped global selectors, unsafe URL schemes, arbitrary attribute selectors, and CSS patterns that can read DOM attributes are stripped. Profile pages expose stable `data-skin-page`, `data-skin-root`, and `data-skin-part` hooks; the page hook accepts only `--skin-*` variables, while styling selectors must be rooted at the profile root or a skin part.

Remote HTTPS images, CSS backgrounds, and Google Fonts imports are allowed in skin HTML by `src/server/security/html.ts` and by the CSP in `src/server/security/headers.ts`. Those browser-side requests are part of custom profile rendering, not required app infrastructure.

## Request Safety

Form-based mutating routes use CSRF tokens and server-side validation. Email verification and password resets use one-time token hashes stored in SQLite; the local email outbox records the messages that carry those links. The app rejects oversized request bodies before parsing form data. Security headers are applied at the Hono layer.

Mutating form routes can opt into named action rate limits through the shared form helper. Source-controlled defaults live in policy, and admins can override them from the local admin panel. Rate-limit counters are kept in SQLite as short-lived action names and hashed account or submitted form-subject keys, preserving the app's local-only deployment shape.

## Uploads

Uploads are stored on disk under `QUENQ_UPLOAD_DIR`, which defaults to `data/uploads` in local development. Validation checks size, allowed extension/MIME, and file signature. Filenames are random UUIDs.

Profile images, post images, and theme songs live in separate upload buckets. Deletion paths that remove posts, groups, or accounts are responsible for removing referenced post-image files as well as the database rows.

## Static Assets

Static app assets, including the default theme song file and dark theme CSS, are served from `public/static`. Uploaded profile images, post images, and theme songs are served from the configured upload directory through `/media/pfp/*`, `/media/post-images/*`, and `/media/theme-songs/*`; the upload root itself is not mounted.

The default layout loads `style.css`, a small cookie-scoped `/theme.css` response for the optional dark theme, and `/branding.css` for saved admin theme colors. `style.css` is the CSS manifest: `core/`, `shell/`, `components/`, `features/`, `pages/`, and `responsive/` CSS are imported in explicit cascade order. Add only selectors and static scripts the app actually renders.

## Indexing and Crawlers

Search indexing is default-deny and server-side. `src/server/indexing/` owns route indexability, crawler blocking, robots.txt text, and sitemap generation, using row-level public predicates from `src/server/db/indexing.ts` for mixed routes such as profiles, blogs, and skins. Public pages receive a canonical `Link` header. Everything else receives an `X-Robots-Tag` noindex header, and crawler-like user agents are blocked from non-indexable pages.

`/robots.txt` and `/sitemap.xml` are generated by `src/routes/system/crawlers.ts` from the same policy. The sitemap lists only public canonical URLs and is capped to the sitemap protocol's 50,000 URL limit. New public content surfaces should add one DB predicate and one resolver branch in `src/server/indexing/routes.ts` instead of duplicating visibility logic in views.

## Non-Goals

- No mandatory OAuth.
- No mandatory object storage.
- No mandatory hosted database.