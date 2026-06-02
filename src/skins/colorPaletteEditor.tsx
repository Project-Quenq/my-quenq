import {
  skinColorGenerateIntent,
  skinColorIntentField,
  skinColorPaletteFromHtml
} from "./colorPalette.js";
import { ColorSwatches, colorSwatchesStylesheet } from "../ui/colorSwatches.js";
import { FormActions } from "../ui/forms.js";
import type { ColorPalette } from "../theme/colorPalette.js";

export { colorSwatchesStylesheet as skinColorPaletteEditorStylesheet };

export function SkinColorPaletteEditor({ codeHtml, fallback }: { codeHtml?: string; fallback?: ColorPalette }) {
  const palette = skinColorPaletteFromHtml(codeHtml, fallback);
  return (
    <div class="color-swatch-stack">
      <ColorSwatches palette={palette} />
      <FormActions>
        <button type="submit" class="button--secondary" name={skinColorIntentField} value={skinColorGenerateIntent} formnovalidate>
          Generate color skin
        </button>
      </FormActions>
    </div>
  );
}
