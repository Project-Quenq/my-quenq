import type { MiddlewareHandler } from "hono";
import { messagesPath, notificationsPath, reportPathBase } from "../../paths.js";
import type { AppBindings } from "../context.js";
import { noindexHeader } from "./routes.js";
import { absoluteUrl, escapeRegExp, normalizePath } from "./urls.js";

const privateRobotPaths = [
  "/admin",
  "/moderation",
  "/settings",
  "/account",
  messagesPath,
  notificationsPath,
  "/feed",
  "/friends",
  "/requests",
  "/blocks",
  "/favorites",
  "/props",
  reportPathBase,
  "/login",
  "/signup",
  "/search",
  "/logout",
  "/reset",
  "/verify",
  "/refresh",
  "/theme",
  "/media",
  "/account/profile",
  "/account/status",
  "/blog/new",
  "/b/*/edit",
  "/g",
  "/groups",
  "/p",
  "/skins/new",
  "/s/*/edit",
  "/s/*/preview"
] as const;

const blockedCrawlerAgents = [
  "AI2Bot",
  "Ai2Bot-Dolma",
  "Amazonbot",
  "anthropic-ai",
  "Applebot-Extended",
  "AwarioRssBot",
  "AwarioSmartBot",
  "Bytespider",
  "CCBot",
  "Claude-SearchBot",
  "Claude-User",
  "ChatGPT-User",
  "Claude-Web",
  "ClaudeBot",
  "cohere-ai",
  "Diffbot",
  "DuckAssistBot",
  "FacebookBot",
  "Google-Extended",
  "GoogleOther",
  "GoogleOther-Image",
  "GoogleOther-Video",
  "GPTBot",
  "ImagesiftBot",
  "img2dataset",
  "Kangaroo Bot",
  "magpie-crawler",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "MistralAI-User",
  "OAI-SearchBot",
  "omgili",
  "omgilibot",
  "PanguBot",
  "peer39_crawler",
  "PerplexityBot",
  "Perplexity-User",
  "QualifiedBot",
  "Timpibot",
  "YouBot"
] as const;

const aiCrawlerPattern = new RegExp(blockedCrawlerAgents.map(escapeRegExp).join("|"), "i");
const crawlerPattern = new RegExp(
  [
    "bot",
    "crawler",
    "spider",
    "slurp",
    "crawl",
    "archiver",
    "facebookexternalhit",
    "embedly",
    "pinterest",
    "slackbot",
    "telegrambot",
    "twitterbot",
    "whatsapp",
    "AhrefsBot",
    "BLEXBot",
    "DataForSeoBot",
    "DotBot",
    "MJ12bot",
    "PetalBot",
    "SemrushBot",
    "SerpstatBot",
    "Scrapy",
    "axios",
    "curl",
    "Go-http-client",
    "httpclient",
    "Java/",
    "libwww-perl",
    "node-fetch",
    "python-requests",
    "wget",
    "AdsBot-Google",
    "Applebot",
    "Baiduspider",
    "BingPreview",
    "Discordbot",
    "DuckDuckBot",
    "Exabot",
    "Facebot",
    "Google-InspectionTool",
    "Googlebot",
    "LinkedInBot",
    "MicrosoftPreview",
    "Mediapartners-Google",
    "Pinterestbot",
    "SkypeUriPreview",
    "Sogou",
    "TeamsBot",
    "YandexBot"
  ].map(escapeRegExp).join("|"),
  "i"
);

export function blockedCrawlerMiddleware(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const path = normalizePath(new URL(c.req.url).pathname);
    if (path !== "/robots.txt" && crawlerKind(c.req.header("user-agent")) === "blocked") {
      c.header("X-Robots-Tag", noindexHeader);
      c.header("Cache-Control", "private, no-store");
      return c.text("Crawler access is not allowed for this site.", 403);
    }
    await next();
  };
}

export function robotsText() {
  return [
    ...blockedCrawlerAgents.flatMap((agent) => [`User-agent: ${agent}`, "Disallow: /", ""]),
    "User-agent: *",
    ...privateRobotPaths.map((path) => `Disallow: ${path}`),
    "Allow: /static/",
    "Allow: /theme.css",
    "Allow: /branding.css",
    "Allow: /favicon.svg",
    "Allow: /og-image.png",
    "Allow: /og-image.svg",
    "Allow: /apple-touch-icon.png",
    "Allow: /icon-192.png",
    "Allow: /icon-512.png",
    "Allow: /icon-1024.png",
    "Allow: /site.webmanifest",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    ""
  ].join("\n");
}

export function crawlerKind(userAgent: string | undefined) {
  if (!userAgent) return "crawler";
  if (aiCrawlerPattern.test(userAgent)) return "blocked";
  if (crawlerPattern.test(userAgent)) return "crawler";
  return "browser";
}
