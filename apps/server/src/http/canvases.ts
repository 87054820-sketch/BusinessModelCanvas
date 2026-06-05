import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { CanvasMeta, Lang } from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import { getIdentity } from './identity.js';

const CreateInput = z.object({
  projectId: z.string().min(1),
  defId: z.string().min(1),
  title: z.string().min(1).max(200),
  language: z.enum(['en', 'zh']),
});

const UpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  language: z.enum(['en', 'zh']).optional(),
});

export function registerCanvasRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  defs: LoadedCanvasDef[],
) {
  const knownDefIds = new Set(defs.map((d) => d.def.id));

  // List canvases, optionally filtered by ?projectId=…
  app.get<{ Querystring: { projectId?: string } }>(
    '/canvases',
    async (req) =>
      storage.listCanvases(
        req.query.projectId ? { projectId: req.query.projectId } : undefined,
      ),
  );

  app.get<{ Params: { id: string } }>('/canvases/:id', async (req, reply) => {
    const canvas = await storage.getCanvas(req.params.id);
    if (!canvas) return reply.code(404).send({ error: 'Canvas not found' });
    return canvas;
  });

  app.post('/canvases', async (req, reply) => {
    const input = CreateInput.parse(req.body);
    if (!knownDefIds.has(input.defId)) {
      return reply.code(400).send({ error: `Unknown canvas def: ${input.defId}` });
    }
    const project = await storage.getProject(input.projectId);
    if (!project) {
      return reply.code(400).send({ error: `Unknown project: ${input.projectId}` });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const identity = getIdentity(req);
    const meta: CanvasMeta = {
      id,
      projectId: input.projectId,
      defId: input.defId,
      title: input.title,
      language: input.language as Lang,
      createdAt: now,
      createdBy: identity.displayName,
      updatedAt: now,
      updatedBy: identity.displayName,
    };
    await storage.createCanvas(meta);
    // Touch the project so it sorts to the top of recent.
    await storage.updateProject(input.projectId, {
      updatedBy: identity.displayName,
    });
    return reply.code(201).send(meta);
  });

  app.patch<{ Params: { id: string } }>('/canvases/:id', async (req, reply) => {
    const patch = UpdateInput.parse(req.body);
    const identity = getIdentity(req);
    try {
      const updated = await storage.updateCanvasMeta(req.params.id, {
        ...patch,
        updatedBy: identity.displayName,
      });
      return updated;
    } catch {
      return reply.code(404).send({ error: 'Canvas not found' });
    }
  });

  app.delete<{ Params: { id: string } }>('/canvases/:id', async (req, reply) => {
    await storage.deleteCanvas(req.params.id);
    return reply.code(204).send();
  });
}
