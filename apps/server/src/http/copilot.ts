import type { ServerResponse } from 'node:http';
import type { FastifyInstance, FastifyReply } from 'fastify';
import * as Y from 'yjs';
import { z } from 'zod';
import {
  COPILOT_ACCEPTED_IMAGE_TYPES,
  COPILOT_MAX_IMAGE_ATTACHMENTS,
  COPILOT_MAX_IMAGE_BYTES,
  type CanvasMeta,
  type CaseLibraryEntry,
  type CopilotImageAttachment,
  type Lang,
  type LibraryResourceDetail,
  type ResourceChapterDetail,
  type ResourceChapterMeta,
} from '@pingarden/shared';
import type { FederatedStorage } from '../storage/FederatedStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import type {
  CopilotAiChatMessage,
  CopilotAiMetricEvent,
  CopilotAiProviderKind,
  CopilotModelId,
} from '../llm/aiProvider.js';
import {
  COPILOT_MODEL_VALUES,
  COPILOT_PROVIDER_VALUES,
  type CopilotAiRouter,
  type CopilotAiSelection,
  CopilotAiSelectionError,
  createCopilotAiRouter,
} from '../llm/copilotAiRouter.js';
import { buildBundledPlaybookPrompt } from '../copilot/bundledPlaybooks.js';
import { buildMemorySuggestionPrompt } from '../copilot/memorySummarizer.js';
import { buildCopilotProtocol, type CopilotProtocolIntent } from '../copilot/protocols.js';
import { CopilotUserProfileStore } from '../copilot/userProfileStore.js';
import { config } from '../config.js';
import { requireIdentity } from './identity.js';
import { stripEmptyAssistantMessages } from './copilotMessages.js';
import type { ProjectAccessService } from '../auth/ProjectAccessService.js';

const STICKIES_KEY = 'stickies';
const ACCEPTED_IMAGE_TYPES = COPILOT_ACCEPTED_IMAGE_TYPES;
const MAX_IMAGE_ATTACHMENTS = COPILOT_MAX_IMAGE_ATTACHMENTS;
const MAX_IMAGE_BYTES = COPILOT_MAX_IMAGE_BYTES;
const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 128;
const COPILOT_SSE_HEARTBEAT_MS = 15_000;
const MAX_ATTACHED_CONTEXT_CHARS = 12_000;

/**
 * Copilot HTTP surface — AI provider chat routes:
 *
 *   GET  /copilot/health                 → active provider + provider list
 *   POST /copilot/test-key               → {ok:bool, message?:string}
 *   POST /copilot/chat                   → SSE stream of {delta} from selected provider
 *   GET  /copilot/case-context/:slug     → pre-formatted markdown brief
 *   GET  /copilot/pattern-context/:slug  → pre-formatted markdown brief
 *
 * Design choices:
 * - **No server-side key persistence.** The renderer holds the
 *   provider key in browser storage (via Electron safeStorage where
 *   available), decrypts it for each chat turn, and includes the
 *   plaintext in the request body. The server uses it only for the
 *   request lifetime. Kimi CLI mode renders config into a temporary
 *   HOME for the spawned process; PinGarden never persists keys in its
 *   dataDir or the user's global Kimi config.
 * - **Provider transports.** Kimi CLI streams through the bundled binary;
 *   Kimi HTTP and DeepSeek HTTP share an OpenAI-compatible streaming
 *   adapter.
 * - **SSE wire shape:** uniform `data: {"delta": "..."}` frames followed
 *   by a final `data: {"done": true}` frame. Errors emit a single
 *   `data: {"error": "..."}` frame before closing. Matches what the
 *   renderer's parser expects (unchanged from Round 1).
 */
export function registerCopilotRoutes(
  app: FastifyInstance,
  storage: FederatedStorage,
  defs: LoadedCanvasDef[],
  access: ProjectAccessService,
) {
  const bundle = storage.bundleStorage;
  const defsById = new Map(defs.map((d) => [d.def.id, d]));
  const profileStore = new CopilotUserProfileStore(config.dataDir);
  const aiRouter = createCopilotAiRouter(config.aiProvider);

  // ── GET /copilot/health ──────────────────────────────────────────────
  app.get('/copilot/health', async () => {
    return aiRouter.health();
  });

  // ── POST /copilot/test-key ──────────────────────────────────────────
  const TestKeySchema = z.object({
    apiKey: z.string().min(1),
    model: z.enum(COPILOT_MODEL_VALUES).optional(),
    provider: z.enum(COPILOT_PROVIDER_VALUES).optional(),
  });

  app.post('/copilot/test-key', async (req, reply) => {
    const parse = TestKeySchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ ok: false, message: 'Invalid request body' });
    }
    const selection = resolveAiSelection(reply, aiRouter, parse.data);
    if (!selection) return;
    return reply.send(await selection.provider.testKey(parse.data.apiKey));
  });

  // ── POST /copilot/clear-key ─────────────────────────────────────────
  const ClearKeySchema = z.object({
    model: z.enum(COPILOT_MODEL_VALUES).optional(),
    provider: z.enum(COPILOT_PROVIDER_VALUES).optional(),
  }).optional();

  app.post('/copilot/clear-key', async (req, reply) => {
    const parse = ClearKeySchema.safeParse(req.body);
    if (!parse.success) return reply.code(400).send({ ok: false, message: 'Invalid request body' });
    const selection = resolveAiSelection(reply, aiRouter, parse.data);
    if (!selection) return;
    return reply.send(await selection.provider.clearKey());
  });

  // ── POST /copilot/chat — SSE stream proxy ────────────────────────────

  const ImageAttachmentSchema = z.object({
    id: z.string().min(1).max(120),
    name: z.string().min(1).max(240),
    mimeType: z.enum(ACCEPTED_IMAGE_TYPES),
    sizeBytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
    dataUrl: z.string().min(1).max(MAX_IMAGE_DATA_URL_LENGTH),
  });

  const ChatRequestSchema = z.object({
    apiKey: z.string().min(1),
    model: z.enum(COPILOT_MODEL_VALUES).optional(),
    provider: z.enum(COPILOT_PROVIDER_VALUES).optional(),
    intent: z.enum(['project-draft', 'project-update', 'discussion-insight', 'apply-learning-to-project']).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
          imageAttachments: z.array(ImageAttachmentSchema).max(MAX_IMAGE_ATTACHMENTS).optional(),
        }),
      )
      .min(1),
    /** Optional pre-fetched case/pattern markdown digest. */
    attachedContext: z.string().optional(),
    /** UI language — controls the quality-rules prompt language. */
    lang: z.enum(['en', 'zh']).optional(),
  });

  app.post('/copilot/chat', async (req, reply) => {
    const routeStartedAt = Date.now();
    const timings: Record<string, number> = {};
    const providerTimings: Record<string, number> = {};
    const providerDetails: Record<string, Record<string, string | number | boolean | null>> = {};
    const mark = (name: string) => {
      timings[name] = Date.now() - routeStartedAt;
    };
    const recordProviderMetric = (event: CopilotAiMetricEvent) => {
      providerTimings[event.name] = event.atMs - routeStartedAt;
      if (event.details) providerDetails[event.name] = event.details;
    };

    const identity = requireIdentity(req, reply);
    if (!identity) return;
    mark('identityMs');
    const parse = ChatRequestSchema.safeParse(req.body);
    mark('requestParsedMs');
    if (!parse.success) {
      req.log.warn(
        {
          route: '/copilot/chat',
          displayName: identity.displayName,
          issues: parse.error.issues,
        },
        'Copilot chat rejected: invalid request body',
      );
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parse.error.issues,
      });
    }

    const body = parse.data;
    const selection = resolveAiSelection(reply, aiRouter, body);
    if (!selection) return;
    const sanitizedMessages = stripEmptyAssistantMessages(body.messages);
    const strippedEmptyAssistantCount = body.messages.length - sanitizedMessages.length;
    const attachmentCount = sanitizedMessages.reduce(
      (total, message) => total + (message.imageAttachments?.length ?? 0),
      0,
    );
    mark('messagesPreparedMs');
    const requestLog = req.log.child({
      route: '/copilot/chat',
      displayName: identity.displayName,
      model: selection.model,
      provider: selection.providerId,
      intent: body.intent ?? null,
      lang: body.lang ?? null,
      messageCount: body.messages.length,
      sanitizedMessageCount: sanitizedMessages.length,
      strippedEmptyAssistantCount,
      attachmentCount,
      attachedContextChars: body.attachedContext?.length ?? 0,
    });

    const attachmentError = validateImageAttachments(
      sanitizedMessages.flatMap((msg) => msg.imageAttachments ?? []),
    );
    if (attachmentError) {
      requestLog.warn({ error: attachmentError, timings }, 'Copilot chat rejected: invalid attachments');
      return reply.code(400).send({ error: attachmentError });
    }
    mark('attachmentsValidatedMs');

    // Hijack the reply so Fastify won't try to serialise a body on our
    // behalf — we write the SSE stream to reply.raw directly.
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': req.id,
    });
    raw.flushHeaders?.();
    mark('responseHeadersFlushedMs');
    writeSseComment(raw, 'stream-open');
    mark('streamOpenCommentMs');

    const heartbeat = setInterval(() => {
      if (!raw.writableEnded) writeSseComment(raw, 'heartbeat');
    }, COPILOT_SSE_HEARTBEAT_MS);

    // Watch the RESPONSE stream for client disconnect (not req.raw — see
    // the long comment in the previous round's code for why).
    const abort = new AbortController();
    let clientDisconnected = false;
    raw.on('close', () => {
      if (!raw.writableEnded) {
        clientDisconnected = true;
        abort.abort();
      }
    });

    // Split messages[] into "prior conversation" + "latest user msg".
    // The renderer always appends a final user turn; we expect that.
    const lastIdx = sanitizedMessages.length - 1;
    const last = sanitizedMessages[lastIdx];
    if (!last || last.role !== 'user') {
      requestLog.warn({ lastRole: last?.role ?? null, timings }, 'Copilot chat rejected: last message must be user');
      writeSseData(raw, { error: 'Last message must be from user', requestId: req.id });
      raw.end();
      clearInterval(heartbeat);
      return;
    }

    const prior: CopilotAiChatMessage[] = sanitizedMessages.slice(0, lastIdx).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const startedAt = Date.now();
    let deltaChunks = 0;
    let deltaChars = 0;

    requestLog.info(
      {
        priorMessageCount: prior.length,
        latestUserChars: last.content.length,
      },
      'Copilot chat stream started',
    );

    try {
      const memoryStartedAt = Date.now();
      const userProfileContext = await profileStore.buildPromptContext(identity.userId);
      timings.memoryPromptContextMs = Date.now() - memoryStartedAt;
      mark('memoryPromptContextDoneMs');

      const promptStartedAt = Date.now();
      const systemPromptText = buildSystemPrompt(body.attachedContext, userProfileContext);
      const latestUserMsg = buildLatestUserMessage(last.content, last.imageAttachments ?? [], body.intent, body.lang);
      timings.promptBuildMs = Date.now() - promptStartedAt;
      timings.systemPromptChars = systemPromptText.length;
      timings.latestUserPromptChars = latestUserMsg.length;
      timings.priorConversationChars = prior.reduce((total, message) => total + message.content.length, 0);
      mark('preUpstreamDoneMs');

      for await (const chunk of selection.provider.streamChat({
        apiKey: body.apiKey,
        systemPromptText,
        conversation: prior,
        latestUserMsg,
        signal: abort.signal,
        metrics: recordProviderMetric,
      })) {
        if (raw.writableEnded) break;
        if ('error' in chunk) {
          requestLog.warn(
            {
              durationMs: Date.now() - startedAt,
              totalMs: Date.now() - routeStartedAt,
              deltaChunks,
              deltaChars,
              upstreamError: chunk.error,
              timings,
              providerTimings,
              providerDetails,
            },
            'Copilot chat upstream returned error',
          );
          writeSseData(raw, { error: chunk.error, requestId: req.id });
          raw.end();
          return;
        }
        if (chunk.delta) {
          if (deltaChunks === 0) mark('firstDownstreamDeltaMs');
          deltaChunks += 1;
          deltaChars += chunk.delta.length;
          writeSseData(raw, { delta: chunk.delta });
        }
      }

      if (!raw.writableEnded) {
        const totalMs = Date.now() - routeStartedAt;
        timings.totalMs = totalMs;
        writeSseData(raw, {
          done: true,
          requestId: req.id,
          model: selection.model,
          provider: selection.providerId,
          timings,
          providerTimings,
        });
        raw.end();
        requestLog.info(
          {
            durationMs: Date.now() - startedAt,
            totalMs,
            deltaChunks,
            deltaChars,
            timings,
            providerTimings,
            providerDetails,
          },
          'Copilot chat stream completed',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (clientDisconnected || abort.signal.aborted) {
        requestLog.info(
          {
            durationMs: Date.now() - startedAt,
            totalMs: Date.now() - routeStartedAt,
            deltaChunks,
            deltaChars,
            timings,
            providerTimings,
            providerDetails,
          },
          'Copilot chat stream aborted by client',
        );
        return;
      }
      requestLog.warn(
        {
          durationMs: Date.now() - startedAt,
          totalMs: Date.now() - routeStartedAt,
          deltaChunks,
          deltaChars,
          err: msg,
          timings,
          providerTimings,
          providerDetails,
        },
        'Copilot chat stream failed',
      );
      if (!raw.writableEnded) {
        writeSseData(raw, { error: msg, requestId: req.id });
        raw.end();
      }
    } finally {
      clearInterval(heartbeat);
    }
  });

  // ── GET /copilot/library-context ─────────────────────────────────────

  app.get<{
    Querystring: { lang?: string; q?: string };
  }>('/copilot/library-context', async (req, reply) => {
    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = await buildLibraryMarkdown(bundle, storage, defs, defsById, lang, req.query.q);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/case-context/:slug ──────────────────────────────────

  app.get<{
    Params: { slug: string };
    Querystring: { lang?: string };
  }>('/copilot/case-context/:slug', async (req, reply) => {
    const entry = bundle.getCaseBySlug(req.params.slug);
    if (!entry) return reply.code(404).send({ error: 'Case not found' });

    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = await buildCaseMarkdown(entry.projectId, entry.slug, storage, defsById, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/pattern-context/:slug ───────────────────────────────

  app.get<{
    Params: { slug: string };
    Querystring: { lang?: string };
  }>('/copilot/pattern-context/:slug', async (req, reply) => {
    const detail = await bundle.getPattern(req.params.slug);
    if (!detail) return reply.code(404).send({ error: 'Pattern not found' });

    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = buildPatternMarkdown(detail, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/resource-context/:slug ──────────────────────────────

  app.get<{
    Params: { slug: string };
    Querystring: { lang?: string; q?: string };
  }>('/copilot/resource-context/:slug', async (req, reply) => {
    const detail = await bundle.getResource(req.params.slug);
    if (!detail) return reply.code(404).send({ error: 'Resource not found' });

    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = await buildResourceMarkdown(bundle, detail, lang, req.query.q);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/project-context/:id ─────────────────────────────────

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string; activeCanvasId?: string; activeStoryId?: string };
  }>('/copilot/project-context/:id', async (req, reply) => {
    const projectAccess = await access.ensureProject(req, reply, req.params.id, 'view');
    if (!projectAccess) return;
    const project = projectAccess.project;

    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = await buildProjectMarkdown(
      project.id,
      storage,
      defsById,
      lang,
      req.query.activeCanvasId,
      req.query.activeStoryId,
    );
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/canvas-context/:id ──────────────────────────────────

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string };
  }>('/copilot/canvas-context/:id', async (req, reply) => {
    const canvasAccess = await access.ensureCanvas(req, reply, req.params.id, 'view');
    if (!canvasAccess) return;
    const canvas = canvasAccess.canvas;

    const lang = parseLang(req.query.lang) ?? canvas.language;
    const markdown = await buildCanvasMarkdown(canvas, storage, defsById, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/story-context/:id ───────────────────────────────────

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string };
  }>('/copilot/story-context/:id', async (req, reply) => {
    const storyAccess = await access.ensureStory(req, reply, req.params.id, 'view');
    if (!storyAccess) return;
    const story = storyAccess.story;

    const lang = parseLang(req.query.lang) ?? story.language ?? 'en';
    const markdown = await buildStoryMarkdown(story.id, storage, defsById, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });
}

function resolveAiSelection(
  reply: FastifyReply,
  aiRouter: CopilotAiRouter,
  input: { model?: CopilotModelId; provider?: CopilotAiProviderKind } | undefined,
): CopilotAiSelection | null {
  try {
    return aiRouter.resolve(input);
  } catch (err) {
    if (err instanceof CopilotAiSelectionError) {
      reply.code(400).send({ ok: false, message: err.message });
      return null;
    }
    throw err;
  }
}

function writeSseComment(raw: ServerResponse, comment: string): void {
  raw.write(`: ${comment}\n\n`);
}

function writeSseData(raw: ServerResponse, payload: Record<string, unknown>): void {
  raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function validateImageAttachments(images: CopilotImageAttachment[]): string | null {
  for (const image of images) {
    const prefix = `data:${image.mimeType};base64,`;
    if (!image.dataUrl.startsWith(prefix)) {
      return `Invalid image data URL for ${image.name}`;
    }
    const base64 = image.dataUrl.slice(prefix.length);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      return `Invalid image base64 payload for ${image.name}`;
    }
    const actualBytes = Buffer.byteLength(base64, 'base64');
    if (actualBytes > MAX_IMAGE_BYTES || actualBytes !== image.sizeBytes) {
      return `Invalid image size for ${image.name}`;
    }
  }
  return null;
}

function buildLatestUserMessage(
  content: string,
  images: CopilotImageAttachment[],
  intent?: CopilotProtocolIntent,
  lang?: 'en' | 'zh',
): string {
  const lines = [content.trim()];
  if (intent) {
    lines.push('', buildCopilotProtocol(intent, lang));
  }
  if (images.length > 0) {
    lines.push('', '## Attached images');
    lines.push('The user attached the following original, uncompressed images as source material. Use every visible label/sticky/note in every image. Extract sourceFindings first, then map each finding to canvas stickies or story content; do not silently drop visible items.');
    for (const [index, image] of images.entries()) {
      lines.push('');
      lines.push(`### Image ${index + 1}: ${image.name}`);
      lines.push(`- MIME type: ${image.mimeType}`);
      lines.push(`- Size: ${image.sizeBytes} bytes`);
      lines.push(`![${escapeMarkdownAlt(image.name)}](${image.dataUrl})`);
    }
  }
  return lines.join('\n').trim();
}

function escapeMarkdownAlt(input: string): string {
  return input.replace(/[\[\]]/g, '');
}

function parseLang(raw: string | undefined): Lang | undefined {
  return raw === 'en' || raw === 'zh' ? raw : undefined;
}

function localize(
  label: { en: string; zh: string } | undefined,
  lang: Lang,
): string {
  if (!label) return '';
  return label[lang] || label.en || label.zh || '';
}

interface LibraryQuery {
  original: string;
  terms: string[];
}

function buildLibraryQuery(raw: string | undefined): LibraryQuery | null {
  const original = (raw ?? '').trim().slice(0, 200);
  if (!original) return null;
  const lower = original.toLowerCase();
  const terms = new Set<string>();
  for (const token of lower.split(/[^\p{L}\p{N}_-]+/u)) {
    if (token.length >= 2) terms.add(token);
  }
  for (const token of original.match(/[\p{Script=Han}]{2,}/gu) ?? []) terms.add(token);
  if (/蓝海|blue\s*ocean/i.test(original)) {
    ['blue-ocean-strategy', 'blue ocean', 'strategy-canvas', 'strategy canvas', 'yellowtail', 'yellow tail', 'cirque'].forEach((term) => terms.add(term));
  }
  if (/环境|environment|扫描|scan/i.test(original)) {
    ['business-model-environment', 'environment-scan', 'pestel', 'scenario'].forEach((term) => terms.add(term));
  }
  if (/平台|platform/i.test(original)) {
    ['multi-sided', 'platform', 'ecosystem'].forEach((term) => terms.add(term));
  }
  if (/价值主张|value\s*proposition/i.test(original)) {
    ['value-proposition-canvas', 'value proposition', 'jobs-to-be-done'].forEach((term) => terms.add(term));
  }
  return { original, terms: [...terms].filter(Boolean) };
}

function selectRelevant<T>(items: T[], query: LibraryQuery, fields: (item: T) => string[], max: number): T[] {
  const scored = items
    .map((item, index) => {
      const haystack = fields(item).filter(Boolean).join(' ').toLowerCase();
      let score = 0;
      for (const term of query.terms) {
        const normalizedTerm = term.toLowerCase();
        if (!normalizedTerm) continue;
        if (haystack.includes(normalizedTerm)) score += normalizedTerm.length >= 6 ? 3 : 1;
      }
      return { item, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (scored.length === 0) return items.slice(0, max);
  return scored.slice(0, max).map((entry) => entry.item);
}

async function buildLibraryMarkdown(
  bundle: FederatedStorage['bundleStorage'],
  storage: FederatedStorage,
  defs: LoadedCanvasDef[],
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
  query?: string,
): Promise<string> {
  const lines: string[] = [];
  const q = buildLibraryQuery(query);
  const selectedDefs = q ? selectRelevant(defs, q, (item) => [
    item.def.id,
    item.def.name.en,
    item.def.name.zh,
    ...(item.def.related ?? []),
  ], 12) : defs;
  const cases = q ? selectRelevant(bundle.listCases(), q, (entry) => [
    entry.slug,
    localize(entry.companyName, lang),
    localize(entry.summary, lang),
    entry.kind,
    ...entry.tags,
    ...(entry.appliesPatterns ?? []),
    ...(entry.appliesStrategyFrameworks ?? []),
  ], 12) : bundle.listCases();
  const patterns = q ? selectRelevant(bundle.listPatterns(), q, (pattern) => [
    pattern.slug,
    localize(pattern.name, lang),
    localize(pattern.summary, lang),
    ...(pattern.examples?.map((e) => e.slug) ?? []),
  ], 8) : bundle.listPatterns();
  const frameworks = q ? selectRelevant(bundle.listStrategyFrameworks(), q, (framework) => [
    framework.slug,
    localize(framework.name, lang),
    localize(framework.summary, lang),
    framework.category ?? '',
    ...(framework.relatedCanvasDefIds ?? []),
    ...(framework.examples?.map((e) => e.slug) ?? []),
  ], 8) : bundle.listStrategyFrameworks();
  const experiments = q ? selectRelevant(bundle.listExperiments(), q, (experiment) => [
    experiment.slug,
    localize(experiment.name, lang),
    localize(experiment.summary, lang),
    experiment.theme,
    experiment.evidenceStrength,
    ...experiment.risks,
    ...experiment.appliesToCanvases,
  ], 6) : bundle.listExperiments();
  const resources = q ? selectRelevant(bundle.listResources(), q, (resource) => [
    resource.slug,
    resource.type,
    localize(resource.title, lang),
    localize(resource.summary, lang),
    ...(resource.relatedCaseSlugs ?? []),
    ...(resource.relatedCanvasDefIds ?? []),
  ], 8) : bundle.listResources();

  lines.push('# PinGarden Strategy Library');
  lines.push('');
  lines.push('This is the curated PinGarden library available in the app. Use these real ids/slugs when recommending content. Do not claim the library is empty.');
  lines.push('');
  lines.push('Taxonomy rules: Cases are concrete company/industry/comparison examples listed only under ## Cases. Resources are books/articles/papers/reports/web pages listed only under ## Resources; never call a resource a case. Canvas templates, business-model patterns, strategy frameworks, and experiments are method assets, not cases. When answering in Chinese, use “案例” only for ## Cases and use “参考阅读/资料/书籍” for ## Resources.');
  lines.push('');
  lines.push(`Counts in this brief: ${cases.length} cases, ${selectedDefs.length} canvas templates, ${patterns.length} business-model patterns, ${frameworks.length} strategy frameworks, ${experiments.length} experiments, ${resources.length} resources.`);
  if (q) lines.push(`Filtered for user question: ${q.original}`);
  lines.push('');

  lines.push('## Canvas templates');
  for (const item of selectedDefs) {
    const name = item.def.name[lang] ?? item.def.name.en;
    const related = item.def.related?.length ? `; pairs with: ${item.def.related.join(', ')}` : '';
    lines.push(`- ${name} (defId: ${item.def.id}${related})`);
  }
  lines.push('');

  lines.push('## Cases');
  for (const entry of cases) {
    const name = localize(entry.companyName, lang);
    const summary = localize(entry.summary, lang);
    const tags = entry.tags.length ? `; tags: ${entry.tags.join(', ')}` : '';
    const patternsText = entry.appliesPatterns?.length
      ? `; patterns: ${entry.appliesPatterns.join(', ')}`
      : '';
    const frameworksText = entry.appliesStrategyFrameworks?.length
      ? `; frameworks: ${entry.appliesStrategyFrameworks.join(', ')}`
      : '';
    const counts = `${entry.canvasCount} canvases, ${entry.storyCount} stories`;
    lines.push(`- ${name} (slug: ${entry.slug}; kind: ${entry.kind}; ${counts}${tags}${patternsText}${frameworksText}) — ${summary}`);
  }
  if (q) await appendCaseDetailHints(lines, cases.slice(0, 6), storage, defsById, lang);
  lines.push('');

  lines.push('## Business-model patterns');
  for (const pattern of patterns) {
    const name = localize(pattern.name, lang);
    const summary = localize(pattern.summary, lang);
    const examples = pattern.examples?.map((e) => e.slug).join(', ');
    lines.push(`- ${name} (slug: ${pattern.slug}${examples ? `; examples: ${examples}` : ''}) — ${summary}`);
  }
  lines.push('');

  lines.push('## Strategy frameworks');
  for (const framework of frameworks) {
    const name = localize(framework.name, lang);
    const summary = localize(framework.summary, lang);
    const examples = framework.examples?.map((e) => e.slug).join(', ');
    const related = framework.relatedCanvasDefIds?.length
      ? `; related canvases: ${framework.relatedCanvasDefIds.join(', ')}`
      : '';
    lines.push(`- ${name} (slug: ${framework.slug}${framework.category ? `; category: ${framework.category}` : ''}${related}${examples ? `; examples: ${examples}` : ''}) — ${summary}`);
  }
  lines.push('');

  lines.push('## Experiments');
  for (const experiment of experiments) {
    const name = localize(experiment.name, lang);
    const summary = localize(experiment.summary, lang);
    lines.push(`- ${name} (slug: ${experiment.slug}; theme: ${experiment.theme}; risks: ${experiment.risks.join(', ')}; evidence: ${experiment.evidenceStrength}; applies to: ${experiment.appliesToCanvases.join(', ')}) — ${summary}`);
  }
  lines.push('');

  lines.push('## Resources');
  lines.push('Resource entries are source materials. When a resource has chapters, use the chapter summaries below to ground deeper strategy guidance; recommend opening or reading a specific chapter when useful.');
  for (const resource of resources) {
    const title = localize(resource.title, lang);
    const summary = localize(resource.summary, lang);
    const relatedCases = resource.relatedCaseSlugs?.length
      ? `; related cases: ${resource.relatedCaseSlugs.join(', ')}`
      : '';
    const relatedCanvases = resource.relatedCanvasDefIds?.length
      ? `; related canvases: ${resource.relatedCanvasDefIds.join(', ')}`
      : '';
    const chapterCount = resource.chapterCount ? `; chapters: ${resource.chapterCount}` : '';
    lines.push(`- ${title} (slug: ${resource.slug}; type: ${resource.type}${resource.year ? `; year: ${resource.year}` : ''}${chapterCount}${relatedCases}${relatedCanvases}) — ${summary}`);
    if (resource.chapterCount) {
      const chapters = await bundle.getResourceChapters(resource.slug);
      const selectedChapters = q && chapters
        ? selectRelevant(chapters, q, resourceChapterSearchFields(lang), 4)
        : chapters?.slice(0, 4);
      for (const chapter of selectedChapters ?? []) {
        const chapterTitle = localize(chapter.title, lang);
        const chapterSummary = localize(chapter.summary, lang);
        const refs = [
          ...(chapter.relatedCanvasDefIds ?? []).map((id) => `canvas:${id}`),
          ...(chapter.relatedPatternSlugs ?? []).map((slug) => `pattern:${slug}`),
          ...(chapter.relatedCaseSlugs ?? []).map((slug) => `case:${slug}`),
        ];
        lines.push(`  - chapter ${chapter.slug}: ${chapterTitle}${refs.length ? ` (${refs.join(', ')})` : ''} — ${chapterSummary}`);
      }
    }
  }

  const markdown = lines.join('\n').trim();
  return q ? limitMarkdown(markdown, MAX_ATTACHED_CONTEXT_CHARS) : markdown;
}

async function appendCaseDetailHints(
  lines: string[],
  cases: CaseLibraryEntry[],
  storage: FederatedStorage,
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
): Promise<void> {
  if (cases.length === 0) return;
  lines.push('');
  lines.push('## Case detail hints');
  lines.push('Use these snippets to explain cases with one more level of detail: what changed, the operating mechanism, and how the lesson transfers.');
  for (const entry of cases) {
    const name = localize(entry.companyName, lang);
    lines.push(`### ${name} (${entry.slug})`);
    const stories = await storage.listStories({ projectId: entry.projectId });
    const langStories = stories.filter((story) => !story.language || story.language === lang);
    const usedStories = (langStories.length > 0 ? langStories : stories).slice(0, 2);
    for (const meta of usedStories) {
      const full = await storage.getStory(meta.id);
      const excerpt = cleanContextExcerpt(full?.content ?? '', 520);
      if (excerpt) lines.push(`- Story “${full?.title ?? meta.title}”: ${excerpt}`);
    }

    const canvases = await storage.listCanvases({ projectId: entry.projectId });
    const langCanvases = canvases.filter((canvas) => canvas.language === lang);
    const usedCanvases = (langCanvases.length > 0 ? langCanvases : canvases).slice(0, 2);
    for (const canvas of usedCanvases) {
      const block = defsById.get(canvas.defId);
      if (!block) continue;
      const zoneText = await hydrateStickiesByZone(canvas, storage);
      const i18n = block.i18n[lang] ?? block.i18n.en;
      const zones: string[] = [];
      for (const zone of block.def.zones) {
        const stickies = zoneText.get(zone.id);
        if (!stickies?.length) continue;
        const zoneTitle = i18n?.blocks[zone.id]?.title ?? zone.id;
        zones.push(`${zoneTitle}: ${stickies.slice(0, 2).map(stripHtml).join(' / ')}`);
        if (zones.length >= 3) break;
      }
      if (zones.length) {
        const defName = block.def.name[lang] ?? block.def.name.en;
        lines.push(`- Canvas “${canvas.title}” (${defName}): ${zones.join('; ')}`);
      }
    }
  }
}

function cleanContextExcerpt(input: string, maxChars: number): string {
  return stripHtml(input)
    .replace(/^::canvas[^\n]*$/gim, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, maxChars)
    .trim();
}

function resourceChapterSearchFields(lang: Lang): (chapter: ResourceChapterMeta) => string[] {
  return (chapter) => [
    chapter.slug,
    localize(chapter.title, lang),
    localize(chapter.summary, lang),
    ...(chapter.relatedCanvasDefIds ?? []),
    ...(chapter.relatedPatternSlugs ?? []),
    ...(chapter.relatedCaseSlugs ?? []),
  ];
}

async function buildResourceMarkdown(
  bundle: FederatedStorage['bundleStorage'],
  detail: LibraryResourceDetail,
  lang: Lang,
  query?: string,
): Promise<string> {
  const lines: string[] = [];
  const resource = detail.resource;
  const title = localize(resource.title, lang);
  const summary = localize(resource.summary, lang);
  const recommendation = localize(resource.recommendation, lang);
  const description = detail.description[lang] || detail.description.en || detail.description.zh || '';
  const q = buildLibraryQuery(query);

  lines.push(`# Resource: ${title}`);
  lines.push('');
  lines.push(`- slug: ${resource.slug}`);
  lines.push(`- type: ${resource.type}`);
  if (resource.authors.length) lines.push(`- authors: ${resource.authors.join(', ')}`);
  if (resource.publisher || resource.year) lines.push(`- publication: ${[resource.publisher, resource.year].filter(Boolean).join(' · ')}`);
  if (resource.tags?.length) lines.push(`- tags: ${resource.tags.join(', ')}`);
  if (resource.relatedCanvasDefIds?.length) lines.push(`- related canvases: ${resource.relatedCanvasDefIds.join(', ')}`);
  if (resource.relatedPatternSlugs?.length) lines.push(`- related patterns: ${resource.relatedPatternSlugs.join(', ')}`);
  if (resource.relatedStrategyFrameworkSlugs?.length) lines.push(`- related strategy frameworks: ${resource.relatedStrategyFrameworkSlugs.join(', ')}`);
  if (resource.relatedCaseSlugs?.length) lines.push(`- related cases: ${resource.relatedCaseSlugs.join(', ')}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(summary);
  if (recommendation) {
    lines.push('');
    lines.push('## Why this resource matters');
    lines.push(recommendation);
  }
  if (description) {
    lines.push('');
    lines.push('## Reading note');
    lines.push(limitMarkdown(description, 2_600));
  }

  if (detail.chapters?.length) {
    lines.push('');
    lines.push('## Chapter index');
    for (const chapter of detail.chapters) {
      const refs = [
        ...(chapter.relatedCanvasDefIds ?? []).map((id) => `canvas:${id}`),
        ...(chapter.relatedPatternSlugs ?? []).map((slug) => `pattern:${slug}`),
        ...(chapter.relatedCaseSlugs ?? []).map((slug) => `case:${slug}`),
      ];
      lines.push(`- ${String(chapter.order).padStart(2, '0')} ${chapter.slug}: ${localize(chapter.title, lang)}${refs.length ? ` (${refs.join(', ')})` : ''} — ${localize(chapter.summary, lang)}`);
    }

    if (q) {
      const selected = selectRelevant(detail.chapters, q, resourceChapterSearchFields(lang), 2);
      lines.push('');
      lines.push(`## Relevant chapter excerpts for: ${q.original}`);
      for (const chapter of selected) {
        const chapterDetail = await bundle.getResourceChapter(resource.slug, chapter.slug);
        if (!chapterDetail) continue;
        lines.push('');
        appendResourceChapterExcerpt(lines, chapterDetail, lang);
      }
    }
  }

  return lines.join('\n').trim();
}

function appendResourceChapterExcerpt(lines: string[], detail: ResourceChapterDetail, lang: Lang): void {
  lines.push(`### ${detail.chapter.slug}: ${localize(detail.chapter.title, lang)}`);
  lines.push(localize(detail.chapter.summary, lang));
  const content = detail.content[lang] || detail.content.en || detail.content.zh || '';
  if (content) lines.push(limitMarkdown(content, 3_200));
  if (detail.relatedCases.length) {
    lines.push(`Related cases: ${detail.relatedCases.map((c) => c.slug).join(', ')}`);
  }
}

function limitMarkdown(input: string, maxChars: number): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n_[Excerpt truncated; ask about a narrower chapter for more detail.]_`;
}

/**
 * Build a markdown brief for one case that an LLM can consume directly
 * as a system message. Includes case metadata, all stories matching
 * `lang` (or every story if none match), and a textual rendering of
 * each canvas's stickies grouped by zone.
 *
 * Kept intentionally small: we lean on the case's own story prose for
 * narrative; the canvas hydration just lists sticky text per zone
 * (no chart pins, no per-canvas overrides). For the cross-comparison
 * prompts the Copilot is designed for, the story is usually the load-
 * bearing piece anyway.
 */
async function buildCaseMarkdown(
  projectId: string,
  slug: string,
  storage: FederatedStorage,
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
): Promise<string> {
  const entry = storage.bundleStorage.getCaseBySlug(slug);
  if (!entry) return '';

  const lines: string[] = [];
  const companyName = entry.companyName[lang] ?? entry.companyName.en;
  const summary = entry.summary[lang] ?? entry.summary.en;

  lines.push(`# ${companyName}`);
  lines.push('');
  if (summary) {
    lines.push(summary);
    lines.push('');
  }
  if (entry.tags.length > 0) {
    lines.push(`**Tags:** ${entry.tags.join(', ')}`);
    lines.push('');
  }
  if (entry.appliesPatterns && entry.appliesPatterns.length > 0) {
    lines.push(`**Applies patterns:** ${entry.appliesPatterns.join(', ')}`);
    lines.push('');
  }

  // ── Stories ─────────────────────────────────────────────────────────
  const allStoryMetas = await storage.listStories({ projectId });
  const langStories = allStoryMetas.filter((s) => !s.language || s.language === lang);
  const usedStories = langStories.length > 0 ? langStories : allStoryMetas;
  for (const meta of usedStories) {
    const full = await storage.getStory(meta.id);
    if (!full?.content) continue;
    lines.push(`## Story: ${full.title}`);
    lines.push('');
    lines.push(full.content);
    lines.push('');
  }

  // ── Canvases ────────────────────────────────────────────────────────
  const allCanvases = await storage.listCanvases({ projectId });
  const langCanvases = allCanvases.filter((c) => c.language === lang);
  const usedCanvases = langCanvases.length > 0 ? langCanvases : allCanvases;

  for (const canvas of usedCanvases) {
    const block = defsById.get(canvas.defId);
    if (!block) continue;
    const defName = block.def.name[lang] ?? block.def.name.en;
    lines.push(`## Canvas: ${canvas.title} (${defName})`);
    lines.push('');
    const zoneText = await hydrateStickiesByZone(canvas, storage);
    if (zoneText.size === 0) {
      lines.push('_(no stickies yet)_');
      lines.push('');
      continue;
    }
    const i18n = block.i18n[lang] ?? block.i18n.en;
    for (const zone of block.def.zones) {
      const stickies = zoneText.get(zone.id);
      if (!stickies || stickies.length === 0) continue;
      const zoneTitle = i18n?.blocks[zone.id]?.title ?? zone.id;
      lines.push(`### ${zoneTitle}`);
      for (const s of stickies) lines.push(`- ${stripHtml(s)}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Decode the canvas Yjs state and return a map of zoneId → sticky text.
 * Mirrors the minimal subset of `aiContext.ts` we need — no chart pins,
 * no per-canvas overrides. Stickies that are missing a required field
 * (id/zone/x/y) are skipped, matching aiContext's defensive behaviour.
 */
async function buildProjectMarkdown(
  projectId: string,
  storage: FederatedStorage,
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
  activeCanvasId?: string,
  activeStoryId?: string,
): Promise<string> {
  const project = await storage.getProject(projectId);
  if (!project) return '';

  const lines: string[] = [];
  lines.push(`# Project: ${project.name}`);
  if (project.description) {
    lines.push('');
    lines.push(project.description);
  }
  lines.push('');
  lines.push(`**Source:** ${project.source ?? 'user'}`);
  if (project.companySlug) lines.push(`**Case slug:** ${project.companySlug}`);
  lines.push('');

  const canvases = await storage.listCanvases({ projectId });
  lines.push('## Canvases');
  if (canvases.length === 0) {
    lines.push('- _(none)_');
  } else {
    for (const canvas of canvases) {
      const block = defsById.get(canvas.defId);
      const defName = block?.def.name[lang] ?? block?.def.name.en ?? canvas.defId;
      const active = canvas.id === activeCanvasId ? ' — active' : '';
      lines.push(`- ${canvas.title} (${defName}, id: ${canvas.id}, updatedAt: ${canvas.updatedAt})${active}`);
    }
  }
  lines.push('');

  const stories = await storage.listStories({ projectId });
  lines.push('## Stories');
  if (stories.length === 0) {
    lines.push('- _(none)_');
  } else {
    for (const story of stories) {
      const active = story.id === activeStoryId ? ' — active' : '';
      lines.push(`- ${story.title} (id: ${story.id}, updatedAt: ${story.updatedAt})${active}`);
    }
  }
  lines.push('');

  if (activeStoryId) {
    const story = await storage.getStory(activeStoryId);
    if (story?.projectId === projectId) {
      lines.push('## Active story');
      lines.push('');
      lines.push(`### ${story.title}`);
      lines.push(story.content || '_(empty story)_');
      lines.push('');
    }
  }

  const activeCanvas = activeCanvasId
    ? canvases.find((canvas) => canvas.id === activeCanvasId)
    : undefined;
  if (activeCanvas) {
    lines.push('## Active canvas detail');
    lines.push('');
    lines.push(await buildCanvasMarkdown(activeCanvas, storage, defsById, lang));
  } else if (canvases.length > 0) {
    lines.push('## Canvas summaries');
    for (const canvas of canvases) {
      lines.push('');
      lines.push(await buildCanvasMarkdown(canvas, storage, defsById, lang));
    }
  }

  return lines.join('\n').trim();
}

async function buildCanvasMarkdown(
  canvas: CanvasMeta,
  storage: FederatedStorage,
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
): Promise<string> {
  const block = defsById.get(canvas.defId);
  const lines: string[] = [];
  const defName = block?.def.name[lang] ?? block?.def.name.en ?? canvas.defId;
  lines.push(`### Canvas: ${canvas.title}`);
  lines.push(`- id: ${canvas.id}`);
  lines.push(`- type: ${defName}`);
  lines.push(`- language: ${canvas.language}`);
  if (canvas.variant) {
    const label = canvas.variant.label[lang] ?? canvas.variant.label.en;
    lines.push(`- variant: ${label}`);
  }
  lines.push('');

  if (!block) {
    lines.push('_(canvas definition not loaded)_');
    return lines.join('\n').trim();
  }

  const zoneText = await hydrateStickiesByZone(canvas, storage);
  const i18n = block.i18n[lang] ?? block.i18n.en;
  for (const zone of block.def.zones) {
    const zoneTitle = i18n?.blocks[zone.id]?.title ?? zone.id;
    const stickies = zoneText.get(zone.id) ?? [];
    lines.push(`#### ${zoneTitle}`);
    if (stickies.length === 0) {
      lines.push('- _(empty)_');
    } else {
      for (const s of stickies) lines.push(`- ${stripHtml(s)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

async function buildStoryMarkdown(
  storyId: string,
  storage: FederatedStorage,
  defsById: Map<string, LoadedCanvasDef>,
  lang: Lang,
): Promise<string> {
  const story = await storage.getStory(storyId);
  if (!story) return '';
  const project = await storage.getProject(story.projectId);
  const canvases = await storage.listCanvases({ projectId: story.projectId });

  const lines: string[] = [];
  lines.push(`# Story: ${story.title}`);
  if (project) lines.push(`**Project:** ${project.name}`);
  lines.push('');
  lines.push(story.content || '_(empty story)_');
  lines.push('');
  lines.push('## Project canvases available to reference');
  if (canvases.length === 0) {
    lines.push('- _(none)_');
  } else {
    for (const canvas of canvases) {
      const block = defsById.get(canvas.defId);
      const defName = block?.def.name[lang] ?? block?.def.name.en ?? canvas.defId;
      lines.push(`- ${canvas.title} (${defName}, id: ${canvas.id})`);
    }
  }

  return lines.join('\n').trim();
}

async function hydrateStickiesByZone(
  canvas: CanvasMeta,
  storage: FederatedStorage,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const state = await storage.loadYDocState(canvas.id);
  if (!state || state.byteLength === 0) return out;

  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, state);
    const root = doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
    const ordered: Array<{ zoneId: string; createdAt: string; text: string }> = [];
    root.forEach((yMap) => {
      const id = yMap.get('id');
      const zoneId = yMap.get('zoneId');
      if (typeof id !== 'string' || typeof zoneId !== 'string' || !zoneId) return;
      const text = (yMap.get('text') as string | undefined) ?? '';
      const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';
      if (!text) return;
      ordered.push({ zoneId, createdAt, text });
    });
    // Stable per-zone order by createdAt — same convention as aiContext.
    ordered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const s of ordered) {
      const arr = out.get(s.zoneId) ?? [];
      arr.push(s.text);
      out.set(s.zoneId, arr);
    }
  } finally {
    doc.destroy();
  }
  return out;
}

/**
 * Strip HTML tags from sticky text. Stickies authored with the rich-text
 * editor are HTML fragments (`<p>...</p>`, `<strong>`, …); legacy
 * stickies are plain strings. For LLM consumption we want the text
 * content only — formatting is invisible to the model anyway.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function buildPatternMarkdown(
  detail: {
    pattern: { slug: string; name: { en: string; zh: string }; tagline?: { en: string; zh: string } };
    description: { en: string; zh: string };
    exampleCases: Array<{ slug: string; companyName: { en: string; zh: string } }>;
  },
  lang: Lang,
): string {
  const lines: string[] = [];
  const name = detail.pattern.name[lang] ?? detail.pattern.name.en;
  lines.push(`# Business Model Pattern: ${name}`);
  lines.push('');
  if (detail.pattern.tagline) {
    const tag = detail.pattern.tagline[lang] ?? detail.pattern.tagline.en;
    if (tag) {
      lines.push(`_${tag}_`);
      lines.push('');
    }
  }
  const desc = detail.description[lang] ?? detail.description.en;
  if (desc) {
    lines.push(desc);
    lines.push('');
  }
  if (detail.exampleCases.length > 0) {
    lines.push('## Example cases');
    for (const c of detail.exampleCases) {
      const cName = c.companyName[lang] ?? c.companyName.en;
      lines.push(`- **${cName}** (\`${c.slug}\`)`);
    }
  }
  return lines.join('\n').trim();
}

/**
 * Compose the Kimi system prompt from optional case/pattern context.
 * Kimi has no `--system-prompt` flag, so the adapter folds this string
 * into the prompt body. Kept terse to leave room for conversation
 * history and the user's question within the model's context window.
 */
function buildSystemPrompt(attachedContext?: string, userProfileContext?: string): string {
  const base = [
    'You are PinGarden Copilot, a strategy-analysis assistant for business-model canvases, projects, cases, stories, and the strategy library.',
    'Answer in concise markdown — no tool use, no file ops, no web fetches. Use short sections separated by blank lines; prefer headings and bullets, and avoid wide markdown tables unless the user explicitly asks for a table.',
    'Keep responses grounded in the supplied PinGarden context; cite specific stories, canvases, or canvas blocks when relevant.',
    'Do not infer library availability from the subprocess working directory; use the supplied PinGarden context as the source of truth.',
    'When recommending a next step, prefer concrete PinGarden actions such as reading a case, reading a specific resource chapter, opening a canvas, drafting a story, choosing a paired canvas, or testing an assumption.',
    'Keep library categories distinct: “case” means only concrete entries from the Cases section; books/articles/reports/web pages are Resources or reference reading, never cases. When resource chapter context is supplied, use it as source material for deeper guidance and cite the resource title plus chapter title/slug. Separate recommended cases, reference reading, canvas templates, strategy frameworks, patterns, and experiments in the answer when more than one category appears. In Chinese answers, prefer localized display names and omit internal slugs/defIds in prose unless the user explicitly asks for IDs; do not expose jargon such as “ad-lib” when a Chinese name exists. In English answers, show the display name first and include slug/id only when useful.',
    'When the user wants to create a project from text, links, or images, first ask for missing essentials such as project name, target customers, and goal. Once enough information is available, output exactly one fenced JSON project draft with kind "pingarden.projectDraft" so the UI can show a confirmation card. Never claim the project is created until the user presses the confirmation button.',
  ].join(' ');
  const answerShape = [
    'Answer shape guidance: when recommending or comparing cases, do not stop at a flat bullet list. Use one deeper markdown level for the top cases: section heading, then per-case heading, then subheadings such as “What changed / Mechanism / How to apply”. Keep each case specific and evidence-backed rather than generic.',
    'Chinese case answers should prefer this hierarchy: ## 真实案例, ### 案例名, #### 做法拆解, #### 机制启发, #### 可迁移到你的问题. English case answers should use the equivalent H2/H3/H4 hierarchy.',
  ].join(' ');
  const sections = [base, answerShape, buildBundledPlaybookPrompt(), buildMemorySuggestionPrompt()];
  if (userProfileContext) sections.push(userProfileContext);
  if (attachedContext) sections.push(`Context for this conversation:\n\n${limitAttachedContext(attachedContext)}`);
  return sections.join('\n\n');
}

function limitAttachedContext(context: string): string {
  const trimmed = context.trim();
  if (trimmed.length <= MAX_ATTACHED_CONTEXT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_ATTACHED_CONTEXT_CHARS)}\n\n_[Context truncated for cloud Copilot reliability. Ask a narrower question for more detail.]_`;
}
