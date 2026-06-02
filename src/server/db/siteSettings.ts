import { limits, validEmail } from "../../policy.js";
import {
  defaultHeaderIconName,
  defaultHeaderIconSvg,
  defaultSiteSettings,
  type SiteContactSettings,
  type SiteHomeSettings,
  type SiteIdentitySettings,
  type SiteRegistrationSettings,
  type SiteSettings
} from "../../settings/site.js";
import { recordFromUnknown, stringFromUnknown } from "../../values.js";
import { saveSetting, settingRow } from "./settings.js";

type StoredSiteSettings = Omit<SiteSettings, "updatedAt">;

export class SiteSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteSettingsValidationError";
  }
}

const siteSettingsKey = "site.settings";
const lucideIconPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function siteSettings(): SiteSettings {
  const row = settingRow(siteSettingsKey);
  const settings = parseSiteSettingsJson(row?.value);
  return { ...settings, updatedAt: row?.updatedAt ?? null };
}

export function saveSiteIdentity(identity: SiteIdentitySettings) {
  saveSiteSettings({ ...siteSettings(), identity: normalizeIdentity(identity) });
}

export function saveSiteHome(home: SiteHomeSettings) {
  saveSiteSettings({ ...siteSettings(), home: normalizeHome(home) });
}

export function saveSiteContact(contact: SiteContactSettings) {
  saveSiteSettings({ ...siteSettings(), contact: normalizeContact(contact) });
}

export function saveSiteRegistration(registration: SiteRegistrationSettings) {
  saveSiteSettings({ ...siteSettings(), registration: normalizeRegistration(registration) });
}

export async function siteIconFromName(value: string) {
  const name = normalizeIconName(value);
  if (!name) throw new SiteSettingsValidationError("Use a Lucide icon name like users or message-circle.");
  if (name === defaultHeaderIconName) return { name, svg: defaultHeaderIconSvg };

  try {
    const icon = await import(`lucide-static/dist/esm/icons/${name}.mjs`) as { default?: unknown };
    if (typeof icon.default !== "string" || !icon.default.includes("<svg")) throw new Error("Invalid icon module.");
    return { name, svg: icon.default };
  } catch {
    throw new SiteSettingsValidationError("Choose an icon from the Lucide icon library.");
  }
}

export function normalizeSiteName(value: string) {
  const name = cleanText(value, limits.siteName);
  if (!name) throw new SiteSettingsValidationError("Site name is required.");
  return name;
}

export function normalizeContactEmail(value: string) {
  const email = cleanText(value.toLowerCase(), limits.emailMax);
  if (email && !validEmail(email)) throw new SiteSettingsValidationError("Use a valid contact email address.");
  return email;
}

export function normalizeCompanyName(value: string) {
  return cleanText(value, limits.shortText) || defaultSiteSettings.contact.companyName;
}

export function normalizeSiteText(value: string, maxLength: number) {
  return cleanText(value, maxLength);
}

function saveSiteSettings(settings: SiteSettings | StoredSiteSettings) {
  saveSetting(siteSettingsKey, JSON.stringify(storedSiteSettings(settings)));
}

function parseSiteSettingsJson(value: string | null | undefined): StoredSiteSettings {
  if (!value) return storedSiteSettings(defaultSiteSettings);
  try {
    return normalizeStoredSiteSettings(JSON.parse(value));
  } catch {
    return storedSiteSettings(defaultSiteSettings);
  }
}

function normalizeStoredSiteSettings(value: unknown): StoredSiteSettings {
  const record = recordFromUnknown(value);
  return {
    identity: normalizeIdentity(record.identity),
    home: normalizeHome(record.home),
    contact: normalizeContact(record.contact),
    registration: normalizeRegistration(record.registration)
  };
}

function normalizeIdentity(value: unknown): SiteIdentitySettings {
  const record = recordFromUnknown(value);
  const defaults = defaultSiteSettings.identity;
  return {
    name: cleanText(record.name, limits.siteName) || defaults.name,
    tagline: textSetting(record, "tagline", limits.siteTagline, defaults.tagline),
    headerIconName: normalizeIconName(record.headerIconName) || defaults.headerIconName,
    headerIconSvg: cleanSvg(record.headerIconSvg) || defaults.headerIconSvg
  };
}

function normalizeHome(value: unknown): SiteHomeSettings {
  const record = recordFromUnknown(value);
  const defaults = defaultSiteSettings.home;
  return {
    announcement: textSetting(record, "announcement", limits.siteAnnouncement, defaults.announcement),
    welcomeText: textSetting(record, "welcomeText", limits.siteWelcomeText, defaults.welcomeText)
  };
}

function normalizeContact(value: unknown): SiteContactSettings {
  const record = recordFromUnknown(value);
  return {
    email: normalizeContactEmail(stringFromUnknown(record.email)),
    companyName: normalizeCompanyName(stringFromUnknown(record.companyName)),
    mailingAddress: cleanText(record.mailingAddress, limits.contactAddress)
  };
}

function normalizeRegistration(value: unknown): SiteRegistrationSettings {
  const record = recordFromUnknown(value);
  return {
    blockedCountries: stringFromUnknown(record.blockedCountries).toUpperCase().replace(/\s+/g, "")
  };
}

function storedSiteSettings(settings: SiteSettings | StoredSiteSettings): StoredSiteSettings {
  return {
    identity: normalizeIdentity(settings.identity),
    home: normalizeHome(settings.home),
    contact: normalizeContact(settings.contact),
    registration: normalizeRegistration(settings.registration)
  };
}

function cleanText(value: unknown, maxLength: number) {
  return stringFromUnknown(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, maxLength);
}

function textSetting(record: Record<string, unknown>, key: string, maxLength: number, fallback: string) {
  return key in record ? cleanText(record[key], maxLength) : fallback;
}

function cleanSvg(value: unknown) {
  const svg = stringFromUnknown(value).trim();
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>") || svg.length > 5000) return "";
  if (/<(?:script|style|foreignObject|iframe|image|use|a)\b/i.test(svg)) return "";
  if (/\son[a-z]+\s*=|(?:href|src)\s*=|javascript:|data:/i.test(svg)) return "";
  return svg;
}

function normalizeIconName(value: unknown) {
  const normalized = stringFromUnknown(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .slice(0, limits.shortText);
  return lucideIconPattern.test(normalized) ? normalized : "";
}