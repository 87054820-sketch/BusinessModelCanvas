import { Option } from 'clipanion';
import pc from 'picocolors';
import type { AiContext, Lang, SnapshotMeta } from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import type { Context } from '../lib/context.js';
import { computeBulkDiff, renderDiffHuman, type BulkDiff } from '../lib/diff.js';
import { readJsonInput } from '../lib/input.js';
import { ObjectsBulkInputSchema, type ObjectsBulkInput } from '../lib/schemas.js';

interface BulkResponse {
  ok: boolean;
  replaced: {
    stickies: number;
    pinClasses: number;
    pins: number;
    xAxisItems: number;
    colorLegend: number;
  };
}

interface LegacyStickyResponse {
  replaced: number;
  ids: string[];
}

export interface CanvasWriteResult {
  /** server's reply (shape depends on --mode) */
  result: BulkResponse | LegacyStickyResponse;
  /** snapshot taken before the write, unless --no-snapshot was passed */
  snapshot?: SnapshotMeta;
  /** computed diff vs prior state (for context) */
  diff: BulkDiff;
  /** when --dry-run was set, no write happened */
  dryRun: boolean;
}

/**
 * Pure handler for `canvas write`. Reads the existing canvas state
 * via /ai-context to compute the diff, then (unless dryRun) creates
 * a milestone snapshot and POSTs the bulk import.
 *
 * On bulk POST failure the snapshot id is preserved on the thrown
 * `CliError` so the wrapper can render a `pingarden snapshot
 * restore` hint.
 */
export async function canvasWriteHandler(
  args: {
    id: string;
    payload: ObjectsBulkInput;
    dryRun: boolean;
    skipSnapshot: boolean;
    snapshotLabel?: string;
    mode: 'bulk' | 'stickies';
    lang?: Lang;
  },
  ctx: Context,
): Promise<CanvasWriteResult> {
  // 1. Read current state for the diff
  const qs = args.lang ? `?lang=${args.lang}` : '';
  const existing = await ctx.client.get<AiContext>(
    `/canvases/${encodeURIComponent(args.id)}/ai-context${qs}`,
  );
  const diff = computeBulkDiff(existing, args.payload);

  if (diff.stickies && diff.stickies.unknownZones.length > 0) {
    throw new CliError(
      'BAD_INPUT',
      `Payload references unknown zoneId(s) for this canvas: ${diff.stickies.unknownZones.join(', ')}`,
      `Run \`pingarden canvas describe ${args.id}\` to see valid zoneIds.`,
    );
  }

  if (args.dryRun) {
    return { result: emptyBulkResponse(), diff, dryRun: true };
  }

  // 2. Snapshot first (unless opted out)
  let snapshot: SnapshotMeta | undefined;
  if (!args.skipSnapshot) {
    const label = args.snapshotLabel ?? `pre-ai-edit-${new Date().toISOString()}`;
    snapshot = await ctx.client.post<SnapshotMeta>(
      `/canvases/${encodeURIComponent(args.id)}/snapshots`,
      { name: label },
    );
  }

  // 3. Bulk write
  try {
    const path =
      args.mode === 'stickies'
        ? `/canvases/${encodeURIComponent(args.id)}/stickies/bulk`
        : `/canvases/${encodeURIComponent(args.id)}/objects/bulk`;
    const body =
      args.mode === 'stickies'
        ? { stickies: args.payload.stickies ?? [] }
        : args.payload;
    const result = await ctx.client.post<BulkResponse | LegacyStickyResponse>(
      path,
      body,
    );
    return { result, snapshot, diff, dryRun: false };
  } catch (err) {
    // Augment the error with snapshot context so the user can recover.
    if (err instanceof CliError && snapshot) {
      const hint = `Pre-edit snapshot is intact. Restore with: pingarden snapshot restore ${args.id} ${snapshot.id} --mode replace`;
      throw new CliError(err.code, err.message, hint, err.details);
    }
    throw err;
  }
}

export class CanvasWriteCommand extends BaseCommand {
  static override paths = [['canvas', 'write']];
  static override usage = BaseCommand.Usage({
    description: 'Bulk-write stickies/pins/colorLegend to a canvas (replace mode)',
    details: `
      Reads JSON payload from --file or stdin, validates it locally, takes a
      milestone snapshot named pre-ai-edit-<ISO> (unless --no-snapshot), then
      replaces the canvas state. Use --dry-run to preview the diff without
      writing.
    `,
    examples: [
      ['Write from a file', '$0 canvas write <id> --file payload.json'],
      ['Pipe from stdin', "echo '{...}' | $0 canvas write <id>"],
      ['Preview only', '$0 canvas write <id> --file payload.json --dry-run'],
    ],
  });

  id = Option.String({ required: true });
  file = Option.String('--file', { description: 'Read JSON from this path; use "-" for stdin (default: stdin)' });
  dryRun = Option.Boolean('--dry-run', false, {
    description: 'Compute & print the diff but do not write or snapshot',
  });
  skipSnapshot = Option.Boolean('--no-snapshot', false, {
    description: 'Skip the auto pre-edit snapshot (NOT recommended)',
  });
  snapshotLabel = Option.String('--snapshot-label', { description: 'Custom milestone name' });
  mode = Option.String('--mode', 'bulk', { description: 'bulk (default) | stickies (legacy single-root)' });
  lang = Option.String('--lang', { description: 'Language used to fetch ai-context for diff' });

  protected async run() {
    const ctx = this.makeContext();

    const raw = await readJsonInput(this.file);
    const parsed = ObjectsBulkInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CliError(
        'BAD_INPUT',
        'Payload failed validation',
        'Run with --dry-run after fixing, or check the schema in objects/bulk.',
        parsed.error.format(),
      );
    }

    if (this.mode !== 'bulk' && this.mode !== 'stickies') {
      throw new CliError('BAD_INPUT', `--mode must be "bulk" or "stickies", got "${this.mode}"`);
    }

    const lang = parseLang(this.lang);

    const result = await canvasWriteHandler(
      {
        id: this.id,
        payload: parsed.data,
        dryRun: this.dryRun,
        skipSnapshot: this.skipSnapshot,
        snapshotLabel: this.snapshotLabel,
        mode: this.mode,
        lang,
      },
      ctx,
    );

    ctx.output.print(result, (r) => renderHuman(r, this.id));
  }
}

function parseLang(v: string | undefined): Lang | undefined {
  if (v === undefined) return undefined;
  if (v === 'en' || v === 'zh') return v;
  throw new CliError('BAD_INPUT', `--lang must be "en" or "zh", got "${v}"`);
}

function renderHuman(r: CanvasWriteResult, canvasId: string): string {
  const lines: string[] = [];
  lines.push(pc.bold(r.dryRun ? 'Dry run — no changes applied' : 'Write applied'));
  lines.push('');
  lines.push(renderDiffHuman(r.diff));
  if (r.snapshot) {
    lines.push('');
    lines.push(pc.dim(`Pre-edit snapshot: ${r.snapshot.id} (${r.snapshot.name})`));
    lines.push(
      pc.dim(`Restore with: pingarden snapshot restore ${canvasId} ${r.snapshot.id} --mode replace`),
    );
  }
  if (!r.dryRun) {
    lines.push('');
    if ('replaced' in r.result && typeof r.result.replaced === 'object') {
      lines.push(pc.green('✓ Replaced:'));
      for (const [k, v] of Object.entries(r.result.replaced)) {
        if (v > 0) lines.push(`  ${k.padEnd(14)} ${v}`);
      }
    } else if ('replaced' in r.result) {
      lines.push(pc.green(`✓ Replaced ${r.result.replaced} stickies`));
    }
  }
  return lines.join('\n');
}

function emptyBulkResponse(): BulkResponse {
  return {
    ok: true,
    replaced: { stickies: 0, pinClasses: 0, pins: 0, xAxisItems: 0, colorLegend: 0 },
  };
}
