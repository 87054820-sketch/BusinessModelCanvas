import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as Y from 'yjs';
import type { ZoneShape } from '@pingarden/shared';
import {
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_STICKY_WIDTH,
  STICKY_MAX_HEIGHT,
  STICKY_MAX_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MIN_WIDTH,
} from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import { getIdentity } from './identity.js';

/**
 * Bulk-sticky import endpoint.
 *
 *   POST /canvases/:id/stickies/bulk
 *
 * Replace-mode JSON: the entire stickies map is rebuilt from the payload,
 * so any pre-existing stickies on the canvas are dropped. This matches the
 * end-user's confirmed intent ("replace, don't append") for the seed-from-
 * reference-image workflow.
 *
 * Field set + Y.Map encoding mirror `apps/web/src/collab/stickies.ts`
 * `addSticky` exactly — that file is the source of truth, and the web
 * client's `useStickies` hook decodes whatever this writes. If you change
 * sticky-shape on one side, change it on the other.
 *
 * Live runtime sync (per-keystroke, multi-cursor) still flows through
 * `PUT /canvases/:id/state`. The two are intentionally separate seams:
 * CRDT for live editing, batch JSON for seed/import.
 *
 * **Sticky text format:** `text` is stored verbatim. As of the
 * StickyRichEditor rollout, the web client emits a small HTML fragment
 * (e.g. `<p>...</p>`, `<strong>`, `<em>`, `<u>`, inline
 * `<span style="...">`). For seed / AI imports, plain-text strings are
 * still accepted — they get round-tripped through the editor as a
 * single paragraph on first read. There is no server-side HTML
 * sanitization today; trust the producer (seed scripts and the future
 * AI Copilot endpoint) to send shapes the editor can parse.
 */

// ─── sticky encoding constants (mirror collab/stickies.ts) ──────────────
const STICKIES_KEY = 'stickies';
const DEFAULT_COLOR = '#FCF1A8'; // STICKY_PALETTE[0] — cream

const StickyInput = z.object({
  zoneId: z.string().min(1),
  text: z.string(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  /** Optional explicit dimensions; bounded so imported stickies stay legible. */
  width: z.number().min(STICKY_MIN_WIDTH).max(STICKY_MAX_WIDTH).optional(),
  height: z.number().min(STICKY_MIN_HEIGHT).max(STICKY_MAX_HEIGHT).optional(),
  authorName: z.string().optional(),
});

const BulkInput = z.object({
  stickies: z.array(StickyInput).max(500),
});

export function registerStickyImportRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  defs: LoadedCanvasDef[],
) {
  const defsById = new Map(defs.map((d) => [d.def.id, d]));

  app.post<{ Params: { id: string } }>(
    '/canvases/:id/stickies/bulk',
    async (req, reply) => {
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });

      const bundle = defsById.get(meta.defId);
      if (!bundle) {
        return reply
          .code(500)
          .send({ error: `Canvas def not loaded: ${meta.defId}` });
      }

      const parsed = BulkInput.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid payload', details: parsed.error.format() });
      }
      const { stickies: input } = parsed.data;

      // Validate every zoneId against the canvas def.
      const zoneById = new Map(bundle.def.zones.map((z) => [z.id, z]));
      const unknown = [
        ...new Set(input.map((s) => s.zoneId).filter((z) => !zoneById.has(z))),
      ];
      if (unknown.length > 0) {
        return reply.code(400).send({
          error: 'Unknown zoneId(s) for this canvas',
          unknownZoneIds: unknown,
          knownZoneIds: bundle.def.zones.map((z) => z.id),
        });
      }

      const identity = getIdentity(req);
      const now = new Date().toISOString();

      // REPLACE: build a fresh Y.Doc from scratch — pre-existing stickies
      // on the canvas are dropped by design.
      const doc = new Y.Doc();
      const ids: string[] = [];
      try {
        const root = doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
        doc.transact(() => {
          // Per-zone counters — `resolvePosition` expects per-zone
          // idx (so each zone's stickies start at row 0) AND the
          // total in that zone (so the layout knows whether to
          // shrink stickyH to make all of them fit). The pre-pass
          // builds the totals; the encode pass increments idx as
          // we walk the input.
          const totalByZone = new Map<string, number>();
          for (const sIn of input) {
            totalByZone.set(sIn.zoneId, (totalByZone.get(sIn.zoneId) ?? 0) + 1);
          }
          const idxByZone = new Map<string, number>();
          input.forEach((sIn) => {
            const id = randomUUID();
            ids.push(id);
            const zone = zoneById.get(sIn.zoneId)!;
            const localIdx = idxByZone.get(sIn.zoneId) ?? 0;
            idxByZone.set(sIn.zoneId, localIdx + 1);
            const total = totalByZone.get(sIn.zoneId) ?? 1;
            const placed = resolvePosition(
              zone.shape,
              sIn.x,
              sIn.y,
              localIdx,
              total,
            );
            const author = (sIn.authorName ?? identity.displayName).slice(0, 64);

            const sticky = new Y.Map<unknown>();
            sticky.set('id', id);
            sticky.set('zoneId', sIn.zoneId);
            sticky.set('x', placed.x);
            sticky.set('y', placed.y);
            // Persist width/height when caller supplied them OR when
            // auto-layout had to shrink the sticky to fit. Renderer
            // falls back to DEFAULT_STICKY_{WIDTH,HEIGHT} otherwise.
            const width = sIn.width ?? placed.width;
            const height = sIn.height ?? placed.height;
            if (width !== undefined) sticky.set('width', width);
            if (height !== undefined) sticky.set('height', height);
            sticky.set('text', sIn.text);
            sticky.set('color', sIn.color ?? DEFAULT_COLOR);
            sticky.set('authorName', author);
            sticky.set('createdAt', now);

            // Initial zoneHistory entry — index 0 of the sticky's lifetime.
            const history = new Y.Array<Y.Map<unknown>>();
            const entry = new Y.Map<unknown>();
            entry.set('zoneId', sIn.zoneId);
            entry.set('at', now);
            entry.set('by', author);
            history.push([entry]);
            sticky.set('zoneHistory', history);

            root.set(id, sticky);
          });
        });

        const state = Y.encodeStateAsUpdate(doc);
        await storage.saveYDocState(req.params.id, state);
      } finally {
        doc.destroy();
      }

      // Touch canvas meta so the project list reflects the change.
      await storage.updateCanvasMeta(req.params.id, {
        updatedBy: identity.displayName,
      });

      return reply.code(200).send({ replaced: ids.length, ids });
    },
  );
}

/**
 * Bounding rect of any zone shape — copied from
 * `apps/web/src/canvas/hitTest.ts` to avoid the server depending on
 * `apps/web`. Keep these two implementations in sync; the source of truth
 * is the web copy.
 */
function zoneBounds(shape: ZoneShape): { x: number; y: number; w: number; h: number } {
  if (shape.type === 'rect') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.type === 'polygon') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of shape.points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  // circle-segment: bound by the full circle
  return {
    x: shape.cx - shape.r,
    y: shape.cy - shape.r,
    w: shape.r * 2,
    h: shape.r * 2,
  };
}

/**
 * If the caller didn't pass coordinates, drop the sticky near the zone
 * centroid with a small deterministic per-index jitter so multiple
 * stickies in the same zone don't pile into a single point.
 */
function resolvePosition(
  shape: ZoneShape,
  x: number | undefined,
  y: number | undefined,
  idxInZone: number,
  totalInZone: number,
): { x: number; y: number; width?: number; height?: number } {
  if (x !== undefined && y !== undefined) return { x, y };
  // Mirror the auto-layout in `packages/shared/src/yjs.ts` so the
  // `POST /stickies/bulk` endpoint and the `case author` /
  // `case relayout` CLIs place stickies identically. See that file
  // for the full rationale (sticky x/y is centre, top inset clears
  // zone title, single-column-preferred + auto-shrink fallback).
  const b = zoneBounds(shape);
  const topPad = 70;
  const sidePad = 12;
  const botPad = 12;
  const gap = 8;
  const innerH = Math.max(STICKY_MIN_HEIGHT, b.h - topPad - botPad);
  const innerW = Math.max(STICKY_MIN_WIDTH, b.w - 2 * sidePad);

  const total = Math.max(1, totalInZone);
  let cols = 1;
  let rowsPerCol = total;
  let stickyW = Math.min(DEFAULT_STICKY_WIDTH, innerW);
  let stickyH = Math.min(
    DEFAULT_STICKY_HEIGHT,
    (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
  );

  if (stickyH < STICKY_MIN_HEIGHT && innerW >= 2 * STICKY_MIN_WIDTH + gap) {
    cols = 2;
    rowsPerCol = Math.ceil(total / cols);
    stickyW = Math.min(DEFAULT_STICKY_WIDTH, (innerW - gap) / cols);
    stickyH = Math.min(
      DEFAULT_STICKY_HEIGHT,
      (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
    );
  }
  if (stickyH < STICKY_MIN_HEIGHT && innerW >= 3 * STICKY_MIN_WIDTH + 2 * gap) {
    cols = 3;
    rowsPerCol = Math.ceil(total / cols);
    stickyW = Math.min(DEFAULT_STICKY_WIDTH, (innerW - 2 * gap) / cols);
    stickyH = Math.min(
      DEFAULT_STICKY_HEIGHT,
      (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
    );
  }
  stickyH = Math.max(stickyH, STICKY_MIN_HEIGHT);
  stickyW = Math.max(stickyW, STICKY_MIN_WIDTH);

  const col = Math.min(cols - 1, Math.floor(idxInZone / rowsPerCol));
  const row = idxInZone - col * rowsPerCol;
  const cx = b.x + sidePad + stickyW / 2 + col * (stickyW + gap);
  const cy = b.y + topPad + stickyH / 2 + row * (stickyH + gap);
  const out: { x: number; y: number; width?: number; height?: number } = {
    x: x === undefined ? cx : x,
    y: y === undefined ? cy : y,
  };
  if (stickyW < DEFAULT_STICKY_WIDTH) out.width = stickyW;
  if (stickyH < DEFAULT_STICKY_HEIGHT) out.height = stickyH;
  return out;
}
