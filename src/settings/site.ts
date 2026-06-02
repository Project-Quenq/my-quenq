import { brandIconShapeSvg, brandIconSvg } from "../brand.js";
import { colorPaletteTokens, defaultColorPalette, mixColor, type ColorPalette } from "../theme/colorPalette.js";

export type SiteIdentitySettings = {
  name: string;
  tagline: string;
  headerIconName: string;
  headerIconSvg: string;
};

export type SiteHomeSettings = {
  announcement: string;
  welcomeText: string;
};

export type SiteContactSettings = {
  email: string;
  companyName: string;
  mailingAddress: string;
};

export type SiteRegistrationSettings = {
  blockedCountries: string;
};

export type SiteSettings = {
  identity: SiteIdentitySettings;
  home: SiteHomeSettings;
  contact: SiteContactSettings;
  registration: SiteRegistrationSettings;
  updatedAt: string | null;
};

export const defaultHeaderIconName = "brand";

export const defaultHeaderIconSvg = brandIconSvg;

export const defaultSiteSettings = {
  identity: {
    name: "my quenq",
    tagline: "your corner of the retro web",
    headerIconName: defaultHeaderIconName,
    headerIconSvg: defaultHeaderIconSvg
  },
  home: {
    announcement: "Welcome to my quenq! Claim your unique handle, design your profile page with custom HTML/CSS, and join our quiet corner of the retro web, free from feed algorithms and AI slop.",
    welcomeText: "Welcome to my quenq, a creative, nostalgic web community inspired by the early days of the internet. It is a quiet space to express yourself, write blogs, and connect with friends."
  },
  contact: {
    email: "support@quenq.com",
    companyName: "Quenq",
    mailingAddress: ""
  },
  registration: {
    blockedCountries: ""
  },
  updatedAt: null
} satisfies SiteSettings;

const appIconSize = 1024;

export function siteFaviconSvg(settings: SiteSettings, palette: ColorPalette = defaultColorPalette) {
  if (settings.identity.headerIconName === defaultHeaderIconName) {
    return brandIconSvg;
  }
  
  const background = mixColor(palette.chrome, "#000000", 0.28);
  const iconColor = palette.chromeText;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">',
    `<circle cx="12" cy="12" r="11" fill="${background}" />`,
    `<g color="${iconColor}" fill="${iconColor}" stroke="${iconColor}">`,
    identityIconSvg(settings.identity.headerIconSvg, 3, 3, 18, 18),
    "</g>",
    "</svg>"
  ].join("");
}

export function siteAppIconSvg(settings: SiteSettings, palette: ColorPalette = defaultColorPalette) {
  if (settings.identity.headerIconName === defaultHeaderIconName) {
    return brandIconSvg.replace('viewBox="0 0 300 300"', `width="${appIconSize}" height="${appIconSize}" viewBox="0 0 300 300"`);
  }

  const background = mixColor(palette.chrome, "#000000", 0.28);
  const iconColor = palette.chromeText;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${appIconSize}" height="${appIconSize}" viewBox="0 0 ${appIconSize} ${appIconSize}" aria-hidden="true">`,
    `<rect width="${appIconSize}" height="${appIconSize}" fill="${background}" />`,
    `<g color="${iconColor}" fill="${iconColor}" stroke="${iconColor}">`,
    identityIconSvg(settings.identity.headerIconSvg, 128, 128, 768, 768),
    "</g>",
    "</svg>"
  ].join("");
}

function identityIconSvg(svg: string, x: number, y: number, width: number, height: number) {
  return svg
    .replace(/\swidth="[^"]*"/i, "")
    .replace(/\sheight="[^"]*"/i, "")
    .replace("<svg", `<svg x="${x}" y="${y}" width="${width}" height="${height}"`);
}