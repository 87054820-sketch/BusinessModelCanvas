import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { Lang, LocalizedLabel } from '@pingarden/shared';

/**
 * Per-canvas overrides for the manifest-supplied chart axis labels.
 *
 * Manifests in `packages/canvases/<id>/manifest.json` ship a default
 * `chart.yAxis.{label, lowLabel, highLabel}` set per canvas type, but
 * users running real-world strategy sessions invariably want to relabel
 * "投入 / 表现水平" to "客户感知价值" / "持有成本" / etc. This module
 * mirrors `xAxisItems.ts` — store user edits in the doc's `chartConfig`
 * Y.Map, fall back to the manifest when the override is missing.
 *
 * The Y.Map is keyed flat by `<labelKey>.<lang>` so each language can be
 * edited independently and the merge is partial (set zh, leave en
 * unchanged → still falls back to manifest.en for the en reader).
 */
export const CHART_CONFIG_KEY = 'chartConfig';

/**
 * The three editable label slots. The list is closed for now — when we
 * introduce additional editable knobs (custom yAxis min/max, a custom
 * X-axis title, etc.) they'll get their own keys and types here.
 */
export type ChartConfigLabelKey =
  | 'yAxisLabel'
  | 'yAxisLowLabel'
  | 'yAxisHighLabel';

export interface ChartConfigOverrides {
  yAxisLabel?: { en?: string; zh?: string };
  yAxisLowLabel?: { en?: string; zh?: string };
  yAxisHighLabel?: { en?: string; zh?: string };
}

/**
 * Returns the (lazily created) Y.Map root that holds all chartConfig
 * overrides. Lazy-create matches the convention used by `stickies.ts`
 * and friends — old docs without the key transparently get an empty map
 * the first time someone reads or writes.
 */
export function getChartConfigRoot(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(CHART_CONFIG_KEY);
}

function readOverrides(root: Y.Map<unknown>): ChartConfigOverrides {
  const out: ChartConfigOverrides = {};
  const keys: ChartConfigLabelKey[] = [
    'yAxisLabel',
    'yAxisLowLabel',
    'yAxisHighLabel',
  ];
  for (const k of keys) {
    const en = root.get(`${k}.en`);
    const zh = root.get(`${k}.zh`);
    if (typeof en === 'string' || typeof zh === 'string') {
      out[k] = {
        ...(typeof en === 'string' ? { en } : {}),
        ...(typeof zh === 'string' ? { zh } : {}),
      };
    }
  }
  return out;
}

/**
 * Subscribe to the chartConfig overrides. Returns a stable empty object
 * when the doc is null or the map is empty — the consumer
 * (ChartCanvasLayer / CanvasConfigInspector) just merges with manifest
 * defaults using `resolveChartLabel`.
 */
export function useChartConfig(doc: Y.Doc | null): ChartConfigOverrides {
  const [overrides, setOverrides] = useState<ChartConfigOverrides>({});
  useEffect(() => {
    if (!doc) {
      setOverrides({});
      return;
    }
    const root = getChartConfigRoot(doc);

    function snapshot() {
      setOverrides(readOverrides(root));
    }

    snapshot();
    root.observe(snapshot);
    return () => root.unobserve(snapshot);
  }, [doc]);

  return overrides;
}

/**
 * Patch one label slot for one language. Empty / whitespace-only values
 * are stored as the absence of the key (so the resolver falls back to
 * manifest), not as the empty string — that keeps "click input, hit
 * Enter without changing anything, blur" from accidentally clobbering a
 * meaningful label.
 */
export function updateChartConfigLabel(
  doc: Y.Doc,
  key: ChartConfigLabelKey,
  lang: Lang,
  value: string,
): void {
  const root = getChartConfigRoot(doc);
  const trimmed = value.trim();
  doc.transact(() => {
    if (trimmed.length === 0) {
      root.delete(`${key}.${lang}`);
    } else {
      root.set(`${key}.${lang}`, trimmed);
    }
  });
}

/**
 * Resolve one label for rendering. Order:
 *   1. Override in the active lang.
 *   2. Manifest in the active lang.
 *   3. Override in the other lang (so a user who only filled in zh still
 *      shows something on the en surface, instead of a blank).
 *   4. Manifest in the other lang.
 *   5. Empty string.
 *
 * Trim whitespace so accidental " " from the input doesn't render as a
 * label — but `updateChartConfigLabel` already prevents this on writes.
 */
export function resolveChartLabel(
  manifest: LocalizedLabel | undefined,
  override: { en?: string; zh?: string } | undefined,
  lang: Lang,
): string {
  const otherLang: Lang = lang === 'en' ? 'zh' : 'en';
  const candidates = [
    override?.[lang],
    manifest?.[lang],
    override?.[otherLang],
    manifest?.[otherLang],
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return '';
}
