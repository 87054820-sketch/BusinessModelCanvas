import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Story } from '@pingarden/shared';
import { parseStoryCanvasDirectives } from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { ProjectAccessService } from '../auth/ProjectAccessService.js';
import { getOptionalIdentity } from './identity.js';

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

export function registerStoryRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  access: ProjectAccessService,
) {
  app.get<{ Querystring: { projectId?: string } }>('/stories', async (req, reply) => {
    if (req.query.projectId) {
      const result = await access.ensureProject(req, reply, req.query.projectId, 'view');
      if (!result) return;
      return storage.listStories({ projectId: req.query.projectId });
    }
    const projects = await access.listAccessibleProjects(getOptionalIdentity(req));
    const lists = await Promise.all(projects.map((p) => storage.listStories({ projectId: p.id })));
    return lists.flat();
  });

  app.get<{ Params: { id: string } }>('/projects/:id/stories', async (req, reply) => {
    const result = await access.ensureProject(req, reply, req.params.id, 'view');
    if (!result) return;
    return storage.listStories({ projectId: req.params.id });
  });

  app.get<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const result = await access.ensureStory(req, reply, req.params.id, 'view');
    if (!result) return;
    return result.story;
  });

  app.post('/stories', async (req, reply) => {
    const input = CreateInput.parse(req.body);
    const projectAccess = await access.ensureProject(req, reply, input.projectId, 'edit');
    if (!projectAccess?.identity) return;

    const canvasError = await validateEmbeddedCanvases(storage, input.projectId, input.content ?? '');
    if (canvasError) return reply.code(400).send(canvasError);

    const identity = projectAccess.identity;
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
      createdByUserId: identity.userId,
      updatedAt: now,
      updatedBy: identity.displayName,
      updatedByUserId: identity.userId,
    };
    await storage.createStory(story);
    await storage.updateProject(input.projectId, {
      updatedBy: identity.displayName,
      updatedByUserId: identity.userId,
    });
    return reply.code(201).send(story);
  });

  app.patch<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const patch = UpdateInput.parse(req.body);
    const result = await access.ensureStory(req, reply, req.params.id, 'edit');
    if (!result?.identity) return;
    const current = result.story;

    if (patch.content !== undefined) {
      const canvasError = await validateEmbeddedCanvases(storage, current.projectId, patch.content);
      if (canvasError) return reply.code(400).send(canvasError);
    }

    const identity = result.identity;
    const updated = await storage.updateStory(req.params.id, {
      ...patch,
      updatedBy: identity.displayName,
      updatedByUserId: identity.userId,
    });
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const result = await access.ensureStory(req, reply, req.params.id, 'edit');
    if (!result) return;
    await storage.deleteStory(req.params.id);
    return reply.code(204).send();
  });
}

async function validateEmbeddedCanvases(
  storage: CanvasStorage,
  projectId: string,
  content: string,
): Promise<{ error: string; canvasId?: string; defId?: string; variantId?: string } | null> {
  const directives = parseStoryCanvasDirectives(content);
  const projectCanvases = directives.some((d) => !d.canvasId)
    ? await storage.listCanvases({ projectId })
    : [];

  for (const d of directives) {
    if (d.canvasId) {
      const canvas = await storage.getCanvas(d.canvasId);
      if (!canvas || canvas.projectId !== projectId) {
        return { error: 'Canvas directive must reference a canvas in the same project', canvasId: d.canvasId };
      }
      if (d.defId && d.defId !== canvas.defId) {
        return { error: 'Canvas directive defId does not match the referenced canvas', canvasId: d.canvasId };
      }
      if (d.variantId && d.variantId !== canvas.variant?.id) {
        return { error: 'Canvas directive variant does not match the referenced canvas', canvasId: d.canvasId };
      }
      continue;
    }

    if (!d.defId) continue;
    const candidates = projectCanvases.filter((c) => c.defId === d.defId);
    const match = d.variantId
      ? candidates.find((c) => c.variant?.id === d.variantId)
      : candidates[0];
    if (!match) {
      return {
        error: 'Canvas directive must resolve to a canvas in the same project',
        defId: d.defId,
        ...(d.variantId ? { variantId: d.variantId } : {}),
      };
    }
  }
  return null;
}
