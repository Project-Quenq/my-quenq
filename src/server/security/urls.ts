const linkProtocols = new Set(["http:", "https:", "mailto:"]);
const trustedLinkDomains = ["my.quenq.com", "quenq.com"] as const; 

const trustedLinkDomainSet = new Set<string>(trustedLinkDomains);

export function normalizeLinkUrl(value: string) {
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!trimmed || /^(javascript|vbscript|file|data):/i.test(trimmed)) return "";
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!linkProtocols.has(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function normalizeTrustedLinkUrl(value: string) {
  const href = normalizeLinkUrl(value);
  if (!href) return "";

  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return "";
    if (url.username || url.password || url.port) return "";
    if (!trustedLinkDomainSet.has(url.hostname.toLowerCase())) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function normalizeResourceUrl(value: string) {
  // User-controlled resources may be local app paths or HTTPS URLs. data: URLs
  // stay blocked here even though the global CSP allows data: for app assets.
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!trimmed || /^(javascript|vbscript|file|data):/i.test(trimmed)) return "";

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}
