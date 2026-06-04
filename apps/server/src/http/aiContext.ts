import type { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import type {
  AiContext,
  AiContextBlock,
  AiContextSticky,
  Lang,
  ZoneHistoryEntry,
} from '@canvas-collab/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { loadKnowledgeForBundle, type LoadedCanvasDef } from '../canvasDefs/loader.js';
import {
  getPinClassesRoot,
  getPinsRoot,
  getXAxisItemsRoot,
  readChartConfig,
  readPin,
  readPinClass,
  readXAxisItem,
  type ChartConfigOverrides,
} from '../collab/encoders.js';

const STICKIES_KEY = 'stickies';

/**
 * GET /canvases/:id/ai-context?lang=en|zh
 *
 * Read-only structured snapshot designed for an AI Copilot to consume.
 * Hydrates Yjs sticky binary state into block-grouped JSON, with block
 * titles and guidance pre-resolved against `lang`. Empty zones are kept
 * with `stickies: []` so the AI sees what's *missing* alongside what's
 * filled.
 *
 * The endpoint is deliberately read-only — when the AI later writes
 * (creates or moves a sticky), it goes through the same `PUT /canvases/:id/state`
 * route that the human web client uses. There is intentionally no
 * separate AI-write API surface.
 */
export function registerAiContextRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  defs: LoadedCanvasDef[],
) {
  const defsById = new Map(defs.map((d) => [d.def.id, d]));

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string };
  }>('/canvases/:id/ai-context', async (req, reply) => {
    const meta = await storage.getCanvas(req.params.id);
    if (!meta) return reply.code(404).send({ error: 'Canvas not found' });

    const bundle = defsById.get(meta.defId);
    if (!bundle) {
      return reply
        .code(500)
        .send({ error: `Canvas def not loaded: ${meta.defId}` });
    }

    // Resolve language: explicit ?lang wins; fall back to the canvas's
    // creation language so an AI that doesn't pass the param still gets a
    // sensibly localised payload.
    const langRaw = req.query.lang;
    const lang: Lang = langRaw === 'en' || langRaw === 'zh' ? langRaw : meta.language;
    const i18n = bundle.i18n[lang];

    const project = await storage.getProject(meta.projectId);

    // Decode the persisted Yjs state, if any. An empty/missing state means
    // the canvas is brand-new — every block still appears in the response,
    // just with `stickies: []`.
    const stickiesByZone = new Map<string, AiContextSticky[]>();
    let factors: Array<{ id: string; label: string }> | undefined;
    let pinClassesOut: AiContext['pinClasses'] | undefined;
    let pinsOut: AiContext['pins'] | undefined;
    let valueCurves: AiContext['valueCurves'] | undefined;
    /** Per-canvas Y-axis label overrides (when chart-canvas plugin is active). */
    let chartOverrides: ChartConfigOverrides = {};
    const state = await storage.loadYDocState(req.params.id);
    if (state && state.byteLength > 0) {
      const doc = new Y.Doc();
      try {
        Y.applyUpdate(doc, state);
        // Read chart-config overrides up front so we can apply them to
        // both the canvas-meta surface (def name still resolves from
        // i18n) and any chart-related response fields.
        chartOverrides = readChartConfig(doc);

        const root = doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
        root.forEach((yMap) => {
          const sticky = readStickyForAi(yMap);
          if (!sticky) return;
          const zoneId = (yMap.get('zoneId') as string | undefined) ?? '';
          if (!zoneId) return;
          const arr = stickiesByZone.get(zoneId) ?? [];
          arr.push(sticky);
          stickiesByZone.set(zoneId, arr);
        });

        // X axis factors (chart-canvas only, but cheap to surface
        // whenever the array is non-empty).
        const factorsRoot = getXAxisItemsRoot(doc);
        if (factorsRoot.length > 0) {
          const list: Array<{ id: string; label: string }> = [];
          factorsRoot.forEach((y) => {
            const item = readXAxisItem(y);
            if (!item) return;
            const label = item.label[lang] || item.label.en || item.label.zh || '';
            list.push({ id: item.id, label });
          });
          if (list.length > 0) factors = list;
        }

        // Pin classes (legend) and pins. We do these together because the
        // pins list carries a `classLabel` derived from the class.
        const classesRoot = getPinClassesRoot(doc);
        const classByIdLocal = new Map<
          string,
          { id: string; label: string; color: string; icon: import('@canvas-collab/shared').PinIcon }
        >();
        if (classesRoot.size > 0) {
          const arr: NonNullable<AiContext['pinClasses']> = [];
          classesRoot.forEach((y) => {
            const c = readPinClass(y);
            if (!c) return;
            arr.push({ id: c.id, label: c.label, color: c.color, icon: c.icon });
            classByIdLocal.set(c.id, { id: c.id, label: c.label, color: c.color, icon: c.icon });
          });
          if (arr.length > 0) pinClassesOut = arr;
        }

        const pinsRoot = getPinsRoot(doc);
        if (pinsRoot.size > 0) {
          const arr: NonNullable<AiContext['pins']> = [];
          // Also accumulate per-class points for valueCurves.
          const byClass = new Map<string, Array<{ x: number; y: number }>>();
          pinsRoot.forEach((y) => {
            const pin = readPin(y);
            if (!pin) return;
            const cls = classByIdLocal.get(pin.classId);
            arr.push({
              id: pin.id,
              classId: pin.classId,
              classLabel: cls?.label ?? '',
              x: pin.x,
              y: pin.y,
              ...(pin.label ? { label: pin.label } : {}),
              ...(pin.body ? { body: pin.body } : {}),
            });
            const list = byClass.get(pin.classId) ?? [];
            list.push({ x: pin.x, y: pin.y });
            byClass.set(pin.classId, list);
          });
          if (arr.length > 0) pinsOut = arr;

          // Auto-derived per-class polylines — sort by x so the curve
          // reads left-to-right. Skip classes with <2 points (no line).
          const curves: NonNullable<AiContext['valueCurves']> = [];
          for (const [classId, points] of byClass) {
            if (points.length < 2) continue;
            const cls = classByIdLocal.get(classId);
            if (!cls) continue;
            points.sort((a, b) => a.x - b.x);
            curves.push({
              classId,
              classLabel: cls.label,
              color: cls.color,
              points,
            });
          }
          if (curves.length > 0) valueCurves = curves;
        }
      } finally {
        doc.destroy();
      }
    }

    // Stable per-zone ordering by createdAt — same convention the web
    // client uses so the AI sees stickies in the order a human would.
    for (const arr of stickiesByZone.values()) {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    // Per-block guidance lives in markdown files at
    // `<bundleDir>/knowledge/blocks/<zoneId>.<lang>.md`. Read here on
    // every request so authors can edit guidance without restarting the
    // server. The LLM still receives a plain string in `guidance` —
    // markdown formatting is invisible to it but harmless.
    const knowledge = await loadKnowledgeForBundle(
      bundle.bundleDir,
      bundle.def.zones.map((z) => z.id),
    );

    const blocks: AiContextBlock[] = bundle.def.zones.map((zone) => {
      const block = i18n.blocks[zone.id];
      return {
        id: zone.id,
        title: block?.title ?? zone.id,
        prompt: block?.prompt,
        guidance: knowledge[lang].blocks[zone.id] ?? block?.guidance,
        stickies: stickiesByZone.get(zone.id) ?? [],
      };
    });

    // Y axis (chart-canvas only). Resolve manifest defaults against
    // `lang` first, then overlay any per-canvas overrides the user
    // typed in the right inspector. Mirrors the resolver in
    // `apps/web/src/collab/chartConfig.ts` — same fallback order so AI
    // output is byte-identical with what the user sees.
    let yAxisOut: AiContext['yAxis'];
    if (bundle.def.chart) {
      const m = bundle.def.chart.yAxis;
      const resolve = (
        manifest: { en: string; zh: string } | undefined,
        override: { en?: string; zh?: string } | undefined,
      ): string | undefined => {
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
        return undefined;
      };
      const label = resolve(m.label, chartOverrides.yAxisLabel) ?? '';
      const lowLabel = resolve(m.lowLabel, chartOverrides.yAxisLowLabel);
      const highLabel = resolve(m.highLabel, chartOverrides.yAxisHighLabel);
      yAxisOut = {
        label,
        ...(lowLabel ? { lowLabel } : {}),
        ...(highLabel ? { highLabel } : {}),
      };
    }

    const ctx: AiContext = {
      canvas: {
        id: meta.id,
        defId: meta.defId,
        defName: bundle.def.name[lang],
        title: meta.title,
        language: meta.language,
        project: project
          ? {
              id: project.id,
              name: project.name,
              ...(project.description ? { description: project.description } : {}),
            }
          : { id: meta.projectId, name: '' },
      },
      blocks,
      ...(factors ? { factors } : {}),
      ...(yAxisOut ? { yAxis: yAxisOut } : {}),
      ...(pinClassesOut ? { pinClasses: pinClassesOut } : {}),
      ...(pinsOut ? { pins: pinsOut } : {}),
      ...(valueCurves ? { valueCurves } : {}),
      generatedAt: new Date().toISOString(),
    };

    return reply.header('Cache-Control', 'no-store').send(ctx);
  });
}

/**
 * Reads one sticky out of the Yjs map and shapes it for the AI payload.
 * Synthesises a single-entry `zoneHistory` from creation metadata when
 * the field is absent, so old stickies (persisted before zoneHistory
 * existed) always present a valid audit trail to readers.
 */
function readStickyForAi(yMap: Y.Map<unknown>): AiContextSticky | null {
  const id = yMap.get('id') as string | undefined;
  const zoneId = yMap.get('zoneId') as string | undefined;
  const x = yMap.get('x') as number | undefined;
  const y = yMap.get('y') as number | undefined;
  if (!id || !zoneId || x === undefined || y === undefined) return null;
  const text = (yMap.get('text') as string | undefined) ?? '';
  const color = (yMap.get('color') as string | undefined) ?? '';
  const authorName = (yMap.get('authorName') as string | undefined) ?? '';
  const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';

  const rawHistory = yMap.get('zoneHistory');
  let zoneHistory: ZoneHistoryEntry[] | undefined;
  if (rawHistory instanceof Y.Array) {
    const out: ZoneHistoryEntry[] = [];
    rawHistory.forEach((entry) => {
      if (!(entry instanceof Y.Map)) return;
      const ezId = entry.get('zoneId') as string | undefined;
      const at = entry.get('at') as string | undefined;
      const by = (entry.get('by') as string | undefined) ?? '';
      if (ezId && at) out.push({ zoneId: ezId, at, by });
    });
    if (out.length > 0) zoneHistory = out;
  }
  if (!zoneHistory) {
    // Backfill: synthesise one entry from creation metadata so the audit
    // trail is always non-empty.
    zoneHistory = [{ zoneId, at: createdAt, by: authorName }];
  }

  return {
    id,
    text,
    color,
    authorName,
    createdAt,
    x,
    y,
    zoneHistory,
  };
}
