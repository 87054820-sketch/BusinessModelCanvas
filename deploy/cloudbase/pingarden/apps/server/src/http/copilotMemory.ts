import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BUNDLED_PLAYBOOKS } from '../copilot/bundledPlaybooks.js';
import { createPreferenceSuggestion } from '../copilot/memorySummarizer.js';
import { CopilotUserProfileStore } from '../copilot/userProfileStore.js';
import { getIdentity } from './identity.js';

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

  app.get('/copilot/memory', async (req) => {
    const identity = getIdentity(req);
    return store.getState(identity.displayName);
  });

  app.get('/copilot/memory/export', async (req, reply) => {
    const identity = getIdentity(req);
    return reply.header('Cache-Control', 'no-store').send(await store.getState(identity.displayName));
  });

  app.post('/copilot/memory/consolidate', async (req, reply) => {
    const parse = ConsolidateInput.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid request body', details: parse.error.issues });
    const identity = getIdentity(req);
    return store.consolidateMemory(identity.displayName, parse.data);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/items/:id/archive', async (req) => {
    const identity = getIdentity(req);
    return store.archiveLayeredMemoryItem(identity.displayName, req.params.id);
  });

  app.delete<{ Params: { id: string } }>('/copilot/memory/items/:id', async (req) => {
    const identity = getIdentity(req);
    return store.deleteLayeredMemoryItem(identity.displayName, req.params.id);
  });

  app.post('/copilot/memory/revert-latest', async (req) => {
    const identity = getIdentity(req);
    return store.revertLatestMemoryChange(identity.displayName);
  });

  app.post('/copilot/memory/suggestions', async (req, reply) => {
    const parse = SuggestionInput.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid request body', details: parse.error.issues });
    const identity = getIdentity(req);
    const suggestion = await store.addSuggestion(identity.displayName, createPreferenceSuggestion(parse.data));
    return reply.code(201).send(suggestion);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/suggestions/:id/accept', async (req) => {
    const identity = getIdentity(req);
    return store.acceptSuggestion(identity.displayName, req.params.id);
  });

  app.post<{ Params: { id: string } }>('/copilot/memory/suggestions/:id/ignore', async (req, reply) => {
    const identity = getIdentity(req);
    const suggestion = await store.ignoreSuggestion(identity.displayName, req.params.id);
    if (!suggestion) return reply.code(404).send({ error: 'Suggestion not found' });
    return suggestion;
  });

  app.delete<{ Params: { id: string } }>('/copilot/memory/preferences/:id', async (req) => {
    const identity = getIdentity(req);
    await store.deletePreference(identity.displayName, req.params.id);
    return { ok: true as const };
  });

  app.get('/copilot/playbooks/bundled', async () => BUNDLED_PLAYBOOKS);
}
