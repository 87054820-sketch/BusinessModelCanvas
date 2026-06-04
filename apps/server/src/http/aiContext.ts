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
    const state = await storage.loadYDocState(req.params.id);
    if (state && state.byteLength > 0) {
      const doc = new Y.Doc();
      try {
        Y.applyUpdate(doc, state);
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
