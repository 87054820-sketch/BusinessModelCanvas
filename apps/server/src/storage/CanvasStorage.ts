import type {
  CanvasMeta,
  Project,
  Snapshot,
  SnapshotKind,
  SnapshotMeta,
} from '@canvas-collab/shared';

/**
 * Storage seam — every read/write of canvas/project state goes through this
 * interface. v1 ships a FileSystemStorage; replacing it with a PostgresStorage
 * later should not require touching domain code (HTTP handlers, snapshot
 * scheduler, future y-websocket persistence).
 */
export interface CanvasStorage {
  // projects ────────────────────────────────────────────────
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(p: Project): Promise<void>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  /** Cascades: deletes every canvas (and its snapshots) belonging to the project. */
  deleteProject(id: string): Promise<void>;

  // canvases ────────────────────────────────────────────────
  /** Optionally filter by project. */
  listCanvases(opts?: { projectId?: string }): Promise<CanvasMeta[]>;
  getCanvas(id: string): Promise<CanvasMeta | null>;
  createCanvas(meta: CanvasMeta): Promise<void>;
  updateCanvasMeta(id: string, patch: Partial<CanvasMeta>): Promise<CanvasMeta>;
  deleteCanvas(id: string): Promise<void>;

  // live Yjs document state (binary) ────────────────────────
  saveYDocState(id: string, state: Uint8Array): Promise<void>;
  loadYDocState(id: string): Promise<Uint8Array | null>;

  // snapshots ───────────────────────────────────────────────
  createSnapshot(snapshot: Snapshot): Promise<void>;
  listSnapshots(canvasId: string, kind?: SnapshotKind): Promise<SnapshotMeta[]>;
  getSnapshot(canvasId: string, snapshotId: string): Promise<Snapshot | null>;
  deleteSnapshot(canvasId: string, snapshotId: string): Promise<void>;
  pruneAutosaves(canvasId: string, keepN: number): Promise<void>;
}
