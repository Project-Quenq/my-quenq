import { env } from "../env.js";

export function absoluteUrl(path: string) {
  return new URL(path, `${env.baseUrl}/`).href;
}

export function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function routeSuffix(path: string, prefix: string) {
  if (!path.startsWith(prefix)) return null;
  const suffix = path.slice(prefix.length);
  return suffix && !suffix.includes("/") ? suffix : null;
}

export function idRoute(path: string, prefix: string) {
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length);
  const [idValue, ...parts] = rest.split("/");
  const id = Number(idValue);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const suffix = parts.length ? `/${parts.join("/")}` : "";
  return { id, suffix };
}

export function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}
