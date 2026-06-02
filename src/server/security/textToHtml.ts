import sanitizeHtml from "sanitize-html";
import { normalizeLinkUrl, normalizeTrustedLinkUrl } from "./urls.js";

const textTags = ["a", "br"];
const blogBodyTags = ["a", "b", "blockquote", "br", "code", "em", "h2", "h3", "i", "li", "ol", "p", "small", "span", "strong", "u", "ul"];

const textAttributes = {
  a: ["href", "title", "target", "rel"]
};
const urlWithLabelPattern = /\[url=(https?:\/\/[^\]\s<>"']+)\]([\s\S]*?)\[\/url\]/gi;
const urlPattern = /\[url\](https?:\/\/[^\]\s<>"']+)\[\/url\]/gi;
const bareHttpsUrlPattern = /https:\/\/[^\s<>"']+/gi;
const trailingUrlPunctuationPattern = /[),.!?;:\]}]+$/;

export function sanitizeUserText(input: string) {
  return sanitizeTextHtml(input.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>"), textTags);
}

export function sanitizeLinkedText(input: string) {
  return sanitizeTextHtml(linkBBCodeToHtml(input.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br>"), textTags);
}

export function sanitizeBlogBody(input: string) {
  return sanitizeTextHtml(blogBBCodeToHtml(input.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br>"), blogBodyTags);
}

function sanitizeTextHtml(input: string, allowedTags: string[]) {
  return sanitizeHtml(input, {
    allowedTags,
    allowedAttributes: textAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    textFilter: (text, tagName) => (tagName === "a" ? text : linkTrustedDomainUrls(text)),
    transformTags: {
      a: (_tagName, attribs) => {
        const sanitized = { ...attribs };
        const href = typeof sanitized.href === "string" ? normalizeLinkUrl(sanitized.href) : "";
        if (href) sanitized.href = href;
        else delete sanitized.href;
        sanitized.rel = "nofollow noopener noreferrer";
        sanitized.target = "_blank";
        return { tagName: "a", attribs: sanitized };
      }
    }
  });
}

function linkTrustedDomainUrls(text: string) {
  return text.replace(bareHttpsUrlPattern, (match) => {
    const [urlText, suffix] = splitTrailingUrlPunctuation(match);
    const href = normalizeTrustedLinkUrl(decodeTextFilterUrl(urlText));
    if (!href) return match;
    return `<a href="${escapeHtmlAttribute(href)}" rel="nofollow noopener noreferrer" target="_blank">${displayTextForTrustedUrl(urlText)}</a>${suffix}`;
  });
}

function displayTextForTrustedUrl(value: string) {
  return value.replace(/^https:\/\//i, "");
}

function splitTrailingUrlPunctuation(value: string): [urlText: string, suffix: string] {
  const match = value.match(trailingUrlPunctuationPattern);
  if (!match?.index) return [value, ""];
  return [value.slice(0, match.index), value.slice(match.index)];
}

function decodeTextFilterUrl(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function blogBBCodeToHtml(input: string) {
  return input
    .replace(/\[(?:h2|heading)\]([\s\S]*?)\[\/(?:h2|heading)\]/gi, "<h2>$1</h2>")
    .replace(/\[(?:h3|subheading)\]([\s\S]*?)\[\/(?:h3|subheading)\]/gi, "<h3>$1</h3>")
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<b>$1</b>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<i>$1</i>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
    .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, "<code>$1</code>")
    .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, "<blockquote>$1</blockquote>")
    .replace(/\[(?:list|ul)\]([\s\S]*?)\[\/(?:list|ul)\]/gi, (_match, body: string) => bbcodeListToHtml("ul", body))
    .replace(/\[(?:olist|ol)\]([\s\S]*?)\[\/(?:olist|ol)\]/gi, (_match, body: string) => bbcodeListToHtml("ol", body))
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, "")
    .replace(urlWithLabelPattern, '<a href="$1">$2</a>')
    .replace(urlPattern, '<a href="$1">$1</a>');
}

function linkBBCodeToHtml(input: string) {
  return input
    .replace(urlWithLabelPattern, '<a href="$1">$2</a>')
    .replace(urlPattern, '<a href="$1">$1</a>');
}

function bbcodeListToHtml(tagName: "ul" | "ol", body: string) {
  const markedItems = body.split(/\[\*\]/).map((item) => item.trim()).filter(Boolean);
  const items = markedItems.length ? markedItems : body.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  return `<${tagName}>${items.map((item) => `<li>${item.replace(/\n+/g, "<br>")}</li>`).join("")}</${tagName}>`;
}
