import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ProjectInvite,
  ProjectMember,
  ProjectRole,
  Team,
  TeamMember,
  TeamRole,
} from '@pingarden/shared';
import type { RequestIdentity } from '../http/identity.js';

export interface AccessStore {
  listTeamsForUser(userId: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | null>;
  createTeam(input: { name: string; description?: string; identity: RequestIdentity }): Promise<Team>;
  listTeamMembers(teamId: string): Promise<TeamMember[]>;
  upsertTeamMember(member: TeamMember): Promise<void>;

  listProjectMembers(projectId: string): Promise<ProjectMember[]>;
  getProjectMember(projectId: string, userId: string): Promise<ProjectMember | null>;
  upsertProjectMember(member: ProjectMember): Promise<void>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;

  listProjectInvites(projectId: string): Promise<ProjectInvite[]>;
  createProjectInvite(input: {
    projectId: string;
    role: ProjectRole;
    identity: RequestIdentity;
    ttlDays?: number;
  }): Promise<ProjectInvite>;
  acceptProjectInvite(token: string, identity: RequestIdentity): Promise<ProjectInvite | null>;
}

interface AccessState {
  teams: Team[];
  teamMembers: TeamMember[];
  projectMembers: ProjectMember[];
  projectInvites: ProjectInvite[];
}

const EMPTY_STATE: AccessState = {
  teams: [],
  teamMembers: [],
  projectMembers: [],
  projectInvites: [],
};

export class FileSystemAccessStore implements AccessStore {
  constructor(private readonly root: string) {}

  async listTeamsForUser(userId: string): Promise<Team[]> {
    const state = await this.read();
    const ids = new Set(state.teamMembers.filter((m) => m.userId === userId).map((m) => m.teamId));
    return state.teams
      .filter((team) => ids.has(team.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTeam(id: string): Promise<Team | null> {
    const state = await this.read();
    return state.teams.find((team) => team.id === id) ?? null;
  }

  async createTeam(input: { name: string; description?: string; identity: RequestIdentity }): Promise<Team> {
    const now = new Date().toISOString();
    const team: Team = {
      id: randomUUID(),
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      createdAt: now,
      createdBy: input.identity.displayName,
      createdByUserId: input.identity.userId,
      updatedAt: now,
      updatedBy: input.identity.displayName,
      updatedByUserId: input.identity.userId,
    };
    const member: TeamMember = {
      teamId: team.id,
      userId: input.identity.userId,
      displayName: input.identity.displayName,
      role: 'owner',
      createdAt: now,
    };
    const state = await this.read();
    await this.write({
      ...state,
      teams: [team, ...state.teams],
      teamMembers: [member, ...state.teamMembers],
    });
    return team;
  }

  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    const state = await this.read();
    return state.teamMembers.filter((m) => m.teamId === teamId);
  }

  async upsertTeamMember(member: TeamMember): Promise<void> {
    const state = await this.read();
    await this.write({
      ...state,
      teamMembers: upsert(
        state.teamMembers,
        member,
        (m) => `${m.teamId}:${m.userId}`,
      ),
    });
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const state = await this.read();
    return state.projectMembers.filter((m) => m.projectId === projectId);
  }

  async getProjectMember(projectId: string, userId: string): Promise<ProjectMember | null> {
    const state = await this.read();
    return state.projectMembers.find((m) => m.projectId === projectId && m.userId === userId) ?? null;
  }

  async upsertProjectMember(member: ProjectMember): Promise<void> {
    const state = await this.read();
    await this.write({
      ...state,
      projectMembers: upsert(
        state.projectMembers,
        member,
        (m) => `${m.projectId}:${m.userId}`,
      ),
    });
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const state = await this.read();
    await this.write({
      ...state,
      projectMembers: state.projectMembers.filter(
        (m) => !(m.projectId === projectId && m.userId === userId),
      ),
    });
  }

  async listProjectInvites(projectId: string): Promise<ProjectInvite[]> {
    const state = await this.read();
    return state.projectInvites.filter((invite) => invite.projectId === projectId);
  }

  async createProjectInvite(input: {
    projectId: string;
    role: ProjectRole;
    identity: RequestIdentity;
    ttlDays?: number;
  }): Promise<ProjectInvite> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.ttlDays ?? 7) * 24 * 60 * 60 * 1000);
    const invite: ProjectInvite = {
      id: randomUUID(),
      projectId: input.projectId,
      role: input.role,
      token: randomUUID(),
      createdAt: now.toISOString(),
      createdBy: input.identity.displayName,
      createdByUserId: input.identity.userId,
      expiresAt: expiresAt.toISOString(),
    };
    const state = await this.read();
    await this.write({ ...state, projectInvites: [invite, ...state.projectInvites] });
    return invite;
  }

  async acceptProjectInvite(token: string, identity: RequestIdentity): Promise<ProjectInvite | null> {
    const state = await this.read();
    const invite = state.projectInvites.find((item) => item.token === token);
    if (!invite || invite.revokedAt || invite.acceptedAt) return null;
    if (new Date(invite.expiresAt).getTime() < Date.now()) return null;
    const accepted: ProjectInvite = {
      ...invite,
      acceptedAt: new Date().toISOString(),
      acceptedByUserId: identity.userId,
    };
    const member: ProjectMember = {
      projectId: invite.projectId,
      userId: identity.userId,
      displayName: identity.displayName,
      role: invite.role,
      createdAt: accepted.acceptedAt!,
    };
    await this.write({
      ...state,
      projectInvites: state.projectInvites.map((item) => (item.id === invite.id ? accepted : item)),
      projectMembers: upsert(
        state.projectMembers,
        member,
        (m) => `${m.projectId}:${m.userId}`,
      ),
    });
    return accepted;
  }

  private statePath(): string {
    return join(this.root, 'access', 'state.json');
  }

  private async read(): Promise<AccessState> {
    try {
      const raw = await fs.readFile(this.statePath(), 'utf8');
      const parsed = JSON.parse(raw) as Partial<AccessState>;
      return {
        teams: parsed.teams ?? [],
        teamMembers: parsed.teamMembers ?? [],
        projectMembers: parsed.projectMembers ?? [],
        projectInvites: parsed.projectInvites ?? [],
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_STATE };
      throw err;
    }
  }

  private async write(state: AccessState): Promise<void> {
    await fs.mkdir(dirname(this.statePath()), { recursive: true });
    await fs.writeFile(this.statePath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
}

function upsert<T>(items: T[], next: T, key: (item: T) => string): T[] {
  const nextKey = key(next);
  const exists = items.some((item) => key(item) === nextKey);
  if (!exists) return [next, ...items];
  return items.map((item) => (key(item) === nextKey ? next : item));
}

export function defaultProjectRoleForTeamRole(role: TeamRole): ProjectRole {
  if (role === 'owner' || role === 'admin' || role === 'member') return 'editor';
  return 'viewer';
}
