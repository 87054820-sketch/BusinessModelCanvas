import type {
  Project,
  ProjectInvite,
  ProjectMember,
  Team,
  TeamMember,
} from '@pingarden/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createLocalSession, type RequestIdentity } from '../http/identity';
import type { CanvasStorage } from '../storage/CanvasStorage';
import type { AccountScope, ScopedProjectStorage } from '../storage/AccountScopedStorage';
import type { AccessStore } from './AccessStore';
import { defaultProjectRoleForTeamRole } from './AccessStore';
import { capabilitiesForRole, ProjectAccessService } from './ProjectAccessService';

const NOW = '2026-01-01T00:00:00.000Z';

function project(id: string, patch: Partial<Project> = {}): Project {
  return {
    id,
    name: `${id} project`,
    createdAt: NOW,
    createdBy: 'seed',
    updatedAt: NOW,
    updatedBy: 'seed',
    ...patch,
  };
}

function identity(patch: Partial<RequestIdentity> = {}): RequestIdentity {
  const base: RequestIdentity = {
    userId: 'user-1',
    displayName: 'User One',
    provider: 'wechat',
    openId: 'openid-1',
    authenticated: true,
    authMode: 'wechat',
    isLocalOnly: false,
    canSyncToCloud: true,
    canUseTeams: true,
  };
  const next = { ...base, ...patch };
  if (next.provider === 'local') delete next.openId;
  return next;
}

function storageWithProjects(projects: Project[]): CanvasStorage {
  return {
    listProjects: vi.fn(async () => projects),
    getProject: vi.fn(async (id: string) => projects.find((item) => item.id === id) ?? null),
  } as unknown as CanvasStorage;
}

function scopedStorageWithProjects(projectsByScope: Record<string, Project[]>): CanvasStorage & ScopedProjectStorage {
  return {
    listProjects: vi.fn(async () => {
      throw new Error('unscoped listProjects must not be called');
    }),
    listProjectsForScopes: vi.fn(async (scopes: AccountScope[]) =>
      scopes.flatMap((scope) => projectsByScope[`${scope.kind}:${scope.id}`] ?? []),
    ),
  } as unknown as CanvasStorage & ScopedProjectStorage;
}

function accessStoreWith(opts: {
  projectMembers?: ProjectMember[];
  teamMembers?: TeamMember[];
}): AccessStore {
  const projectMembers = opts.projectMembers ?? [];
  const teamMembers = opts.teamMembers ?? [];

  return {
    listTeamsForUser: vi.fn(async (_userId: string) => [] as Team[]),
    getTeam: vi.fn(async (_id: string) => null),
    createTeam: vi.fn(),
    listTeamMembers: vi.fn(async (teamId: string) =>
      teamMembers.filter((member) => member.teamId === teamId),
    ),
    upsertTeamMember: vi.fn(),
    listProjectMembers: vi.fn(async (projectId: string) =>
      projectMembers.filter((member) => member.projectId === projectId),
    ),
    getProjectMember: vi.fn(async (projectId: string, userId: string) =>
      projectMembers.find((member) => member.projectId === projectId && member.userId === userId) ??
      null,
    ),
    upsertProjectMember: vi.fn(),
    removeProjectMember: vi.fn(),
    listProjectInvites: vi.fn(async (_projectId: string) => [] as ProjectInvite[]),
    createProjectInvite: vi.fn(),
    acceptProjectInvite: vi.fn(),
  } as unknown as AccessStore;
}

function replyMock(): FastifyReply {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(() => reply),
  };
  return reply as unknown as FastifyReply;
}

describe('capabilitiesForRole', () => {
  it('maps owner, editor, and viewer roles to stable project capabilities', () => {
    expect(capabilitiesForRole('owner')).toEqual({
      canView: true,
      canEdit: true,
      canManageMembers: true,
      canDelete: true,
      role: 'owner',
    });
    expect(capabilitiesForRole('editor')).toEqual({
      canView: true,
      canEdit: true,
      canManageMembers: false,
      canDelete: false,
      role: 'editor',
    });
    expect(capabilitiesForRole('viewer')).toEqual({
      canView: true,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
      role: 'viewer',
    });
  });
});

describe('defaultProjectRoleForTeamRole', () => {
  it('keeps team viewers read-only and maps other team roles to project editors', () => {
    expect(defaultProjectRoleForTeamRole('owner')).toBe('editor');
    expect(defaultProjectRoleForTeamRole('admin')).toBe('editor');
    expect(defaultProjectRoleForTeamRole('member')).toBe('editor');
    expect(defaultProjectRoleForTeamRole('viewer')).toBe('viewer');
  });
});

describe('ProjectAccessService.projectCapabilities', () => {
  it('keeps library projects readable but never mutable', async () => {
    const service = new ProjectAccessService(storageWithProjects([]), accessStoreWith({}));

    await expect(
      service.projectCapabilities(project('case-1', { source: 'library' }), null),
    ).resolves.toEqual({
      canView: true,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
      role: 'viewer',
    });
  });

  it('denies cloud projects when there is no identity', async () => {
    const service = new ProjectAccessService(storageWithProjects([]), accessStoreWith({}));

    await expect(service.projectCapabilities(project('private'), null)).resolves.toEqual({
      canView: false,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
    });
  });

  it('uses explicit project membership before ownership and team-derived roles', async () => {
    const service = new ProjectAccessService(
      storageWithProjects([]),
      accessStoreWith({
        projectMembers: [
          {
            projectId: 'project-1',
            userId: 'user-1',
            displayName: 'User One',
            role: 'viewer',
            createdAt: NOW,
          },
        ],
      }),
    );

    await expect(
      service.projectCapabilities(
        project('project-1', { ownerUserId: 'user-1', teamId: 'team-1' }),
        identity(),
      ),
    ).resolves.toMatchObject({
      canView: true,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
      role: 'viewer',
    });
  });

  it('derives cloud access from the project owner fields', async () => {
    const service = new ProjectAccessService(storageWithProjects([]), accessStoreWith({}));

    await expect(
      service.projectCapabilities(project('project-1', { ownerUserId: 'user-1' }), identity()),
    ).resolves.toMatchObject({
      canView: true,
      canEdit: true,
      canManageMembers: true,
      canDelete: true,
      role: 'owner',
    });
  });

  it('lets local owners edit personal projects but not manage members', async () => {
    const service = new ProjectAccessService(storageWithProjects([]), accessStoreWith({}));

    await expect(
      service.projectCapabilities(
        project('project-1', { ownerUserId: 'local:device-1' }),
        identity({
          userId: 'local:device-1',
          displayName: '本机模式',
          provider: 'local',
          authMode: 'local',
          isLocalOnly: true,
          canSyncToCloud: false,
          canUseTeams: false,
        }),
      ),
    ).resolves.toMatchObject({
      canView: true,
      canEdit: true,
      canManageMembers: false,
      canDelete: true,
      role: 'owner',
    });
  });

  it('denies team projects to local identities', async () => {
    const service = new ProjectAccessService(storageWithProjects([]), accessStoreWith({}));

    await expect(
      service.projectCapabilities(
        project('project-1', { teamId: 'team-1' }),
        identity({
          userId: 'local:device-1',
          displayName: '本机模式',
          provider: 'local',
          authMode: 'local',
          isLocalOnly: true,
          canSyncToCloud: false,
          canUseTeams: false,
        }),
      ),
    ).resolves.toMatchObject({
      canView: false,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
    });
  });

  it('derives cloud access from team membership when no project member exists', async () => {
    const service = new ProjectAccessService(
      storageWithProjects([]),
      accessStoreWith({
        teamMembers: [
          {
            teamId: 'team-1',
            userId: 'user-1',
            displayName: 'User One',
            role: 'viewer',
            createdAt: NOW,
          },
        ],
      }),
    );

    await expect(
      service.projectCapabilities(project('project-1', { teamId: 'team-1' }), identity()),
    ).resolves.toMatchObject({
      canView: true,
      canEdit: false,
      canManageMembers: false,
      canDelete: false,
      role: 'viewer',
    });
  });
});

describe('ProjectAccessService.listAccessibleProjects', () => {
  it('omits library projects and projects the cloud identity cannot view', async () => {
    const visible = project('visible', { ownerUserId: 'user-1' });
    const hidden = project('hidden', { ownerUserId: 'user-2' });
    const library = project('library', { source: 'library' });
    const service = new ProjectAccessService(
      storageWithProjects([visible, hidden, library]),
      accessStoreWith({}),
    );

    await expect(service.listAccessibleProjects(identity())).resolves.toEqual([
      {
        ...visible,
        capabilities: {
          canView: true,
          canEdit: true,
          canManageMembers: true,
          canDelete: true,
          role: 'owner',
        },
      },
    ]);
  });

  it('reads project lists from viewer-scoped storage only', async () => {
    const visible = project('visible', { ownerUserId: 'user-1' });
    const hidden = project('hidden', { ownerUserId: 'user-2' });
    const storage = scopedStorageWithProjects({
      'user:user-1': [visible],
      'user:user-2': [hidden],
    });
    const service = new ProjectAccessService(storage, accessStoreWith({}));

    await expect(service.listAccessibleProjects(identity())).resolves.toEqual([
      {
        ...visible,
        capabilities: {
          canView: true,
          canEdit: true,
          canManageMembers: true,
          canDelete: true,
          role: 'owner',
        },
      },
    ]);
    expect(storage.listProjectsForScopes).toHaveBeenCalledWith([{ kind: 'user', id: 'user-1' }]);
    expect(storage.listProjects).not.toHaveBeenCalled();
  });
});

describe('ProjectAccessService.ensureProject', () => {
  it('lets a local owner delete a personal project without member-management permission', async () => {
    const session = createLocalSession('device-1');
    const owned = project('project-1', { ownerUserId: session.user.userId });
    const service = new ProjectAccessService(storageWithProjects([owned]), accessStoreWith({}));
    const req = {
      headers: { authorization: `Bearer ${session.accessToken}` },
    } as unknown as FastifyRequest;
    const reply = replyMock();

    const result = await service.ensureProject(req, reply, owned.id, 'delete');

    expect(result?.project.id).toBe(owned.id);
    expect(result?.capabilities).toMatchObject({
      canDelete: true,
      canManageMembers: false,
      role: 'owner',
    });
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});
