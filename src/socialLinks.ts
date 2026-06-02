import { limits } from "./policy.js";
import { recordFromUnknown, stringFromUnknown } from "./values.js";

export type SocialLinkPlatformConfig = {
  id: string;
  label: string;
  icon?: { src: string };
  pattern: string;
  placeholder: string;
  baseUrl?: string;
};

export const socialLinkPlatforms = [
  {
    id: "website",
    label: "Website",
    pattern: "^[^\\s<>]+$",
    placeholder: "yourwebsite.com",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: { src: "https://cdn.simpleicons.org/instagram/E4405F" },
    baseUrl: "https://instagram.com/",
    pattern: "^[a-zA-Z0-9._]{1,30}$",
    placeholder: "username",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: { src: "https://cdn.simpleicons.org/tiktok" },
    baseUrl: "https://tiktok.com/@",
    pattern: "^[a-zA-Z0-9._]{2,24}$",
    placeholder: "username",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: { src: "https://cdn.simpleicons.org/youtube/FF0000" },
    baseUrl: "https://youtube.com/@",
    pattern: "^[a-zA-Z0-9._-]{3,30}$",
    placeholder: "channel",
  },
  {
    id: "twitch",
    label: "Twitch",
    icon: { src: "https://cdn.simpleicons.org/twitch/9146FF" },
    baseUrl: "https://twitch.tv/",
    pattern: "^[a-zA-Z0-9_]{4,25}$",
    placeholder: "username",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: { src: "https://cdn.simpleicons.org/pinterest/BD081C" },
    baseUrl: "https://pinterest.com/",
    pattern: "^[a-zA-Z0-9_-]{3,30}$",
    placeholder: "username",
  }
] as const satisfies readonly SocialLinkPlatformConfig[];

type SocialPlatform = (typeof socialLinkPlatforms)[number]["id"];
export type SocialLinks = Record<SocialPlatform, string>;

export const defaultSocialLinks: SocialLinks = {
  website: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  twitch: "",
  pinterest: ""
};

export class SocialLinkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialLinkValidationError";
  }
}

export function normalizeSocialLinks(input: Partial<Record<SocialPlatform, string>>) {
  const links = { ...defaultSocialLinks };
  for (const platform of socialLinkPlatforms) {
    links[platform.id] = normalizeSocialLink(platform, input[platform.id] ?? "");
  }
  return links;
}

export function normalizeStoredSocialLinks(input: unknown) {
  const record = recordFromUnknown(input);
  const links = { ...defaultSocialLinks };
  for (const platform of socialLinkPlatforms) {
    const value = stringFromUnknown(record[platform.id]);
    try {
      links[platform.id] = normalizeSocialLink(platform, value);
    } catch {
      links[platform.id] = "";
    }
  }
  return links;
}

export function hasSocialLinks(links: SocialLinks) {
  return socialLinkPlatforms.some((p) => Boolean(links[p.id]));
}

function normalizeSocialLink(platform: SocialLinkPlatformConfig, value: string) {
  let val = value.trim();
  if (!val) return "";
  
  if (platform.id === "website") {
    if (!/^https?:\/\//i.test(val)) val = `https://${val}`;
    try { 
      const url = new URL(val); 
      return url.href;
    } catch { 
      throw new SocialLinkValidationError("Please enter a valid website address."); 
    }
  }

  // Handle usernames: strip leading @ and base URLs if user pasted full links
  val = val.replace(/^@/, "");
  if (platform.baseUrl && val.includes(platform.baseUrl)) {
    val = val.replace(platform.baseUrl, "").split("/")[0].split("?")[0];
  }
  
  if (!new RegExp(platform.pattern).test(val)) {
    throw new SocialLinkValidationError(`Invalid ${platform.label} username.`);
  }
  return val;
}

function platformLabel(platform: string) {
  return socialLinkPlatforms.find((p) => p.id === platform)?.label ?? "Social";
}