import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { CanvasDefaultColorLegendEntry, Lang } from '@pingarden/shared';
import { STICKY_PALETTE } from '@pingarden/shared';

/**
 * Per-canvas semantic mapping for the sticky-note palette. Each entry
 * carries a `label` (mandatory; without it the chip doesn't appear in
 * the right-aside StickyLegendPalette) and an optional `description`
 * surfaced inside the inspector.
 *
 * Replaces the prior `Project.colorLegend` (which was per-project and
 * lived in the sidebar) — different canvases in the same project use
 * the same six palette colours for completely different meanings, so
 * project granularity was the wrong default.
 *
 * Storage: a single Y.Map keyed flat by `${hex}.label` /
 * `${hex}.description`. Mirrors the `chartConfig` Y.Map convention so
 * the encoder is identical across both surfaces.
 */
export const COLOR_LEGEND_KEY = 'colorLegend';

export interface ColorLegendEntry {
  label: string;
  description?: string;
}

export interface VisibleColorLegendEntry {
  hex: string;
  label: string;
  description?: string;
  source: 'live' | 'default';
}

/** Hex (from STICKY_PALETTE) → entry. Hex strings only — never raw colour names. */
export type ColorLegendMap = Record<string, ColorLegendEntry>;

const PALETTE_SET = new Set<string>(STICKY_PALETTE);

export function getColorLegendRoot(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(COLOR_LEGEND_KEY);
}

const DEFAULTS_SEEDED_KEY = '__defaultsSeeded';

export function seedColorLegendDefaults(
  doc: Y.Doc,
  defaults: CanvasDefaultColorLegendEntry[] | undefined,
  lang: Lang,
): void {
  if (!defaults?.length) return;
  const root = getColorLegendRoot(doc);
  if (root.get(DEFAULTS_SEEDED_KEY) === true) return;

  let hasUserEntry = false;
  for (const hex of STICKY_PALETTE) {
    const label = root.get(`${hex}.label`);
    const description = root.get(`${hex}.description`);
    if (
      (typeof label === 'string' && label.trim().length > 0) ||
      (typeof description === 'string' && description.trim().length > 0)
    ) {
      hasUserEntry = true;
      break;
    }
  }
  if (hasUserEntry) {
    root.set(DEFAULTS_SEEDED_KEY, true);
    return;
  }

  const fallbackLang: Lang = lang === 'zh' ? 'en' : 'zh';
  doc.transact(() => {
    for (const entry of defaults) {
      const label = entry.label[lang] || entry.label[fallbackLang];
      const description = entry.description?.[lang] || entry.description?.[fallbackLang];
      if (label) root.set(`${entry.hex}.label`, label);
      if (description) root.set(`${entry.hex}.description`, description);
    }
    root.set(DEFAULTS_SEEDED_KEY, true);
  });
}

function readEntries(root: Y.Map<unknown>): ColorLegendMap {
  const out: ColorLegendMap = {};
  for (const hex of STICKY_PALETTE) {
    const label = root.get(`${hex}.label`);
    const description = root.get(`${hex}.description`);
    if (typeof label === 'string' && label.trim().length > 0) {
      out[hex] = {
        label,
        ...(typeof description === 'string' && description.length > 0
          ? { description }
          : {}),
      };
    } else if (typeof description === 'string' && description.trim().length > 0) {
      // Description without label — keep it around in the data so the
      // user's typing isn't dropped, but the chip palette won't render
      // it (label is the visible identity). The inspector still surfaces
      // both inputs so the user can fill in the label.
      out[hex] = { label: '', description };
    }
  }
  return out;
}

/**
 * Subscribe to the legend map. Returns a fresh `ColorLegendMap` each
 * time the underlying Y.Map mutates, including from remote / batch
 * imports — so the StickyLegendPalette and CanvasConfigInspector
 * naturally re-render in response to either the local user editing or
 * an AI/seed write coming through `objectsImport`.
 */
export function useColorLegend(doc: Y.Doc | null): ColorLegendMap {
  const [entries, setEntries] = useState<ColorLegendMap>({});
  useEffect(() => {
    if (!doc) {
      setEntries({});
      return;
    }
    const root = getColorLegendRoot(doc);

    function snapshot() {
      setEntries(readEntries(root));
    }

    snapshot();
    root.observe(snapshot);
    return () => root.unobserve(snapshot);
  }, [doc]);
  return entries;
}

/**
 * Patch one entry's label / description for one hex. Empty / whitespace
 * value → delete the key (so the resolver can fall back to "no entry"
 * rather than rendering a chip with an empty label).
 *
 * Caller is responsible for restricting `hex` to STICKY_PALETTE; we
 * silently no-op on off-palette inputs to avoid littering the Y.Map.
 */
export function updateColorLegendEntry(
  doc: Y.Doc,
  hex: string,
  patch: { label?: string; description?: string },
): void {
  if (!PALETTE_SET.has(hex)) return;
  const root = getColorLegendRoot(doc);
  doc.transact(() => {
    if (patch.label !== undefined) {
      const trimmed = patch.label.trim();
      if (trimmed.length === 0) root.delete(`${hex}.label`);
      else root.set(`${hex}.label`, trimmed);
    }
    if (patch.description !== undefined) {
      const trimmed = patch.description.trim();
      if (trimmed.length === 0) root.delete(`${hex}.description`);
      else root.set(`${hex}.description`, trimmed);
    }
  });
}

/** Wipe all metadata for one colour (label + description). */
export function removeColorLegendEntry(doc: Y.Doc, hex: string): void {
  if (!PALETTE_SET.has(hex)) return;
  const root = getColorLegendRoot(doc);
  doc.transact(() => {
    root.delete(`${hex}.label`);
    root.delete(`${hex}.description`);
  });
}

/**
 * Cheap one-shot check: does this canvas have any colour-legend entries
 * worth rendering as chips? "Worth rendering" follows the same rule as
 * `visibleLegendEntries` — at least one palette hex carries a non-empty
 * label. Used by the story-embedded canvas to decide whether to mount
 * the StickyLegendPalette overlay at all.
 */
export function hasColorLegend(
  doc: Y.Doc,
  lang?: Lang,
  defaults?: CanvasDefaultColorLegendEntry[],
): boolean {
  const root = getColorLegendRoot(doc);
  const live = readEntries(root);
  if (lang && resolveVisibleLegendEntries(live, lang, defaults).length > 0) return true;
  for (const hex of STICKY_PALETTE) {
    const label = root.get(`${hex}.label`);
    if (typeof label === 'string' && label.trim().length > 0) return true;
  }
  return false;
}

function resolveDefaultLegendMap(
  defaults: CanvasDefaultColorLegendEntry[] | undefined,
  lang: Lang,
): ColorLegendMap {
  if (!defaults?.length) return {};
  const fallbackLang: Lang = lang === 'zh' ? 'en' : 'zh';
  const out: ColorLegendMap = {};
  for (const entry of defaults) {
    if (!PALETTE_SET.has(entry.hex)) continue;
    const label = (entry.label[lang] || entry.label[fallbackLang] || '').trim();
    if (!label) continue;
    const description = (
      entry.description?.[lang] || entry.description?.[fallbackLang] || ''
    ).trim();
    out[entry.hex] = {
      label,
      ...(description ? { description } : {}),
    };
  }
  return out;
}

/**
 * Pure resolver — given the live legend map plus optional manifest defaults,
 * return only entries that SHOULD render as chips. Live Y.Doc labels win;
 * manifest defaults fill only missing colours. A live description without a
 * live label is treated as an intentional incomplete row and is not rendered.
 */
export function resolveVisibleLegendEntries(
  legend: ColorLegendMap,
  lang: Lang,
  defaults?: CanvasDefaultColorLegendEntry[],
): VisibleColorLegendEntry[] {
  const defaultLegend = resolveDefaultLegendMap(defaults, lang);
  const out: VisibleColorLegendEntry[] = [];
  for (const hex of STICKY_PALETTE) {
    const live = legend[hex];
    const liveLabel = live?.label.trim() ?? '';
    if (liveLabel) {
      out.push({
        hex,
        label: liveLabel,
        ...(live?.description?.trim() ? { description: live.description.trim() } : {}),
        source: 'live',
      });
      continue;
    }
    if (live?.description?.trim()) continue;
    const fallback = defaultLegend[hex];
    if (!fallback?.label.trim()) continue;
    out.push({
      hex,
      label: fallback.label,
      ...(fallback.description ? { description: fallback.description } : {}),
      source: 'default',
    });
  }
  return out;
}

export function visibleLegendEntries(
  legend: ColorLegendMap,
  lang: Lang,
  defaults?: CanvasDefaultColorLegendEntry[],
): Array<{ hex: string; label: string; description?: string }> {
  return resolveVisibleLegendEntries(legend, lang, defaults).map(
    ({ hex, label, description }) => ({
      hex,
      label,
      ...(description ? { description } : {}),
    }),
  );
}
