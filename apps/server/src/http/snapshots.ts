import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as Y from 'yjs';
import type { CanvasMeta, Snapshot, SnapshotMeta } from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { ProjectAccessService } from '../auth/ProjectAccessService.js';

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

export function registerSnapshotRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  access: ProjectAccessService,
) {
  // List milestones (default) or all snapshot kinds.
  app.get<{
    Params: { id: string };
    Querystring: { kind?: 'autosave' | 'milestone' };
  }>('/canvases/:id/snapshots', async (req, reply) => {
    const result = await access.ensureCanvas(req, reply, req.params.id, 'view');
    if (!result) return;
    const kind = req.query.kind ?? 'milestone';
    return storage.listSnapshots(req.params.id, kind);
  });

  // Capture current Y.Doc state as a milestone.
  app.post<{ Params: { id: string } }>(
    '/canvases/:id/snapshots',
    async (req, reply) => {
      const input = CreateMilestoneInput.parse(req.body);
      const result = await access.ensureCanvas(req, reply, req.params.id, 'edit');
      if (!result?.identity) return;
      const state = (await storage.loadYDocState(req.params.id)) ?? new Uint8Array();
      const identity = result.identity;
      const snapshot: Snapshot = {
        id: randomUUID(),
        canvasId: req.params.id,
        kind: 'milestone',
        name: input.name,
        description: input.description,
        createdAt: new Date().toISOString(),
        createdBy: identity.displayName,
        createdByUserId: identity.userId,
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
      const result = await access.ensureCanvas(req, reply, req.params.id, 'edit');
      if (!result?.identity) return;
      const meta = result.canvas;
      const snap = await storage.getSnapshot(req.params.id, req.params.sid);
      if (!snap) return reply.code(404).send({ error: 'Snapshot not found' });
      const bytes = new Uint8Array(Buffer.from(snap.state, 'base64'));
      const identity = result.identity;
      const now = new Date().toISOString();

      if (input.mode === 'replace') {
        await storage.saveYDocState(req.params.id, bytes);
        const updated = await storage.updateCanvasMeta(req.params.id, {
          updatedBy: identity.displayName,
          updatedByUserId: identity.userId,
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
        createdByUserId: identity.userId,
        updatedAt: now,
        updatedBy: identity.displayName,
        updatedByUserId: identity.userId,
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
      const result = await access.ensureCanvas(req, reply, req.params.id, 'edit');
      if (!result) return;
      await storage.deleteSnapshot(req.params.id, req.params.sid);
      return reply.code(204).send();
    },
  );
}
