# Profile Skins

Profile skins customize quenq profile pages with sanitized HTML and passive CSS.

Skins are edited in the profile editor under **Skin HTML** and shared from **Skins -> Submit skin**.

The skin field is limited to 20,000 characters.

Profile skins may be empty.

Shared skins must save to non-empty sanitized skin HTML.

Profile and shared skin forms sanitize skin HTML before saving.

Profile rendering sanitizes profile skin HTML again before rendering.

## Quick Start

Use one or more `<style>` blocks for CSS.

Use `[data-skin-page]` for page-level color variables and page background styles.

Use `[data-skin-root]` for the rendered profile layout container.

Use `[data-skin-part="..."]` for stable profile and shell sections.

Example:

```html
<style>
[data-skin-page] {
  --skin-palette-backdrop: #111111;
  --skin-palette-page: #171717;
  --skin-palette-page-text: #f8fafc;
  --skin-palette-surface: #262626;
  --skin-palette-surface-text: #f8fafc;
  --skin-palette-chrome: #7c3aed;
  --skin-palette-chrome-text: #ffffff;
  --skin-palette-link: #a78bfa;
  --skin-radius-panel: 8px;
  background: #111111;
}

[data-skin-root] {
  border: 2px solid #7c3aed;
}

[data-skin-part="name"] {
  color: #ffffff;
  text-shadow: 2px 2px 0 #7c3aed;
}

[data-skin-part="bio"] a:hover {
  color: #fbbf24;
}
</style>

<p>Optional custom skin HTML appears on the profile.</p>
```

## Rendering Model

Skin CSS is collected from sanitized `<style>` blocks and rendered in the page head.

Skin HTML outside `<style>` blocks is rendered inside the profile as the `custom-html` skin part.

The `custom-html` block appears after the profile bio and before the blog preview.

If no sanitized CSS survives, the page does not receive `data-skin-page` and the shell skin hooks are not activated.

The profile layout root still receives `data-skin-root` and `data-skin-version`.

## Stable Hooks

These hooks are the public selector contract.

Do not depend on ordinary app class names as stable API.

Internal class names may work when scoped under a supported hook, but they may change without a skin contract update.

### Page And Shell Hooks

| Hook | Rendered target |
| --- | --- |
| `[data-skin-page]` | The `<body>` element when sanitized CSS exists. |
| `[data-skin-root]` | The profile layout container. |
| `[data-skin-version="2026"]` | The current skin-version marker on the body when sanitized CSS exists and on the profile layout root. |
| `[data-skin-part="page"]` | The `<body>` element when sanitized CSS exists. |
| `[data-skin-part="shell"]` | The site shell container around navigation, page content, and footer. |
| `[data-skin-part="header"]` | The header around the site navigation. |
| `[data-skin-part="navigation"]` | The navigation element. |
| `[data-skin-part="navigation-top"]` | The top navigation row. |
| `[data-skin-part="brand"]` | The site brand area in navigation. |
| `[data-skin-part="search"]` | The navigation search form area. |
| `[data-skin-part="account"]` | The navigation account/action links area. |
| `[data-skin-part="navigation-links"]` | The main navigation link list. |
| `[data-skin-part="content"]` | The page `<main>` element. |
| `[data-skin-part="footer"]` | The site footer. |

Shell hooks render only when the profile page has sanitized CSS.

### Profile Hooks

| Hook | Rendered target |
| --- | --- |
| `[data-skin-part="sidebar"]` | The profile sidebar column. |
| `[data-skin-part="identity"]` | The username plus profile photo/details group. |
| `[data-skin-part="name"]` | The profile display-name heading. |
| `[data-skin-part="about"]` | The profile photo and status area. |
| `[data-skin-part="photo"]` | The profile photo wrapper. |
| `[data-skin-part="details"]` | The status quote, when a status is set. |
| `[data-skin-part="theme-song"]` | The profile theme-song audio player. |
| `[data-skin-part="vibe"]` | The current-vibe box, when a current vibe is set. |
| `[data-skin-part="actions"]` | The profile actions panel. |
| `[data-skin-part="url"]` | The profile URL box. |
| `[data-skin-part="links"]` | The social-links panel, when social links exist. |
| `[data-skin-part="interests"]` | The interests panel, when interests exist. |
| `[data-skin-part="main"]` | The main profile column. |
| `[data-skin-part="notice"]` | Friend or owner notices, when those notices render. |
| `[data-skin-part="bio"]` | The bio panel, when the profile has bio content. |
| `[data-skin-part="bio-content"]` | The rendered bio content inside the bio panel. |
| `[data-skin-part="custom-html"]` | Sanitized non-style skin HTML. |
| `[data-skin-part="blog-preview"]` | The latest blog entries panel. |
| `[data-skin-part="wall"]` | The wall posts panel. |
| `[data-skin-part="post"]` | A single post card on profile walls and when a profile skin is reused outside that author's profile. |
| `[data-skin-part="comment"]` | A single author-scoped comment when a profile skin is reused outside that author's profile. |
| `[data-skin-part="friends"]` | The profile front-row friends panel. |

Conditional hooks only exist when their target content exists.

When posts or comments appear outside an author's own profile, the app may reuse the author's profile skin inside a scoped item boundary.

Scoped author skins render only sanitized CSS; custom skin HTML is not inserted into posts or comments.

Profile wall posts stay inside the profile owner's page skin. They are not re-skinned by each post author's profile skin.

Use `[data-skin-part="post"]` to target only the post card element.

Use `[data-skin-part="comment"]` to target only the comment card element.

Existing wall-post descendant rules such as `[data-skin-part="wall"] .post-card` can also style author-scoped posts.

Author-scoped comments also receive post-card skin rules as a low-specificity fallback, so comments match posts by default.

Add `[data-skin-part="comment"]` rules when comments should intentionally differ from posts.

Exact page background declarations fill the viewport-wide post-height backdrop band.

Exact shell, content, and root paint declarations, such as backgrounds, borders, radii, outlines, and shadows, fill matching author-scoped structure layers inside the app container.

Exact page, shell, navigation, footer, content, and wall rules are otherwise treated as profile-page context in author-scoped items. They can pass CSS variables and inherited text or cursor declarations through, but they do not paint page chrome, pseudo-elements, navigation, or footer decorations around feed posts or comments.

The actions panel exposes `.profile-actions`, `.profile-actions__cell`, and `.profile-action` classes inside `[data-skin-part="actions"]`.

Use `.profile-action` when styling action links, buttons, and disabled action labels.

State classes such as `.profile-action--secondary`, `.profile-action--danger`, and `.profile-action--disabled` only describe tone or availability; keep the main box treatment on `.profile-action` so links and form buttons stay visually consistent.

Do not style every descendant `span` inside `[data-skin-part="actions"]`; action icons and button labels also use spans.

## Color Variables

Put skin color variables on `[data-skin-page]`.

The app maps skin palette variables into the active page theme for profile pages.

Missing skin palette variables inherit the current app theme.

Supported skin palette variables are:

| Variable | Effect |
| --- | --- |
| `--skin-palette-backdrop` | Page backdrop source color. |
| `--skin-palette-page` | Main page/canvas source color. |
| `--skin-palette-page-text` | Text color used on the page background. |
| `--skin-palette-surface` | Panel and surface source color. |
| `--skin-palette-surface-text` | Text color used on panels and surfaces. |
| `--skin-palette-chrome` | Navigation and panel-heading source color. |
| `--skin-palette-chrome-text` | Text color used on chrome and panel headings. |
| `--skin-palette-accent` | Primary accent source color. |
| `--skin-palette-accent-text` | Text color used on accent-colored controls. |
| `--skin-palette-link` | Link color source. |
| `--skin-palette-link-hover` | Page link hover color source. |
| `--skin-palette-surface-link-hover` | Surface link hover color source. |
| `--skin-palette-muted` | Muted text source color. |
| `--skin-palette-focus` | Focus outline source color. |

The **Generate color skin** button writes a `<style>` block with editable `--skin-palette-*` variables.

The **Generate color skin** button fills the skin editor; it does not save until the profile or skin form is submitted.

The color editor reads existing `--skin-palette-*` values from the current skin code.

The color editor also reads these older aliases: `--skin-accent`, `--skin-accent-text`, `--skin-panel-heading-background`, `--skin-panel-heading-text`, `--skin-link`, `--skin-backdrop`, `--skin-background`, and `--skin-panel-background`.

Do not set app-owned variables such as `--theme-*`, `--app-theme-*`, or `--color-*` in skin CSS.

The CSS sanitizer removes custom properties whose names start with `--theme-`, `--app-theme-`, or `--color-`.

## Radius Variables

Put radius variables on `[data-skin-page]`.

| Variable | Effect |
| --- | --- |
| `--skin-radius` | Shared fallback radius for profile panels and media. |
| `--skin-radius-panel` | Panels, cards, composers, URL boxes, and notice boxes. |
| `--skin-radius-photo` | Profile photos, placeholders, friend images, and post media. |
| `--skin-radius-control` | Form controls and buttons. |

Examples:

```html
<style>[data-skin-page]{--skin-radius:8px;--skin-radius-control:6px;}</style>
```

```html
<style>[data-skin-page]{--skin-radius-panel:18px;--skin-radius-photo:50%;--skin-radius-control:999px;}</style>
```

## CSS Selector Rules

Every skin CSS selector must include at least one supported hook.

Supported hooks are `[data-skin-page]`, `[data-skin-root]`, `[data-skin-version="2026"]`, and supported `[data-skin-part="..."]` values.

Bare page selectors are limited to `[data-skin-page]` or `[data-skin-version="2026"]` by themselves.

Use `[data-skin-root]` or `[data-skin-part="..."]` before descendant selectors.

This is allowed:

```css
[data-skin-part="bio"] a:hover {
  color: red;
}
```

This is dropped because it is a descendant of the body hook rather than a profile part:

```css
[data-skin-page] a {
  color: red;
}
```

This is dropped because it has no skin hook:

```css
body {
  color: red;
}
```

Selectors with unsupported attribute selectors are dropped.

Selectors using `:has()`, `:is()`, or `:where()` are dropped.

Simple `:not(...)` selectors can survive when the `:not(...)` contents only use simple class, id, tag, or spacing characters.

If any selector in a comma-separated selector list is unsafe, the whole rule is dropped.

Selectors longer than 500 characters are dropped.

The sanitizer removes `<` and `>` from CSS before parsing, so do not use child combinators.

Use descendant selectors instead of `>`.

## CSS Declaration Rules

Most ordinary CSS property names are accepted.

The properties `behavior` and `-moz-binding` are blocked.

`position:absolute`, `position:fixed`, and `position:sticky` are blocked.

`position:relative` is not blocked by the skin sanitizer.

CSS custom properties are accepted when the name starts with `--` and does not use a blocked app-owned prefix.

CSS values are dropped if they contain CSS escapes, `expression(...)`, `javascript:`, `vbscript:`, `behavior:`, `-moz-binding`, `attr(...)`, `<`, or `>`.

A declaration containing an unsafe `url(...)` is dropped.

Other safe declarations in the same rule can still survive.

CSS comments are removed.

Malformed CSS rule blocks may be dropped.

## CSS At-Rules

`@import` is only kept for `https://fonts.googleapis.com/...` stylesheets.

Other `@import` rules are removed.

`@media` rules can survive when the media prelude uses the sanitizer's supported simple characters.

`@keyframes` rules can survive when the animation name is alphanumeric, underscore, or hyphen.

Keyframe selectors can be `from`, `to`, or percentages.

Other CSS at-rules are removed.

## URLs And Media

Links and resources use different URL rules.

Link `href` values can be local paths, hash links, `http:`, `https:`, or `mailto:`.

Link `rel` is rewritten to `nofollow noopener noreferrer`.

Link `target` is kept only when it is `_blank`.

Image `src`, table `background`, and CSS `url(...)` resources can be local app paths or `https:` URLs.

Resource URLs using `http:`, `data:`, `file:`, `javascript:`, or `vbscript:` are removed.

Invalid image URLs are replaced with an empty `<span>`.

CSS declarations with invalid `url(...)` values are removed.

## Embeds

Skins can include sanitized `<iframe>` embeds from supported media providers.

Supported embed providers are YouTube, SoundCloud, Vimeo, Spotify, Bandcamp, TikTok, and Dailymotion.

YouTube watch, shorts, embed, youtube-nocookie, and youtu.be URLs are normalized to `https://www.youtube-nocookie.com/embed/...`.

Spotify URLs are normalized to `https://open.spotify.com/embed/...`.

Vimeo URLs are normalized to `https://player.vimeo.com/video/...`.

TikTok URLs are normalized to `https://www.tiktok.com/player/v1/...`.

Dailymotion URLs are normalized to `https://www.dailymotion.com/embed/video/...`.

Unsupported iframe sources are replaced with an empty `<span>`.

Iframe `loading` is rewritten to `lazy`.

Iframe `referrerpolicy` is rewritten to `strict-origin-when-cross-origin`.

Iframe `sandbox` is rewritten to `allow-scripts allow-same-origin allow-presentation allow-popups`.

Iframe `allow` is rewritten from the normalized provider URL.

Iframe `allowfullscreen` is added.

## Allowed HTML

Allowed skin tags are:

```text
a b big blockquote br caption center code div em font h1 h2 h3 h4 hr i iframe img li marquee ol p s small span strike strong style sub sup table tbody td tfoot th thead tr u ul
```

Allowed attributes by tag are:

| Tag | Attributes |
| --- | --- |
| `a` | `href`, `title`, `target`, `rel`, `class`, `id`, `style` |
| `font` | `face`, `color`, `size`, `class`, `id`, `style` |
| `iframe` | `src`, `title`, `width`, `height`, `class`, `id`, `style`, `loading`, `allow`, `allowfullscreen`, `frameborder`, `referrerpolicy`, `sandbox` |
| `img` | `src`, `alt`, `title`, `width`, `height`, `class`, `id`, `style`, `loading`, `align`, `border` |
| `marquee` | `behavior`, `direction`, `scrollamount`, `scrolldelay`, `loop`, `width`, `height`, `bgcolor`, `align`, `class`, `id`, `style` |
| `table` | `width`, `height`, `border`, `cellpadding`, `cellspacing`, `align`, `valign`, `bgcolor`, `background`, `class`, `id`, `style` |
| `td` | `width`, `height`, `colspan`, `rowspan`, `align`, `valign`, `bgcolor`, `background`, `class`, `id`, `style` |
| `th` | `width`, `height`, `colspan`, `rowspan`, `align`, `valign`, `bgcolor`, `background`, `class`, `id`, `style` |
| `tr` | `align`, `valign`, `bgcolor`, `background`, `class`, `id`, `style` |
| all allowed tags | `class`, `id`, `style`, `align`, `title` |

Event handler attributes are not allowed.

`<script>` is not allowed.

Inline `style` attributes are sanitized with the same declaration sanitizer used for CSS blocks.

Classes and ids on custom HTML can be useful for your own markup.

CSS selectors should still start from a supported skin hook.

## Shared Skins

Shared skins have a title, description, and skin HTML.

The shared skin description is ordinary user text, not skin HTML.

Shared skin HTML is sanitized before it is stored.

Users can preview a shared skin on their own profile before applying it.

Applying a shared skin copies that skin's saved HTML into the user's profile skin field.

User-authored shared skins can be edited by the owner or an admin.

Built-in shared skins can be edited by admins.

User-authored shared skins can be deleted by the owner, an admin, or a permitted moderator.

Built-in shared skins can be deleted by admins.

## Examples

### Background Image

```html
<style>
[data-skin-page] {
  background: #000000 url("https://example.com/background.gif") repeat;
}
</style>
```

### Style A Profile Part

```html
<style>
[data-skin-part="friends"] {
  border: 2px solid #ff99cc;
}
</style>
```

### Add Custom HTML

```html
<p>
  <a href="https://example.com" target="_blank">My links</a>
</p>
<img src="https://example.com/banner.gif" alt="Decorative banner" loading="lazy">
```

### Add A YouTube Embed

```html
<iframe
  src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  title="YouTube video"
  width="350"
  height="215">
</iframe>
```

The saved iframe source is normalized to `https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ`.

## Common Reasons Code Disappears

The selector did not include a supported skin hook.

The selector used `body`, `.profile`, `nav`, `table`, or another global selector by itself.

The selector used an unsupported attribute selector.

The rule used a blocked at-rule.

The declaration used an unsafe URL.

The declaration used a blocked CSS value.

The HTML tag or attribute is not in the allowed lists.

The image or iframe URL did not match the sanitizer's URL rules.

## Developer Verification

The skin hook list comes from `src/skins/contract.ts`.

Skin rendering behavior comes from `src/skins/rendering.tsx`, `src/views/profile/page.tsx`, and `src/views/profile/main.tsx`.

Shell hook behavior comes from `src/shell/layout.tsx`, `src/shell/nav.tsx`, and the layout primitives in `src/shell/page.tsx`.

Profile part placement comes from `src/views/profile/layout.tsx`, `src/views/profile/sidebar.tsx`, `src/views/profile/main.tsx`, `src/views/profile/details.tsx`, `src/views/profile/actions.tsx`, `src/views/posts/panels.tsx`, and the split layout helpers in `src/shell/page.tsx`.

Color and radius variables come from `src/skins/colorPalette.ts`, `src/skins/colorPaletteEditor.tsx`, and `public/static/css/features/profile.css`.

HTML, CSS, URL, and iframe sanitizer behavior comes from `src/server/security/skinHtml.ts`, `src/server/security/css.ts`, `src/server/security/urls.ts`, and `src/server/security/embeds.ts`.

Skin create, edit, preview, and apply behavior comes from `src/routes/skins/index.tsx`.

Profile skin save and generated color-skin behavior comes from `src/routes/profile/index.tsx` and `src/routes/profile/edit/actions.ts`.

When changing skin behavior, update this document in the same change.
