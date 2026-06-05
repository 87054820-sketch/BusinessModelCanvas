/**
 * Sticky note colour palette — soft pastels.
 *
 * Source of truth: `packages/shared/src/index.ts`. The palette lives in the
 * shared package so server-side validators (e.g. the Y.Doc colourLegend
 * encoder) can constrain stored hex keys to the same set the web client
 * paints with. This module re-exports the constants to keep web-side
 * imports stable.
 *
 * Design notes (kept here so they don't bleed into the server bundle):
 *   - High lightness (≈ 87–90%) keeps dense boards calm.
 *   - Adjacent hues spaced ≈ 60° apart on the colour wheel so the six
 *     swatches stay distinguishable at a glance.
 *   - Semantic-free by design: teams agree their own per-canvas mapping
 *     via the StickyLegendPalette overlay (top-right of the canvas) and
 *     CanvasConfigInspector → Sticky color legend section.
 */
export {
  STICKY_PALETTE,
  DEFAULT_STICKY_COLOR,
  type StickyColor,
} from '@canvas-collab/shared';
