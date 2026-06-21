import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  CanvasMeta,
  CaseForkResult,
  CaseLibraryDetail,
  Lang,
  Project,
  Story,
} from '@pingarden/shared';
import type { FederatedStorage } from '../storage/FederatedStorage.js';
import { getIdentity } from './identity.js';

/**
 * Routes for the read-only case library. Backed by `BundleStorage` for
 * reads + `FileSystemStorage` for fork writes (both wrapped by
 * `FederatedStorage`).
 *
 *   GET  /library/cases                       → CaseLibraryEntry[]
 *   GET  /library/cases/:slug                 → CaseLibraryDetail
 *   POST /library/cases/:slug/fork            → CaseForkResult (new user project)
 *   GET  /library/patterns                    → BusinessModelPattern[]
 *   GET  /library/patterns/:slug              → BusinessModelPatternDetail
 *   GET  /library/experiments                 → Experiment[]
 *   GET  /library/experiments/:slug           → BusinessModelExperimentDetail
 *   GET  /library/strategy-frameworks         → StrategyFramework[]
 *   GET  /library/strategy-frameworks/:slug   → StrategyFrameworkDetail
 *   GET  /library/resources                   → LibraryResource[]
 *   GET  /library/resources/:slug             → LibraryResourceDetail
 *
 * Mutations on library projects/canvases/stories elsewhere in the API
 * surface as 403 via the global error handler in `server.ts` — those
 * paths reach `BundleStorage`, which rejects every write op. Patterns
 * and experiments have no mutation surface at all (no fork, no edit) —
 * they are pure curated content.
 */
export function registerLibraryRoutes(
  app: FastifyInstance,
  storage: FederatedStorage,
) {
  const bundle = storage.bundleStorage;

  app.get('/library/cases', async () => bundle.listCases());

  app.get<{ Params: { slug: string } }>(
    '/library/cases/:slug',
    async (req, reply) => {
      const detail = await loadCaseDetail(req.params.slug, storage);
      if (!detail) return reply.code(404).send({ error: 'Case not found' });
      return detail;
    },
  );

  app.post<{
    Params: { slug: string };
    Querystring: { lang?: string };
  }>(
    '/library/cases/:slug/fork',
    async (req, reply) => {
      const slug = req.params.slug;
      const caseEntry = bundle.getCaseBySlug(slug);
      if (!caseEntry) return reply.code(404).send({ error: 'Case not found' });

      const identity = getIdentity(req);
      const lang = parseLang(req.query.lang);
      const result = await forkCase(slug, identity.displayName, storage, lang);
      return reply.code(201).send(result);
    },
  );

  app.get('/library/patterns', async () => bundle.listPatterns());

  app.get<{ Params: { slug: string } }>(
    '/library/patterns/:slug',
    async (req, reply) => {
      const detail = await bundle.getPattern(req.params.slug);
      if (!detail) return reply.code(404).send({ error: 'Pattern not found' });
      return detail;
    },
  );

  app.get('/library/experiments', async () => bundle.listExperiments());

  app.get<{ Params: { slug: string } }>(
    '/library/experiments/:slug',
    async (req, reply) => {
      const detail = await bundle.getExperiment(req.params.slug);
      if (!detail) return reply.code(404).send({ error: 'Experiment not found' });
      return detail;
    },
  );

  app.get('/library/strategy-frameworks', async () => bundle.listStrategyFrameworks());

  app.get<{ Params: { slug: string } }>(
    '/library/strategy-frameworks/:slug',
    async (req, reply) => {
      const detail = await bundle.getStrategyFramework(req.params.slug);
      if (!detail) return reply.code(404).send({ error: 'Strategy framework not found' });
      return detail;
    },
  );

  app.get('/library/resources', async () => bundle.listResources());

  app.get<{ Params: { slug: string } }>(
    '/library/resources/:slug',
    async (req, reply) => {
      const detail = await bundle.getResource(req.params.slug);
      if (!detail) return reply.code(404).send({ error: 'Resource not found' });
      return detail;
    },
  );
}

/**
 * Narrow an unknown query-string value down to the `Lang` union — the
 * fork route only accepts `'en'` or `'zh'`, anything else (missing,
 * empty, `'fr'`, …) means "no language filter, fork the whole case".
 */
function parseLang(raw: string | undefined): Lang | undefined {
  return raw === 'en' || raw === 'zh' ? raw : undefined;
}

async function loadCaseDetail(
  slug: string,
  storage: FederatedStorage,
): Promise<CaseLibraryDetail | null> {
  const bundle = storage.bundleStorage;
  const caseEntry = bundle.getCaseBySlug(slug);
  if (!caseEntry) return null;

  // FederatedStorage.get* falls through user → bundle. For library
  // resources only bundle has them, so we get the bundle copy.
  const project = await storage.getProject(caseEntry.projectId);
  if (!project) return null;
  const canvases = await storage.listCanvases({ projectId: caseEntry.projectId });
  const stories = await storage.listStories({ projectId: caseEntry.projectId });
  return { case: caseEntry, project, canvases, stories };
}

/**
 * Deep-copy a library case into the user's writable storage. The new
 * project carries no library metadata — fork is independent and does
 * not track upstream (per plan generic-strolling-tarjan.md decision).
 *
 * When `lang` is provided we filter the source canvases / stories down
 * to that language before copying, so an EN-UI user forks a 3-canvas
 * EN-only project rather than the full 6-canvas bilingual original.
 * If a future bundle is missing the requested language, fork falls back
 * to copying everything — better that than producing an empty project
 * just because the requested lang isn't shipped.
 *
 * Story content is rewritten so `::canvas[<defId>]{canvasId="..."}`
 * directives point at the *new* canvas ids in the user's copy. Without
 * this rewrite the user would see story content that reads correctly
 * but whose embedded canvases can't be edited (they'd still resolve to
 * the read-only library originals).
 */
async function forkCase(
  slug: string,
  displayName: string,
  storage: FederatedStorage,
  lang: Lang | undefined,
): Promise<CaseForkResult> {
  const bundle = storage.bundleStorage;
  const caseEntry = bundle.getCaseBySlug(slug);
  if (!caseEntry) throw new Error(`Case '${slug}' not found`);

  const srcProject = await bundle.getProject(caseEntry.projectId);
  if (!srcProject) throw new Error(`Case '${slug}' has no project on disk`);

  const now = new Date().toISOString();
  const newProjectId = randomUUID();
  const forkedName = `${srcProject.name} (forked)`;

  // 1. New user project — strip every library-origin field. The fork
  //    is independent: the user can rename, edit, delete it freely,
  //    and there's no "pull updates from upstream" affordance.
  const newProject: Project = {
    id: newProjectId,
    name: forkedName,
    ...(srcProject.description ? { description: srcProject.description } : {}),
    createdAt: now,
    createdBy: displayName,
    updatedAt: now,
    updatedBy: displayName,
  };
  await storage.createProject(newProject);

  // 2. Canvases — copy meta + binary Yjs state. Sort by id so the
  //    response's `canvasIds[]` index is deterministic per fork run.
  const allCanvases = await bundle.listCanvases({ projectId: caseEntry.projectId });
  // Filter by `lang` when provided. If filtering yields nothing
  // (single-language case where the requested lang isn't shipped),
  // fall back to copying every canvas — silently producing the only
  // version that exists is better UX than producing an empty project.
  const langFilteredCanvases = lang
    ? allCanvases.filter((c) => c.language === lang)
    : allCanvases;
  const srcCanvases = langFilteredCanvases.length > 0
    ? langFilteredCanvases
    : allCanvases;
  srcCanvases.sort((a, b) => a.id.localeCompare(b.id));

  const canvasIdMap = new Map<string, string>();
  const newCanvasIds: string[] = [];
  for (const src of srcCanvases) {
    const newCanvasId = randomUUID();
    canvasIdMap.set(src.id, newCanvasId);

    const newCanvas: CanvasMeta = {
      ...src,
      id: newCanvasId,
      projectId: newProjectId,
      createdAt: now,
      createdBy: displayName,
      updatedAt: now,
      updatedBy: displayName,
      // `variant` (if any) carries through unchanged — it's case-content
      // semantics ("Maerki Baumann variant"), not user-editable identity.
    };
    await storage.createCanvas(newCanvas);

    const srcState = await bundle.loadYDocState(src.id);
    if (srcState) await storage.saveYDocState(newCanvasId, srcState);

    newCanvasIds.push(newCanvasId);
  }

  // 3. Stories — same approach + rewrite embedded canvas directives.
  //    Apply the same lang filter as canvases. When no story matches
  //    the requested lang we fork *no* stories (rather than copying
  //    the wrong-language one): the fork is single-language by intent,
  //    and an EN user forking a Swiss case shouldn't end up with the
  //    Chinese story tagging along. Exception: when there's no `lang`
  //    filter at all (server invoked without ?lang=), or when the
  //    case has no story-level language tagging (older data), copy
  //    every story.
  const allStoryMetas = await bundle.listStories({ projectId: caseEntry.projectId });
  const taggedStories = allStoryMetas.filter((s) => !!s.language);
  const srcStoryMetas = lang && taggedStories.length > 0
    ? allStoryMetas.filter((s) => s.language === lang)
    : allStoryMetas;
  srcStoryMetas.sort((a, b) => a.id.localeCompare(b.id));

  const newStoryIds: string[] = [];
  for (const meta of srcStoryMetas) {
    const fullStory = await bundle.getStory(meta.id);
    if (!fullStory) continue;
    const newStoryId = randomUUID();
    const rewrittenContent = rewriteCanvasDirectives(fullStory.content, canvasIdMap);
    const newStory: Story = {
      ...fullStory,
      id: newStoryId,
      projectId: newProjectId,
      content: rewrittenContent,
      createdAt: now,
      createdBy: displayName,
      updatedAt: now,
      updatedBy: displayName,
    };
    await storage.createStory(newStory);
    newStoryIds.push(newStoryId);
  }

  return { project: newProject, canvasIds: newCanvasIds, storyIds: newStoryIds };
}

/**
 * Rewrite `canvasId="<oldId>"` (or single-quoted, or bare) inside
 * markdown story content. Targets the directive shape used by
 * `parseStoryCanvasDirectives` — it's a literal id substitution; we
 * intentionally don't re-parse the markdown to avoid normalising the
 * author's whitespace / structure.
 */
function rewriteCanvasDirectives(
  content: string,
  idMap: Map<string, string>,
): string {
  let out = content;
  for (const [oldId, newId] of idMap) {
    const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: canvasId="<old>"  |  canvasId='<old>'  |  canvasId=<old>
    const re = new RegExp(`canvasId=(["']?)${escaped}\\1`, 'g');
    out = out.replace(re, `canvasId=$1${newId}$1`);
  }
  return out;
}
