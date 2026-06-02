import { recordFromUnknown, stringFromUnknown } from "../values.js";

export const colorPaletteTokens = ["chrome", "chromeText", "accent", "accentText", "link", "backdrop", "page", "surface"] as const;

export type ColorPaletteToken = (typeof colorPaletteTokens)[number];
export type ColorPalette = Record<ColorPaletteToken, string>;

export const colorPaletteLabels = {
  chrome: "Header",
  chromeText: "Header text",
  accent: "Accent",
  accentText: "Accent text",
  link: "Link",
  backdrop: "Backdrop",
  page: "Page",
  surface: "Panel"
} satisfies Record<ColorPaletteToken, string>;

export const defaultColorPalette = {
  chrome: "#43515e",
  chromeText: "#ffffff",
  accent: "#43515e",
  accentText: "#ffffff",
  link: "#2d353e",
  backdrop: "#e2e7ec",
  page: "#ffffff",
  surface: "#ffffff"
} satisfies ColorPalette;

type Rgb = { r: number; g: number; b: number };

const colorInputPrefix = "color_";
const hexPattern = /^#[0-9a-f]{6}$/i;

export function colorPaletteFieldName(token: ColorPaletteToken) {
  return `${colorInputPrefix}${token}`;
}

export function colorPaletteFromForm(form: Record<string, unknown>, fallback: ColorPalette = defaultColorPalette): ColorPalette {
  return colorPaletteTokens.reduce((colors, token) => {
    colors[token] = normalizeHex(stringFromUnknown(form[colorPaletteFieldName(token)]), fallback[token]);
    return colors;
  }, { ...fallback });
}

export function colorPaletteFromCssVariables(
  css: string,
  aliases: Record<ColorPaletteToken, readonly string[]>,
  fallback: ColorPalette = defaultColorPalette
): ColorPalette {
  return colorPaletteTokens.reduce((colors, token) => {
    colors[token] = normalizeHex(firstSavedVariable(css, aliases[token]), fallback[token]);
    return colors;
  }, { ...fallback });
}

export function parseColorPaletteJson(value: string | null | undefined): ColorPalette | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = recordFromUnknown(parsed);
    return colorPaletteTokens.reduce((colors, token) => {
      colors[token] = normalizeHex(stringFromUnknown(record[token]), defaultColorPalette[token]);
      return colors;
    }, { ...defaultColorPalette });
  } catch {
    return null;
  }
}

export function colorPaletteJson(palette: ColorPalette) {
  const stored = { ...defaultColorPalette };
  for (const token of colorPaletteTokens) {
    stored[token] = normalizeHex(palette[token], defaultColorPalette[token]);
  }
  return JSON.stringify(stored);
}

function colorPalettesEqual(left: ColorPalette, right: ColorPalette) {
  return colorPaletteTokens.every((token) => normalizeHex(left[token], defaultColorPalette[token]) === normalizeHex(right[token], defaultColorPalette[token]));
}

export function isDefaultColorPalette(palette: ColorPalette) {
  return colorPalettesEqual(palette, defaultColorPalette);
}

export function deriveColorPalette(source: ColorPalette) {
  const pageText = readableText(source.page);
  const surfaceText = readableText(source.surface);
  const chrome = source.chrome;

  return {
    accent: source.accent,
    accentText: source.accentText,
    backdrop: source.backdrop,
    chrome,
    chromeText: source.chromeText,
    muted: mixColor(surfaceText, source.surface, 0.42),
    page: source.page,
    pageLink: source.link,
    pageLinkHover: readableAccent(mixColor(source.link, pageText, 0.35), source.page),
    pageText,
    surface: source.surface,
    surfaceLink: source.link,
    surfaceLinkHover: readableAccent(mixColor(source.link, surfaceText, 0.35), source.surface),
    surfaceText
  };
}

export function cssCustomPropertyDeclarations(variables: Record<string, string>) {
  return Object.entries(variables).map(([name, value]) => `  --${name}:${value};`);
}

function normalizeHex(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase();
  return hexPattern.test(normalized) ? normalized : fallback;
}

function savedVariable(css: string, variable: string) {
  const match = new RegExp(`--${variable}\\s*:\\s*(#[0-9a-f]{6})\\b`, "i").exec(css);
  return match ? match[1] : "";
}

function firstSavedVariable(css: string, variables: readonly string[]) {
  for (const variable of variables) {
    const value = savedVariable(css, variable);
    if (value) return value;
  }
  return "";
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): Rgb {
  const value = hexPattern.test(hex) ? hex.slice(1) : "000000";
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(color: Rgb) {
  return `#${[color.r, color.g, color.b].map((channel) => clamp(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function mixColor(color: string, target: string, amount: number) {
  const left = hexToRgb(color);
  const right = hexToRgb(target);
  return rgbToHex({
    r: left.r + (right.r - left.r) * amount,
    g: left.g + (right.g - left.g) * amount,
    b: left.b + (right.b - left.b) * amount
  });
}

export function headerChromeColor(palette: Pick<ColorPalette, "chrome">) {
  return mixColor(palette.chrome, "#000000", 0.28);
}

function luminance(hex: string) {
  const color = hexToRgb(hex);
  const [red, green, blue] = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrast(foreground: string, background: string) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function readableText(background: string) {
  return contrast("#111111", background) >= contrast("#ffffff", background) ? "#111111" : "#ffffff";
}

function readableAccent(accent: string, background: string) {
  if (contrast(accent, background) >= 4.5) return accent;
  let best = readableText(background);
  let bestRatio = contrast(best, background);

  for (const target of ["#000000", "#ffffff"]) {
    for (let step = 1; step <= 8; step += 1) {
      const candidate = mixColor(accent, target, step / 10);
      const ratio = contrast(candidate, background);
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
      if (ratio >= 4.5) break;
    }
  }

  return best;
}
