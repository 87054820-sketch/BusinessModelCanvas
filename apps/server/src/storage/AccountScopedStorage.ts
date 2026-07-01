import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
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
import { FileSystemStorage } from './FileSystemStorage.js';

interface AccountStorageIndex {
  projects: Record<string, string>;
  canvases: Record<string, string>;
  stories: Record<string, string>;
}

const EMPTY_INDEX: AccountStorageIndex = {
  projects: {},
  canvases: {},
  stories: {},
};

export interface AccountScope {
  kind: 'user' | 'team';
  id: string;
}

export interface ScopedProjectStorage {
  listProjectsForScopes(scopes: AccountScope[]): Promise<Project[]>;
}

/**
 * Filesystem storage with physical account partitioning.
 *
 *   <root>/accounts/users/<user-id>/...
 *   <root>/accounts/teams/<team-id>/...
 *
 * Official cases still live in BundleStorage. This class only owns
 * user/team writable data and refuses legacy projects that have no
 * `ownerUserId` or `teamId`.
 */
export class AccountScopedStorage implements CanvasStorage {
  constructor(private readonly root: string) {}

  async listProjectsForScopes(scopes: AccountScope[]): Promise<Project[]> {
    const unique = uniqueScopes(scopes).map((scope) => scopeToPath(scope));
    const lists = await Promise.all(unique.map((scope) => this.storage(scope).listProjects()));
    return lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listProjects(): Promise<Project[]> {
    const scopes = await this.listScopes();
    const lists = await Promise.all(scopes.map((scope) => this.storage(scope).listProjects()));
    return lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<Project | null> {
    const scope = await this.scopeForProjectId(id);
    return scope ? this.storage(scope).getProject(id) : null;
  }

  async createProject(p: Project): Promise<void> {
    const scope = scopeForProject(p);
    await this.storage(scope).createProject(p);
    const index = await this.readIndex();
    index.projects[p.id] = scope;
    await this.writeIndex(index);
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const scope = await this.requireProjectScope(id);
    return this.storage(scope).updateProject(id, patch);
  }

  async deleteProject(id: string): Promise<void> {
    const scope = await this.requireProjectScope(id);
    const scoped = this.storage(scope);
    const [canvases, stories] = await Promise.all([
      scoped.listCanvases({ projectId: id }),
      scoped.listStories({ projectId: id }),
    ]);
    await scoped.deleteProject(id);
    const index = await this.readIndex();
    delete index.projects[id];
    for (const canvas of canvases) delete index.canvases[canvas.id];
    for (const story of stories) delete index.stories[story.id];
    await this.writeIndex(index);
  }

  async listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]> {
    if (opts?.projectId) {
      const scope = await this.scopeForProjectId(opts.projectId);
      return scope ? this.storage(scope).listCanvases(opts) : [];
    }
    const scopes = await this.listScopes();
    const lists = await Promise.all(scopes.map((scope) => this.storage(scope).listCanvases()));
    return lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCanvas(id: string): Promise<CanvasMeta | null> {
    const scope = await this.scopeForCanvasId(id);
    return scope ? this.storage(scope).getCanvas(id) : null;
  }

  async createCanvas(meta: CanvasMeta): Promise<void> {
    const scope = await this.requireProjectScope(meta.projectId);
    await this.storage(scope).createCanvas(meta);
    const index = await this.readIndex();
    index.canvases[meta.id] = scope;
    await this.writeIndex(index);
  }

  async updateCanvasMeta(id: string, patch: Partial<CanvasMeta>): Promise<CanvasMeta> {
    const scope = await this.requireCanvasScope(id);
    return this.storage(scope).updateCanvasMeta(id, patch);
  }

  async deleteCanvas(id: string): Promise<void> {
    const scope = await this.requireCanvasScope(id);
    await this.storage(scope).deleteCanvas(id);
    const index = await this.readIndex();
    delete index.canvases[id];
    await this.writeIndex(index);
  }

  async listStories(opts?: { projectId?: string }): Promise<StoryMeta[]> {
    if (opts?.projectId) {
      const scope = await this.scopeForProjectId(opts.projectId);
      return scope ? this.storage(scope).listStories(opts) : [];
    }
    const scopes = await this.listScopes();
    const lists = await Promise.all(scopes.map((scope) => this.storage(scope).listStories()));
    return lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getStory(id: string): Promise<Story | null> {
    const scope = await this.scopeForStoryId(id);
    return scope ? this.storage(scope).getStory(id) : null;
  }

  async createStory(story: Story): Promise<void> {
    const scope = await this.requireProjectScope(story.projectId);
    await this.storage(scope).createStory(story);
    const index = await this.readIndex();
    index.stories[story.id] = scope;
    await this.writeIndex(index);
  }

  async updateStory(id: string, patch: Partial<Story>): Promise<Story> {
    const scope = await this.requireStoryScope(id);
    return this.storage(scope).updateStory(id, patch);
  }

  async deleteStory(id: string): Promise<void> {
    const scope = await this.requireStoryScope(id);
    await this.storage(scope).deleteStory(id);
    const index = await this.readIndex();
    delete index.stories[id];
    await this.writeIndex(index);
  }

  async saveYDocState(id: string, state: Uint8Array): Promise<void> {
    const scope = await this.requireCanvasScope(id);
    return this.storage(scope).saveYDocState(id, state);
  }

  async loadYDocState(id: string): Promise<Uint8Array | null> {
    const scope = await this.scopeForCanvasId(id);
    return scope ? this.storage(scope).loadYDocState(id) : null;
  }

  async createSnapshot(snapshot: Snapshot): Promise<void> {
    const scope = await this.requireCanvasScope(snapshot.canvasId);
    return this.storage(scope).createSnapshot(snapshot);
  }

  async listSnapshots(canvasId: string, kind?: SnapshotKind): Promise<SnapshotMeta[]> {
    const scope = await this.scopeForCanvasId(canvasId);
    return scope ? this.storage(scope).listSnapshots(canvasId, kind) : [];
  }

  async getSnapshot(canvasId: string, snapshotId: string): Promise<Snapshot | null> {
    const scope = await this.scopeForCanvasId(canvasId);
    return scope ? this.storage(scope).getSnapshot(canvasId, snapshotId) : null;
  }

  async deleteSnapshot(canvasId: string, snapshotId: string): Promise<void> {
    const scope = await this.requireCanvasScope(canvasId);
    return this.storage(scope).deleteSnapshot(canvasId, snapshotId);
  }

  async pruneAutosaves(canvasId: string, keepN: number): Promise<void> {
    const scope = await this.scopeForCanvasId(canvasId);
    if (!scope) return;
    return this.storage(scope).pruneAutosaves(canvasId, keepN);
  }

  private storage(scope: string): FileSystemStorage {
    return new FileSystemStorage(join(this.root, 'accounts', scope));
  }

  private indexPath(): string {
    return join(this.root, 'accounts', 'index.json');
  }

  private async scopeForProjectId(id: string): Promise<string | null> {
    const index = await this.readIndex();
    const indexed = index.projects[id];
    if (indexed) return indexed;
    return this.scanForProject(id, index);
  }

  private async scopeForCanvasId(id: string): Promise<string | null> {
    const index = await this.readIndex();
    const indexed = index.canvases[id];
    if (indexed) return indexed;
    return this.scanForCanvas(id, index);
  }

  private async scopeForStoryId(id: string): Promise<string | null> {
    const index = await this.readIndex();
    const indexed = index.stories[id];
    if (indexed) return indexed;
    return this.scanForStory(id, index);
  }

  private async requireProjectScope(id: string): Promise<string> {
    const scope = await this.scopeForProjectId(id);
    if (!scope) throw new Error(`Project ${id} not found`);
    return scope;
  }

  private async requireCanvasScope(id: string): Promise<string> {
    const scope = await this.scopeForCanvasId(id);
    if (!scope) throw new Error(`Canvas ${id} not found`);
    return scope;
  }

  private async requireStoryScope(id: string): Promise<string> {
    const scope = await this.scopeForStoryId(id);
    if (!scope) throw new Error(`Story ${id} not found`);
    return scope;
  }

  private async scanForProject(id: string, index: AccountStorageIndex): Promise<string | null> {
    for (const scope of await this.listScopes()) {
      if (await this.storage(scope).getProject(id)) {
        index.projects[id] = scope;
        await this.writeIndex(index);
        return scope;
      }
    }
    return null;
  }

  private async scanForCanvas(id: string, index: AccountStorageIndex): Promise<string | null> {
    for (const scope of await this.listScopes()) {
      if (await this.storage(scope).getCanvas(id)) {
        index.canvases[id] = scope;
        await this.writeIndex(index);
        return scope;
      }
    }
    return null;
  }

  private async scanForStory(id: string, index: AccountStorageIndex): Promise<string | null> {
    for (const scope of await this.listScopes()) {
      if (await this.storage(scope).getStory(id)) {
        index.stories[id] = scope;
        await this.writeIndex(index);
        return scope;
      }
    }
    return null;
  }

  private async listScopes(): Promise<string[]> {
    const out: string[] = [];
    for (const kind of ['users', 'teams'] as const) {
      const dir = join(this.root, 'accounts', kind);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
      out.push(...entries.map((entry) => `${kind}/${entry}`));
    }
    return out;
  }

  private async readIndex(): Promise<AccountStorageIndex> {
    try {
      const raw = await fs.readFile(this.indexPath(), 'utf8');
      const parsed = JSON.parse(raw) as Partial<AccountStorageIndex>;
      return {
        projects: parsed.projects ?? {},
        canvases: parsed.canvases ?? {},
        stories: parsed.stories ?? {},
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          projects: { ...EMPTY_INDEX.projects },
          canvases: { ...EMPTY_INDEX.canvases },
          stories: { ...EMPTY_INDEX.stories },
        };
      }
      throw err;
    }
  }

  private async writeIndex(index: AccountStorageIndex): Promise<void> {
    await fs.mkdir(dirname(this.indexPath()), { recursive: true });
    await fs.writeFile(this.indexPath(), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  }
}

function scopeForProject(project: Project): string {
  if (project.teamId) return `teams/${encodeScopePart(project.teamId)}`;
  if (project.ownerUserId) return `users/${encodeScopePart(project.ownerUserId)}`;
  throw new Error(`Project ${project.id} is missing ownerUserId/teamId.`);
}

function scopeToPath(scope: AccountScope): string {
  const kind = scope.kind === 'user' ? 'users' : 'teams';
  return `${kind}/${encodeScopePart(scope.id)}`;
}

function uniqueScopes(scopes: AccountScope[]): AccountScope[] {
  const seen = new Set<string>();
  const out: AccountScope[] = [];
  for (const scope of scopes) {
    const key = `${scope.kind}:${scope.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(scope);
  }
  return out;
}

function encodeScopePart(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}
