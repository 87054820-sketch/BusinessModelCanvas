import type { CanvasMeta, Project, Snapshot, SnapshotKind, Story } from '@pingarden/shared';
import { describe, expect, it, vi } from 'vitest';
import type { CanvasStorage } from './CanvasStorage';
import { FederatedStorage } from './FederatedStorage';
import type { BundleStorage } from './BundleStorage';
import { BundleReadOnlyError } from './errors';

function makeProject(id: string, source?: Project['source']): Project {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    name: `${id} project`,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
    ...(source ? { source } : {}),
  };
}

function makeCanvas(id: string, projectId: string): CanvasMeta {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    projectId,
    defId: 'business-model-canvas',
    title: `${id} canvas`,
    language: 'zh',
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
  };
}

function makeStory(id: string, projectId: string): Story {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    projectId,
    title: `${id} story`,
    status: 'draft',
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
    content: '# Story',
  };
}

function createUserStorage(opts: {
  projects?: Project[];
  canvases?: CanvasMeta[];
  stories?: Story[];
  states?: Array<[string, Uint8Array]>;
}): CanvasStorage {
  const projects = new Map((opts.projects ?? []).map((item) => [item.id, item]));
  const canvases = new Map((opts.canvases ?? []).map((item) => [item.id, item]));
  const stories = new Map((opts.stories ?? []).map((item) => [item.id, item]));
  const states = new Map(opts.states ?? []);

  return {
    listProjects: vi.fn(async () => [...projects.values()]),
    getProject: vi.fn(async (id: string) => projects.get(id) ?? null),
    createProject: vi.fn(async (project: Project) => {
      projects.set(project.id, project);
    }),
    updateProject: vi.fn(async (id: string, patch: Partial<Project>) => {
      const current = projects.get(id);
      if (!current) throw new Error(`Project ${id} not found`);
      const next = { ...current, ...patch, id: current.id };
      projects.set(id, next);
      return next;
    }),
    deleteProject: vi.fn(async (id: string) => {
      projects.delete(id);
    }),
    listCanvases: vi.fn(async (filter?: { projectId?: string }) =>
      [...canvases.values()].filter((item) => !filter?.projectId || item.projectId === filter.projectId),
    ),
    getCanvas: vi.fn(async (id: string) => canvases.get(id) ?? null),
    createCanvas: vi.fn(async (canvas: CanvasMeta) => {
      canvases.set(canvas.id, canvas);
    }),
    updateCanvasMeta: vi.fn(async (id: string, patch: Partial<CanvasMeta>) => {
      const current = canvases.get(id);
      if (!current) throw new Error(`Canvas ${id} not found`);
      const next = { ...current, ...patch, id: current.id, projectId: current.projectId };
      canvases.set(id, next);
      return next;
    }),
    deleteCanvas: vi.fn(async (id: string) => {
      canvases.delete(id);
    }),
    listStories: vi.fn(async (filter?: { projectId?: string }) =>
      [...stories.values()].filter((item) => !filter?.projectId || item.projectId === filter.projectId),
    ),
    getStory: vi.fn(async (id: string) => stories.get(id) ?? null),
    createStory: vi.fn(async (story: Story) => {
      stories.set(story.id, story);
    }),
    updateStory: vi.fn(async (id: string, patch: Partial<Story>) => {
      const current = stories.get(id);
      if (!current) throw new Error(`Story ${id} not found`);
      const next = { ...current, ...patch, id: current.id, projectId: current.projectId };
      stories.set(id, next);
      return next;
    }),
    deleteStory: vi.fn(async (id: string) => {
      stories.delete(id);
    }),
    saveYDocState: vi.fn(async (id: string, state: Uint8Array) => {
      states.set(id, state);
    }),
    loadYDocState: vi.fn(async (id: string) => states.get(id) ?? null),
    createSnapshot: vi.fn(async (_snapshot: Snapshot) => {}),
    listSnapshots: vi.fn(async (_canvasId: string, _kind?: SnapshotKind) => []),
    getSnapshot: vi.fn(async (_canvasId: string, _snapshotId: string) => null),
    deleteSnapshot: vi.fn(async (_canvasId: string, _snapshotId: string) => {}),
    pruneAutosaves: vi.fn(async (_canvasId: string, _keepN: number) => {}),
  };
}

function createBundleStorage(opts: {
  projects?: Project[];
  canvases?: CanvasMeta[];
  stories?: Story[];
  states?: Array<[string, Uint8Array]>;
}): BundleStorage {
  const projects = new Map((opts.projects ?? []).map((item) => [item.id, item]));
  const canvases = new Map((opts.canvases ?? []).map((item) => [item.id, item]));
  const stories = new Map((opts.stories ?? []).map((item) => [item.id, item]));
  const states = new Map(opts.states ?? []);

  return {
    hasProject: (id: string) => projects.has(id),
    hasCanvas: (id: string) => canvases.has(id),
    hasStory: (id: string) => stories.has(id),
    listProjects: vi.fn(async () => [...projects.values()]),
    getProject: vi.fn(async (id: string) => projects.get(id) ?? null),
    listCanvases: vi.fn(async (filter?: { projectId?: string }) =>
      [...canvases.values()].filter((item) => !filter?.projectId || item.projectId === filter.projectId),
    ),
    getCanvas: vi.fn(async (id: string) => canvases.get(id) ?? null),
    listStories: vi.fn(async (filter?: { projectId?: string }) =>
      [...stories.values()].filter((item) => !filter?.projectId || item.projectId === filter.projectId),
    ),
    getStory: vi.fn(async (id: string) => stories.get(id) ?? null),
    loadYDocState: vi.fn(async (id: string) => states.get(id) ?? null),
  } as unknown as BundleStorage;
}

describe('FederatedStorage permission routing', () => {
  it('reads user-owned resources before bundled read-only resources with the same id', async () => {
    const userProject = makeProject('project-1');
    const bundleProject = { ...makeProject('project-1', 'library'), name: 'library copy' };
    const storage = new FederatedStorage(
      createUserStorage({ projects: [userProject] }),
      createBundleStorage({ projects: [bundleProject] }),
    );

    await expect(storage.getProject('project-1')).resolves.toEqual(userProject);
  });

  it('throws a structured read-only error when only the bundle owns a project', async () => {
    const storage = new FederatedStorage(
      createUserStorage({}),
      createBundleStorage({ projects: [makeProject('library-project', 'library')] }),
    );

    await expect(storage.updateProject('library-project', { name: 'Edit' })).rejects.toMatchObject(
      {
        name: 'BundleReadOnlyError',
        operation: 'updateProject',
        targetId: 'library-project',
      },
    );
  });

  it('allows a user-owned legacy copy to shadow a bundled project id for writes', async () => {
    const user = createUserStorage({ projects: [makeProject('shared-project')] });
    const storage = new FederatedStorage(
      user,
      createBundleStorage({ projects: [makeProject('shared-project', 'library')] }),
    );

    await expect(storage.updateProject('shared-project', { name: 'My copy' })).resolves.toMatchObject({
      id: 'shared-project',
      name: 'My copy',
    });
    expect(user.updateProject).toHaveBeenCalledWith('shared-project', { name: 'My copy' });
  });

  it('refuses to create a canvas inside a bundle-only project', async () => {
    const storage = new FederatedStorage(
      createUserStorage({}),
      createBundleStorage({ projects: [makeProject('library-project', 'library')] }),
    );

    await expect(storage.createCanvas(makeCanvas('new-canvas', 'library-project'))).rejects.toBeInstanceOf(
      BundleReadOnlyError,
    );
  });

  it('refuses direct Yjs state writes to bundle-only canvases', async () => {
    const storage = new FederatedStorage(
      createUserStorage({}),
      createBundleStorage({
        projects: [makeProject('library-project', 'library')],
        canvases: [makeCanvas('library-canvas', 'library-project')],
      }),
    );

    await expect(storage.saveYDocState('library-canvas', new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      operation: 'saveYDocState',
      targetId: 'library-canvas',
    });
  });

  it('treats bundle-only snapshots as absent for read paths', async () => {
    const storage = new FederatedStorage(
      createUserStorage({}),
      createBundleStorage({
        projects: [makeProject('library-project', 'library')],
        canvases: [makeCanvas('library-canvas', 'library-project')],
      }),
    );

    await expect(storage.listSnapshots('library-canvas')).resolves.toEqual([]);
    await expect(storage.getSnapshot('library-canvas', 'snap-1')).resolves.toBeNull();
  });
});
