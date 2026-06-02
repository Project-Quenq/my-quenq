import sharp from "sharp";
import { defaultColorPalette, type ColorPalette } from "../../theme/colorPalette.js";
import { siteAppIconSvg, siteFaviconSvg, defaultSiteSettings, type SiteSettings } from "../../settings/site.js";
import { siteSocialPreviewSvg, siteWebManifest } from "../../settings/seo.js";

export const defaultBrandAssetDirectory = "public/static/brand";

export type BrandAssetName =
  | "apple-touch-icon.png"
  | "favicon.svg"
  | "icon-192.png"
  | "icon-1024.png"
  | "icon-512.png"
  | "og-image.png"
  | "og-image.svg"
  | "site.webmanifest";

type BrandAssetFile = {
  content: ArrayBuffer | string;
  contentType: string;
  filename: BrandAssetName;
};

const brandAssetContentTypes = {
  "apple-touch-icon.png": "image/png",
  "favicon.svg": "image/svg+xml; charset=utf-8",
  "icon-192.png": "image/png",
  "icon-1024.png": "image/png",
  "icon-512.png": "image/png",
  "og-image.png": "image/png",
  "og-image.svg": "image/svg+xml; charset=utf-8",
  "site.webmanifest": "application/manifest+json; charset=utf-8"
} satisfies Record<BrandAssetName, string>;

const brandAssetNames = Object.keys(brandAssetContentTypes) as BrandAssetName[];

export async function brandAssetFile(
  filename: BrandAssetName,
  settings: SiteSettings = defaultSiteSettings,
  palette: ColorPalette = defaultColorPalette
): Promise<BrandAssetFile> {
  return {
    content: await brandAssetContent(filename, settings, palette),
    contentType: brandAssetContentTypes[filename],
    filename
  };
}

export function brandAssetFiles(settings: SiteSettings = defaultSiteSettings, palette: ColorPalette = defaultColorPalette) {
  return Promise.all(brandAssetNames.map((filename) => brandAssetFile(filename, settings, palette)));
}

async function brandAssetContent(filename: BrandAssetName, settings: SiteSettings, palette: ColorPalette) {
  switch (filename) {
    case "apple-touch-icon.png":
      return pngFromSvg(siteAppIconSvg(settings, palette), 180);
    case "favicon.svg":
      return siteFaviconSvg(settings, palette);
    case "icon-192.png":
      return pngFromSvg(siteAppIconSvg(settings, palette), 192);
    case "icon-1024.png":
      return pngFromSvg(siteAppIconSvg(settings, palette), 1024);
    case "icon-512.png":
      return pngFromSvg(siteAppIconSvg(settings, palette), 512);
    case "og-image.png":
      return pngFromSvg(siteSocialPreviewSvg(settings, palette));
    case "og-image.svg":
      return siteSocialPreviewSvg(settings, palette);
    case "site.webmanifest":
      return siteWebManifest(settings, palette);
  }
}

async function pngFromSvg(svg: string, size?: number): Promise<ArrayBuffer> {
  const pipeline = sharp(Buffer.from(svg));
  const buffer = await (size ? pipeline.resize(size, size) : pipeline).png().toBuffer();
  return arrayBuffer(buffer);
}

function arrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes.buffer;
}
