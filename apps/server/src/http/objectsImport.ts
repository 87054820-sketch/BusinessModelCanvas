import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ObjectsBulkInput } from '@pingarden/shared';
import { encodeObjectsBulk, EncodeBulkInputError } from '@pingarden/shared/yjs';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import { getIdentity } from './identity.js';

/**
 * Generalised bulk-import endpoint.
 *
 *   POST /canvases/:id/objects/bulk
 *
 * Body shape mirrors `ObjectsBulkInput` in `packages/shared`. Each
 * top-level key is **per-key replace**: only keys present in the
 * request are replaced; other roots on the doc are untouched. Allowed
 * keys per canvas are validated against the canvas def's effective
 * `objectTypes` (sticky/pin/pinClass by default; xAxisItem only when
 * the canvas declares it explicitly).
 *
 * The legacy `POST /canvases/:id/stickies/bulk` is kept (in
 * stickyImport.ts) and delegates here with `{stickies}` so callers
 * using the old shape keep working.
 *
 * Yjs encoding is delegated to `@pingarden/shared/yjs` →
 * `encodeObjectsBulk` so the CLI's `case author` command produces
 * byte-compatible `live.ydoc` files without spinning up a server.
 */

// ─── per-type input validation ────────────────────────────────────────
const StickyInput = z.object({
  zoneId: z.string().min(1),
  text: z.string(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  authorName: z.string().optional(),
});

const PinClassInput = z.object({
  id: z.string().optional(),
  label: z.string(),
  color: z.string().optional(),
  icon: z.enum(['circle', 'triangle', 'square', 'star', 'flag']).optional(),
  authorName: z.string().optional(),
});

const PinInput = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  body: z.string().optional(),
  authorName: z.string().optional(),
});

const XAxisItemInput = z.object({
  id: z.string().min(1),
  label: z.object({ en: z.string(), zh: z.string() }),
});

const ColorLegendEntryInput = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
});

const BulkInput = z.object({
  stickies: z.array(StickyInput).max(500).optional(),
  pinClasses: z.array(PinClassInput).max(50).optional(),
  pins: z.array(PinInput).max(500).optional(),
  xAxisItems: z.array(XAxisItemInput).max(50).optional(),
  /**
   * Replace-style colour-legend payload. Keys MUST be hex strings drawn
   * from `STICKY_PALETTE`; off-palette keys are rejected outright (no
   * silent drop) so an AI agent gets a clear error rather than a
   * mysteriously-empty legend.
   */
  colorLegend: z.record(z.string(), ColorLegendEntryInput).optional(),
});

export function registerObjectsImportRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  defs: LoadedCanvasDef[],
) {
  const defsById = new Map(defs.map((d) => [d.def.id, d]));

  app.post<{ Params: { id: string } }>(
    '/canvases/:id/objects/bulk',
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
      const input = parsed.data as ObjectsBulkInput;

      const identity = getIdentity(req);
      const prev = await storage.loadYDocState(req.params.id);

      let result;
      try {
        result = encodeObjectsBulk(input, bundle.def, {
          prevState: prev ?? undefined,
          defaultAuthor: identity.displayName,
        });
      } catch (err) {
        if (err instanceof EncodeBulkInputError) {
          // Map domain error codes to the same shape this endpoint
          // historically returned, so existing CLI / web callers don't
          // see a behaviour change.
          if (err.code === 'OBJECT_TYPE_NOT_ALLOWED') {
            return reply.code(400).send({
              error: err.message,
              allowed: err.details.allowed,
            });
          }
          if (err.code === 'UNKNOWN_ZONE_IDS') {
            return reply.code(400).send({
              error: err.message,
              unknownZoneIds: err.details.unknownZoneIds,
              knownZoneIds: err.details.knownZoneIds,
            });
          }
          if (err.code === 'UNKNOWN_PIN_CLASS_IDS') {
            return reply.code(400).send({
              error: err.message,
              unknownClassIds: err.details.unknownClassIds,
              knownClassIds: err.details.knownClassIds,
            });
          }
          if (err.code === 'OFF_PALETTE_COLOR_LEGEND') {
            return reply.code(400).send({
              error: err.message,
              offPalette: err.details.offPalette,
            });
          }
        }
        throw err;
      }

      await storage.saveYDocState(req.params.id, result.state);
      await storage.updateCanvasMeta(req.params.id, {
        updatedBy: identity.displayName,
      });

      return reply.code(200).send({
        ok: true,
        replaced: result.replaced,
      });
    },
  );
}
