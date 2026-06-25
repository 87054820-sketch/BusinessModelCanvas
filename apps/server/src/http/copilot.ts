import type { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import { z } from 'zod';
import {
  COPILOT_ACCEPTED_IMAGE_TYPES,
  COPILOT_MAX_IMAGE_ATTACHMENTS,
  COPILOT_MAX_IMAGE_BYTES,
  type CanvasMeta,
  type CopilotImageAttachment,
  type Lang,
} from '@pingarden/shared';
import type { FederatedStorage } from '../storage/FederatedStorage.js';
import type { LoadedCanvasDef } from '../canvasDefs/loader.js';
import { streamKimiChat, type KimiChatMessage } from '../llm/kimiCliAdapter.js';
import { resolveKimiBinary, readKimiVersion, KimiBinaryNotFoundError } from '../llm/kimiBinaryResolver.js';
import { writeConfig as writeKimiConfig, clearConfig as clearKimiConfig } from '../llm/kimiConfig.js';
import { buildBundledPlaybookPrompt } from '../copilot/bundledPlaybooks.js';
import { buildMemorySuggestionPrompt } from '../copilot/memorySummarizer.js';
import { buildCopilotProtocol, type CopilotProtocolIntent } from '../copilot/protocols.js';
import { CopilotUserProfileStore } from '../copilot/userProfileStore.js';
import { config } from '../config.js';
import { getIdentity } from './identity.js';

const STICKIES_KEY = 'stickies';
const ACCEPTED_IMAGE_TYPES = COPILOT_ACCEPTED_IMAGE_TYPES;
const MAX_IMAGE_ATTACHMENTS = COPILOT_MAX_IMAGE_ATTACHMENTS;
const MAX_IMAGE_BYTES = COPILOT_MAX_IMAGE_BYTES;
const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 128;

/**
 * Copilot HTTP surface — Mode A (Kimi CLI chat) routes:
 *
 *   GET  /copilot/health                 → {kimi:{available,version?}}
 *   POST /copilot/test-key               → {ok:bool, message?:string}
 *   POST /copilot/chat                   → SSE stream of {delta} from bundled kimi
 *   GET  /copilot/case-context/:slug     → pre-formatted markdown brief
 *   GET  /copilot/pattern-context/:slug  → pre-formatted markdown brief
 *
 * Design choices:
 * - **No server-side key persistence.** The renderer holds the
 *   encrypted Kimi Code key in localStorage (via Electron safeStorage
 *   where available), decrypts it for each chat turn, and includes the
 *   plaintext in the request body. The server uses it for the request
 *   lifetime only — written to `~/.kimi-code/config.toml` just before
 *   spawning `kimi`, never persisted to PinGarden's own dataDir.
 * - **kimi-subprocess transport.** Bundled `kimi -p ...
 *   --output-format stream-json` is the only way to legally reach the
 *   kimi-for-coding model (it's gated to registered coding agents). Output is parsed
 *   line-by-line in `kimiCliAdapter.ts`.
 * - **SSE wire shape:** uniform `data: {"delta": "..."}` frames followed
 *   by a final `data: {"done": true}` frame. Errors emit a single
 *   `data: {"error": "..."}` frame before closing. Matches what the
 *   renderer's parser expects (unchanged from Round 1).
 */
export function registerCopilotRoutes(
  app: FastifyInstance,
  storage: FederatedStorage,
  defs: LoadedCanvasDef[],
) {
  const bundle = storage.bundleStorage;
  const defsById = new Map(defs.map((d) => [d.def.id, d]));
  const profileStore = new CopilotUserProfileStore(config.dataDir);

  // ── GET /copilot/health ──────────────────────────────────────────────
  // Namespaced under `kimi` so future modes (MCP server, GitHub Action,
  // …) can add their own health sub-objects without breaking the schema.
  app.get('/copilot/health', async () => {
    try {
      const bin = resolveKimiBinary();
      const version = readKimiVersion(bin);
      return { kimi: { available: true, ...(version ? { version } : {}) } };
    } catch {
      return { kimi: { available: false } };
    }
  });

  // ── POST /copilot/test-key ──────────────────────────────────────────
  // Quick probe: write config.toml with the candidate key, spawn one
  // tiny kimi turn, return ok on first text delta. Used by the
  // settings panel's "测试连接" button.
  const TestKeySchema = z.object({
    apiKey: z.string().min(1),
  });

  app.post('/copilot/test-key', async (req, reply) => {
    const parse = TestKeySchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ ok: false, message: 'Invalid request body' });
    }
    try {
      await writeKimiConfig(parse.data.apiKey);
    } catch (err) {
      return reply.code(500).send({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to write Kimi config',
      });
    }

    // Spawn one ping; resolve as soon as we see any delta (or error).
    const probe = streamKimiChat({
      systemPromptText: 'Reply with exactly the word "pong".',
      conversation: [],
      latestUserMsg: 'ping',
    });
    const timeout = new Promise<{ ok: false; message: string }>((resolve) => {
      setTimeout(() => resolve({ ok: false, message: 'Timed out after 20s' }), 20_000);
    });
    const probeResult = (async () => {
      for await (const chunk of probe) {
        if ('error' in chunk) return { ok: false as const, message: chunk.error };
        if ('delta' in chunk && chunk.delta) return { ok: true as const };
      }
      return { ok: false as const, message: 'Empty response from kimi' };
    })();
    const result = await Promise.race([probeResult, timeout]);
    return reply.send(result);
  });

  // ── POST /copilot/clear-key ─────────────────────────────────────────
  // Wipes ~/.kimi-code/config.toml back to its empty stub. Called by the
  // renderer when the user clicks "Remove" in settings.
  app.post('/copilot/clear-key', async (_req, reply) => {
    await clearKimiConfig();
    return reply.send({ ok: true });
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
    const parse = ChatRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parse.error.issues,
      });
    }
    const body = parse.data;
    const attachmentError = validateImageAttachments(
      body.messages.flatMap((msg) => msg.imageAttachments ?? []),
    );
    if (attachmentError) {
      return reply.code(400).send({ error: attachmentError });
    }

    // Write the user's key into Kimi's config every turn so we always
    // pick up the latest credential without trusting whatever was there
    // before. Cheap (one small file write) and avoids stale-key bugs.
    try {
      await writeKimiConfig(body.apiKey);
    } catch (err) {
      return reply.code(500).send({
        error: err instanceof Error ? err.message : 'Failed to write Kimi config',
      });
    }

    // Verify kimi binary is reachable before opening the SSE — avoids
    // sending the user a half-open stream that immediately errors.
    try {
      resolveKimiBinary();
    } catch (err) {
      if (err instanceof KimiBinaryNotFoundError) {
        return reply.code(503).send({ error: err.message });
      }
      throw err;
    }

    // Hijack the reply so Fastify won't try to serialise a body on our
    // behalf — we write the SSE stream to reply.raw directly.
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Watch the RESPONSE stream for client disconnect (not req.raw — see
    // the long comment in the previous round's code for why).
    const abort = new AbortController();
    raw.on('close', () => {
      if (!raw.writableEnded) abort.abort();
    });

    // Split messages[] into "prior conversation" + "latest user msg".
    // The renderer always appends a final user turn; we expect that.
    const lastIdx = body.messages.length - 1;
    const last = body.messages[lastIdx]!;
    if (last.role !== 'user') {
      // Defensive — surface as SSE error so the renderer sees it.
      raw.write(`data: ${JSON.stringify({ error: 'Last message must be from user' })}\n\n`);
      raw.end();
      return;
    }
    const prior: KimiChatMessage[] = body.messages.slice(0, lastIdx).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const identity = getIdentity(req);
    const userProfileContext = await profileStore.buildPromptContext(identity.displayName);
    const systemPromptText = buildSystemPrompt(body.attachedContext, userProfileContext);
    const latestUserMsg = buildLatestUserMessage(last.content, last.imageAttachments ?? [], body.intent, body.lang);

    try {
      for await (const chunk of streamKimiChat({
        systemPromptText,
        conversation: prior,
        latestUserMsg,
        signal: abort.signal,
      })) {
        if (raw.writableEnded) break;
        if ('error' in chunk) {
          raw.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
          raw.end();
          return;
        }
        if (chunk.delta) {
          raw.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
        }
      }
      if (!raw.writableEnded) {
        raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        raw.end();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      app.log.warn({ err: msg }, 'Copilot chat stream failed');
      if (!raw.writableEnded) {
        raw.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        raw.end();
      }
    }
  });

  // ── GET /copilot/library-context ─────────────────────────────────────

  app.get<{
    Querystring: { lang?: string };
  }>('/copilot/library-context', async (req, reply) => {
    const lang = parseLang(req.query.lang) ?? 'en';
    const markdown = buildLibraryMarkdown(bundle, defs, lang);
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

  // ── GET /copilot/project-context/:id ─────────────────────────────────

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string; activeCanvasId?: string; activeStoryId?: string };
  }>('/copilot/project-context/:id', async (req, reply) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return reply.code(404).send({ error: 'Project not found' });

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
    const canvas = await storage.getCanvas(req.params.id);
    if (!canvas) return reply.code(404).send({ error: 'Canvas not found' });

    const lang = parseLang(req.query.lang) ?? canvas.language;
    const markdown = await buildCanvasMarkdown(canvas, storage, defsById, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });

  // ── GET /copilot/story-context/:id ───────────────────────────────────

  app.get<{
    Params: { id: string };
    Querystring: { lang?: string };
  }>('/copilot/story-context/:id', async (req, reply) => {
    const story = await storage.getStory(req.params.id);
    if (!story) return reply.code(404).send({ error: 'Story not found' });

    const lang = parseLang(req.query.lang) ?? story.language ?? 'en';
    const markdown = await buildStoryMarkdown(story.id, storage, defsById, lang);
    return reply.header('Cache-Control', 'no-store').send({ markdown });
  });
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

function buildLibraryMarkdown(
  bundle: FederatedStorage['bundleStorage'],
  defs: LoadedCanvasDef[],
  lang: Lang,
): string {
  const lines: string[] = [];
  const cases = bundle.listCases();
  const patterns = bundle.listPatterns();
  const frameworks = bundle.listStrategyFrameworks();
  const experiments = bundle.listExperiments();
  const resources = bundle.listResources();

  lines.push('# PinGarden Strategy Library');
  lines.push('');
  lines.push('This is the curated PinGarden library available in the app. Use these real ids/slugs when recommending content. Do not claim the library is empty.');
  lines.push('');
  lines.push('Taxonomy rules: Cases are concrete company/industry/comparison examples listed only under ## Cases. Resources are books/articles/papers/reports/web pages listed only under ## Resources; never call a resource a case. Canvas templates, business-model patterns, strategy frameworks, and experiments are method assets, not cases. When answering in Chinese, use “案例” only for ## Cases and use “参考阅读/资料/书籍” for ## Resources.');
  lines.push('');
  lines.push(`Counts: ${cases.length} cases, ${defs.length} canvas templates, ${patterns.length} business-model patterns, ${frameworks.length} strategy frameworks, ${experiments.length} experiments, ${resources.length} resources.`);
  lines.push('');

  lines.push('## Canvas templates');
  for (const item of defs) {
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
  for (const resource of resources) {
    const title = localize(resource.title, lang);
    const summary = localize(resource.summary, lang);
    const relatedCases = resource.relatedCaseSlugs?.length
      ? `; related cases: ${resource.relatedCaseSlugs.join(', ')}`
      : '';
    const relatedCanvases = resource.relatedCanvasDefIds?.length
      ? `; related canvases: ${resource.relatedCanvasDefIds.join(', ')}`
      : '';
    lines.push(`- ${title} (slug: ${resource.slug}; type: ${resource.type}${resource.year ? `; year: ${resource.year}` : ''}${relatedCases}${relatedCanvases}) — ${summary}`);
  }

  return lines.join('\n').trim();
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
    'When recommending a next step, prefer concrete PinGarden actions such as reading a case, opening a canvas, drafting a story, choosing a paired canvas, or testing an assumption.',
    'Keep library categories distinct: “case” means only concrete entries from the Cases section; books/articles/reports/web pages are Resources or reference reading, never cases. Separate recommended cases, reference reading, canvas templates, strategy frameworks, patterns, and experiments in the answer when more than one category appears. In Chinese answers, prefer localized display names and omit internal slugs/defIds in prose unless the user explicitly asks for IDs; do not expose jargon such as “ad-lib” when a Chinese name exists. In English answers, show the display name first and include slug/id only when useful.',
    'When the user wants to create a project from text, links, or images, first ask for missing essentials such as project name, target customers, and goal. Once enough information is available, output exactly one fenced JSON project draft with kind "pingarden.projectDraft" so the UI can show a confirmation card. Never claim the project is created until the user presses the confirmation button.',
  ].join(' ');
  const sections = [base, buildBundledPlaybookPrompt(), buildMemorySuggestionPrompt()];
  if (userProfileContext) sections.push(userProfileContext);
  if (attachedContext) sections.push(`Context for this conversation:\n\n${attachedContext}`);
  return sections.join('\n\n');
}
