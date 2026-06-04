import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as Y from 'yjs';
import type { CanvasMeta, Snapshot, SnapshotMeta } from '@canvas-collab/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { getIdentity } from './identity.js';

const CreateMilestoneInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

const RestoreInput = z.object({
  mode: z.enum(['replace', 'fork']),
});

const STICKIES_KEY = 'stickies';

/** Decode a binary Yjs state and count the stickies inside. */
function countStickies(state: Uint8Array | null): number {
  if (!state || state.byteLength === 0) return 0;
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const map = doc.getMap(STICKIES_KEY);
  return map.size;
}

export function registerSnapshotRoutes(app: FastifyInstance, storage: CanvasStorage) {
  // List milestones (default) or all snapshot kinds.
  app.get<{
    Params: { id: string };
    Querystring: { kind?: 'autosave' | 'milestone' };
  }>('/canvases/:id/snapshots', async (req, reply) => {
    const meta = await storage.getCanvas(req.params.id);
    if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
    const kind = req.query.kind ?? 'milestone';
    return storage.listSnapshots(req.params.id, kind);
  });

  // Capture current Y.Doc state as a milestone.
  app.post<{ Params: { id: string } }>(
    '/canvases/:id/snapshots',
    async (req, reply) => {
      const input = CreateMilestoneInput.parse(req.body);
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
      const state = (await storage.loadYDocState(req.params.id)) ?? new Uint8Array();
      const identity = getIdentity(req);
      const snapshot: Snapshot = {
        id: randomUUID(),
        canvasId: req.params.id,
        kind: 'milestone',
        name: input.name,
        description: input.description,
        createdAt: new Date().toISOString(),
        createdBy: identity.displayName,
        stickyCount: countStickies(state),
        state: Buffer.from(state).toString('base64'),
      };
      await storage.createSnapshot(snapshot);
      const { state: _omit, ...returned } = snapshot;
      return reply.code(201).send(returned satisfies SnapshotMeta);
    },
  );

  // Restore a snapshot — either replace the live state or fork to a new canvas.
  app.post<{ Params: { id: string; sid: string } }>(
    '/canvases/:id/snapshots/:sid/restore',
    async (req, reply) => {
      const input = RestoreInput.parse(req.body);
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
      const snap = await storage.getSnapshot(req.params.id, req.params.sid);
      if (!snap) return reply.code(404).send({ error: 'Snapshot not found' });
      const bytes = new Uint8Array(Buffer.from(snap.state, 'base64'));
      const identity = getIdentity(req);
      const now = new Date().toISOString();

      if (input.mode === 'replace') {
        await storage.saveYDocState(req.params.id, bytes);
        const updated = await storage.updateCanvasMeta(req.params.id, {
          updatedBy: identity.displayName,
        });
        return reply.send({ canvas: updated });
      }

      // fork
      const newId = randomUUID();
      const newCanvas: CanvasMeta = {
        ...meta,
        id: newId,
        title: `${meta.title} (fork)`,
        createdAt: now,
        createdBy: identity.displayName,
        updatedAt: now,
        updatedBy: identity.displayName,
      };
      await storage.createCanvas(newCanvas);
      await storage.saveYDocState(newId, bytes);
      return reply.code(201).send({ canvas: newCanvas });
    },
  );

  // Delete a single snapshot (milestone or autosave).
  app.delete<{ Params: { id: string; sid: string } }>(
    '/canvases/:id/snapshots/:sid',
    async (req, reply) => {
      const meta = await storage.getCanvas(req.params.id);
      if (!meta) return reply.code(404).send({ error: 'Canvas not found' });
      await storage.deleteSnapshot(req.params.id, req.params.sid);
      return reply.code(204).send();
    },
  );
}
