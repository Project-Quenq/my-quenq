# Theme Tokens

Theme tokens are the internal CSS custom-property contract for the app shell and reusable UI components.

This document is for maintainers changing the app theme system.

Skin authors should use [Profile Skins](skins.md) instead.

Do not merge this document into `skins.md`.

`skins.md` describes the user-facing skin HTML contract and sanitizer boundary.

This document describes how app and admin themes feed the shared component palette.

## Source Files

- `public/static/css/core/tokens.css` defines default theme tokens, sizing tokens, and component-facing aliases.
- `public/static/css/themes/dark.css` defines the cookie-selected dark override layer.
- `src/theme/colorPalette.ts` defines the admin color-palette model and derived color calculations.
- `src/theme/themeCss.ts` writes `/branding.css` from a saved admin color palette.
- `src/routes/system/theme.ts` serves `/theme.css` and handles the light/dark toggle cookie.
- `src/routes/system/branding.ts` serves `/branding.css`.
- `src/server/db/branding.ts` stores and reads the admin color palette.
- `src/views/staff/siteSettings.tsx` renders the admin color-theme form.
- `public/static/css/features/profile.css` maps profile skin variables into the same component-facing aliases on skinned profile pages.

## Token Layers

The theme system has four layers.

### 1. Admin Palette Source

The admin color-theme form edits eight source colors.

These source colors are defined by `colorPaletteTokens` in `src/theme/colorPalette.ts`.

| Palette token | Admin label | Default |
| --- | --- | --- |
| `chrome` | Header | `#7c3aed` |
| `chromeText` | Header text | `#ffffff` |
| `accent` | Accent | `#7c3aed` |
| `accentText` | Accent text | `#ffffff` |
| `link` | Link | `#6b21a8` |
| `backdrop` | Backdrop | `#e6e3ea` |
| `page` | Page | `#ffffff` |
| `surface` | Panel | `#ffffff` |

The admin form field names are `color_chrome`, `color_chromeText`, `color_accent`, `color_accentText`, `color_link`, `color_backdrop`, `color_page`, and `color_surface`.

Only six-digit hex colors are accepted by the palette parser.

Invalid submitted palette values fall back to the current palette value or the default palette.

The saved admin palette is stored as JSON in the `branding.palette` setting.

Saving the default palette removes the saved `branding.palette` setting.

### 2. App Theme Variables

`public/static/css/core/tokens.css` defines default `--app-theme-*` fallback values.

`src/theme/themeCss.ts` writes these `--app-theme-*` variables into `/branding.css` when admin branding is customized:

```text
--app-theme-backdrop
--app-theme-page
--app-theme-surface
--app-theme-chrome
--app-theme-chrome-text
--app-theme-accent
--app-theme-accent-text
--app-theme-link
--app-theme-link-hover
--app-theme-surface-link
--app-theme-surface-link-hover
--app-theme-page-text
--app-theme-surface-text
--app-theme-muted
```

`--app-theme-focus` exists in the default CSS and is used as the fallback for `--theme-focus`.

The admin color-theme form does not currently edit `--app-theme-focus`.

### 3. Active Theme Variables

Components do not consume admin palette tokens directly.

They consume active `--theme-*` variables.

Default active theme variables are defined in `public/static/css/core/tokens.css`.

Customized admin branding writes these active variables into `/branding.css`:

```text
--theme-backdrop
--theme-page
--theme-surface
--theme-chrome
--theme-chrome-text
--theme-accent
--theme-accent-text
--theme-link
--theme-link-hover
--theme-surface-link
--theme-surface-link-hover
--theme-page-text
--theme-surface-text
--theme-muted
```

These active theme variables are CSS-only defaults and are not written by `src/theme/themeCss.ts`:

```text
--theme-danger
--theme-danger-text
--theme-success
--theme-success-ink
--theme-success-text
--theme-focus
--theme-page-grid-a
--theme-page-grid-b
--theme-toggle-dark-display
--theme-toggle-light-display
```

### 4. Component-Facing Aliases

Reusable component CSS consumes `--color-*`, `--surface-*`, `--page-background`, and `--shadow-*` aliases.

Those aliases are resolved for both `:root` and `[data-skin-page]` in `public/static/css/core/tokens.css`.

The shared resolver lets admin themes and profile skins use the same component formulas.

Component-facing color aliases are:

```text
--color-page
--color-canvas
--color-surface
--color-surface-raised
--color-surface-tint
--color-text
--color-text-muted
--color-text-on-bright
--color-link
--color-link-hover
--color-brand
--color-brand-accent
--color-brand-header
--color-brand-nav
--color-brand-soft
--color-brand-border
--color-panel-accent
--color-panel-accent-soft
--color-panel-rule
--color-container-border
--color-danger
--color-danger-text
--color-danger-soft
--color-danger-border
--color-success
--color-success-ink
--color-success-text
--color-success-soft
--color-success-border
--color-field
--color-field-disabled
--color-field-border-light
--color-field-border
--color-field-border-dark
--color-focus
--color-link-focus-bg
--color-row-alt
--color-shadow-panel
--color-shadow-soft
--color-shadow-pressed
--color-shadow-card
--color-button-primary-bg
--color-button-primary-text
--color-button-primary-border-light
--color-button-primary-border-dark
--color-button-primary-hover-bg
--color-button-primary-hover-text
--color-button-secondary-bg
--color-button-secondary-text
--color-button-secondary-border-light
--color-button-secondary-border-dark
--color-button-secondary-hover-bg
--color-button-secondary-hover-text
--color-button-danger-bg
--color-button-danger-text
--color-button-danger-border-light
--color-button-danger-border-dark
--color-button-danger-hover-bg
--color-button-danger-hover-text
```

Component-facing surface aliases are:

```text
--surface-background
--surface-background-raised
--surface-background-soft
--surface-background-tint
--surface-border
--surface-border-soft
--surface-rule
--surface-shadow
```

Page and shadow aliases are:

```text
--page-background
--shadow-panel
--shadow-button
--shadow-field
--shadow-pressed
--shadow-photo
--shadow-card
--column-divider-shadow
```

## Derived Colors

`src/theme/colorPalette.ts` derives readable and hover colors from the eight admin palette source colors.

`deriveColorPalette()` returns:

```text
accent
accentText
backdrop
chrome
chromeText
muted
page
pageLink
pageLinkHover
pageText
surface
surfaceLink
surfaceLinkHover
surfaceText
```

`pageText` and `surfaceText` are chosen as black or white based on contrast.

`muted` is mixed from `surfaceText` and `surface`.

`pageLinkHover` and `surfaceLinkHover` are adjusted toward readable contrast against their background.

The CSS layer derives borders, soft surfaces, fields, shadows, and button border colors with `color-mix(...)`.

## Surface Meanings

`--theme-backdrop` is the browser background behind the app container.

`--theme-page` is the page canvas inside the app container.

`--theme-surface` is used for panels, cards, composers, profile actions, and form surfaces.

`--theme-chrome` is used for navigation, header-like chrome, and panel headings.

`--theme-accent` is used for primary actions.

`--theme-link` is the normal content link source color.

`--theme-page-text` is used for text on the page canvas.

`--theme-surface-text` is used for text on panels and surfaces.

`--theme-muted` is used for secondary text.

`--theme-focus` is used for focus styling.

## Default Light Theme

The default light theme is defined in `public/static/css/core/tokens.css`.

The default theme color source variables such as `--theme-chrome`, `--theme-accent`, `--theme-link`, `--theme-backdrop`, `--theme-page`, and `--theme-surface` point at default `--app-theme-*` fallback values.

The default `--theme-page-grid-a` and `--theme-page-grid-b` variables derive a subtle page-grid background from `--theme-backdrop`.

## Dark Theme

The dark theme is a small override layer in `public/static/css/themes/dark.css`.

`/theme.css` imports `public/static/css/themes/dark.css` only when the `app_theme` cookie is `dark` and admin branding is not customized.

The dark override is scoped to `:root:not([data-theme-lock="light"])`.

Dark mode overrides:

```text
color-scheme
--theme-backdrop
--theme-page
--theme-surface
--theme-page-text
--theme-link
--theme-muted
--theme-danger
--theme-success-text
--theme-toggle-dark-display
--theme-toggle-light-display
```

The dark override does not write `--app-theme-*` values.

## Admin Branding

Customized admin branding is served from `/branding.css`.

`/branding.css` is empty when branding is not customized.

When branding is customized, `src/theme/themeCss.ts` writes both `--app-theme-*` fallback values and active `--theme-*` values to `:root`.

Customized admin branding disables the light/dark theme toggle in the shell.

Customized admin branding locks the document with `data-theme-lock="light"` so the dark override does not apply.

Resetting the color theme deletes the saved palette and returns the app to the default light/dark behavior.

## Profile Skins

Profile skins do not write this global contract directly.

Skin CSS should use `--skin-palette-*` variables scoped to `[data-skin-page]`.

`public/static/css/features/profile.css` maps skin palette variables into page-local `--skin-*` variables.

`public/static/css/features/profile.css` then republishes those values through local `--theme-*` variables on `[data-skin-page]`.

Because component-facing aliases are resolved for `[data-skin-page]`, skinned profile pages use the same component formulas as admin themes.

Missing skin palette variables inherit the current `--app-theme-*` values.

Profiles without sanitized skin CSS inherit the normal site theme.

The skin sanitizer drops custom properties whose names start with `--theme-`, `--app-theme-`, or `--color-`.

Skin authors should use the public skin variables and hooks documented in [Profile Skins](skins.md).

Profile skin radius variables map into shared radius tokens on `[data-skin-page]`:

| Skin variable | Shared token |
| --- | --- |
| `--skin-radius-panel` | `--radius-panel` |
| `--skin-radius-photo` | `--radius-media` |
| `--skin-radius-control` | `--radius-subtle` |

`--skin-radius` is a fallback used by the skin radius variables.

## Non-Color Tokens

`public/static/css/core/tokens.css` also defines non-color tokens.

These tokens are not controlled by the admin color-theme form.

Base color constants:

```text
--color-white
--color-ink
```

Typography tokens:

```text
--font-body
--line-height-body
--font-size-main
--font-size-footer
--font-size-note
--font-size-caption
--font-size-small
--font-size-nav
--font-size-nav-link
--font-size-utility-action
--font-size-card-heading
--font-size-panel-heading
--font-size-profile-heading
```

Layout and size tokens:

```text
--container-width
--container-min-height
--content-measure
--nav-side-min
--audio-width
--avatar-size
--avatar-compact-size
--profile-photo-size
--profile-edit-photo-size
--person-card-width
--person-card-min-height
--profile-person-card-width
--details-label-width
--discussion-author-width
--column-compact
--column-profile
--column-wide
--column-aside-min
--profile-sidebar-min
```

Spacing tokens:

```text
--space-1
--space-2
--space-3
--space-4
--space-5
--space-6
--space-7
--space-8
--space-9
--space-10
--space-11
--space-12
--layout-stack-gap
--panel-body-gap
--list-stack-gap
--space-main-y
--space-main-x
--space-nav-links-y
--space-nav-links-x
--link-separator-gap
--article-title-offset
--icon-label-gap
--icon-offset-y
```

Border, radius, control, and table tokens:

```text
--border-thin
--border-medium
--radius-panel-default
--radius-media-default
--radius-panel
--radius-media
--radius-control-default
--radius-subtle
--text-decoration-hairline
--text-underline-offset
--icon-size
--brand-icon-size
--avatar-glyph-size
--control-min-height
--control-pad-y
--control-pad-x
--button-active-shift
--disabled-opacity
--focus-outline-width
--focus-offset
--table-cell-y
--table-cell-x
--contact-cell-min-height
--nav-search-width
--nav-link-min-height
```

## Maintainer Rules

Add a new admin-controlled source color only if it belongs in the eight-token color palette model or if that model is intentionally expanded.

If the admin palette model changes, update `src/theme/colorPalette.ts`, `src/theme/themeCss.ts`, the admin color form, and this document.

If a component needs a reusable color, prefer adding a component-facing alias in `public/static/css/core/tokens.css` rather than reading `--app-theme-*` directly.

If a profile skin should control a new theme concept, add a `--skin-palette-*` or `--skin-*` token in `public/static/css/features/profile.css` and update [Profile Skins](skins.md).

Do not require skin authors to set `--theme-*`, `--app-theme-*`, or `--color-*`.

## Change Checklist

When changing theme tokens:

- update `public/static/css/core/tokens.css`;
- update `src/theme/colorPalette.ts` and `src/theme/themeCss.ts` if admin branding should control the token;
- update the admin color-theme form if admins need to edit the token;
- keep `public/static/css/themes/dark.css` as a small override layer;
- verify `/branding.css` output when branding is customized;
- verify `/theme.css` output with and without the dark cookie;
- check profile skins still use their separate skin contract;
- update [Profile Skins](skins.md) when skin-facing variables change.
