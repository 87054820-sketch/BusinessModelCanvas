import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as Y from 'yjs';
import type { ZoneShape } from '@pingarden/shared';
import {
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
          input.forEach((sIn, idx) => {
            const id = randomUUID();
            ids.push(id);
            const zone = zoneById.get(sIn.zoneId)!;
            const { x, y } = resolvePosition(zone.shape, sIn.x, sIn.y, idx);
            const author = (sIn.authorName ?? identity.displayName).slice(0, 64);

            const sticky = new Y.Map<unknown>();
            sticky.set('id', id);
            sticky.set('zoneId', sIn.zoneId);
            sticky.set('x', x);
            sticky.set('y', y);
            // Persist width/height ONLY when supplied — keeps the
            // shape of stickies seeded without explicit dimensions
            // identical to today (renderer falls back to defaults).
            if (sIn.width !== undefined) sticky.set('width', sIn.width);
            if (sIn.height !== undefined) sticky.set('height', sIn.height);
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
  idx: number,
): { x: number; y: number } {
  if (x !== undefined && y !== undefined) return { x, y };
  const b = zoneBounds(shape);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  // Spiral-ish offset: each new sticky in the same zone shifts a bit so
  // the cluster spreads out instead of stacking. Capped to ~30% of the
  // zone's smaller dimension so we never escape the box.
  const cap = Math.min(b.w, b.h) * 0.3;
  const step = Math.min(28, cap / Math.max(1, idx));
  const angle = idx * 137.5 * (Math.PI / 180); // golden-angle for nice spread
  const dx = Math.cos(angle) * step * Math.sqrt(idx);
  const dy = Math.sin(angle) * step * Math.sqrt(idx);
  return {
    x: cx + (x === undefined ? dx : 0),
    y: cy + (y === undefined ? dy : 0),
  };
}
