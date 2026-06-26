import * as Y from 'yjs';
import type { CanvasDef, Lang, ZoneDef } from '@pingarden/shared';
import { AxisGridLayer } from './axisGrid/AxisGridLayer';
import { ChartCanvasLayer } from './chartCanvas/ChartCanvasLayer';

/**
 * Props every plugin layer receives. Adding a prop here is a contract
 * change — bump every plugin in this file at the same time.
 *
 * `doc` may be null briefly while the Yjs document is hydrating; plugins
 * must tolerate it (render nothing, or empty defaults).
 */
export interface PluginProps {
  def: CanvasDef;
  zones: readonly ZoneDef[];
  lang: Lang;
  doc: Y.Doc | null;
  /**
   * SVG-coord-mapping helper used by interactive plugins (e.g. drag a
   * chart point). Mirrors the helper passed into `<CanvasRenderer>`'s
   * children render-prop.
   */
  toSvgPoint?: (
    ev: PointerEvent | React.PointerEvent,
  ) => { x: number; y: number } | null;
  /** Display name credited as the actor on writes. */
  displayName: string;
}

/**
 * Plugin registry. Every plugin id declared in `PluginId`
 * (`packages/shared/src/index.ts`) MUST have a renderer mapped here, and
 * the server's manifest validator
 * (`apps/server/src/canvasDefs/loader.ts`) MUST list the same ids in its
 * Zod enum. These three places are the contract: shared types, this map,
 * server validator. Out of sync = a manifest can pass server validation
 * but render as a hole in the canvas.
 *
 * Add a new plugin = three edits, one folder under `apps/web/src/plugins/`,
 * one Zod-enum line on the server.
 */
export const pluginRegistry: Record<
  string,
  React.FC<PluginProps>
> = {
  'axis-grid': AxisGridAdapter,
  'chart-canvas': ChartCanvasLayer,
};

/**
 * AxisGridLayer pre-dates the unified `PluginProps` shape — it only
 * needs `{zones, lang}`. Adapter shim keeps the registry signature
 * uniform without forcing every read-only plugin to take the wider
 * prop set.
 */
function AxisGridAdapter({ zones, lang }: PluginProps) {
  return <AxisGridLayer zones={zones} lang={lang} />;
}
