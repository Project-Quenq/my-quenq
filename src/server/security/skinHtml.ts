import sanitizeHtml from "sanitize-html";
import { sanitizeInlineStyle, sanitizeStyleBlocks } from "./css.js";
import { embedAllowPolicy, embedReferrerPolicy, embedSandbox, normalizeEmbedUrl } from "./embeds.js";
import { normalizeLinkUrl, normalizeResourceUrl } from "./urls.js";

const skinTags = [
  "a",
  "b",
  "big",
  "blockquote",
  "br",
  "caption",
  "center",
  "code",
  "div",
  "em",
  "font",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "iframe",
  "img",
  "li",
  "marquee",
  "ol",
  "p",
  "s",
  "small",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul"
];

const skinAttributes = {
  a: ["href", "title", "target", "rel", "class", "id", "style"],
  font: ["face", "color", "size", "class", "id", "style"],
  iframe: ["src", "title", "width", "height", "class", "id", "style", "loading", "allow", "allowfullscreen", "frameborder", "referrerpolicy", "sandbox"],
  img: ["src", "alt", "title", "width", "height", "class", "id", "style", "loading", "align", "border"],
  marquee: ["behavior", "direction", "scrollamount", "scrolldelay", "loop", "width", "height", "bgcolor", "align", "class", "id", "style"],
  table: ["width", "height", "border", "cellpadding", "cellspacing", "align", "valign", "bgcolor", "background", "class", "id", "style"],
  td: ["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor", "background", "class", "id", "style"],
  th: ["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor", "background", "class", "id", "style"],
  tr: ["align", "valign", "bgcolor", "background", "class", "id", "style"],
  "*": ["class", "id", "style", "align", "title"]
};

const allowedIframeHostnames = [
  "bandcamp.com",
  "open.spotify.com",
  "player.vimeo.com",
  "w.soundcloud.com",
  "www.dailymotion.com",
  "www.tiktok.com",
  "www.youtube-nocookie.com",
  "www.youtube.com"
];

export function sanitizeSkinHtml(input: string) {
  const withoutActiveCode = input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/behavior\s*:/gi, "");
  const withSanitizedCss = sanitizeStyleBlocks(withoutActiveCode);

  return sanitizeHtml(withSanitizedCss, {
    allowedTags: skinTags,
    allowedAttributes: skinAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames,
    allowVulnerableTags: true,
    transformTags: {
      "*": (tagName, attribs) => ({ tagName, attribs: sanitizeSkinAttributes(tagName, attribs) }),
      a: (_tagName, attribs) => {
        const sanitized = sanitizeSkinAttributes("a", attribs);
        const href = typeof sanitized.href === "string" ? normalizeLinkUrl(sanitized.href) : "";
        if (href) sanitized.href = href;
        else delete sanitized.href;
        sanitized.rel = "nofollow noopener noreferrer";
        if (sanitized.target && sanitized.target !== "_blank") delete sanitized.target;
        return { tagName: "a", attribs: sanitized };
      },
      img: (_tagName, attribs) => {
        const sanitized = sanitizeSkinAttributes("img", attribs);
        const src = typeof sanitized.src === "string" ? sanitized.src : "";
        const safeSrc = normalizeResourceUrl(src);
        return safeSrc
          ? { tagName: "img", attribs: { ...sanitized, src: safeSrc } }
          : { tagName: "span", attribs: {}, text: "" };
      },
      iframe: (_tagName, attribs) => {
        const sanitized = sanitizeSkinAttributes("iframe", attribs);
        const src = typeof sanitized.src === "string" ? normalizeEmbedUrl(sanitized.src) : "";
        if (!src) return { tagName: "span", attribs: {}, text: "" };
        return {
          tagName: "iframe",
          attribs: {
            ...sanitized,
            src,
            loading: "lazy",
            referrerpolicy: embedReferrerPolicy,
            sandbox: embedSandbox,
            allow: embedAllowPolicy(src),
            allowfullscreen: ""
          }
        };
      }
    }
  });
}

function sanitizeSkinAttributes(tagName: string, attribs: Record<string, string>) {
  const sanitized = { ...attribs };

  if (typeof sanitized.style === "string") {
    const style = sanitizeInlineStyle(sanitized.style);
    if (style) sanitized.style = style;
    else delete sanitized.style;
  }

  for (const attr of ["src", "background"]) {
    if (typeof sanitized[attr] !== "string") continue;
    const url = normalizeResourceUrl(sanitized[attr]);
    if (url) sanitized[attr] = url;
    else delete sanitized[attr];
  }

  if (tagName === "img" && sanitized.loading && !/^(lazy|eager)$/i.test(sanitized.loading)) delete sanitized.loading;
  if (tagName === "iframe") {
    const embedSrc = typeof sanitized.src === "string" ? normalizeEmbedUrl(sanitized.src) : "";
    if (sanitized.allow !== (embedSrc ? embedAllowPolicy(embedSrc) : "")) delete sanitized.allow;
    if (sanitized.sandbox !== embedSandbox) delete sanitized.sandbox;
    if (sanitized.referrerpolicy !== embedReferrerPolicy) delete sanitized.referrerpolicy;
    delete sanitized.frameborder;
    if (sanitized.loading && !/^(lazy|eager)$/i.test(sanitized.loading)) delete sanitized.loading;
  }

  return sanitized;
}
