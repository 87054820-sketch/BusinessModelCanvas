/**
 * Sticky note colour palette — soft pastels.
 *
 * Source of truth: `packages/shared/src/index.ts`. The palette lives in the
 * shared package so the server can validate `Project.colorLegend` keys
 * against the same set the web client paints with. This module re-exports
 * the constants to keep web-side imports stable.
 *
 * Design notes (kept here so they don't bleed into the server bundle):
 *   - High lightness (≈ 87–90%) keeps dense boards calm.
 *   - Adjacent hues spaced ≈ 60° apart on the colour wheel so the six
 *     swatches stay distinguishable at a glance.
 *   - Semantic-free by design: teams agree their own per-project mapping
 *     via the project-level "Color legend" feature.
 */
export {
  STICKY_PALETTE,
  DEFAULT_STICKY_COLOR,
  type StickyColor,
} from '@canvas-collab/shared';
