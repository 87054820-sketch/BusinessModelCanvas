/**
 * Thin re-export shim for the Yjs encoders.
 *
 * The actual implementation lives in `packages/shared/src/yjs.ts` so
 * the CLI's case-authoring command can produce byte-identical
 * `live.ydoc` files without depending on the server. This shim keeps
 * existing server imports (`./collab/encoders`) working unchanged
 * while providing a single source of truth — there used to be a
 * "parallel implementation" comment here calling out the duplication
 * between this file and `apps/web/src/collab/*`. Now the parallel
 * lives in shared, and server + CLI both pull from there.
 *
 * The web client still has its own copies because it edits Yjs state
 * incrementally (one Y.Map mutation per keystroke), which is a
 * different shape than the bulk replace the encoder serves. If you
 * change a field on the web encoder, mirror it in
 * `packages/shared/src/yjs.ts` in the same commit.
 */

export {
  X_AXIS_ITEMS_KEY,
  getXAxisItemsRoot,
  makeXAxisItemYMap,
  readXAxisItem,
  PIN_CLASSES_KEY,
  getPinClassesRoot,
  makePinClassYMap,
  readPinClass,
  PINS_KEY,
  getPinsRoot,
  makePinYMap,
  readPin,
  CHART_CONFIG_KEY,
  getChartConfigRoot,
  readChartConfig,
  COLOR_LEGEND_KEY,
  getColorLegendRoot,
  readColorLegend,
  isStickyPaletteHex,
} from '@pingarden/shared/yjs';

export type {
  ChartConfigLabelKey,
  ChartConfigOverrides,
} from '@pingarden/shared/yjs';
