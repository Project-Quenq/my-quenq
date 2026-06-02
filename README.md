<div align="center">
  <img src="./public/static/brand/favicon.svg" alt="quenq icon" width="96" height="96">
  <h1>my quenq</h1>
  <p><em>your corner of the retro web</em></p>
</div>

## Quick Start

```bash
corepack enable
pnpm install
pnpm db:init
pnpm dev
```

Open `http://localhost:3000`.

`pnpm db:init` initializes a fresh empty database. The app also initializes the schema on startup.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Default Brand Assets

Default my quenq favicon, social preview, app icon, and manifest files are generated from the same settings-derived asset helpers used by the runtime branding routes.

```bash
pnpm assets:brand
pnpm assets:brand:clean
```

## Project Layout

```text
src/
  routes/        HTTP routes and form handlers; nested helpers live beside their feature
  views/         server-rendered page markup grouped by product area
  shell/         app chrome: default layout, navigation, footer, global banners, and page layout primitives
  ui/            shared forms, icons, panels, avatars, actor summaries, links, people, comments, discussion, and engagement components
  server/        auth, database, relationship data, indexing, uploads, rendering, moderation, and security
  scripts/       asset-generation scripts
  automodPolicy.ts shared automod scope, action, pattern, and limit policy
  brand.ts       shared default brand icon SVG source
  currentUser.ts shared authenticated-user shape
  messages.ts    shared private-message form contracts
  models.ts      shared product read models
  notifications.ts shared notification type and label contracts
  paths.ts       shared app route and media URL builders
  policy.ts      shared limits, defaults, validation, and rate-limit policy
  roles.ts       shared roles and staff permission checks
  socialLinks.ts shared profile social-link validation and platform metadata
  text.ts        shared text formatting helpers
  values.ts      shared unknown-value parsing helpers
  theme/         color palette derivation and generated theme CSS helpers
  skins/         profile skin contracts, color palette helpers, and skin color-palette editor
public/          static CSS, icons, and bundled media assets; CSS is grouped by cascade layer
data/            local SQLite database and uploads, created at runtime and ignored by git
docs/            operator and security notes
```

## Contributor Orientation

- Routes stay in `src/routes`; they handle auth, form parsing, validation, and redirects.
- Views stay in feature folders under `src/views`; they render page markup and reuse focused UI modules from `src/ui`.
- SQLite access stays in `src/server/db`; public feature modules can delegate to nested implementation files.
- `src/server/db/schema.ts` is the schema source of truth. Keep account export, moderation, and automod code in sync with schema changes.
- User HTML must be sanitized before storage and rendered through the shared `trustedHtml` boundary.
- Runtime output stays out of source: `data`, `dist`, and `node_modules` are ignored local state.

## Runtime Choices

- Hono for the HTTP server.
- TypeScript with server-rendered JSX.
- SQLite through `better-sqlite3`.
- Argon2id password hashing.
- Plain CSS.
- Local filesystem uploads.

## License

my quenq is licensed under [GPL-3.0-only](LICENSE). Official license text: [gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

## Documentation

- [Architecture](docs/architecture.md)
- [Profile Skins](docs/skins.md)
- [Theme Tokens](docs/theme-tokens.md)
- [Self-hosting](docs/self-hosting.md)
- [Threat Model](docs/threat-model.md)