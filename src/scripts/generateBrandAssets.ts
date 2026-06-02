import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { brandAssetFiles, defaultBrandAssetDirectory } from "../server/branding/assets.js";
import { defaultSiteSettings } from "../settings/site.js";
import { defaultColorPalette } from "../theme/colorPalette.js";

const clean = process.argv.includes("--clean");

if (clean) {
  rmSync(defaultBrandAssetDirectory, { force: true, recursive: true });
  console.log(`Removed ${defaultBrandAssetDirectory}`);
} else {
  mkdirSync(defaultBrandAssetDirectory, { recursive: true });
  const files = await brandAssetFiles(defaultSiteSettings, defaultColorPalette);

  for (const file of files) {
    const path = join(defaultBrandAssetDirectory, file.filename);
    writeFileSync(path, file.content instanceof ArrayBuffer ? new Uint8Array(file.content) : file.content);
    console.log(`Generated ${path}`);
  }

  console.log(`Default brand assets are available at ${pathToFileURL(defaultBrandAssetDirectory).href}`);
}
