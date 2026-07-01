import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BUNDLED_PLAYBOOKS } from '../copilot/bundledPlaybooks.js';
import { createPreferenceSuggestion } from '../copilot/memorySummarizer.js';
import { CopilotUserProfileStore } from '../copilot/userProfileStore.js';
import { requireIdentity } from './identity.js';

const SuggestionInput = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  suggestedValue: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1).optional(),
  evidenceSummary: z.string().min(1).max(1000),
});

const ConsolidateInput = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(12000),
  })).min(1).max(12),
  projectId: z.string().min(1).max(120).optional(),
  contextLabel: z.string().min(1).max(240).optional(),
});

export function registerCopilotMemoryRoutes(app: FastifyInstance, dataDir: string) {
  const store = new CopilotUserProfileStore(dataDir);

  app.get('/copilot/memory', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.getState(identity.userId);
  });

  app.get('/copilot/memory/export', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return reply.header('Cache-Control', 'no-store').send(await store.getState(identity.userId));
  });

  app.post('/copilot/memory/consolidate', async (req, reply) => {
    const parse = ConsolidateInput.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid request body', details: parse.error.issues });
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.consolidateMemory(identity.userId, parse.data);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/items/:id/archive', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.archiveLayeredMemoryItem(identity.userId, req.params.id);
  });

  app.delete<{ Params: { id: string } }>('/copilot/memory/items/:id', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.deleteLayeredMemoryItem(identity.userId, req.params.id);
  });

  app.post('/copilot/memory/revert-latest', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.revertLatestMemoryChange(identity.userId);
  });

  app.post('/copilot/memory/suggestions', async (req, reply) => {
    const parse = SuggestionInput.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid request body', details: parse.error.issues });
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    const suggestion = await store.addSuggestion(identity.userId, createPreferenceSuggestion(parse.data));
    return reply.code(201).send(suggestion);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/suggestions/:id/accept', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    return store.acceptSuggestion(identity.userId, req.params.id);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/suggestions/:id/ignore', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    const suggestion = await store.ignoreSuggestion(identity.userId, req.params.id);
    if (!suggestion) return reply.code(404).send({ error: 'Suggestion not found' });
    return suggestion;
  });

  app.delete<{ Params: { id: string } }>('/copilot/memory/preferences/:id', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    await store.deletePreference(identity.userId, req.params.id);
    return { ok: true as const };
  });

  app.get('/copilot/playbooks/bundled', async () => BUNDLED_PLAYBOOKS);
}
