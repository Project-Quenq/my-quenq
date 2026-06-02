// Folds text before automod matching so substitution tricks do not slip past
// rules. NFKD plus stripping combining marks and zero-width chars handles
// most Unicode lookalikes; the homoglyph table catches glyphs that survive
// normalization (Cyrillic \u0430, Greek \u03B1, etc.); the leetspeak table handles
// digit and symbol swaps (4 to a, 1 to i, $ to s). Each scan emits several
// variants (folded, squeezed, compact) so one rule matches across all of
// them. Pruning entries from these tables weakens the bypass coverage.

const zeroWidthPattern = /[\u200B-\u200F\uFEFF]/g;
const combiningMarksPattern = /\p{Mark}/gu;
const nonAutomodTokenPattern = /[^a-z0-9]+/g;
const repeatedAutomodCharPattern = /([a-z0-9])\1{2,}/g;

const homoglyphs: Record<string, string> = {
  "Α": "a",
  "α": "a",
  "А": "a",
  "а": "a",
  "ɑ": "a",
  "Β": "b",
  "β": "b",
  "В": "b",
  "Ь": "b",
  "Ƅ": "b",
  "ϲ": "c",
  "С": "c",
  "с": "c",
  "ԁ": "d",
  "Ε": "e",
  "ε": "e",
  "Е": "e",
  "е": "e",
  "Ϝ": "f",
  "ɡ": "g",
  "Η": "h",
  "η": "h",
  "Н": "h",
  "һ": "h",
  "Ι": "i",
  "ι": "i",
  "І": "i",
  "і": "i",
  "Ј": "j",
  "ј": "j",
  "Κ": "k",
  "к": "k",
  "К": "k",
  "κ": "k",
  "Μ": "m",
  "м": "m",
  "М": "m",
  "Ν": "n",
  "ν": "n",
  "О": "o",
  "Ο": "o",
  "ο": "o",
  "о": "o",
  "Ρ": "p",
  "ρ": "p",
  "Р": "p",
  "р": "p",
  "Տ": "s",
  "ѕ": "s",
  "Τ": "t",
  "т": "t",
  "Т": "t",
  "τ": "t",
  "υ": "u",
  "Χ": "x",
  "χ": "x",
  "Х": "x",
  "х": "x",
  "Υ": "y",
  "γ": "y",
  "у": "y",
  "Ζ": "z",
  "ζ": "z"
};

const leetspeak: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "(": "c",
  "3": "e",
  "6": "g",
  "9": "g",
  "!": "i",
  "1": "i",
  "|": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
  "2": "z"
};

const leetspeakWithTallGlyphsAsL: Record<string, string> = {
  ...leetspeak,
  "!": "l",
  "1": "l",
  "|": "l"
};

const regexSubstitutions: Record<string, string> = {
  a: "a@4",
  b: "b8",
  c: "c(",
  e: "e3",
  g: "g69",
  i: "i1!|",
  l: "l1!|",
  o: "o0",
  s: "s$5z2",
  t: "t7+",
  z: "z2"
};

export type AutomodScanText = {
  raw: string;
  folded: string;
  squeezed: string;
  compact: string;
  compactSqueezed: string;
  variants: string[];
};

export function createAutomodScanText(text: string): AutomodScanText {
  const raw = text.replace(/\s+/g, " ").trim();
  const folded = normalizeFoldedAutomodText(raw, leetspeak);
  const foldedTallGlyphsAsL = normalizeFoldedAutomodText(raw, leetspeakWithTallGlyphsAsL);
  const squeezed = folded.replace(repeatedAutomodCharPattern, "$1");
  const squeezedTallGlyphsAsL = foldedTallGlyphsAsL.replace(repeatedAutomodCharPattern, "$1");
  const compact = folded.replace(nonAutomodTokenPattern, "");
  const compactSqueezed = squeezed.replace(nonAutomodTokenPattern, "");
  const compactTallGlyphsAsL = foldedTallGlyphsAsL.replace(nonAutomodTokenPattern, "");
  const compactSqueezedTallGlyphsAsL = squeezedTallGlyphsAsL.replace(nonAutomodTokenPattern, "");
  const variants = uniqueAutomodTexts([
    raw,
    folded,
    squeezed,
    compact,
    compactSqueezed,
    foldedTallGlyphsAsL,
    squeezedTallGlyphsAsL,
    compactTallGlyphsAsL,
    compactSqueezedTallGlyphsAsL
  ]);
  return { raw, folded, squeezed, compact, compactSqueezed, variants };
}

export function automodLiteralPattern(literal: string) {
  const words = createAutomodScanText(literal).folded.split(" ").filter(Boolean);
  if (!words.length) return "(?!)";
  const pattern = words.map(evasiveWordPattern).join("[^a-z0-9]*");
  return `(?:^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`;
}

function normalizeFoldedAutomodText(text: string, leetspeakMap: Record<string, string>) {
  return foldAutomodText(text, leetspeakMap).replace(nonAutomodTokenPattern, " ").trim();
}

function foldAutomodText(text: string, leetspeakMap: Record<string, string>) {
  return Array.from(
    text
      .normalize("NFKC")
      .normalize("NFKD")
      .replace(combiningMarksPattern, "")
      .replace(zeroWidthPattern, "")
      .toLowerCase()
  )
    .map((char) => leetspeakMap[char] ?? homoglyphs[char] ?? char)
    .join("");
}

function evasiveWordPattern(word: string) {
  return Array.from(word).map(evasiveCharPattern).join("[^a-z0-9]*");
}

function evasiveCharPattern(char: string) {
  const substitutions = regexSubstitutions[char];
  if (!substitutions) return `${escapeRegex(char)}+`;
  return `[${escapeRegexCharClass(substitutions)}]+`;
}

function escapeRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function escapeRegexCharClass(value: string) {
  return value.replace(/[\\\]^$-]/g, "\\$&");
}

function uniqueAutomodTexts(texts: string[]) {
  return Array.from(new Set(texts));
}
