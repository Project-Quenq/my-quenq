import type { ColorPalette } from "../theme/colorPalette.js";

export type BrandingSettings = {
  customized: boolean;
  palette: ColorPalette;
  updatedAt: string | null;
};
