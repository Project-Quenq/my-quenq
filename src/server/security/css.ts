import { profileSkinPartSet, profileSkinVersion } from "../../skins/contract.js";
import { normalizeResourceUrl } from "./urls.js";

const blockedCssProperties = new Set(["behavior", "-moz-binding"]);
const blockedCustomPropertyPrefixes = ["--theme-", "--app-theme-", "--color-"];
const skinVersionSelectorSource = String.raw`\[data-skin-version\s*=\s*(?:"${profileSkinVersion}"|'${profileSkinVersion}'|${profileSkinVersion})\s*\]`;
const skinVersionSelectorPattern = new RegExp(skinVersionSelectorSource);
const skinVersionSelectorGlobalPattern = new RegExp(skinVersionSelectorSource, "g");
const importRulePattern = /@import\s+(?:url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)|"([^"]+)"|'([^']+)'|([^;\s]+))[^;]*;/gi;

export function sanitizeInlineStyle(input: string) {
  return sanitizeDeclarations(input);
}

export function sanitizeStyleBlocks(input: string) {
  return input.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
    const sanitized = sanitizeSkinCss(css);
    return sanitized ? `<style>${sanitized}</style>` : "";
  });
}

function sanitizeSkinCss(input: string) {
  const imports: string[] = [];
  const css = input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(importRulePattern, (_rule, doubleQuotedUrl: string, singleQuotedUrl: string, unquotedUrl: string, bareDoubleQuotedUrl: string, bareSingleQuotedUrl: string, bareUnquotedUrl: string) => {
      const rawUrl = doubleQuotedUrl || singleQuotedUrl || unquotedUrl || bareDoubleQuotedUrl || bareSingleQuotedUrl || bareUnquotedUrl;
      const url = normalizeResourceUrl(rawUrl);
      // The CSP permits Google Fonts CSS for user skins; all other imports are
      // dropped so skins cannot pull arbitrary remote stylesheets.
      if (url?.startsWith("https://fonts.googleapis.com/")) imports.push(`@import url("${url.replace(/"/g, "%22")}");`);
      return "";
    })
    .replace(/<\/?style\b[^>]*>/gi, "")
    .replace(/[<>]/g, "");

  return `${imports.join("\n")}${imports.length ? "\n" : ""}${sanitizeCssBlock(css)}`.trim();
}

function sanitizeCssBlock(css: string) {
  // This accepts simple balanced CSS rule blocks and drops malformed trailing
  // input instead of trying to repair ambiguous CSS.
  let output = "";
  let index = 0;

  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open === -1) break;

    const prelude = css.slice(index, open).trim();
    const close = matchingBrace(css, open);
    if (close === -1) break;

    const body = css.slice(open + 1, close);
    const rule = prelude.startsWith("@") ? sanitizeAtRule(prelude, body) : sanitizeStyleRule(prelude, body);
    if (rule) output += rule;
    index = close + 1;
  }

  return output;
}

function sanitizeAtRule(prelude: string, body: string) {
  const lower = prelude.toLowerCase();

  if (lower.startsWith("@media") && /^@media[-a-zA-Z0-9\s:().,%/]+$/.test(prelude)) {
    const nested = sanitizeCssBlock(body);
    return nested ? `${prelude}{${nested}}` : "";
  }

  if (lower.startsWith("@keyframes") && /^@keyframes\s+[-_a-zA-Z0-9]+$/.test(prelude)) {
    const nested = sanitizeKeyframes(body);
    return nested ? `${prelude}{${nested}}` : "";
  }

  return "";
}

function sanitizeStyleRule(selector: string, body: string) {
  if (!isSafeSelector(selector)) return "";
  const declarations = sanitizeDeclarations(body);
  return declarations ? `${selector}{${declarations}}` : "";
}

function isSafeSelector(selector: string) {
  return selector.length <= 500 && selector.split(",").every(isSafeSelectorBranch);
}

function isSafeSelectorBranch(selector: string) {
  if (!hasSupportedSkinHook(selector)) return false;
  const normalizedSelector = normalizeSupportedSkinSelectors(selector);
  // Attribute selectors and selector functions can target app-owned DOM
  // state in surprising ways. Keep only the public profile skin hooks.
  if (/[\[\]<>]/.test(normalizedSelector)) return false;
  if (/:has|:is|:where/i.test(normalizedSelector)) return false;
  const withoutSimpleNot = normalizedSelector.replace(/:not\([-_a-zA-Z0-9\s.#]+\)/g, "");
  if (/:not/i.test(withoutSimpleNot)) return false;
  if (!isProfileScopedSelector(selector, normalizedSelector)) return false;
  return /^[-_a-zA-Z0-9\s.#:>+~,()*="'|%^$]+$/.test(normalizedSelector);
}

function hasSupportedSkinHook(selector: string) {
  if (/\[data-skin-page\]/.test(selector)) return true;
  if (/\[data-skin-root\]/.test(selector)) return true;
  if (skinVersionSelectorPattern.test(selector)) return true;
  return hasSupportedSkinPartHook(selector);
}

function isProfileScopedSelector(selector: string, normalizedSelector: string) {
  if (/\[data-skin-root\]/.test(selector)) return true;
  if (hasSupportedSkinPartHook(selector)) return true;

  // Bare page selectors are limited to the <body> hook. Descendant rules should
  // target public shell/profile part hooks instead of arbitrary app classes.
  return isPageLevelSelector(selector, normalizedSelector);
}

function isPageLevelSelector(selector: string, normalizedSelector: string) {
  if (!/\[data-skin-page\]/.test(selector) && !skinVersionSelectorPattern.test(selector)) return false;
  if (/\[data-skin-root\]/.test(selector) || hasSupportedSkinPartHook(selector)) return false;
  return normalizedSelector.replace(/\.skin-page|\.skin-version/g, "").trim() === "";
}

function hasSupportedSkinPartHook(selector: string) {
  const partPattern = /\[data-skin-part\s*=\s*(?:"([^"]+)"|'([^']+)'|([-_a-zA-Z0-9]+))\s*\]/g;
  for (const match of selector.matchAll(partPattern)) {
    const part = (match[1] || match[2] || match[3] || "").toLowerCase();
    if (profileSkinPartSet.has(part)) return true;
  }
  return false;
}

function normalizeSupportedSkinSelectors(selector: string) {
  return selector
    .replace(/\[data-skin-page\]/g, ".skin-page")
    .replace(/\[data-skin-root\]/g, ".skin-root")
    .replace(skinVersionSelectorGlobalPattern, ".skin-version")
    .replace(/\[data-skin-part\s*=\s*(?:"([^"]+)"|'([^']+)'|([-_a-zA-Z0-9]+))\s*\]/g, (match, doubleQuoted: string, singleQuoted: string, unquoted: string) => {
      const part = (doubleQuoted || singleQuoted || unquoted || "").toLowerCase();
      return profileSkinPartSet.has(part) ? ".skin-part" : match;
    });
}

function sanitizeKeyframes(css: string) {
  let output = "";
  let index = 0;

  while (index < css.length) {
    const open = css.indexOf("{", index);
    if (open === -1) break;

    const selector = css.slice(index, open).trim();
    const close = matchingBrace(css, open);
    if (close === -1) break;

    const declarations = isSafeKeyframeSelector(selector) ? sanitizeDeclarations(css.slice(open + 1, close)) : "";
    if (declarations) output += `${selector}{${declarations}}`;
    index = close + 1;
  }

  return output;
}

function isSafeKeyframeSelector(selector: string) {
  return /^(from|to|(?:100|[1-9]?[0-9])(?:\.\d+)?%)$/i.test(selector);
}

function sanitizeDeclarations(input: string) {
  return splitDeclarations(input)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return "";

      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim();
      if (!isSafeCssProperty(property)) return "";
      const safeValue = sanitizeCssValue(property, value);
      return safeValue ? `${property}:${safeValue};` : "";
    })
    .join("");
}

function splitDeclarations(input: string) {
  // Split on semicolons outside quoted strings and CSS functions so url(...)
  // values are validated as a single declaration.
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

function isSafeCssProperty(property: string) {
  if (/^--/.test(property)) return /^--[-_a-z0-9]+$/.test(property) && !blockedCustomPropertyPrefixes.some((prefix) => property.startsWith(prefix));
  if (!/^-?[a-z][-_a-z0-9]*$/.test(property)) return false;
  return !blockedCssProperties.has(property);
}

function sanitizeCssValue(property: string, value: string) {
  if (!value || /[<>]/.test(value)) return "";
  // Reject CSS escapes to avoid obfuscated spellings such as u\72l(...).
  if (/\\/.test(value)) return "";
  if (/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding/i.test(value)) return "";
  if (/\battr\s*\(/i.test(value)) return "";
  if (property === "position" && /\b(absolute|fixed|sticky)\b/i.test(value)) return "";

  let rejectedUrl = false;
  const withSafeUrls = value.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_match, _quote, rawUrl: string) => {
    const url = normalizeResourceUrl(rawUrl);
    if (!url) {
      rejectedUrl = true;
      return "";
    }
    return `url("${url.replace(/"/g, "%22")}")`;
  });

  return rejectedUrl ? "" : withSafeUrls;
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
