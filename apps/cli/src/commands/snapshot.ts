import { Option } from 'clipanion';
import type { CanvasMeta, RestoreMode, SnapshotMeta } from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers ───────────────────────────────────────────────────────────

export async function snapshotListHandler(
  args: { canvasId: string; kind?: 'autosave' | 'milestone' },
  ctx: Context,
): Promise<SnapshotMeta[]> {
  const qs = args.kind ? `?kind=${args.kind}` : '';
  return ctx.client.get<SnapshotMeta[]>(
    `/canvases/${encodeURIComponent(args.canvasId)}/snapshots${qs}`,
  );
}

export async function snapshotCreateHandler(
  args: { canvasId: string; name: string; description?: string },
  ctx: Context,
): Promise<SnapshotMeta> {
  return ctx.client.post<SnapshotMeta>(
    `/canvases/${encodeURIComponent(args.canvasId)}/snapshots`,
    { name: args.name, description: args.description },
  );
}

export async function snapshotRestoreHandler(
  args: { canvasId: string; snapshotId: string; mode: RestoreMode },
  ctx: Context,
): Promise<{ canvas: CanvasMeta }> {
  return ctx.client.post<{ canvas: CanvasMeta }>(
    `/canvases/${encodeURIComponent(args.canvasId)}/snapshots/${encodeURIComponent(args.snapshotId)}/restore`,
    { mode: args.mode },
  );
}

export async function snapshotDeleteHandler(
  args: { canvasId: string; snapshotId: string },
  ctx: Context,
): Promise<void> {
  await ctx.client.delete<void>(
    `/canvases/${encodeURIComponent(args.canvasId)}/snapshots/${encodeURIComponent(args.snapshotId)}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class SnapshotListCommand extends BaseCommand {
  static override paths = [['snapshot', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List snapshots for a canvas (defaults to milestones)',
  });

  canvasId = Option.String({ required: true });
  kind = Option.String('--kind', { description: 'autosave | milestone (default milestone)' });

  protected async run() {
    const ctx = this.makeContext();
    const kind = parseKind(this.kind);
    const data = await snapshotListHandler({ canvasId: this.canvasId, kind }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          stickies: s.stickyCount,
          createdAt: s.createdAt,
          createdBy: s.createdBy,
        })),
      ),
    );
  }
}

export class SnapshotCreateCommand extends BaseCommand {
  static override paths = [['snapshot', 'create']];
  static override usage = BaseCommand.Usage({
    description: 'Create a milestone snapshot of the current canvas state',
  });

  canvasId = Option.String({ required: true });
  label = Option.String('--label', { required: true, description: 'Milestone name' });
  description = Option.String('--description');

  protected async run() {
    const ctx = this.makeContext();
    const data = await snapshotCreateHandler(
      { canvasId: this.canvasId, name: this.label, description: this.description },
      ctx,
    );
    ctx.output.print(data, (s) => `✓ created milestone ${s.id} "${s.name}" (${s.stickyCount} stickies)`);
  }
}

export class SnapshotRestoreCommand extends BaseCommand {
  static override paths = [['snapshot', 'restore']];
  static override usage = BaseCommand.Usage({
    description: 'Restore a snapshot — replace live state, or fork to a new canvas',
    examples: [
      ['Replace', '$0 snapshot restore <canvasId> <sid> --mode replace'],
      ['Fork', '$0 snapshot restore <canvasId> <sid> --mode fork'],
    ],
  });

  canvasId = Option.String({ required: true });
  snapshotId = Option.String({ required: true });
  mode = Option.String('--mode', { required: true, description: 'replace | fork' });

  protected async run() {
    const ctx = this.makeContext();
    const mode = parseRestoreMode(this.mode);
    const data = await snapshotRestoreHandler(
      { canvasId: this.canvasId, snapshotId: this.snapshotId, mode },
      ctx,
    );
    ctx.output.print(data, (r) =>
      mode === 'fork'
        ? `✓ forked → new canvas ${r.canvas.id} "${r.canvas.title}"`
        : `✓ restored ${this.canvasId} (replace)`,
    );
  }
}

export class SnapshotDeleteCommand extends BaseCommand {
  static override paths = [['snapshot', 'delete']];
  static override usage = BaseCommand.Usage({ description: 'Delete a snapshot' });

  canvasId = Option.String({ required: true });
  snapshotId = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    await snapshotDeleteHandler(
      { canvasId: this.canvasId, snapshotId: this.snapshotId },
      ctx,
    );
    ctx.output.print(
      { deleted: this.snapshotId },
      () => `✓ deleted snapshot ${this.snapshotId}`,
    );
  }
}

function parseKind(v: string | undefined): 'autosave' | 'milestone' | undefined {
  if (v === undefined) return undefined;
  if (v === 'autosave' || v === 'milestone') return v;
  throw new CliError('BAD_INPUT', `--kind must be "autosave" or "milestone", got "${v}"`);
}

function parseRestoreMode(v: string): RestoreMode {
  if (v === 'replace' || v === 'fork') return v;
  throw new CliError('BAD_INPUT', `--mode must be "replace" or "fork", got "${v}"`);
}
