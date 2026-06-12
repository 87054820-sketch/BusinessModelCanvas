import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type {
  CanvasMeta,
  CaseLibraryEntry,
  Lang,
  Project,
  Snapshot,
  SnapshotKind,
  SnapshotMeta,
  Story,
  StoryMeta,
} from '@pingarden/shared';
import type { CanvasStorage } from './CanvasStorage.js';
import { BundleReadOnlyError } from './errors.js';

/**
 * Top-level manifest schema (`<bundleDir>/manifest.json`). Lists every
 * shipped case in curated display order. Directories under `cases/` that
 * are not listed here are ignored (treated as orphaned; the build
 * script's case-library validator will surface them).
 */
interface CaseLibraryManifest {
  version: number;
  cases: Array<{ slug: string; featured?: boolean }>;
}

/**
 * Resolved index entry for one case. Built once at `BundleStorage.load()`
 * time so all downstream queries are O(1) map lookups.
 */
interface BundleCaseRecord {
  slug: string;
  caseDir: string;
  /** Manifest ordering hint — preserves the order cases were listed in. */
  index: number;
  featured: boolean;
  caseJson: CaseLibraryEntry;
  project: Project;
  canvasIds: string[];
  storyIds: string[];
}

/**
 * Read-only storage backend that exposes the bundled case library
 * (`packages/case-library/` in dev; `<.app>/Resources/case-library/`
 * when packaged) as a `CanvasStorage`. Every mutation method throws
 * `BundleReadOnlyError`; reads serve from an in-memory index built at
 * load time.
 *
 * The bundle directory is expected to follow this layout:
 *
 *     <bundleDir>/
 *     ├── manifest.json
 *     └── cases/
 *         └── <slug>/
 *             ├── case.json
 *             ├── projects/<uuid>.json
 *             ├── canvases/<uuid>/{meta.json, live.ydoc}
 *             └── stories/<uuid>/{meta.json, content.md}
 *
 * Construction is async because we walk the bundle once at startup;
 * use the static `load()` factory rather than `new`.
 */
export class BundleStorage implements CanvasStorage {
  /** projectId → record */
  private readonly projects = new Map<string, BundleCaseRecord>();
  /** canvasId → { record, defId-bound dir path } */
  private readonly canvases = new Map<string, { record: BundleCaseRecord; meta: CanvasMeta; canvasDir: string }>();
  /** storyId → { record, story dir path } */
  private readonly stories = new Map<string, { record: BundleCaseRecord; meta: StoryMeta; storyDir: string }>();
  /** slug → record (used by the /library/cases route) */
  private readonly bySlug = new Map<string, BundleCaseRecord>();

  private constructor(public readonly bundleDir: string) {}

  /**
   * Build a `BundleStorage` by walking `bundleDir`. Returns an empty
   * storage (zero cases) when the directory is missing or contains no
   * manifest — the server must still boot in that scenario, just with
   * no library content.
   */
  static async load(bundleDir: string): Promise<BundleStorage> {
    const storage = new BundleStorage(bundleDir);
    await storage.scan();
    return storage;
  }

  /** Re-scan the bundle. Used by tests; production servers don't hot-reload. */
  async refresh(): Promise<void> {
    this.projects.clear();
    this.canvases.clear();
    this.stories.clear();
    this.bySlug.clear();
    await this.scan();
  }

  // ─── case-library specific accessors (used by /library/cases route) ───

  /** Catalog list — manifest order, every case's resolved metadata. */
  listCases(): CaseLibraryEntry[] {
    return [...this.bySlug.values()]
      .sort((a, b) => a.index - b.index)
      .map((rec) => rec.caseJson);
  }

  getCaseBySlug(slug: string): CaseLibraryEntry | null {
    return this.bySlug.get(slug)?.caseJson ?? null;
  }

  /** Reverse lookup: which case owns this resource? Used by the fork route. */
  caseSlugForProject(projectId: string): string | null {
    return this.projects.get(projectId)?.slug ?? null;
  }

  hasProject(id: string): boolean {
    return this.projects.has(id);
  }

  hasCanvas(id: string): boolean {
    return this.canvases.has(id);
  }

  hasStory(id: string): boolean {
    return this.stories.has(id);
  }

  /** Number of cases currently indexed (0 when bundle dir is empty/absent). */
  get size(): number {
    return this.bySlug.size;
  }

  // ─── CanvasStorage: projects ────────────────────────────────────────

  async listProjects(): Promise<Project[]> {
    return [...this.projects.values()]
      .sort((a, b) => a.index - b.index)
      .map((rec) => rec.project);
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id)?.project ?? null;
  }

  async createProject(_p: Project): Promise<void> {
    throw new BundleReadOnlyError('createProject');
  }

  async updateProject(id: string, _patch: Partial<Project>): Promise<Project> {
    throw new BundleReadOnlyError('updateProject', id);
  }

  async deleteProject(id: string): Promise<void> {
    throw new BundleReadOnlyError('deleteProject', id);
  }

  // ─── CanvasStorage: canvases ────────────────────────────────────────

  async listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]> {
    const out: CanvasMeta[] = [];
    for (const entry of this.canvases.values()) {
      if (opts?.projectId && entry.meta.projectId !== opts.projectId) continue;
      out.push(entry.meta);
    }
    // Stable order: keep the order canvases were listed in case.json /
    // discovered on disk, then by canvas id within the same case.
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  async getCanvas(id: string): Promise<CanvasMeta | null> {
    return this.canvases.get(id)?.meta ?? null;
  }

  async createCanvas(_meta: CanvasMeta): Promise<void> {
    throw new BundleReadOnlyError('createCanvas');
  }

  async updateCanvasMeta(id: string, _patch: Partial<CanvasMeta>): Promise<CanvasMeta> {
    throw new BundleReadOnlyError('updateCanvasMeta', id);
  }

  async deleteCanvas(id: string): Promise<void> {
    throw new BundleReadOnlyError('deleteCanvas', id);
  }

  // ─── CanvasStorage: stories ─────────────────────────────────────────

  async listStories(opts?: { projectId?: string }): Promise<StoryMeta[]> {
    const out: StoryMeta[] = [];
    for (const entry of this.stories.values()) {
      if (opts?.projectId && entry.meta.projectId !== opts.projectId) continue;
      out.push(entry.meta);
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  async getStory(id: string): Promise<Story | null> {
    const entry = this.stories.get(id);
    if (!entry) return null;
    const contentPath = join(entry.storyDir, 'content.md');
    let content = '';
    try {
      content = await fs.readFile(contentPath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // Missing content file → empty body; still a valid story.
    }
    return { ...entry.meta, content };
  }

  async createStory(_story: Story): Promise<void> {
    throw new BundleReadOnlyError('createStory');
  }

  async updateStory(id: string, _patch: Partial<Story>): Promise<Story> {
    throw new BundleReadOnlyError('updateStory', id);
  }

  async deleteStory(id: string): Promise<void> {
    throw new BundleReadOnlyError('deleteStory', id);
  }

  // ─── CanvasStorage: yjs binary ──────────────────────────────────────

  async saveYDocState(id: string, _state: Uint8Array): Promise<void> {
    throw new BundleReadOnlyError('saveYDocState', id);
  }

  async loadYDocState(id: string): Promise<Uint8Array | null> {
    const entry = this.canvases.get(id);
    if (!entry) return null;
    const ydocPath = join(entry.canvasDir, 'live.ydoc');
    try {
      const buf = await fs.readFile(ydocPath);
      return new Uint8Array(buf);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  // ─── CanvasStorage: snapshots ───────────────────────────────────────

  async createSnapshot(snapshot: Snapshot): Promise<void> {
    throw new BundleReadOnlyError('createSnapshot', snapshot.canvasId);
  }

  async listSnapshots(_canvasId: string, _kind?: SnapshotKind): Promise<SnapshotMeta[]> {
    // Library canvases are read-only; they have no user-authored
    // snapshots. Returning [] is the truthful answer.
    return [];
  }

  async getSnapshot(_canvasId: string, _snapshotId: string): Promise<Snapshot | null> {
    return null;
  }

  async deleteSnapshot(canvasId: string, _snapshotId: string): Promise<void> {
    throw new BundleReadOnlyError('deleteSnapshot', canvasId);
  }

  async pruneAutosaves(canvasId: string, _keepN: number): Promise<void> {
    // The library has no autosaves to prune. Throwing here would be
    // noisy if a periodic pruner happens to call us with a bundle id;
    // be quiet instead.
    if (this.canvases.has(canvasId)) return;
    throw new BundleReadOnlyError('pruneAutosaves', canvasId);
  }

  // ─── private — bundle scan ──────────────────────────────────────────

  private async scan(): Promise<void> {
    let manifest: CaseLibraryManifest;
    try {
      const raw = await fs.readFile(join(this.bundleDir, 'manifest.json'), 'utf8');
      manifest = JSON.parse(raw) as CaseLibraryManifest;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') return; // empty bundle
      throw err;
    }
    if (!Array.isArray(manifest.cases)) return;

    for (let i = 0; i < manifest.cases.length; i++) {
      const entry = manifest.cases[i]!;
      try {
        const record = await this.loadCase(entry.slug, i, !!entry.featured);
        this.bySlug.set(record.slug, record);
        this.projects.set(record.project.id, record);
      } catch {
        // A broken individual case must not bring the whole server down;
        // the build-time validator will catch this in CI. Skip silently
        // at runtime.
      }
    }
  }

  private async loadCase(
    slug: string,
    orderIndex: number,
    featured: boolean,
  ): Promise<BundleCaseRecord> {
    const caseDir = join(this.bundleDir, 'cases', slug);
    const caseJsonRaw = await fs.readFile(join(caseDir, 'case.json'), 'utf8');
    const caseJson = JSON.parse(caseJsonRaw) as CaseLibraryEntry;

    // Project — the case.json says which uuid file under projects/ to read.
    const projectPath = join(caseDir, 'projects', `${caseJson.projectId}.json`);
    const rawProject = JSON.parse(await fs.readFile(projectPath, 'utf8')) as Project;

    // Synthesize the library-origin metadata onto the runtime project so
    // every consumer of `getProject` sees consistent fields, even when the
    // on-disk projects/<uuid>.json is a minimal Project shape (the
    // authoring tool is allowed to leave `source` etc. undefined; we
    // normalise here).
    const project: Project = {
      ...rawProject,
      source: 'library',
      companySlug: caseJson.slug,
      // Use English company name as the canonical Project.name; UI can
      // request the bilingual version via /library/cases/:slug.
      companyName: caseJson.companyName.en,
      tags: caseJson.tags,
      caseKind: caseJson.kind,
    };

    // Walk canvases/ and stories/ to enumerate ids (we don't trust
    // case.json to list them — directory walk is the source of truth).
    const canvasIds = await this.scanCanvases(caseDir, project.id);
    const storyIds = await this.scanStories(caseDir, project.id);

    // Hydrate per-canvas + per-story indices for fast lookup.
    for (const canvasId of canvasIds) {
      const canvasDir = join(caseDir, 'canvases', canvasId);
      const meta = JSON.parse(
        await fs.readFile(join(canvasDir, 'meta.json'), 'utf8'),
      ) as CanvasMeta;
      this.canvases.set(canvasId, {
        record: undefined as unknown as BundleCaseRecord, // back-filled below
        meta,
        canvasDir,
      });
    }
    for (const storyId of storyIds) {
      const storyDir = join(caseDir, 'stories', storyId);
      const meta = JSON.parse(
        await fs.readFile(join(storyDir, 'meta.json'), 'utf8'),
      ) as StoryMeta;
      this.stories.set(storyId, {
        record: undefined as unknown as BundleCaseRecord,
        meta,
        storyDir,
      });
    }

    const record: BundleCaseRecord = {
      slug: caseJson.slug,
      caseDir,
      index: orderIndex,
      featured,
      caseJson: {
        ...caseJson,
        // Authoritative counts derived from the directory walk; ignore
        // any drift in case.json.
        canvasCount: canvasIds.length,
        storyCount: storyIds.length,
        // Per-language breakdowns let the case card / preview / library
        // workspace show the user-facing count for the active UI lang
        // (with the total as fallback). Computed from the canvas/story
        // meta we just hydrated. Untagged content is bucketed under
        // its absence — older cases without per-canvas `language`
        // simply have empty per-lang maps and consumers fall back to
        // the absolute counts.
        canvasesByLanguage: countByLanguage(
          canvasIds.map((id) => this.canvases.get(id)?.meta.language),
        ),
        storiesByLanguage: countByLanguage(
          storyIds.map((id) => this.stories.get(id)?.meta.language),
        ),
      },
      project,
      canvasIds,
      storyIds,
    };

    // Back-fill the record references on the per-canvas / per-story maps.
    for (const id of canvasIds) {
      const entry = this.canvases.get(id);
      if (entry) entry.record = record;
    }
    for (const id of storyIds) {
      const entry = this.stories.get(id);
      if (entry) entry.record = record;
    }

    return record;
  }

  private async scanCanvases(caseDir: string, projectId: string): Promise<string[]> {
    const canvasesRoot = join(caseDir, 'canvases');
    let entries: string[] = [];
    try {
      entries = await fs.readdir(canvasesRoot);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: string[] = [];
    for (const id of entries) {
      const stat = await fs.stat(join(canvasesRoot, id)).catch(() => null);
      if (!stat?.isDirectory()) continue;
      // Validate the canvas's projectId before keeping it. A canvas
      // pointing at a different project is a content authoring bug.
      try {
        const meta = JSON.parse(
          await fs.readFile(join(canvasesRoot, id, 'meta.json'), 'utf8'),
        ) as CanvasMeta;
        if (meta.projectId === projectId) out.push(id);
      } catch {
        // skip unreadable canvas
      }
    }
    return out;
  }

  private async scanStories(caseDir: string, projectId: string): Promise<string[]> {
    const storiesRoot = join(caseDir, 'stories');
    let entries: string[] = [];
    try {
      entries = await fs.readdir(storiesRoot);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: string[] = [];
    for (const id of entries) {
      const stat = await fs.stat(join(storiesRoot, id)).catch(() => null);
      if (!stat?.isDirectory()) continue;
      try {
        const meta = JSON.parse(
          await fs.readFile(join(storiesRoot, id, 'meta.json'), 'utf8'),
        ) as StoryMeta;
        if (meta.projectId === projectId) out.push(id);
      } catch {
        /* skip unreadable */
      }
    }
    return out;
  }
}

/**
 * Count occurrences of each `Lang` value in a list of optional language
 * tags. Used to derive `CaseLibraryEntry.canvasesByLanguage` /
 * `storiesByLanguage` from the per-canvas / per-story `language` fields
 * stored on disk. Languages outside the `Lang` union and `undefined`
 * entries are ignored — older single-language cases without per-canvas
 * tagging simply produce an empty map and consumers fall back to the
 * absolute count fields. The map only carries non-zero entries to keep
 * the JSON payload tight.
 */
function countByLanguage(
  langs: ReadonlyArray<Lang | undefined>,
): Partial<Record<Lang, number>> {
  const out: Partial<Record<Lang, number>> = {};
  for (const lang of langs) {
    if (lang !== 'en' && lang !== 'zh') continue;
    out[lang] = (out[lang] ?? 0) + 1;
  }
  return out;
}
