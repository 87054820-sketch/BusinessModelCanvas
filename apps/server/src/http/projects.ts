import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Project } from '@canvas-collab/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { getIdentity } from './identity.js';

const CreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const UpdateInput = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export function registerProjectRoutes(app: FastifyInstance, storage: CanvasStorage) {
  app.get('/projects', async () => storage.listProjects());

  app.get<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    return project;
  });

  app.get<{ Params: { id: string } }>(
    '/projects/:id/canvases',
    async (req, reply) => {
      const project = await storage.getProject(req.params.id);
      if (!project) return reply.code(404).send({ error: 'Project not found' });
      return storage.listCanvases({ projectId: req.params.id });
    },
  );

  app.post('/projects', async (req, reply) => {
    const input = CreateInput.parse(req.body);
    const identity = getIdentity(req);
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      createdAt: now,
      createdBy: identity.displayName,
      updatedAt: now,
      updatedBy: identity.displayName,
    };
    await storage.createProject(project);
    return reply.code(201).send(project);
  });

  app.patch<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const patch = UpdateInput.parse(req.body);
    const identity = getIdentity(req);
    try {
      const updated = await storage.updateProject(req.params.id, {
        ...patch,
        updatedBy: identity.displayName,
      });
      return updated;
    } catch {
      return reply.code(404).send({ error: 'Project not found' });
    }
  });

  app.delete<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    await storage.deleteProject(req.params.id);
    return reply.code(204).send();
  });
}
