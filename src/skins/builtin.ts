import { readFileSync } from "node:fs";
import { cssCustomPropertyDeclarations } from "../theme/colorPalette.js";

const builtinSkinAuthor = {
  name: "my.quenq.com",
  url: "https://my.quenq.com"
} as const;

export type BuiltinSkinDefinition = {
  sourceKey: string;
  title: string;
  descriptionHtml: string;
  codeHtml: string;
};

type BuiltinSkinTheme = {
  accent: string;
  accentText: string;
  backdrop: string;
  chrome: string;
  chromeText: string;
  colorScheme: "light" | "dark";
  link: string;
  linkHover: string;
  muted: string;
  page: string;
  pageText: string;
  surface: string;
  surfaceLinkHover: string;
  surfaceText: string;
};

const lightTheme = {
  accent: "#43515e",
  accentText: "#ffffff",
  backdrop: "#e2e7ec",
  chrome: "#43515e",
  chromeText: "#ffffff",
  colorScheme: "light",
  link: "#2d353e",
  linkHover: "color-mix(in srgb, #2d353e 68%, #1a1a1a)",
  muted: "#5c6f82",
  page: "#ffffff",
  pageText: "#1a1a1a",
  surface: "#ffffff",
  surfaceLinkHover: "color-mix(in srgb, #2d353e 68%, #1a1a1a)",
  surfaceText: "#1a1a1a"
} satisfies BuiltinSkinTheme;

const darkTheme = {
  accent: "#43515e",
  accentText: "#ffffff",
  backdrop: "#171c20",
  chrome: "#43515e",
  chromeText: "#ffffff",
  colorScheme: "dark",
  link: "#a4b9be",
  linkHover: "color-mix(in srgb, #a4b9be 68%, #f0f0f0)",
  muted: "#5c6f82",
  page: "#171c20",
  pageText: "#f0f0f0",
  surface: "#22282f",
  surfaceLinkHover: "color-mix(in srgb, #a4b9be 68%, #f0f0f0)",
  surfaceText: "#f0f0f0"
} satisfies BuiltinSkinTheme;

const builtinExampleSkins = [
  {
    sourceKey: "spacehey.scenecore-emo-layout",
    title: "Scenecore emo layout",
    file: "scenecore-emo-layout.html",
    creditName: "TheJasmineSixx / LunaGloomyCore",
    creditUrl: "https://layouts.spacehey.com/layout?id=611"
  },
  {
    sourceKey: "spacehey.round-profile-photo",
    title: "Round profile photo",
    file: "round-profile-photo.html",
    creditName: "fini hoover :3",
    creditUrl: "https://layouts.spacehey.com/layout?id=31074"
  },
  {
    sourceKey: "spacehey.spinning-round-profile-photo",
    title: "Spinning round profile photo",
    file: "spinning-round-profile-photo.html",
    creditName: "fini hoover :3",
    creditUrl: "https://layouts.spacehey.com/layout?id=31074"
  },
  {
    sourceKey: "spacehey.pink-internetcore-anime",
    title: "Pink internetcore anime",
    file: "pink-internetcore-anime.html",
    creditName: "sybilz layouts",
    creditUrl: "https://layouts.spacehey.com/layout?id=24152"
  },
  {
    sourceKey: "spacehey.fly-away",
    title: "Fly away",
    file: "fly-away.html",
    creditName: "leo",
    creditUrl: "https://layouts.spacehey.com/layout?id=3840"
  },
  {
    sourceKey: "spacehey.windows-xp",
    title: "Windows XP",
    file: "windows-xp.html",
    creditName: "Cory",
    creditUrl: "https://layouts.spacehey.com/layout?id=1169"
  },
  {
    sourceKey: "spacehey.cd-case-profile-photo",
    title: "CD case profile photo",
    file: "cd-case-profile-photo.html",
    creditName: "Valentine",
    creditUrl: "https://layouts.spacehey.com/layout?id=29048"
  },
  {
    sourceKey: "spacehey.black-and-grey",
    title: "Black and grey",
    file: "black-and-grey.html",
    creditName: "Bela",
    creditUrl: "https://layouts.spacehey.com/layout?id=2719"
  },
  {
    sourceKey: "spacehey.old-school-computer-bezel",
    title: "Old-school computer with bezel",
    file: "old-school-computer-bezel.html",
    creditName: "Cory",
    creditUrl: "https://layouts.spacehey.com/layout?id=133"
  },
  {
    sourceKey: "spacehey.hello-kitty",
    title: "Hello Kitty",
    file: "hello-kitty.html",
    creditName: "madnes",
    creditUrl: "https://layouts.spacehey.com/layout?id=19476"
  },
  {
    sourceKey: "spacehey.red-web-glitchcore",
    title: "Red web / glitchcore",
    file: "red-web-glitchcore.html",
    creditName: "sybilz layouts",
    creditUrl: "https://layouts.spacehey.com/layout?id=23505"
  },
  {
    sourceKey: "spacehey.matrix",
    title: "Matrix",
    file: "matrix.html",
    creditName: "p0libius",
    creditUrl: "https://layouts.spacehey.com/layout?id=1430"
  },
  {
    sourceKey: "spacehey.windows-98",
    title: "Windows 98",
    file: "windows-98.html",
    creditName: "Angel Is Pretty. Odd.",
    creditUrl: "https://layouts.spacehey.com/layout?id=4188"
  },
  {
    sourceKey: "spacehey.glossy-dark",
    title: "Glossy dark",
    file: "glossy-dark.html",
    creditName: "mori",
    creditUrl: "https://layouts.spacehey.com/layout?id=24806"
  },
  {
    sourceKey: "spacehey.windows-vista",
    title: "Windows Vista",
    file: "windows-vista.html",
    creditName: "aoife☆",
    creditUrl: "https://layouts.spacehey.com/layout?id=39825"
  }
] as const;

export const builtinSkinDefinitions = [
  {
    sourceKey: "quenq.light",
    title: "quenq",
    descriptionHtml: "The default my quenq light theme for profile pages.",
    codeHtml: skinCodeFromTheme(lightTheme)
  },
  {
    sourceKey: "quenq.dark",
    title: "quenq (dark)",
    descriptionHtml: "The default my quenq dark theme for profile pages.",
    codeHtml: skinCodeFromTheme(darkTheme)
  },
  ...builtinExampleSkins.map(exampleSkinDefinition)
] satisfies readonly BuiltinSkinDefinition[];

const builtinSkinSourceKeys = new Set<string>(builtinSkinDefinitions.map((skin) => skin.sourceKey));

export function builtinSkinAttribution(sourceKey: string | null | undefined) {
  return sourceKey && builtinSkinSourceKeys.has(sourceKey) ? builtinSkinAuthor : null;
}

export function builtinSkinOrderSql(column = "source_key") {
  const cases = builtinSkinDefinitions
    .map((skin, index) => `WHEN '${sqlString(skin.sourceKey)}' THEN ${index}`)
    .join(" ");
  return `CASE ${column} ${cases} ELSE ${builtinSkinDefinitions.length} END`;
}

function skinCodeFromTheme(theme: BuiltinSkinTheme) {
  const variables = {
    "skin-palette-accent": theme.accent,
    "skin-palette-accent-text": theme.accentText,
    "skin-palette-backdrop": theme.backdrop,
    "skin-palette-chrome": theme.chrome,
    "skin-palette-chrome-text": theme.chromeText,
    "skin-palette-link": theme.link,
    "skin-palette-link-hover": theme.linkHover,
    "skin-palette-muted": theme.muted,
    "skin-palette-page": theme.page,
    "skin-palette-page-text": theme.pageText,
    "skin-palette-surface": theme.surface,
    "skin-palette-surface-link-hover": theme.surfaceLinkHover,
    "skin-palette-surface-text": theme.surfaceText
  };
  return [
    "<style>",
    "[data-skin-page]{",
    `  color-scheme:${theme.colorScheme};`,
    cssCustomPropertyDeclarations(variables).join("\n"),
    "}",
    "</style>"
  ].join("\n");
}

function exampleSkinDefinition(skin: (typeof builtinExampleSkins)[number]): BuiltinSkinDefinition {
  return {
    sourceKey: skin.sourceKey,
    title: skin.title,
    descriptionHtml: originalCreditDescription(skin.creditName, skin.creditUrl),
    codeHtml: readExampleSkinCode(skin.file)
  };
}

function originalCreditDescription(name: string, url: string) {
  return [
    "<p>Original SpaceHey layout credit:",
    `<br>${escapeHtml(name)}`,
    `<br><a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`,
    "</p>"
  ].join("");
}

function readExampleSkinCode(file: string) {
  const html = readFileSync(new URL(`../../docs/skin-examples/${file}`, import.meta.url), "utf8");
  return html.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sqlString(value: string) {
  return value.replace(/'/g, "''");
}
