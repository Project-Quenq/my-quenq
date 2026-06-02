import { cssCustomPropertyDeclarations, deriveColorPalette, type ColorPalette } from "./colorPalette.js";

export function themeCssFromPalette(palette: ColorPalette) {
  const colors = deriveColorPalette(palette);
  const variables = {
    "app-theme-backdrop": colors.backdrop,
    "app-theme-page": colors.page,
    "app-theme-surface": colors.surface,
    "app-theme-chrome": colors.chrome,
    "app-theme-chrome-text": colors.chromeText,
    "app-theme-accent": colors.accent,
    "app-theme-accent-text": colors.accentText,
    "app-theme-link": colors.pageLink,
    "app-theme-link-hover": colors.pageLinkHover,
    "app-theme-surface-link": colors.surfaceLink,
    "app-theme-surface-link-hover": colors.surfaceLinkHover,
    "app-theme-page-text": colors.pageText,
    "app-theme-surface-text": colors.surfaceText,
    "app-theme-muted": colors.muted,
    "theme-backdrop": colors.backdrop,
    "theme-page": colors.page,
    "theme-surface": colors.surface,
    "theme-chrome": colors.chrome,
    "theme-chrome-text": colors.chromeText,
    "theme-accent": colors.accent,
    "theme-accent-text": colors.accentText,
    "theme-link": colors.pageLink,
    "theme-link-hover": colors.pageLinkHover,
    "theme-surface-link": colors.surfaceLink,
    "theme-surface-link-hover": colors.surfaceLinkHover,
    "theme-page-text": colors.pageText,
    "theme-surface-text": colors.surfaceText,
    "theme-muted": colors.muted
  };
  return `:root{\n${cssCustomPropertyDeclarations(variables).join("\n")}\n}\n`;
}
