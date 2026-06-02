const soundCloudResourceHosts = new Set(["api.soundcloud.com", "soundcloud.com", "www.soundcloud.com"]);
const spotifyEmbedTypes = new Set(["album", "artist", "audiobook", "episode", "playlist", "show", "track"]);

// Embed URLs are normalized to these hosts before rendering.
export const embedSandbox = "allow-scripts allow-same-origin allow-presentation allow-popups";
export const embedReferrerPolicy = "strict-origin-when-cross-origin";

export function normalizeEmbedUrl(value: string) {
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!trimmed || /^(javascript|vbscript|file|data):/i.test(trimmed)) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return "";

    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") return youtubeEmbedUrl(url.pathname.slice(1), url.searchParams);

    if (hostname === "www.youtube.com" || hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "www.youtube-nocookie.com") {
      if (url.pathname === "/watch") return youtubeEmbedUrl(url.searchParams.get("v") ?? "", url.searchParams);
      if (url.pathname.startsWith("/shorts/")) return youtubeEmbedUrl(url.pathname.split("/")[2] ?? "", url.searchParams);
      if (url.pathname.startsWith("/embed/")) return youtubeEmbedUrl(url.pathname.slice("/embed/".length), url.searchParams);
    }

    if (hostname === "w.soundcloud.com" && url.pathname === "/player/" && isSafeSoundCloudWidget(url)) return url.href;
    if ((hostname === "vimeo.com" || hostname === "www.vimeo.com" || hostname === "player.vimeo.com") && isSafeVimeoUrl(url)) return vimeoEmbedUrl(url);
    if (hostname === "open.spotify.com" && isSafeSpotifyUrl(url)) return spotifyEmbedUrl(url);
    if (hostname === "bandcamp.com" && isSafeBandcampPlayer(url)) return url.href;
    if ((hostname === "www.tiktok.com" || hostname === "tiktok.com") && isSafeTikTokUrl(url)) return tiktokEmbedUrl(url);
    if ((hostname === "www.dailymotion.com" || hostname === "dailymotion.com" || hostname === "dai.ly") && isSafeDailymotionUrl(url)) return dailymotionEmbedUrl(url);

    return "";
  } catch {
    return "";
  }
}

export function embedAllowPolicy(src: string) {
  const hostname = new URL(src).hostname;
  if (hostname === "w.soundcloud.com" || hostname === "bandcamp.com") return "autoplay";
  if (hostname === "open.spotify.com") return "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  if (hostname === "player.vimeo.com") return "autoplay; fullscreen; picture-in-picture";
  if (hostname === "www.tiktok.com") return "encrypted-media; fullscreen; picture-in-picture";
  if (hostname === "www.dailymotion.com") return "autoplay; fullscreen; picture-in-picture";
  return "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
}

function youtubeEmbedUrl(rawId: string, params: URLSearchParams) {
  const [id] = rawId.split(/[/?#]/);
  const embed = new URL("https://www.youtube-nocookie.com/embed/");
  const list = params.get("list");

  if (id === "videoseries" && list) {
    embed.pathname = "/embed/videoseries";
    embed.searchParams.set("list", list);
    return embed.href;
  }

  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id)) return "";
  embed.pathname = `/embed/${id}`;
  if (list && /^[a-zA-Z0-9_-]{6,80}$/.test(list)) embed.searchParams.set("list", list);
  return embed.href;
}

function isSafeSoundCloudWidget(url: URL) {
  const embeddedUrl = url.searchParams.get("url");
  if (!embeddedUrl) return true;

  try {
    const parsed = new URL(embeddedUrl);
    return parsed.protocol === "https:" && soundCloudResourceHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isSafeVimeoUrl(url: URL) {
  if (url.hostname.toLowerCase() === "player.vimeo.com") {
    return /^\/video\/\d+$/.test(url.pathname) && safeQueryParams(url.searchParams, ["h", "badge", "autopause", "player_id", "app_id"]);
  }
  const parts = pathParts(url);
  return parts.length >= 1 && /^\d+$/.test(parts[0]) && (!parts[1] || /^[a-zA-Z0-9_-]{6,64}$/.test(parts[1]));
}

function vimeoEmbedUrl(url: URL) {
  const embed = new URL("https://player.vimeo.com/video/");
  if (url.hostname.toLowerCase() === "player.vimeo.com") {
    embed.pathname = url.pathname;
    copySafeParams(url.searchParams, embed.searchParams, ["h"]);
    return embed.href;
  }

  const [id, hash] = pathParts(url);
  embed.pathname = `/video/${id}`;
  const h = url.searchParams.get("h") ?? hash;
  if (h && /^[a-zA-Z0-9_-]{6,64}$/.test(h)) embed.searchParams.set("h", h);
  return embed.href;
}

function isSafeSpotifyUrl(url: URL) {
  const parts = pathParts(url).filter((part) => !/^[a-z]{2}(?:-[a-z]{2})?$/i.test(part));
  const offset = parts[0] === "embed" ? 1 : 0;
  const type = parts[offset];
  const id = parts[offset + 1];
  return Boolean(type && id && spotifyEmbedTypes.has(type) && /^[a-zA-Z0-9]{12,40}$/.test(id));
}

function spotifyEmbedUrl(url: URL) {
  const parts = pathParts(url).filter((part) => !/^[a-z]{2}(?:-[a-z]{2})?$/i.test(part));
  const offset = parts[0] === "embed" ? 1 : 0;
  return `https://open.spotify.com/embed/${parts[offset]}/${parts[offset + 1]}`;
}

function isSafeBandcampPlayer(url: URL) {
  return /^\/EmbeddedPlayer\/(?:[-_a-zA-Z0-9=]+\/)*$/.test(url.pathname) && /\/(?:album|track)=\d+\//.test(`${url.pathname}/`);
}

function isSafeTikTokUrl(url: URL) {
  const parts = pathParts(url);
  if (parts[0] === "player" && parts[1] === "v1") return /^\d{8,32}$/.test(parts[2] ?? "");
  const videoIndex = parts.indexOf("video");
  return videoIndex !== -1 && /^\d{8,32}$/.test(parts[videoIndex + 1] ?? "");
}

function tiktokEmbedUrl(url: URL) {
  const parts = pathParts(url);
  const id = parts[0] === "player" && parts[1] === "v1" ? parts[2] : parts[parts.indexOf("video") + 1];
  return `https://www.tiktok.com/player/v1/${id}`;
}

function isSafeDailymotionUrl(url: URL) {
  const parts = pathParts(url);
  if (url.hostname.toLowerCase() === "dai.ly") return /^[a-zA-Z0-9]+$/.test(parts[0] ?? "");
  if (parts[0] === "embed" && parts[1] === "video") return /^[a-zA-Z0-9]+$/.test(parts[2] ?? "");
  return parts[0] === "video" && /^[a-zA-Z0-9]+$/.test(parts[1] ?? "");
}

function dailymotionEmbedUrl(url: URL) {
  const parts = pathParts(url);
  const id = url.hostname.toLowerCase() === "dai.ly" ? parts[0] : parts[0] === "embed" ? parts[2] : parts[1];
  return `https://www.dailymotion.com/embed/video/${id}`;
}

function pathParts(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

function safeQueryParams(params: URLSearchParams, allowed: string[]) {
  return [...params.keys()].every((key) => allowed.includes(key));
}

function copySafeParams(from: URLSearchParams, to: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = from.get(name);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) to.set(name, value);
  }
}
