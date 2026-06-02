import { createHash } from "node:crypto";
import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { sanitizeSkinHtml } from "../server/security/html.js";
import { trustedHtml } from "../ui/html.js";
import type { DataAttributes } from "../ui/types.js";
import { profileSkinVersion, type ProfileSkinPart } from "./contract.js";

const leadingCssImportPattern = /^@import\s+(?:url\(\s*(?:"[^"]+"|'[^']+'|[^)\s]+)\s*\)|"[^"]+"|'[^']+'|[^;\s]+)[^;]*;\s*/i;
const styleBlockPattern = /<style>([\s\S]*?)<\/style>/gi;
const skinPartSelectorPattern = /\[data-skin-part\s*=\s*(?:"([^"]+)"|'([^']+)'|([-_a-zA-Z0-9]+))\s*\]/g;
const skinVersionSelectorPattern = new RegExp(String.raw`\[data-skin-version\s*=\s*(?:"${profileSkinVersion}"|'${profileSkinVersion}'|${profileSkinVersion})\s*\]`, "g");
const authorSkinCommentPartSelector = '[data-author-skin-part="comment"]';
const authorSkinPostPartSelector = '[data-author-skin-part="post"]';
const postCardClassSelectorPattern = /(^|[^-_a-zA-Z0-9])\.post-card(?=$|[^-_a-zA-Z0-9])/g;
// These hooks can provide ancestor context and variables in author-scoped items,
// but exact rules for them must not paint a mini profile page around a post.
const authorSkinContextParts = [
  "page",
  "shell",
  "content",
  "wall",
  "navigation",
  "navigation-top",
  "navigation-links",
  "footer",
  "brand",
  "search",
  "account"
] as const satisfies readonly ProfileSkinPart[];
const authorSkinContextOnlySelectorPattern = new RegExp(
  String.raw`^(\[data-author-skin-page\]|\[data-author-skin-version="${profileSkinVersion}"\]|\[data-author-skin-root\]|\[data-author-skin-part="(?:${authorSkinContextParts.join("|")})"\])(?::+[-_a-zA-Z0-9]+(?:\([^)]*\))?)*$`
);
const publicSkinCustomProperties = new Set([
  "--skin-accent",
  "--skin-accent-text",
  "--skin-background",
  "--skin-backdrop",
  "--skin-focus",
  "--skin-link",
  "--skin-link-hover",
  "--skin-muted",
  "--skin-palette-accent",
  "--skin-palette-accent-text",
  "--skin-palette-backdrop",
  "--skin-palette-chrome",
  "--skin-palette-chrome-text",
  "--skin-palette-focus",
  "--skin-palette-link",
  "--skin-palette-link-hover",
  "--skin-palette-muted",
  "--skin-palette-page",
  "--skin-palette-page-text",
  "--skin-palette-surface",
  "--skin-palette-surface-link-hover",
  "--skin-palette-surface-text",
  "--skin-panel-background",
  "--skin-panel-heading-background",
  "--skin-panel-heading-text",
  "--skin-panel-text",
  "--skin-radius",
  "--skin-radius-control",
  "--skin-radius-panel",
  "--skin-radius-photo",
  "--skin-surface-link-hover",
  "--skin-text"
]);

export type ProfileSkin = {
  bodyHtml: string;
  styleHtml: string;
};

export type AuthorSkinItem = {
  authorId?: number;
  authorSkinHtml?: string | null;
};

type AuthorSkinScope = {
  id: string;
  skin: ProfileSkin;
};

export type AuthorSkinBackdropMode = "none" | "item" | "container";

type AuthorSkinCssScope = {
  customProperties: ReadonlyMap<string, string>;
  keyframes: ReadonlyMap<string, string>;
};

type AuthorSkinContextPart = (typeof authorSkinContextParts)[number];

export function profileSkinPart(part: ProfileSkinPart): DataAttributes {
  return { "data-skin-part": part };
}

function authorSkinPart(part: ProfileSkinPart): DataAttributes {
  return { "data-author-skin-part": part };
}

function profileSkinPage(): DataAttributes {
  return { "data-skin-page": "", "data-skin-part": "page", "data-skin-version": profileSkinVersion };
}

function authorSkinPage(): DataAttributes {
  return { "data-author-skin-page": "", "data-author-skin-part": "page", "data-author-skin-version": profileSkinVersion };
}

export function profileSkinPageAttributes(skin: ProfileSkin): DataAttributes | undefined {
  return skin.styleHtml.trim() ? profileSkinPage() : undefined;
}

export function profileSkinRoot(): DataAttributes {
  return { "data-skin-root": "", "data-skin-version": profileSkinVersion };
}

function authorSkinRoot(): DataAttributes {
  return { "data-author-skin-root": "", "data-author-skin-version": profileSkinVersion };
}

function splitProfileSkinHtml(html: string): ProfileSkin {
  const styleBlocks: string[] = [];
  const bodyHtml = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (styleBlock) => {
      styleBlocks.push(styleBlock);
      return "";
    })
    .trim();

  return {
    bodyHtml,
    styleHtml: styleBlocks.join("")
  };
}

export function profileSkinFromHtml(html: string): ProfileSkin {
  return splitProfileSkinHtml(sanitizeSkinHtml(html));
}

export function ProfileSkinStyles({ skin }: { skin: ProfileSkin }) {
  return skin.styleHtml ? <>{raw(layerProfileSkinStyleHtml(skin.styleHtml))}</> : null;
}

export function AuthorSkinStyles(props: { items: readonly AuthorSkinItem[] }) {
  const styles = authorSkinStyleHtmlForItems(props.items);
  return styles ? <>{raw(styles)}</> : null;
}

export function layerProfileSkinStyleHtml(styleHtml: string) {
  return styleHtml.replace(styleBlockPattern, (_match, css: string) => {
    const { imports, rules } = splitLeadingCssImports(css);
    return `<style>${[imports.join("\n"), rules ? `@layer profile-skin{${rules}}` : ""].filter(Boolean).join("\n")}</style>`;
  });
}

export function AuthorSkinBoundary(props: {
  backdrop?: AuthorSkinBackdropMode;
  children: Child;
  contextParts?: readonly AuthorSkinContextPart[];
  skinHtml?: string | null;
}) {
  const scope = authorSkinScopeFromHtml(props.skinHtml);
  if (!scope) return <>{props.children}</>;
  const backdrop = props.backdrop ?? "none";

  return (
    <div data-author-skin-scope={scope.id} data-author-skin-backdrop={backdrop} data-author-skin-layer="page" {...authorSkinPage()}>
      <div data-author-skin-layer="backdrop"></div>
      <div data-author-skin-layer="shell"></div>
      <div data-author-skin-layer="content"></div>
      <div data-author-skin-layer="root"></div>
      <div data-author-skin-layer="foreground">
        {backdrop === "container"
          ? authorSkinProfileWallFrame(props.children)
          : (
              <div data-author-skin-wrapper="" {...authorSkinPart("shell")}>
                <div data-author-skin-wrapper="" {...authorSkinPart("content")}>
                  <div data-author-skin-wrapper="" {...authorSkinRoot()}>
                    {authorSkinContextContainers(props.contextParts ?? [], props.children)}
                  </div>
                </div>
              </div>
            )}
      </div>
    </div>
  );
}

function authorSkinStyleHtmlForItems(items: readonly AuthorSkinItem[]) {
  const scopes = new Map<string, AuthorSkinScope>();
  for (const item of items) {
    const scope = authorSkinScopeFromHtml(item.authorSkinHtml);
    if (scope && !scopes.has(scope.id)) scopes.set(scope.id, scope);
  }
  return [...scopes.values()].map((scope) => layerScopedProfileSkinStyleHtml(scope.skin.styleHtml, scope.id)).join("\n");
}

function layerScopedProfileSkinStyleHtml(styleHtml: string, scopeId: string) {
  const cssScope = authorSkinCssScope(styleHtml, scopeId);
  const reset = `<style>@layer profile-skin{${authorSkinLayerBaselineCss(scopeId)}}</style>`;
  return reset + styleHtml.replace(styleBlockPattern, (_match, css: string) => {
    const { imports, rules } = splitLeadingCssImports(css);
    const scopedRules = rules ? transformScopedCssBlock(rules, scopeId, cssScope) : "";
    return `<style>${[imports.join("\n"), scopedRules ? `@layer profile-skin{${scopedRules}}` : ""].filter(Boolean).join("\n")}</style>`;
  });
}

function splitLeadingCssImports(css: string) {
  const imports: string[] = [];
  let rules = css.trim();
  let match = rules.match(leadingCssImportPattern);

  while (match) {
    imports.push(match[0].trim());
    rules = rules.slice(match[0].length).trim();
    match = rules.match(leadingCssImportPattern);
  }

  return { imports, rules };
}

function authorSkinScopeFromHtml(html: string | null | undefined): AuthorSkinScope | null {
  const skin = profileSkinFromHtml(html ?? "");
  if (!skin.styleHtml.trim()) return null;
  return {
    id: createHash("sha256").update(skin.styleHtml).digest("hex").slice(0, 12),
    skin
  };
}

function authorSkinContextContainers(parts: readonly AuthorSkinContextPart[], children: Child): Child {
  return parts.reduceRight(
    (child, part) => <div data-author-skin-wrapper="" {...authorSkinPart(part)}>{child}</div>,
    children
  );
}

function authorSkinProfileWallFrame(children: Child) {
  return (
    <div data-author-skin-wrapper="" {...authorSkinPart("shell")}>
      <div data-author-skin-wrapper="" {...authorSkinPart("content")}>
        <div data-author-skin-frame="profile-measure" class="profile" {...authorSkinRoot()}>
          <div data-author-skin-frame="main" class="split-layout__pane split-layout__main profile__main" {...authorSkinPart("main")}>
            <div data-author-skin-frame="wall" {...authorSkinPart("wall")}>
              <div data-author-skin-frame="wall-body">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function authorSkinCssScope(styleHtml: string, scopeId: string): AuthorSkinCssScope {
  return {
    customProperties: collectCustomPropertiesFromStyleHtml(styleHtml, scopeId),
    keyframes: collectKeyframeNamesFromStyleHtml(styleHtml, scopeId)
  };
}

function collectCustomPropertiesFromStyleHtml(styleHtml: string, scopeId: string) {
  const customProperties = new Map<string, string>();
  for (const css of styleBlockCsses(styleHtml)) {
    const { rules } = splitLeadingCssImports(css);
    collectCustomProperties(rules, scopeId, customProperties);
  }
  return customProperties;
}

function collectCustomProperties(css: string, scopeId: string, customProperties: Map<string, string>) {
  walkCssBlocks(css, (prelude, body) => {
    if (prelude.toLowerCase().startsWith("@media")) {
      collectCustomProperties(body, scopeId, customProperties);
      return;
    }

    if (prelude.startsWith("@")) return;

    for (const declaration of splitDeclarations(body)) {
      const colon = declaration.indexOf(":");
      if (colon === -1) continue;

      const property = declaration.slice(0, colon).trim();
      if (property.startsWith("--") && !publicSkinCustomProperties.has(property) && !customProperties.has(property)) {
        customProperties.set(property, scopedCustomPropertyName(scopeId, property));
      }
    }
  });
}

function collectKeyframeNamesFromStyleHtml(styleHtml: string, scopeId: string) {
  const keyframes = new Map<string, string>();
  for (const css of styleBlockCsses(styleHtml)) {
    const { rules } = splitLeadingCssImports(css);
    collectKeyframeNames(rules, scopeId, keyframes);
  }
  return keyframes;
}

function styleBlockCsses(styleHtml: string) {
  return [...styleHtml.matchAll(styleBlockPattern)].map((match) => match[1] ?? "");
}

function authorSkinLayerBaselineCss(scopeId: string) {
  const scope = `[data-author-skin-scope="${scopeId}"]`;
  return `${scope},${scope} *{all:revert-layer;}`;
}

function collectKeyframeNames(css: string, scopeId: string, keyframes = new Map<string, string>()) {
  walkCssBlocks(css, (prelude, body) => {
    const keyframeName = keyframeNameFromPrelude(prelude);
    if (keyframeName) keyframes.set(keyframeName, scopedKeyframeName(scopeId, keyframeName));
    else if (prelude.toLowerCase().startsWith("@media")) collectKeyframeNames(body, scopeId, keyframes);
  });
  return keyframes;
}

function transformScopedCssBlock(css: string, scopeId: string, cssScope: AuthorSkinCssScope) {
  let output = "";
  walkCssBlocks(css, (prelude, body) => {
    const keyframeName = keyframeNameFromPrelude(prelude);
    if (keyframeName) {
      output += `@keyframes ${cssScope.keyframes.get(keyframeName) ?? keyframeName}{${body}}`;
      return;
    }

    if (prelude.toLowerCase().startsWith("@media")) {
      const nested = transformScopedCssBlock(body, scopeId, cssScope);
      if (nested) output += `${prelude}{${nested}}`;
      return;
    }

    const scopedSelectors = scopedAuthorSkinSelectors(prelude, scopeId);
    const scopedBody = rewriteScopedDeclarations(body, cssScope);
    if (scopedSelectors.full.length && scopedBody) output += `${scopedSelectors.full.join(",")}{${scopedBody}}`;

    const scopedLayerPaint = rewriteScopedLayerPaintDeclarations(body, cssScope);
    if (scopedSelectors.backdrop.length && scopedLayerPaint) output += `${scopedSelectors.backdrop.join(",")}{${scopedLayerPaint}}`;
    if (scopedSelectors.content.length && scopedLayerPaint) output += `${scopedSelectors.content.join(",")}{${scopedLayerPaint}}`;
    if (scopedSelectors.root.length && scopedLayerPaint) output += `${scopedSelectors.root.join(",")}{${scopedLayerPaint}}`;
    if (scopedSelectors.shell.length && scopedLayerPaint) output += `${scopedSelectors.shell.join(",")}{${scopedLayerPaint}}`;

    const scopedContextDeclarations = rewriteScopedContextDeclarations(body, cssScope);
    if (scopedSelectors.context.length && scopedContextDeclarations) {
      output += `${scopedSelectors.context.join(",")}{${scopedContextDeclarations}}`;
    }
  });
  return output;
}

function scopedAuthorSkinSelectors(prelude: string, scopeId: string) {
  const selectors = {
    backdrop: [] as string[],
    content: [] as string[],
    context: [] as string[],
    full: [] as string[],
    root: [] as string[],
    shell: [] as string[]
  };

  for (const selector of prelude.split(",")) {
    const normalized = selector.trim();
    if (!normalized) continue;

    const authorSelector = authorSkinSelector(normalized);
    const scopedSelector = scopeAuthorSkinSelector(authorSelector, scopeId);
    if (isAuthorSkinContextOnlySelector(authorSelector)) {
      selectors.context.push(scopedSelector);
      if (isAuthorSkinPageBackgroundSelector(authorSelector)) selectors.backdrop.push(authorSkinLayerSelector(scopeId, "backdrop"));
      if (isAuthorSkinShellBackgroundSelector(authorSelector)) selectors.shell.push(authorSkinLayerSelector(scopeId, "shell"));
      if (isAuthorSkinContentBackgroundSelector(authorSelector)) selectors.content.push(authorSkinLayerSelector(scopeId, "content"));
      if (isAuthorSkinRootBackgroundSelector(authorSelector)) selectors.root.push(authorSkinLayerSelector(scopeId, "root"));
    } else {
      selectors.full.push(scopedSelector);
      selectors.full.push(...authorSkinCommentFallbackSelectors(authorSelector, scopeId));
    }
  }

  return selectors;
}

function authorSkinCommentFallbackSelectors(selector: string, scopeId: string) {
  if (selector.includes(authorSkinCommentPartSelector)) return [];

  const fallbacks = new Set<string>();
  if (selector.includes(authorSkinPostPartSelector)) {
    fallbacks.add(selector.split(authorSkinPostPartSelector).join(authorSkinCommentPartSelector));
  }

  const postCardFallback = selector.replace(postCardClassSelectorPattern, `$1${authorSkinCommentPartSelector}`);
  if (postCardFallback !== selector) fallbacks.add(postCardFallback);

  return [...fallbacks].map((fallback) => scopeAuthorSkinFallbackSelector(fallback, scopeId));
}

function scopeAuthorSkinFallbackSelector(selector: string, scopeId: string) {
  return `[data-author-skin-scope="${scopeId}"] :where(${selector})`;
}

function authorSkinLayerSelector(scopeId: string, layer: "backdrop" | "content" | "root" | "shell") {
  return `[data-author-skin-scope="${scopeId}"] > [data-author-skin-layer="${layer}"]`;
}

function scopeAuthorSkinSelector(selector: string, scopeId: string) {
  const scopeSelector = `[data-author-skin-scope="${scopeId}"]`;
  if (
    selector.startsWith("[data-author-skin-page]") ||
    selector.startsWith('[data-author-skin-part="page"]') ||
    selector.startsWith(`[data-author-skin-version="${profileSkinVersion}"]`)
  ) {
    return `${scopeSelector}${selector}`;
  }
  return `${scopeSelector} ${selector}`;
}

function isAuthorSkinContextOnlySelector(selector: string) {
  return authorSkinContextOnlySelectorPattern.test(selector);
}

function isAuthorSkinPageBackgroundSelector(selector: string) {
  return (
    selector === "[data-author-skin-page]" ||
    selector === '[data-author-skin-part="page"]' ||
    selector === `[data-author-skin-version="${profileSkinVersion}"]`
  );
}

function isAuthorSkinShellBackgroundSelector(selector: string) {
  return selector === '[data-author-skin-part="shell"]';
}

function isAuthorSkinContentBackgroundSelector(selector: string) {
  return selector === '[data-author-skin-part="content"]';
}

function isAuthorSkinRootBackgroundSelector(selector: string) {
  return selector === "[data-author-skin-root]";
}

function authorSkinSelector(selector: string) {
  return selector
    .replace(/\[data-skin-page\]/g, "[data-author-skin-page]")
    .replace(/\[data-skin-root\]/g, "[data-author-skin-root]")
    .replace(skinVersionSelectorPattern, `[data-author-skin-version="${profileSkinVersion}"]`)
    .replace(skinPartSelectorPattern, (_match, doubleQuoted: string, singleQuoted: string, unquoted: string) => {
      const part = doubleQuoted || singleQuoted || unquoted || "";
      return `[data-author-skin-part="${part}"]`;
    });
}

function walkCssBlocks(css: string, visit: (prelude: string, body: string) => void) {
  let index = 0;

  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open === -1) break;

    const prelude = css.slice(index, open).trim();
    const close = matchingBrace(css, open);
    if (close === -1) break;

    visit(prelude, css.slice(open + 1, close));
    index = close + 1;
  }
}

function keyframeNameFromPrelude(prelude: string) {
  const match = prelude.match(/^@keyframes\s+([-_a-zA-Z0-9]+)$/i);
  return match?.[1] ?? null;
}

function scopedKeyframeName(scopeId: string, keyframeName: string) {
  return `author-skin-${scopeId}-${keyframeName}`;
}

function scopedCustomPropertyName(scopeId: string, property: string) {
  return `--author-skin-${scopeId}-${property.slice(2)}`;
}

function rewriteScopedDeclarations(body: string, cssScope: AuthorSkinCssScope) {
  return splitDeclarations(body)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return declaration;

      const property = declaration.slice(0, colon).trim();
      const scopedProperty = cssScope.customProperties.get(property) ?? property;
      let value = replaceCustomPropertyTokens(declaration.slice(colon + 1), cssScope.customProperties);
      if (property === "animation" || property === "animation-name") {
        value = replaceKeyframeTokens(value, cssScope.keyframes);
      }
      return `${scopedProperty}:${value};`;
    })
    .join("");
}

const contextDeclarationProperties = new Set([
  "accent-color",
  "caret-color",
  "color",
  "cursor",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-optical-sizing",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-variant",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variation-settings",
  "font-weight",
  "hyphens",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "overflow-wrap",
  "quotes",
  "tab-size",
  "text-align",
  "text-align-last",
  "text-indent",
  "text-justify",
  "text-shadow",
  "text-transform",
  "text-wrap",
  "white-space",
  "word-break",
  "word-spacing"
]);

function rewriteScopedContextDeclarations(body: string, cssScope: AuthorSkinCssScope) {
  return splitDeclarations(body)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return "";

      const property = declaration.slice(0, colon).trim();
      if (!property.startsWith("--") && !contextDeclarationProperties.has(property)) return "";

      const scopedProperty = cssScope.customProperties.get(property) ?? property;
      const value = replaceCustomPropertyTokens(declaration.slice(colon + 1), cssScope.customProperties);
      return `${scopedProperty}:${value};`;
    })
    .join("");
}

const layerPaintDeclarationProperties = new Set([
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-style",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-style",
  "border-block-start-width",
  "border-block-style",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-color",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-style",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-style",
  "border-inline-start-width",
  "border-inline-style",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "box-shadow",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width"
]);

function rewriteScopedLayerPaintDeclarations(body: string, cssScope: AuthorSkinCssScope) {
  return splitDeclarations(body)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return "";

      const property = declaration.slice(0, colon).trim();
      if (!layerPaintDeclarationProperties.has(property)) return "";

      const value = replaceCustomPropertyTokens(declaration.slice(colon + 1), cssScope.customProperties);
      return `${property}:${value};`;
    })
    .join("");
}

function replaceKeyframeTokens(value: string, keyframes: ReadonlyMap<string, string>) {
  let output = value;
  for (const [name, scopedName] of keyframes) {
    output = output.replace(
      new RegExp(`(^|[^-_a-zA-Z0-9])${escapeRegExp(name)}(?=$|[^-_a-zA-Z0-9])`, "g"),
      (_match, prefix: string) => `${prefix}${scopedName}`
    );
  }
  return output;
}

function replaceCustomPropertyTokens(value: string, customProperties: ReadonlyMap<string, string>) {
  if (!customProperties.size) return value;
  let output = value;
  for (const [name, scopedName] of customProperties) {
    output = output.replace(
      new RegExp(`(^|[^-_a-zA-Z0-9])${escapeRegExp(name)}(?=$|[^-_a-zA-Z0-9])`, "g"),
      (_match, prefix: string) => `${prefix}${scopedName}`
    );
  }
  return output;
}

function splitDeclarations(input: string) {
  const declarations: string[] = [];
  let current = "";
  let quote = "";
  let depth = 0;

  for (const char of input) {
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")" && depth > 0) depth -= 1;

    if (char === ";" && depth === 0) {
      declarations.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) declarations.push(current);
  return declarations;
}

function matchingBrace(input: string, open: number) {
  let depth = 0;
  let quote = "";

  for (let index = open; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (char === quote && input[index - 1] !== "\\") quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ProfileCustomSkin({ skin }: { skin: ProfileSkin }) {
  return skin.bodyHtml ? <div class="profile__custom-skin custom-skin profile-section" {...profileSkinPart("custom-html")} dangerouslySetInnerHTML={trustedHtml(skin.bodyHtml)} /> : null;
}
