import {
  colorPaletteFromForm,
  colorPaletteJson,
  defaultColorPalette,
  isDefaultColorPalette,
  parseColorPaletteJson,
  type ColorPalette
} from "../../theme/colorPalette.js";
import type { BrandingSettings } from "../../settings/branding.js";
import { deleteSetting, saveSetting, settingRow } from "./settings.js";

const brandingPaletteKey = "branding.palette";

export function brandingSettings(): BrandingSettings {
  const row = settingRow(brandingPaletteKey);
  const palette = parseColorPaletteJson(row?.value) ?? defaultColorPalette;
  const customized = Boolean(row) && !isDefaultColorPalette(palette);
  return {
    customized,
    palette,
    updatedAt: customized ? row?.updatedAt ?? null : null
  };
}

export function brandingPaletteFromForm(form: Record<string, unknown>) {
  return colorPaletteFromForm(form, brandingSettings().palette);
}

export function saveBrandingPalette(palette: ColorPalette) {
  if (isDefaultColorPalette(palette)) {
    resetBrandingPalette();
    return;
  }
  saveSetting(brandingPaletteKey, colorPaletteJson(palette));
}

export function resetBrandingPalette() {
  deleteSetting(brandingPaletteKey);
}
