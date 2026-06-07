import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Story } from '@pingarden/shared';
import { parseStoryCanvasDirectives } from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { getIdentity } from './identity.js';

const ContentDatePrecision = z.enum(['year', 'month', 'day']);
const StoryStatus = z.enum(['draft', 'published']);
const contentDate = z.string().regex(/^\d{4}(-\d{2}){0,2}$/).optional();

const CreateInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(500_000).optional(),
  status: StoryStatus.optional(),
  contentDate,
  contentDatePrecision: ContentDatePrecision.optional(),
  contentDateLabel: z.string().max(80).optional(),
});

const UpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(500_000).optional(),
  status: StoryStatus.optional(),
  contentDate,
  contentDatePrecision: ContentDatePrecision.optional(),
  contentDateLabel: z.string().max(80).optional(),
});

export function registerStoryRoutes(app: FastifyInstance, storage: CanvasStorage) {
  app.get<{ Querystring: { projectId?: string } }>('/stories', async (req) =>
    storage.listStories(req.query.projectId ? { projectId: req.query.projectId } : undefined),
  );

  app.get<{ Params: { id: string } }>('/projects/:id/stories', async (req, reply) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    return storage.listStories({ projectId: req.params.id });
  });

  app.get<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const story = await storage.getStory(req.params.id);
    if (!story) return reply.code(404).send({ error: 'Story not found' });
    return story;
  });

  app.post('/stories', async (req, reply) => {
    const input = CreateInput.parse(req.body);
    const project = await storage.getProject(input.projectId);
    if (!project) return reply.code(400).send({ error: `Unknown project: ${input.projectId}` });

    const canvasError = await validateEmbeddedCanvases(storage, input.projectId, input.content ?? '');
    if (canvasError) return reply.code(400).send(canvasError);

    const identity = getIdentity(req);
    const now = new Date().toISOString();
    const story: Story = {
      id: randomUUID(),
      projectId: input.projectId,
      title: input.title,
      content: input.content ?? '',
      status: input.status ?? 'draft',
      ...(input.contentDate ? { contentDate: input.contentDate } : {}),
      ...(input.contentDatePrecision ? { contentDatePrecision: input.contentDatePrecision } : {}),
      ...(input.contentDateLabel ? { contentDateLabel: input.contentDateLabel } : {}),
      createdAt: now,
      createdBy: identity.displayName,
      updatedAt: now,
      updatedBy: identity.displayName,
    };
    await storage.createStory(story);
    await storage.updateProject(input.projectId, { updatedBy: identity.displayName });
    return reply.code(201).send(story);
  });

  app.patch<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const patch = UpdateInput.parse(req.body);
    const current = await storage.getStory(req.params.id);
    if (!current) return reply.code(404).send({ error: 'Story not found' });

    if (patch.content !== undefined) {
      const canvasError = await validateEmbeddedCanvases(storage, current.projectId, patch.content);
      if (canvasError) return reply.code(400).send(canvasError);
    }

    const identity = getIdentity(req);
    const updated = await storage.updateStory(req.params.id, {
      ...patch,
      updatedBy: identity.displayName,
    });
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    await storage.deleteStory(req.params.id);
    return reply.code(204).send();
  });
}

async function validateEmbeddedCanvases(
  storage: CanvasStorage,
  projectId: string,
  content: string,
): Promise<{ error: string; canvasId?: string } | null> {
  const directives = parseStoryCanvasDirectives(content);
  for (const d of directives) {
    const canvas = await storage.getCanvas(d.canvasId);
    if (!canvas || canvas.projectId !== projectId) {
      return { error: 'Canvas directive must reference a canvas in the same project', canvasId: d.canvasId };
    }
    if (d.defId && d.defId !== canvas.defId) {
      return { error: 'Canvas directive defId does not match the referenced canvas', canvasId: d.canvasId };
    }
  }
  return null;
}
