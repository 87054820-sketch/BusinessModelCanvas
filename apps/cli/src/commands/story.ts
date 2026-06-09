import { Option } from 'clipanion';
import type {
  CreateStoryInput,
  Story,
  StoryMeta,
  StoryStatus,
  UpdateStoryInput,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import type { Context } from '../lib/context.js';
import { readTextInput } from '../lib/input.js';
import { table } from '../lib/output.js';

// ─── Pure handlers ───────────────────────────────────────────────────────────

export async function storyListHandler(
  args: { projectId?: string },
  ctx: Context,
): Promise<StoryMeta[]> {
  const qs = args.projectId
    ? `?projectId=${encodeURIComponent(args.projectId)}`
    : '';
  return ctx.client.get<StoryMeta[]>(`/stories${qs}`);
}

export async function storyGetHandler(
  args: { id: string },
  ctx: Context,
): Promise<Story> {
  return ctx.client.get<Story>(`/stories/${encodeURIComponent(args.id)}`);
}

export async function storyCreateHandler(
  args: CreateStoryInput,
  ctx: Context,
): Promise<Story> {
  return ctx.client.post<Story>('/stories', args);
}

export async function storyUpdateHandler(
  args: { id: string; patch: UpdateStoryInput },
  ctx: Context,
): Promise<Story> {
  return ctx.client.patch<Story>(
    `/stories/${encodeURIComponent(args.id)}`,
    args.patch,
  );
}

export async function storyDeleteHandler(
  args: { id: string },
  ctx: Context,
): Promise<void> {
  await ctx.client.delete<void>(`/stories/${encodeURIComponent(args.id)}`);
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class StoryListCommand extends BaseCommand {
  static override paths = [['story', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List stories (optionally scope to one project)',
  });

  project = Option.String('--project', { description: 'Filter by project id' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await storyListHandler({ projectId: this.project }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          updatedAt: s.updatedAt,
        })),
      ),
    );
  }
}

export class StoryGetCommand extends BaseCommand {
  static override paths = [['story', 'get']];
  static override usage = BaseCommand.Usage({ description: 'Show one story (with content)' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await storyGetHandler({ id: this.id }, ctx);
    ctx.output.print(data);
  }
}

export class StoryCreateCommand extends BaseCommand {
  static override paths = [['story', 'create']];
  static override usage = BaseCommand.Usage({
    description: 'Create a new story; content read from --file or stdin',
    details: `
      The story body is markdown. Embed canvases with the directive
      "::canvas[<defId>]{canvasId=\\"<uuid>\\"}" — referenced canvases
      must live in the same project.
    `,
    examples: [
      ['From a file', '$0 story create --project p1 --title "Coffee Co narrative" --file story.md'],
      ['From stdin', 'cat story.md | $0 story create --project p1 --title "..."'],
    ],
  });

  project = Option.String('--project', { required: true });
  title = Option.String('--title', { required: true });
  status = Option.String('--status', { description: 'draft | published (default draft)' });
  file = Option.String('--file', { description: 'Read markdown body from this path; "-" or omit for stdin' });
  contentDate = Option.String('--content-date');
  contentDatePrecision = Option.String('--content-date-precision');
  contentDateLabel = Option.String('--content-date-label');

  protected async run() {
    const ctx = this.makeContext();
    const content = await readTextInput(this.file);
    const status = parseStatus(this.status);
    const precision = parsePrecision(this.contentDatePrecision);
    const input: CreateStoryInput = {
      projectId: this.project,
      title: this.title,
      content,
      ...(status ? { status } : {}),
      ...(this.contentDate ? { contentDate: this.contentDate } : {}),
      ...(precision ? { contentDatePrecision: precision } : {}),
      ...(this.contentDateLabel ? { contentDateLabel: this.contentDateLabel } : {}),
    };
    const data = await storyCreateHandler(input, ctx);
    ctx.output.print(data, (s) => `✓ created story ${s.id} "${s.title}"`);
  }
}

export class StoryUpdateCommand extends BaseCommand {
  static override paths = [['story', 'update']];
  static override usage = BaseCommand.Usage({ description: 'Update a story' });

  id = Option.String({ required: true });
  title = Option.String('--title');
  status = Option.String('--status');
  file = Option.String('--file', { description: 'Replace body from path or stdin (only when --file is set)' });
  contentDate = Option.String('--content-date');
  contentDatePrecision = Option.String('--content-date-precision');
  contentDateLabel = Option.String('--content-date-label');

  protected async run() {
    const ctx = this.makeContext();
    const patch: UpdateStoryInput = {};
    if (this.title !== undefined) patch.title = this.title;
    const status = parseStatus(this.status);
    if (status) patch.status = status;
    if (this.file !== undefined) {
      patch.content = await readTextInput(this.file);
    }
    if (this.contentDate !== undefined) patch.contentDate = this.contentDate;
    const precision = parsePrecision(this.contentDatePrecision);
    if (precision) patch.contentDatePrecision = precision;
    if (this.contentDateLabel !== undefined) patch.contentDateLabel = this.contentDateLabel;

    if (Object.keys(patch).length === 0) {
      throw new CliError('BAD_INPUT', 'Pass at least one field to update');
    }
    const data = await storyUpdateHandler({ id: this.id, patch }, ctx);
    ctx.output.print(data, (s) => `✓ updated story ${s.id} "${s.title}"`);
  }
}

export class StoryDeleteCommand extends BaseCommand {
  static override paths = [['story', 'delete']];
  static override usage = BaseCommand.Usage({ description: 'Delete a story' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    await storyDeleteHandler({ id: this.id }, ctx);
    ctx.output.print({ deleted: this.id }, () => `✓ deleted story ${this.id}`);
  }
}

function parseStatus(v: string | undefined): StoryStatus | undefined {
  if (v === undefined) return undefined;
  if (v === 'draft' || v === 'published') return v;
  throw new CliError('BAD_INPUT', `--status must be "draft" or "published", got "${v}"`);
}

function parsePrecision(v: string | undefined): 'year' | 'month' | 'day' | undefined {
  if (v === undefined) return undefined;
  if (v === 'year' || v === 'month' || v === 'day') return v;
  throw new CliError(
    'BAD_INPUT',
    `--content-date-precision must be "year", "month", or "day", got "${v}"`,
  );
}
