import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CanvasMeta,
  Project,
  ProjectCapabilities,
  ProjectMember,
  ProjectRole,
  Story,
} from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import type { RequestIdentity } from '../http/identity.js';
import { getOptionalIdentity, requireIdentity } from '../http/identity.js';
import type { AccessStore } from './AccessStore.js';
import { defaultProjectRoleForTeamRole } from './AccessStore.js';
import type { AccountScope, ScopedProjectStorage } from '../storage/AccountScopedStorage.js';

export type AccessLevel = 'view' | 'edit' | 'manage' | 'delete';

export interface ProjectAccessResult {
  project: Project;
  identity: RequestIdentity | null;
  capabilities: ProjectCapabilities;
}

export interface CanvasAccessResult extends ProjectAccessResult {
  canvas: CanvasMeta;
}

export interface StoryAccessResult extends ProjectAccessResult {
  story: Story;
}

export class ProjectAccessService {
  constructor(
    private readonly storage: CanvasStorage,
    private readonly accessStore: AccessStore,
  ) {}

  async listAccessibleProjects(identity: RequestIdentity | null): Promise<Project[]> {
    if (!identity) return [];
    const all = await this.listProjectsForIdentity(identity);
    const out: Project[] = [];
    for (const project of all) {
      if (project.source === 'library') continue;
      const capabilities = await this.capabilitiesFor(project, identity);
      if (capabilities.canView) out.push({ ...project, capabilities });
    }
    return out;
  }

  async projectCapabilities(project: Project, identity: RequestIdentity | null): Promise<ProjectCapabilities> {
    return this.capabilitiesFor(project, identity);
  }

  async ensureProject(
    req: FastifyRequest,
    reply: FastifyReply,
    projectId: string,
    level: AccessLevel,
  ): Promise<ProjectAccessResult | null> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      reply.code(404).send({ error: 'Project not found' });
      return null;
    }
    const identity = this.identityForLevel(req, reply, project, level);
    if (identity === false) return null;

    const capabilities = await this.capabilitiesFor(project, identity);
    if (!allows(capabilities, level)) {
      reply.code(project.source === 'library' ? 403 : 404).send({
        error: project.source === 'library' ? 'Forbidden' : 'Project not found',
        code: project.source === 'library' ? 'CASE_LIBRARY_READ_ONLY' : 'PROJECT_ACCESS_DENIED',
        message:
          project.source === 'library'
            ? 'Library cases are read-only. Fork the case to edit it.'
            : 'Project not found',
      });
      return null;
    }
    return { project: { ...project, capabilities }, identity, capabilities };
  }

  async ensureCanvas(
    req: FastifyRequest,
    reply: FastifyReply,
    canvasId: string,
    level: AccessLevel,
  ): Promise<CanvasAccessResult | null> {
    const canvas = await this.storage.getCanvas(canvasId);
    if (!canvas) {
      reply.code(404).send({ error: 'Canvas not found' });
      return null;
    }
    const access = await this.ensureProject(req, reply, canvas.projectId, level);
    if (!access) return null;
    return { ...access, canvas };
  }

  async ensureStory(
    req: FastifyRequest,
    reply: FastifyReply,
    storyId: string,
    level: AccessLevel,
  ): Promise<StoryAccessResult | null> {
    const story = await this.storage.getStory(storyId);
    if (!story) {
      reply.code(404).send({ error: 'Story not found' });
      return null;
    }
    const access = await this.ensureProject(req, reply, story.projectId, level);
    if (!access) return null;
    return { ...access, story };
  }

  async seedOwner(project: Project, identity: RequestIdentity): Promise<void> {
    await this.accessStore.upsertProjectMember({
      projectId: project.id,
      userId: identity.userId,
      displayName: identity.displayName,
      role: 'owner',
      createdAt: project.createdAt,
    });
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.accessStore.listProjectMembers(projectId);
  }

  async addProjectMember(input: {
    projectId: string;
    userId: string;
    displayName: string;
    role: ProjectRole;
  }): Promise<ProjectMember> {
    const member: ProjectMember = {
      ...input,
      createdAt: new Date().toISOString(),
    };
    await this.accessStore.upsertProjectMember(member);
    return member;
  }

  get store(): AccessStore {
    return this.accessStore;
  }

  private identityForLevel(
    req: FastifyRequest,
    reply: FastifyReply,
    project: Project,
    level: AccessLevel,
  ): RequestIdentity | null | false {
    if (project.source === 'library' && level === 'view') {
      return getOptionalIdentity(req);
    }
    return requireIdentity(req, reply) ?? false;
  }

  private async capabilitiesFor(
    project: Project,
    identity: RequestIdentity | null,
  ): Promise<ProjectCapabilities> {
    if (project.source === 'library') {
      return { canView: true, canEdit: false, canManageMembers: false, canDelete: false, role: 'viewer' };
    }

    if (!identity) {
      return { canView: false, canEdit: false, canManageMembers: false, canDelete: false };
    }

    if (project.teamId && !identity.canUseTeams) {
      return { canView: false, canEdit: false, canManageMembers: false, canDelete: false };
    }

    const explicit = await this.accessStore.getProjectMember(project.id, identity.userId);
    const role =
      explicit?.role ??
      (project.ownerUserId === identity.userId || project.createdByUserId === identity.userId
        ? 'owner'
        : await this.teamDerivedRole(project, identity));

    if (!role) {
      return { canView: false, canEdit: false, canManageMembers: false, canDelete: false };
    }
    const capabilities = capabilitiesForRole(role);
    if (!identity.canUseTeams) {
      return { ...capabilities, canManageMembers: false };
    }
    return capabilities;
  }

  private async teamDerivedRole(
    project: Project,
    identity: RequestIdentity,
  ): Promise<ProjectRole | undefined> {
    if (!project.teamId) return undefined;
    if (!identity.canUseTeams) return undefined;
    const members = await this.accessStore.listTeamMembers(project.teamId);
    const member = members.find((m) => m.userId === identity.userId);
    return member ? defaultProjectRoleForTeamRole(member.role) : undefined;
  }

  private async listProjectsForIdentity(identity: RequestIdentity): Promise<Project[]> {
    if (hasScopedProjectStorage(this.storage)) {
      const teams = identity.canUseTeams
        ? await this.accessStore.listTeamsForUser(identity.userId)
        : [];
      const scopes: AccountScope[] = [
        { kind: 'user', id: identity.userId },
        ...teams.map((team) => ({ kind: 'team' as const, id: team.id })),
      ];
      return this.storage.listProjectsForScopes(scopes);
    }
    return this.storage.listProjects();
  }
}

export function capabilitiesForRole(role: ProjectRole): ProjectCapabilities {
  switch (role) {
    case 'owner':
      return { canView: true, canEdit: true, canManageMembers: true, canDelete: true, role };
    case 'editor':
      return { canView: true, canEdit: true, canManageMembers: false, canDelete: false, role };
    case 'viewer':
      return { canView: true, canEdit: false, canManageMembers: false, canDelete: false, role };
  }
}

function allows(capabilities: ProjectCapabilities, level: AccessLevel): boolean {
  if (level === 'view') return capabilities.canView;
  if (level === 'edit') return capabilities.canEdit;
  if (level === 'manage') return capabilities.canManageMembers;
  return capabilities.canDelete;
}

function hasScopedProjectStorage(storage: CanvasStorage): storage is CanvasStorage & ScopedProjectStorage {
  return typeof (storage as Partial<ScopedProjectStorage>).listProjectsForScopes === 'function';
}
