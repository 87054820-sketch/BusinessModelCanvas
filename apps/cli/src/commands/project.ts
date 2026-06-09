import { Option } from 'clipanion';
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers (MCP-friendly, no clipanion dep) ──────────────────────────

export async function projectListHandler(_args: unknown, ctx: Context): Promise<Project[]> {
  return ctx.client.get<Project[]>('/projects');
}

export async function projectGetHandler(
  args: { id: string },
  ctx: Context,
): Promise<Project> {
  return ctx.client.get<Project>(`/projects/${encodeURIComponent(args.id)}`);
}

export async function projectCreateHandler(
  args: CreateProjectInput,
  ctx: Context,
): Promise<Project> {
  return ctx.client.post<Project>('/projects', args);
}

export async function projectUpdateHandler(
  args: { id: string; patch: UpdateProjectInput },
  ctx: Context,
): Promise<Project> {
  return ctx.client.patch<Project>(`/projects/${encodeURIComponent(args.id)}`, args.patch);
}

export async function projectDeleteHandler(
  args: { id: string },
  ctx: Context,
): Promise<void> {
  await ctx.client.delete<void>(`/projects/${encodeURIComponent(args.id)}`);
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class ProjectListCommand extends BaseCommand {
  static override paths = [['project', 'list']];
  static override usage = BaseCommand.Usage({ description: 'List all projects' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await projectListHandler({}, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((p) => ({
          id: p.id,
          name: p.name,
          description: (p.description ?? '').slice(0, 60),
          updatedAt: p.updatedAt,
        })),
      ),
    );
  }
}

export class ProjectGetCommand extends BaseCommand {
  static override paths = [['project', 'get']];
  static override usage = BaseCommand.Usage({ description: 'Show one project by id' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await projectGetHandler({ id: this.id }, ctx);
    ctx.output.print(data);
  }
}

export class ProjectCreateCommand extends BaseCommand {
  static override paths = [['project', 'create']];
  static override usage = BaseCommand.Usage({
    description: 'Create a new project',
    examples: [['Create a project', "$0 project create --name 'Coffee Co' --description 'subscription model exploration'"]],
  });

  name = Option.String('--name', { required: true, description: 'Project name' });
  description = Option.String('--description', { description: 'Project description' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await projectCreateHandler(
      { name: this.name, description: this.description },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class ProjectUpdateCommand extends BaseCommand {
  static override paths = [['project', 'update']];
  static override usage = BaseCommand.Usage({ description: 'Update a project' });

  id = Option.String({ required: true });
  name = Option.String('--name');
  description = Option.String('--description');

  protected async run() {
    const ctx = this.makeContext();
    const patch: UpdateProjectInput = {};
    if (this.name !== undefined) patch.name = this.name;
    if (this.description !== undefined) patch.description = this.description;
    const data = await projectUpdateHandler({ id: this.id, patch }, ctx);
    ctx.output.print(data);
  }
}

export class ProjectDeleteCommand extends BaseCommand {
  static override paths = [['project', 'delete']];
  static override usage = BaseCommand.Usage({ description: 'Delete a project (cascades to canvases + snapshots)' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    await projectDeleteHandler({ id: this.id }, ctx);
    ctx.output.print({ deleted: this.id }, () => `✓ deleted ${this.id}`);
  }
}
