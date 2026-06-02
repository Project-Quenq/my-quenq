import type { Hono } from "hono";
import { themeCssFromPalette } from "../../theme/themeCss.js";
import { brandingSettings } from "../../server/db/branding.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { brandAssetFile, type BrandAssetName } from "../../server/branding/assets.js";
import type { AppBindings, AppContext } from "../../server/context.js";

export function registerBrandingRoutes(app: Hono<AppBindings>) {
  app.get("/branding.css", (c) => {
    const branding = brandingSettings();
    c.header("Content-Type", "text/css; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(branding.customized ? themeCssFromPalette(branding.palette) : "");
  });
  app.get("/favicon.svg", (c) => {
    return brandAssetResponse(c, "favicon.svg");
  });
  app.get("/og-image.svg", (c) => {
    return brandAssetResponse(c, "og-image.svg");
  });
  app.get("/og-image.png", (c) => brandAssetResponse(c, "og-image.png"));
  app.get("/apple-touch-icon.png", (c) => brandAssetResponse(c, "apple-touch-icon.png"));
  app.get("/icon-192.png", (c) => brandAssetResponse(c, "icon-192.png"));
  app.get("/icon-512.png", (c) => brandAssetResponse(c, "icon-512.png"));
  app.get("/icon-1024.png", (c) => brandAssetResponse(c, "icon-1024.png"));
  app.get("/site.webmanifest", (c) => {
    return brandAssetResponse(c, "site.webmanifest");
  });
}

async function brandAssetResponse(c: AppContext, filename: BrandAssetName) {
  const branding = brandingSettings();
  const settings = siteSettings();
  const asset = await brandAssetFile(filename, settings, branding.palette);
  c.header("Content-Type", asset.contentType);
  c.header("Cache-Control", "no-store");
  return c.body(asset.content);
}
