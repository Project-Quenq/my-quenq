import {
  colorPaletteFieldName,
  colorPaletteLabels,
  colorPaletteTokens,
  type ColorPalette,
  type ColorPaletteToken
} from "../theme/colorPalette.js";

export const colorSwatchesStylesheet = "/static/css/components/color-swatches.css";

export function ColorSwatches({ palette }: { palette: ColorPalette }) {
  return (
    <div class="color-swatches">
      <div class="color-swatches__controls">
        {colorPaletteTokens.map((token) => (
          <ColorSwatch key={token} label={colorPaletteLabels[token]} token={token} value={palette[token]} />
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({ label, token, value }: { label: string; token: ColorPaletteToken; value: string }) {
  return (
    <label class="color-swatches__field">
      <span>{label}</span>
      <input type="color" name={colorPaletteFieldName(token)} value={value} />
    </label>
  );
}
