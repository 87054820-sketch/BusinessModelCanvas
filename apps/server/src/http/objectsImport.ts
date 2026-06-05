import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as Y from 'yjs';
import type {
  ObjectsBulkInput,
  ObjectType,
  ZoneShape,
} from '@pingarden/shared';
import {
  DEFAULT_CHART_COLOR,
  effectiveObjectTypes,
} from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import { getIdentity } from './identity.js';
import {
  getColorLegendRoot,
  getPinClassesRoot,
  getPinsRoot,
  getXAxisItemsRoot,
  isStickyPaletteHex,
  makePinClassYMap,
  makePinYMap,
  makeXAxisItemYMap,
} from '../collab/encoders.js';

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
 */

// ─── per-type input validation ────────────────────────────────────────
const StickyInput = z.object({
  zoneId: z.string().min(1),
  text: z.string(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
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

const STICKIES_KEY = 'stickies';
const STICKY_DEFAULT_COLOR = '#FCF1A8'; // mirrors collab/stickies.ts

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

      // Verify each provided key is allowed by the canvas's effective
      // objectTypes (sticky/pin/pinClass by default; xAxisItem opt-in).
      // `colorLegend` is canvas-level metadata, not an object type — it
      // applies to every canvas (no allow-list check).
      const allowed = new Set<ObjectType>(effectiveObjectTypes(bundle.def));
      const provided2types: Record<
        Exclude<keyof ObjectsBulkInput, 'colorLegend'>,
        ObjectType
      > = {
        stickies: 'sticky',
        pinClasses: 'pinClass',
        pins: 'pin',
        xAxisItems: 'xAxisItem',
      };
      for (const key of Object.keys(input) as Array<keyof ObjectsBulkInput>) {
        if (input[key] === undefined) continue;
        if (key === 'colorLegend') continue; // metadata, not an ObjectType
        if (!allowed.has(provided2types[key])) {
          return reply.code(400).send({
            error: `Object type '${provided2types[key]}' not allowed on canvas '${meta.defId}'`,
            allowed: [...allowed],
          });
        }
      }

      const zoneById = new Map(bundle.def.zones.map((z) => [z.id, z]));

      const identity = getIdentity(req);
      const now = new Date().toISOString();

      const doc = new Y.Doc();
      try {
        const prev = await storage.loadYDocState(req.params.id);
        if (prev && prev.byteLength > 0) Y.applyUpdate(doc, prev);

        // ── stickies (replace whole map) ──
        if (input.stickies) {
          const root = doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
          const unknown = [
            ...new Set(
              input.stickies.map((s) => s.zoneId).filter((z) => !zoneById.has(z)),
            ),
          ];
          if (unknown.length > 0) {
            return reply.code(400).send({
              error: 'Unknown zoneId(s) for this canvas',
              unknownZoneIds: unknown,
              knownZoneIds: bundle.def.zones.map((z) => z.id),
            });
          }
          doc.transact(() => {
            root.forEach((_v, k) => root.delete(k));
            input.stickies!.forEach((sIn, idx) => {
              const id = randomUUID();
              const zone = zoneById.get(sIn.zoneId)!;
              const { x, y } = resolvePosition(zone.shape, sIn.x, sIn.y, idx);
              const author = (sIn.authorName ?? identity.displayName).slice(0, 64);

              const sticky = new Y.Map<unknown>();
              sticky.set('id', id);
              sticky.set('zoneId', sIn.zoneId);
              sticky.set('x', x);
              sticky.set('y', y);
              sticky.set('text', sIn.text);
              sticky.set('color', sIn.color ?? STICKY_DEFAULT_COLOR);
              sticky.set('authorName', author);
              sticky.set('createdAt', now);
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
        }

        // ── pinClasses (replace whole map) ──
        // We import classes BEFORE pins so pin.classId validation
        // sees the freshly-imported class set.
        const importedClassIds = new Set<string>();
        if (input.pinClasses) {
          const root = getPinClassesRoot(doc);
          doc.transact(() => {
            root.forEach((_v, k) => root.delete(k));
            input.pinClasses!.forEach((cIn) => {
              const id = cIn.id ?? randomUUID();
              const author = (cIn.authorName ?? identity.displayName).slice(0, 64);
              importedClassIds.add(id);
              root.set(
                id,
                makePinClassYMap({
                  id,
                  label: cIn.label,
                  color: cIn.color ?? DEFAULT_CHART_COLOR,
                  icon: cIn.icon ?? 'circle',
                  authorName: author,
                  createdAt: now,
                }),
              );
            });
          });
        } else {
          // Use the existing classes already in the doc as the
          // membership set — needed when the user is uploading pins
          // referencing classes they created via UI earlier.
          const root = getPinClassesRoot(doc);
          root.forEach((_v, id) => importedClassIds.add(id));
        }

        // ── pins (replace whole map) ──
        if (input.pins) {
          // Validate every pin's classId.
          const unknownClasses = [
            ...new Set(
              input.pins.map((p) => p.classId).filter((cid) => !importedClassIds.has(cid)),
            ),
          ];
          if (unknownClasses.length > 0) {
            return reply.code(400).send({
              error: 'Unknown pin classId(s)',
              unknownClassIds: unknownClasses,
              knownClassIds: [...importedClassIds],
            });
          }
          const root = getPinsRoot(doc);
          doc.transact(() => {
            root.forEach((_v, k) => root.delete(k));
            input.pins!.forEach((pIn) => {
              const id = pIn.id ?? randomUUID();
              const author = (pIn.authorName ?? identity.displayName).slice(0, 64);
              root.set(
                id,
                makePinYMap({
                  id,
                  classId: pIn.classId,
                  x: pIn.x,
                  y: pIn.y,
                  ...(pIn.label ? { label: pIn.label } : {}),
                  ...(pIn.body ? { body: pIn.body } : {}),
                  authorName: author,
                  createdAt: now,
                }),
              );
            });
          });
        }

        // ── xAxisItems (replace array) ──
        if (input.xAxisItems) {
          const root = getXAxisItemsRoot(doc);
          doc.transact(() => {
            if (root.length > 0) root.delete(0, root.length);
            input.xAxisItems!.forEach((it) => {
              root.push([makeXAxisItemYMap({ id: it.id, label: it.label })]);
            });
          });
        }

        // ── colorLegend (replace whole map) ──
        // Keys MUST be members of STICKY_PALETTE — off-palette hex would
        // sit in the doc orphaned (the chip palette only renders the
        // known six). Reject up front so the AI gets a clear error.
        if (input.colorLegend) {
          const offPalette = Object.keys(input.colorLegend).filter(
            (hex) => !isStickyPaletteHex(hex),
          );
          if (offPalette.length > 0) {
            return reply.code(400).send({
              error: 'colorLegend keys must be members of STICKY_PALETTE',
              offPalette,
            });
          }
          const root = getColorLegendRoot(doc);
          doc.transact(() => {
            // Replace-style: clear everything first, then write what was
            // provided. Keeps semantics aligned with the other roots in
            // this endpoint.
            root.forEach((_v, k) => root.delete(k));
            for (const [hex, entry] of Object.entries(input.colorLegend!)) {
              const label = entry.label.trim();
              if (label.length === 0) continue;
              root.set(`${hex}.label`, label);
              if (entry.description && entry.description.trim().length > 0) {
                root.set(`${hex}.description`, entry.description.trim());
              }
            }
          });
        }

        const state = Y.encodeStateAsUpdate(doc);
        await storage.saveYDocState(req.params.id, state);
      } finally {
        doc.destroy();
      }

      await storage.updateCanvasMeta(req.params.id, {
        updatedBy: identity.displayName,
      });

      return reply.code(200).send({
        ok: true,
        replaced: {
          stickies: input.stickies?.length ?? 0,
          pinClasses: input.pinClasses?.length ?? 0,
          pins: input.pins?.length ?? 0,
          xAxisItems: input.xAxisItems?.length ?? 0,
          colorLegend: input.colorLegend
            ? Object.keys(input.colorLegend).length
            : 0,
        },
      });
    },
  );
}

/* ─── geometry helpers (mirrored from web hitTest) ──────────────────── */

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
  return {
    x: shape.cx - shape.r,
    y: shape.cy - shape.r,
    w: shape.r * 2,
    h: shape.r * 2,
  };
}

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
  const cap = Math.min(b.w, b.h) * 0.3;
  const step = Math.min(28, cap / Math.max(1, idx));
  const angle = idx * 137.5 * (Math.PI / 180);
  const dx = Math.cos(angle) * step * Math.sqrt(idx);
  const dy = Math.sin(angle) * step * Math.sqrt(idx);
  return {
    x: cx + (x === undefined ? dx : 0),
    y: cy + (y === undefined ? dy : 0),
  };
}
