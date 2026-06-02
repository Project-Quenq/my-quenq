import { truncateText } from "../text.js";
import { headerChromeColor, type ColorPalette } from "../theme/colorPalette.js";
import type { SiteSettings } from "./site.js";
import { brandIconShapeSvg } from "../brand.js";

export const defaultSocialImagePath = "/og-image.png";
export const socialImageSize = {
  width: 1200,
  height: 630
} as const;

export type JsonLd = Record<string, unknown>;

export type PageSeo = {
  canonicalPath?: string;
  description?: string;
  imageAlt?: string;
  imagePath?: string;
  jsonLd?: JsonLd | JsonLd[];
  modifiedTime?: string;
  noindex?: boolean;
  publishedTime?: string;
  title?: string;
  type?: "article" | "profile" | "website";
};

export function siteSeoDescription(settings: SiteSettings) {
  return seoText(settings.home.welcomeText || siteMarketingDescription(settings), 180);
}

export function siteMarketingDescription(settings: Pick<SiteSettings, "identity">) {
  const name = settings.identity.name.trim() || "my quenq";
  return `${name} is a nostalgic social network inspired by the early days of the web.`;
}

export function seoText(input: string, maxLength = 180) {
  return truncateText(input.replace(/\s+/g, " ").trim(), maxLength);
}

export function siteSocialImageAlt(settings: SiteSettings) {
  return `${settings.identity.name} social preview`;
}

export function siteStructuredData(settings: SiteSettings, siteUrl: string, imageUrl: string): JsonLd[] {
  const organization = organizationStructuredData(settings, siteUrl);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: settings.identity.name,
      description: siteSeoDescription(settings),
      url: siteUrl,
      image: imageUrl,
      ...(organization ? { publisher: { "@id": organization["@id"] } } : {})
    },
    ...(organization ? [organization] : [])
  ];
}

export function siteWebManifest(settings: SiteSettings, palette: ColorPalette) {
  return JSON.stringify(
    {
      name: settings.identity.name,
      short_name: truncateText(settings.identity.name, 24),
      description: siteSeoDescription(settings),
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: palette.page,
      theme_color: headerChromeColor(palette),
      icons: [
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-1024.png", sizes: "1024x1024", type: "image/png" }
      ]
    },
    null,
    2
  );
}

export function siteSocialPreviewSvg(settings: SiteSettings, palette: ColorPalette) {
  const background = headerChromeColor(palette);
  const foreground = palette.chromeText;
  const name = settings.identity.name || "my quenq";
  const tagline = settings.identity.tagline || "";

  // Scaled up to fill the empty visual space
  const nameSize = 105;
  const taglineSize = 38;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${xmlAttribute(siteSocialImageAlt(settings))}">`,
    `<rect width="1200" height="630" fill="${background}" />`,
    
    // Shifted logo slightly right (from 80 to 120) for better centering
    `<g transform="translate(120, 165)">`,
    brandIconShapeSvg,
    `</g>`,
    
    // Text block starting at X=500 (previously 480) to perfectly balance the margins
    `<text x="500" y="305" fill="${foreground}" font-family="Verdana, Arial, sans-serif" font-size="${nameSize}" font-weight="700">${xmlText(name)}</text>`,
    
    `<text x="500" y="375" fill="${foreground}" fill-opacity="0.8" font-family="Verdana, Arial, sans-serif" font-size="${taglineSize}" font-weight="400">${xmlText(tagline)}</text>`,
    
    `</svg>`
  ].join("");
}

function organizationStructuredData(settings: SiteSettings, siteUrl: string): JsonLd | null {
  const name = settings.contact.companyName.trim();
  if (!name) return null;
  return {
    "@context": "https://schema.org",
    "@id": `${siteUrl}#organization`,
    "@type": "Organization",
    name,
    url: siteUrl,
    ...(settings.contact.email ? { email: settings.contact.email } : {})
  };
}

function fittedFontSize(text: string, base: number, minimum: number, comfortableCharacters: number) {
  if (text.length <= comfortableCharacters) return base;
  return Math.max(minimum, Math.floor(base * (comfortableCharacters / text.length)));
}

function xmlText(input: string) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function xmlAttribute(input: string) {
  return xmlText(input).replace(/"/g, "&quot;");
}