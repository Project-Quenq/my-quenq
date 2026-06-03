const frameSources = [
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://w.soundcloud.com",
  "https://player.vimeo.com",
  "https://open.spotify.com",
  "https://bandcamp.com",
  "https://www.tiktok.com",
  "https://www.dailymotion.com"
];

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "script-src-attr 'none'",
  "img-src 'self' data: https:",
  "media-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `frame-src ${frameSources.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

export const securityHeaders = {
  "Content-Security-Policy": contentSecurityPolicy,
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
};
