import {
  colorPaletteFromCssVariables,
  colorPaletteFromForm,
  cssCustomPropertyDeclarations,
  deriveColorPalette,
  headerChromeColor,
  type ColorPalette,
  type ColorPaletteToken
} from "../theme/colorPalette.js";
import { stringFromUnknown } from "../values.js";

export const skinColorIntentField = "intent";
export const skinColorGenerateIntent = "generate-skin";

const skinColorPaletteAliases = {
  accent: ["skin-palette-accent", "skin-accent"],
  accentText: ["skin-palette-accent-text", "skin-accent-text"],
  chrome: ["skin-palette-chrome", "skin-panel-heading-background"],
  chromeText: ["skin-palette-chrome-text", "skin-panel-heading-text"],
  link: ["skin-palette-link", "skin-link"],
  backdrop: ["skin-palette-backdrop", "skin-backdrop"],
  page: ["skin-palette-page", "skin-background"],
  surface: ["skin-palette-surface", "skin-panel-background"]
} satisfies Record<ColorPaletteToken, readonly string[]>;

export function isSkinColorGenerateIntent(form: Record<string, unknown>) {
  return stringFromUnknown(form[skinColorIntentField]) === skinColorGenerateIntent;
}

export function skinColorPaletteFromHtml(code = "", fallback?: ColorPalette) {
  return colorPaletteFromCssVariables(code, skinColorPaletteAliases, fallback);
}

export function skinBrowserThemeColorFromHtml(code = "", fallback?: ColorPalette) {
  return headerChromeColor(skinColorPaletteFromHtml(code, fallback));
}

export function skinStyleCodeFromColorForm(form: Record<string, unknown>, fallback?: ColorPalette) {
  return skinStyleCodeFromColorPalette(colorPaletteFromForm(form, fallback));
}

function skinStyleCodeFromColorPalette(source: ColorPalette) {
  const colors = deriveColorPalette(source);
  const variables = {
    "skin-palette-accent": source.accent,
    "skin-palette-accent-text": source.accentText,
    "skin-palette-chrome": source.chrome,
    "skin-palette-chrome-text": source.chromeText,
    "skin-palette-link": source.link,
    "skin-palette-link-hover": colors.pageLinkHover,
    "skin-palette-muted": colors.muted,
    "skin-palette-backdrop": source.backdrop,
    "skin-palette-page": source.page,
    "skin-palette-page-text": colors.pageText,
    "skin-palette-surface": source.surface,
    "skin-palette-surface-link-hover": colors.surfaceLinkHover,
    "skin-palette-surface-text": colors.surfaceText
  };
  return [
    "<style>",
    "[data-skin-page]{",
    cssCustomPropertyDeclarations(variables).join("\n"),
    "}",
    "</style>"
  ].join("\n");
}
