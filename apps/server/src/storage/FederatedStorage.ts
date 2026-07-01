import type {
  CanvasMeta,
  Project,
  Snapshot,
  SnapshotKind,
  SnapshotMeta,
  Story,
  StoryMeta,
} from '@pingarden/shared';
import type { CanvasStorage } from './CanvasStorage.js';
import type { AccountScope, ScopedProjectStorage } from './AccountScopedStorage.js';
import { BundleStorage } from './BundleStorage.js';
import { BundleReadOnlyError } from './errors.js';

/**
 * Composes a writable user-data backend with a read-only case-library
 * backend. Reads check user storage first, falling through to the
 * library; writes always go to user storage and refuse — via
 * `BundleReadOnlyError` — when the target id is owned ONLY by the
 * library.
 *
 * Routing rule:
 *   - read    : user → bundle  (user-edited fork shadows library original
 *                                if a uuid collision ever happens; today
 *                                ids are uuid v4 so collision probability
 *                                is negligible, but this preserves the
 *                                "fork is independent" guarantee)
 *   - mutate  : if bundle.has(id) AND user does NOT have it →
 *                 throw BundleReadOnlyError
 *               else → delegate to user (which also throws on missing id)
 *
 * Why the "AND user does NOT have it" half matters: legacy collisions.
 * Several library cases were once authored as ordinary user projects,
 * then migrated into the bundle keeping their original uuid. Long-time
 * users who upgraded from those releases still have a copy of the
 * project in their writable data dir. The read-shadow rule already
 * makes the bundle copy invisible to them; on the mutate side, the
 * symmetric rule means their delete / update targets the user copy
 * they actually own — instead of the surprising "you can see it but
 * can't delete it" 403 the strict bundle-first check produced.
 *
 * The HTTP layer maps `BundleReadOnlyError` to a 403; everything else
 * keeps the existing semantics of the user backend (404 etc.).
 */
export class FederatedStorage implements CanvasStorage {
  constructor(
    /** Writable user storage. Today: `FileSystemStorage`. */
    private readonly user: CanvasStorage,
    /** Read-only library storage. Empty when no cases ship. */
    private readonly bundle: BundleStorage,
  ) {}

  // ─── read-only routing helpers ──────────────────────────────────────
  // "Is this id read-only from the user's perspective?" — true only when
  // the bundle is the SOLE owner of the id. If the user also has a copy
  // (legacy collision), they own it and writes go to their copy.

  private async isProjectReadOnly(id: string): Promise<boolean> {
    if (!this.bundle.hasProject(id)) return false;
    return (await this.user.getProject(id)) === null;
  }

  private async isCanvasReadOnly(id: string): Promise<boolean> {
    if (!this.bundle.hasCanvas(id)) return false;
    return (await this.user.getCanvas(id)) === null;
  }

  private async isStoryReadOnly(id: string): Promise<boolean> {
    if (!this.bundle.hasStory(id)) return false;
    return (await this.user.getStory(id)) === null;
  }

  // ─── projects ───────────────────────────────────────────────────────

  async listProjectsForScopes(scopes: AccountScope[]): Promise<Project[]> {
    if (hasScopedProjectStorage(this.user)) {
      return this.user.listProjectsForScopes(scopes);
    }
    return [];
  }

  async listProjects(): Promise<Project[]> {
    const [u, b] = await Promise.all([this.user.listProjects(), this.bundle.listProjects()]);
    // User projects first (most-recently-edited focus), then library at
    // the bottom — keeps the "my work" surface area on top in any UI
    // that consumes this list directly without further filtering.
    return [...u, ...b];
  }

  async getProject(id: string): Promise<Project | null> {
    const u = await this.user.getProject(id);
    if (u) return u;
    return this.bundle.getProject(id);
  }

  async createProject(p: Project): Promise<void> {
    return this.user.createProject(p);
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    if (await this.isProjectReadOnly(id)) {
      throw new BundleReadOnlyError('updateProject', id);
    }
    return this.user.updateProject(id, patch);
  }

  async deleteProject(id: string): Promise<void> {
    if (await this.isProjectReadOnly(id)) {
      throw new BundleReadOnlyError('deleteProject', id);
    }
    return this.user.deleteProject(id);
  }

  // ─── canvases ───────────────────────────────────────────────────────

  async listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]> {
    const [u, b] = await Promise.all([
      this.user.listCanvases(opts),
      this.bundle.listCanvases(opts),
    ]);
    return [...u, ...b];
  }

  async getCanvas(id: string): Promise<CanvasMeta | null> {
    const u = await this.user.getCanvas(id);
    if (u) return u;
    return this.bundle.getCanvas(id);
  }

  async createCanvas(meta: CanvasMeta): Promise<void> {
    // A new canvas can't belong to a library project — those are read-
    // only. Refuse early with a clear error rather than letting the
    // user backend write a canvas whose projectId doesn't exist there.
    if (await this.isProjectReadOnly(meta.projectId)) {
      throw new BundleReadOnlyError('createCanvas', meta.projectId);
    }
    return this.user.createCanvas(meta);
  }

  async updateCanvasMeta(id: string, patch: Partial<CanvasMeta>): Promise<CanvasMeta> {
    if (await this.isCanvasReadOnly(id)) {
      throw new BundleReadOnlyError('updateCanvasMeta', id);
    }
    return this.user.updateCanvasMeta(id, patch);
  }

  async deleteCanvas(id: string): Promise<void> {
    if (await this.isCanvasReadOnly(id)) {
      throw new BundleReadOnlyError('deleteCanvas', id);
    }
    return this.user.deleteCanvas(id);
  }

  // ─── stories ────────────────────────────────────────────────────────

  async listStories(opts?: { projectId?: string }): Promise<StoryMeta[]> {
    const [u, b] = await Promise.all([
      this.user.listStories(opts),
      this.bundle.listStories(opts),
    ]);
    return [...u, ...b];
  }

  async getStory(id: string): Promise<Story | null> {
    const u = await this.user.getStory(id);
    if (u) return u;
    return this.bundle.getStory(id);
  }

  async createStory(story: Story): Promise<void> {
    if (await this.isProjectReadOnly(story.projectId)) {
      throw new BundleReadOnlyError('createStory', story.projectId);
    }
    return this.user.createStory(story);
  }

  async updateStory(id: string, patch: Partial<Story>): Promise<Story> {
    if (await this.isStoryReadOnly(id)) {
      throw new BundleReadOnlyError('updateStory', id);
    }
    return this.user.updateStory(id, patch);
  }

  async deleteStory(id: string): Promise<void> {
    if (await this.isStoryReadOnly(id)) {
      throw new BundleReadOnlyError('deleteStory', id);
    }
    return this.user.deleteStory(id);
  }

  // ─── yjs binary ─────────────────────────────────────────────────────

  async saveYDocState(id: string, state: Uint8Array): Promise<void> {
    if (await this.isCanvasReadOnly(id)) {
      throw new BundleReadOnlyError('saveYDocState', id);
    }
    return this.user.saveYDocState(id, state);
  }

  async loadYDocState(id: string): Promise<Uint8Array | null> {
    const u = await this.user.loadYDocState(id);
    if (u) return u;
    return this.bundle.loadYDocState(id);
  }

  // ─── snapshots ──────────────────────────────────────────────────────

  async createSnapshot(snapshot: Snapshot): Promise<void> {
    if (await this.isCanvasReadOnly(snapshot.canvasId)) {
      throw new BundleReadOnlyError('createSnapshot', snapshot.canvasId);
    }
    return this.user.createSnapshot(snapshot);
  }

  async listSnapshots(canvasId: string, kind?: SnapshotKind): Promise<SnapshotMeta[]> {
    if (await this.isCanvasReadOnly(canvasId)) return [];
    return this.user.listSnapshots(canvasId, kind);
  }

  async getSnapshot(canvasId: string, snapshotId: string): Promise<Snapshot | null> {
    if (await this.isCanvasReadOnly(canvasId)) return null;
    return this.user.getSnapshot(canvasId, snapshotId);
  }

  async deleteSnapshot(canvasId: string, snapshotId: string): Promise<void> {
    if (await this.isCanvasReadOnly(canvasId)) {
      throw new BundleReadOnlyError('deleteSnapshot', canvasId);
    }
    return this.user.deleteSnapshot(canvasId, snapshotId);
  }

  async pruneAutosaves(canvasId: string, keepN: number): Promise<void> {
    // Bundle-only canvases never have autosaves; quietly no-op rather
    // than surface an error to a routine pruner.
    if (await this.isCanvasReadOnly(canvasId)) return;
    return this.user.pruneAutosaves(canvasId, keepN);
  }

  // ─── library-only escape hatch (used by /library/* routes) ──────────

  /**
   * Direct access to the bundle backend. The library HTTP routes use
   * this for `listCases` / `getCaseBySlug` / `caseSlugForProject` —
   * concepts that don't fit the generic CanvasStorage interface.
   */
  get bundleStorage(): BundleStorage {
    return this.bundle;
  }
}

function hasScopedProjectStorage(storage: CanvasStorage): storage is CanvasStorage & ScopedProjectStorage {
  return typeof (storage as Partial<ScopedProjectStorage>).listProjectsForScopes === 'function';
}
