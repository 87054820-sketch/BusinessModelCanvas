import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Project, ProjectRole } from '@pingarden/shared';
import type { CanvasStorage } from '../storage/CanvasStorage.js';
import { BundleReadOnlyError } from '../storage/errors.js';
import { getOptionalIdentity, requireIdentity, type RequestIdentity } from './identity.js';
import type { ProjectAccessService } from '../auth/ProjectAccessService.js';

const CreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  teamId: z.string().min(1).optional(),
});

const UpdateInput = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const CreateTeamInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});

const ProjectRoleInput = z.enum(['owner', 'editor', 'viewer']);

const AddMemberInput = z.object({
  userId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(120),
  role: ProjectRoleInput,
});

const CreateInviteInput = z.object({
  role: ProjectRoleInput.default('editor'),
  ttlDays: z.number().int().min(1).max(30).optional(),
});

export function registerProjectRoutes(
  app: FastifyInstance,
  storage: CanvasStorage,
  access: ProjectAccessService,
) {
  app.get('/projects', async (req, reply) => {
    if (req.headers.accept?.includes('text/html')) {
      return reply.callNotFound();
    }
    const identity = getOptionalIdentity(req);
    return access.listAccessibleProjects(identity);
  });

  app.get<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const result = await access.ensureProject(req, reply, req.params.id, 'view');
    if (!result) return;
    return result.project;
  });

  app.get<{ Params: { id: string } }>(
    '/projects/:id/canvases',
    async (req, reply) => {
      const result = await access.ensureProject(req, reply, req.params.id, 'view');
      if (!result) return;
      return storage.listCanvases({ projectId: req.params.id });
    },
  );

  app.post('/projects', async (req, reply) => {
    const input = CreateInput.parse(req.body);
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (input.teamId) {
      if (!requireWechatAccount(identity, reply)) return;
      const teamMembers = await access.store.listTeamMembers(input.teamId);
      const member = teamMembers.find((item) => item.userId === identity.userId);
      if (!member) {
        return reply.code(404).send({
          error: 'Team not found',
          code: 'TEAM_ACCESS_DENIED',
          message: 'Team not found',
        });
      }
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      projectType: input.teamId ? 'team' : 'personal',
      ownerUserId: input.teamId ? undefined : identity.userId,
      ...(input.teamId ? { teamId: input.teamId } : {}),
      createdAt: now,
      createdBy: identity.displayName,
      createdByUserId: identity.userId,
      updatedAt: now,
      updatedBy: identity.displayName,
      updatedByUserId: identity.userId,
    };
    await storage.createProject(project);
    await access.seedOwner(project, identity);
    return reply.code(201).send(project);
  });

  app.patch<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const patch = UpdateInput.parse(req.body);
    const result = await access.ensureProject(req, reply, req.params.id, 'edit');
    if (!result?.identity) return;
    const identity = result.identity;
    try {
      const updated = await storage.updateProject(req.params.id, {
        ...patch,
        updatedBy: identity.displayName,
        updatedByUserId: identity.userId,
      });
      const capabilities = await access.projectCapabilities(updated, identity);
      return { ...updated, capabilities };
    } catch (err) {
      // BundleReadOnlyError must reach the global handler so it maps
      // to 403; only "not found" plain errors from FileSystemStorage
      // keep the existing 404 behaviour.
      if (err instanceof BundleReadOnlyError) throw err;
      return reply.code(404).send({ error: 'Project not found' });
    }
  });

  app.delete<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const result = await access.ensureProject(req, reply, req.params.id, 'delete');
    if (!result) return;
    await storage.deleteProject(req.params.id);
    return reply.code(204).send();
  });

  app.get('/teams', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    return access.store.listTeamsForUser(identity.userId);
  });

  app.post('/teams', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const input = CreateTeamInput.parse(req.body);
    const team = await access.store.createTeam({ ...input, identity });
    return reply.code(201).send(team);
  });

  app.get<{ Params: { id: string } }>('/teams/:id/projects', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const projects = await access.listAccessibleProjects(identity);
    return projects.filter((project) => project.teamId === req.params.id);
  });

  app.get<{ Params: { id: string } }>('/projects/:id/members', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const result = await access.ensureProject(req, reply, req.params.id, 'view');
    if (!result) return;
    return access.listProjectMembers(req.params.id);
  });

  app.post<{ Params: { id: string } }>('/projects/:id/members', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const result = await access.ensureProject(req, reply, req.params.id, 'manage');
    if (!result) return;
    const input = AddMemberInput.parse(req.body);
    const member = await access.addProjectMember({
      projectId: req.params.id,
      userId: input.userId,
      displayName: input.displayName,
      role: input.role as ProjectRole,
    });
    return reply.code(201).send(member);
  });

  app.get<{ Params: { id: string } }>('/projects/:id/invites', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const result = await access.ensureProject(req, reply, req.params.id, 'manage');
    if (!result) return;
    return access.store.listProjectInvites(req.params.id);
  });

  app.post<{ Params: { id: string } }>('/projects/:id/invites', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const result = await access.ensureProject(req, reply, req.params.id, 'manage');
    if (!result?.identity) return;
    const input = CreateInviteInput.parse(req.body);
    const invite = await access.store.createProjectInvite({
      projectId: req.params.id,
      role: input.role as ProjectRole,
      ttlDays: input.ttlDays,
      identity: result.identity,
    });
    return reply.code(201).send(invite);
  });

  app.post<{ Params: { token: string } }>('/project-invites/:token/accept', async (req, reply) => {
    const identity = requireIdentity(req, reply);
    if (!identity) return;
    if (!requireWechatAccount(identity, reply)) return;
    const invite = await access.store.acceptProjectInvite(req.params.token, identity);
    if (!invite) return reply.code(404).send({ error: 'Invite not found or expired' });
    return invite;
  });
}

function requireWechatAccount(identity: RequestIdentity, reply: FastifyReply): boolean {
  if (identity.provider === 'wechat') return true;
  reply.code(403).send({
    error: 'WeChat account required',
    code: 'WECHAT_ACCOUNT_REQUIRED',
    message: 'Team collaboration requires WeChat sign-in.',
  });
  return false;
}
