import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type {
  CanvasMeta,
  Project,
  Snapshot,
  SnapshotKind,
  SnapshotMeta,
} from '@canvas-collab/shared';
import type { CanvasStorage } from './CanvasStorage.js';

/**
 * v1 storage layout:
 *
 *   <root>/
 *     projects/
 *       <project-id>.json           Project metadata
 *     canvases/
 *       <canvas-id>/
 *         meta.json                 CanvasMeta (includes projectId)
 *         live.ydoc                 binary Yjs state
 *         snapshots/
 *           <snapshot-id>.json      Snapshot (state base64)
 */
export class FileSystemStorage implements CanvasStorage {
  constructor(private readonly root: string) {}

  // ───────────────── projects ─────────────────
  async listProjects(): Promise<Project[]> {
    const dir = this.projectsDir();
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir);
    const out: Project[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(join(dir, f), 'utf8');
        out.push(JSON.parse(raw) as Project);
      } catch {
        /* ignore corrupt project file */
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const raw = await fs.readFile(this.projectPath(id), 'utf8');
      return JSON.parse(raw) as Project;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async createProject(p: Project): Promise<void> {
    await fs.mkdir(this.projectsDir(), { recursive: true });
    await fs.writeFile(this.projectPath(p.id), JSON.stringify(p, null, 2), 'utf8');
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    const cur = await this.getProject(id);
    if (!cur) throw new Error(`Project ${id} not found`);
    const next: Project = {
      ...cur,
      ...patch,
      id: cur.id,
      createdAt: cur.createdAt,
      createdBy: cur.createdBy,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.projectPath(id), JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  async deleteProject(id: string): Promise<void> {
    // cascade: every canvas with this projectId
    const children = await this.listCanvases({ projectId: id });
    for (const c of children) {
      await this.deleteCanvas(c.id);
    }
    await fs.rm(this.projectPath(id), { force: true });
  }

  // ───────────────── canvases ─────────────────
  async listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]> {
    const dir = this.canvasesDir();
    await fs.mkdir(dir, { recursive: true });
    const ids = await fs.readdir(dir);
    const out: CanvasMeta[] = [];
    for (const id of ids) {
      const meta = await this.readMeta(id);
      if (!meta) continue;
      if (opts?.projectId && meta.projectId !== opts.projectId) continue;
      out.push(meta);
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async getCanvas(id: string): Promise<CanvasMeta | null> {
    return this.readMeta(id);
  }

  async createCanvas(meta: CanvasMeta): Promise<void> {
    await fs.mkdir(this.canvasDir(meta.id), { recursive: true });
    await fs.mkdir(this.snapshotsDir(meta.id), { recursive: true });
    await fs.writeFile(this.metaPath(meta.id), JSON.stringify(meta, null, 2), 'utf8');
  }

  async updateCanvasMeta(id: string, patch: Partial<CanvasMeta>): Promise<CanvasMeta> {
    const cur = await this.readMeta(id);
    if (!cur) throw new Error(`Canvas ${id} not found`);
    const next: CanvasMeta = {
      ...cur,
      ...patch,
      id: cur.id,
      projectId: cur.projectId,
      defId: cur.defId,
      createdAt: cur.createdAt,
      createdBy: cur.createdBy,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.metaPath(id), JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  async deleteCanvas(id: string): Promise<void> {
    await fs.rm(this.canvasDir(id), { recursive: true, force: true });
  }

  // ───────────────── Yjs binary ─────────────────
  async saveYDocState(id: string, state: Uint8Array): Promise<void> {
    await fs.mkdir(this.canvasDir(id), { recursive: true });
    await fs.writeFile(this.ydocPath(id), state);
  }

  async loadYDocState(id: string): Promise<Uint8Array | null> {
    try {
      const buf = await fs.readFile(this.ydocPath(id));
      return new Uint8Array(buf);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  // ───────────────── snapshots ─────────────────
  async createSnapshot(snapshot: Snapshot): Promise<void> {
    const dir = this.snapshotsDir(snapshot.canvasId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      join(dir, `${snapshot.id}.json`),
      JSON.stringify(snapshot, null, 2),
      'utf8',
    );
  }

  async listSnapshots(canvasId: string, kind?: SnapshotKind): Promise<SnapshotMeta[]> {
    const dir = this.snapshotsDir(canvasId);
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: SnapshotMeta[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await fs.readFile(join(dir, f), 'utf8');
      const s = JSON.parse(raw) as Snapshot;
      if (kind && s.kind !== kind) continue;
      const { state: _state, ...meta } = s;
      out.push(meta);
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out;
  }

  async getSnapshot(canvasId: string, snapshotId: string): Promise<Snapshot | null> {
    try {
      const raw = await fs.readFile(
        join(this.snapshotsDir(canvasId), `${snapshotId}.json`),
        'utf8',
      );
      return JSON.parse(raw) as Snapshot;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async deleteSnapshot(canvasId: string, snapshotId: string): Promise<void> {
    await fs.rm(join(this.snapshotsDir(canvasId), `${snapshotId}.json`), {
      force: true,
    });
  }

  async pruneAutosaves(canvasId: string, keepN: number): Promise<void> {
    const all = await this.listSnapshots(canvasId, 'autosave');
    const stale = all.slice(keepN); // sorted desc by createdAt; keep the newest N
    await Promise.all(
      stale.map((s) =>
        fs.rm(join(this.snapshotsDir(canvasId), `${s.id}.json`), { force: true }),
      ),
    );
  }

  // ───────────────── path helpers ─────────────────
  private projectsDir() {
    return join(this.root, 'projects');
  }
  private projectPath(id: string) {
    return join(this.projectsDir(), `${id}.json`);
  }
  private canvasesDir() {
    return join(this.root, 'canvases');
  }
  private canvasDir(id: string) {
    return join(this.canvasesDir(), id);
  }
  private metaPath(id: string) {
    return join(this.canvasDir(id), 'meta.json');
  }
  private ydocPath(id: string) {
    return join(this.canvasDir(id), 'live.ydoc');
  }
  private snapshotsDir(id: string) {
    return join(this.canvasDir(id), 'snapshots');
  }

  private async readMeta(id: string): Promise<CanvasMeta | null> {
    try {
      const raw = await fs.readFile(this.metaPath(id), 'utf8');
      return JSON.parse(raw) as CanvasMeta;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}
