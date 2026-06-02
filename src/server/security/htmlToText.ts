import sanitizeHtml from "sanitize-html";

export function userTextFromHtml(input: string) {
  const anchors: string[] = [];
  const withAnchorTokens = input.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes: string, textHtml: string): string => {
    const href = hrefFromAttributes(attributes);
    const label = editorText(textHtml.replace(/<br\s*\/?>/gi, "\n"));
    const token = editorLinkToken(anchors.length);
    anchors.push(href ? `<a href="${escapeHtmlAttribute(href)}">${escapeHtmlText(label || href)}</a>` : label);
    return token;
  });

  return anchors.reduce(
    (text, anchor, index) => text.replaceAll(editorLinkToken(index), anchor),
    editorText(withAnchorTokens.replace(/<br\s*\/?>/gi, "\n"))
  );
}

export function blogBodyTextFromHtml(input: string): string {
  const editorMarkup: string = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_match, textHtml: string): string => `[h2]${blogBodyTextFromHtml(textHtml).trim()}[/h2]\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_match, textHtml: string): string => `[h3]${blogBodyTextFromHtml(textHtml).trim()}[/h3]\n`)
    .replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, tagName: string, listHtml: string): string => listHtmlToBBCode(tagName, listHtml))
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<blockquote\b[^>]*>/gi, "\n[quote]\n")
    .replace(/<\/blockquote>/gi, "\n[/quote]\n")
    .replace(/<code\b[^>]*>/gi, "[code]")
    .replace(/<\/code>/gi, "[/code]")
    .replace(/<(?:b|strong)\b[^>]*>/gi, "[b]")
    .replace(/<\/(?:b|strong)>/gi, "[/b]")
    .replace(/<(?:i|em)\b[^>]*>/gi, "[i]")
    .replace(/<\/(?:i|em)>/gi, "[/i]")
    .replace(/<u\b[^>]*>/gi, "[u]")
    .replace(/<\/u>/gi, "[/u]")
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes: string, textHtml: string): string => {
      const href = hrefFromAttributes(attributes);
      const label: string = blogBodyTextFromHtml(textHtml).trim();
      if (!href) return label;
      return !label || label === href ? `[url]${href}[/url]` : `[url=${href}]${label}[/url]`;
    });

  return editorText(editorMarkup);
}

export function plainTextFromHtml(input: string) {
  const spaced = input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<li\b[^>]*>/gi, " ")
    .replace(/<\/(?:blockquote|div|h[1-6]|li|ol|p|tr|ul)>/gi, " ");
  return decodeHtmlEntities(sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })).replace(/\s+/g, " ").trim();
}

function editorLinkToken(index: number) {
  return `\uE000EDITOR_LINK_${index}\uE001`;
}

function editorText(markup: string) {
  return decodeHtmlEntities(sanitizeHtml(markup, { allowedTags: [], allowedAttributes: {} }))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function listHtmlToBBCode(tagName: string, listHtml: string) {
  const items = Array.from(listHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => blogBodyTextFromHtml(match[1] ?? "").trim())
    .filter(Boolean);
  if (!items.length) return blogBodyTextFromHtml(listHtml);
  const bbcodeTag = tagName.toLowerCase() === "ol" ? "olist" : "list";
  return `[${bbcodeTag}]\n${items.map((item) => `[*] ${item}`).join("\n")}\n[/${bbcodeTag}]\n`;
}

function decodeHtmlEntities(input: string) {
  return input.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    if (normalized === "nbsp") return "\u00a0";
    const codePoint = normalized.startsWith("#x") ? Number.parseInt(normalized.slice(2), 16) : Number.parseInt(normalized.slice(1), 10);
    if (!Number.isFinite(codePoint)) return match;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });
}

function hrefFromAttributes(attributes: string) {
  const match = attributes.match(/\shref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function escapeHtmlText(input: string) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(input: string) {
  return escapeHtmlText(input).replace(/"/g, "&quot;");
}
