import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

function integerEnv(name: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = process.env[name]?.trim();
  const value = Number(raw || fallback);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
}

function nonEmptyEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function urlEnv(name: string, fallback: string) {
  try {
    const url = new URL(process.env[name]?.trim() || fallback);
    return ["http:", "https:"].includes(url.protocol) ? url.href.replace(/\/$/, "") : fallback;
  } catch {
    return fallback;
  }
}

const baseUrl = urlEnv("QUENQ_BASE_URL", "http://localhost:3000");
const parsedBaseUrl = new URL(baseUrl);

export const env = {
  baseUrl,
  baseOrigin: parsedBaseUrl.origin,
  baseHostname: parsedBaseUrl.hostname || "localhost",
  secureCookies: parsedBaseUrl.protocol === "https:",
  databasePath: nonEmptyEnv("QUENQ_DATABASE_PATH", "./data/quenq.sqlite"),
  uploadDir: nonEmptyEnv("QUENQ_UPLOAD_DIR", "./data/uploads"),
  adminUserId: integerEnv("QUENQ_ADMIN_USER_ID", 1, 1),
  smtpHost: process.env.QUENQ_SMTP_HOST ?? "",
  smtpPort: integerEnv("QUENQ_SMTP_PORT", 587, 1, 65535),
  smtpUser: process.env.QUENQ_SMTP_USER ?? "",
  smtpPassword: process.env.QUENQ_SMTP_PASSWORD ?? "",
  smtpFrom: process.env.QUENQ_SMTP_FROM ?? "",
  smtpSecure: process.env.QUENQ_SMTP_SECURE === "1",
  smtpStartTls: process.env.QUENQ_SMTP_STARTTLS !== "0",
  mediaConcurrency: integerEnv("QUENQ_MEDIA_CONCURRENCY", 1, 1, 8),
  port: integerEnv("PORT", 3000, 0, 65535),
  host: nonEmptyEnv("HOST", "0.0.0.0")
};

export const paths = {
  db: resolve(env.databasePath),
  uploads: resolve(env.uploadDir),
  pfp: resolve(env.uploadDir, "pfp"),
  postImages: resolve(env.uploadDir, "post-images"),
  themeSongs: resolve(env.uploadDir, "theme-songs")
};

export function ensureRuntimeDirs() {
  mkdirSync(paths.uploads, { recursive: true });
  mkdirSync(paths.pfp, { recursive: true });
  mkdirSync(paths.postImages, { recursive: true });
  mkdirSync(paths.themeSongs, { recursive: true });
}
