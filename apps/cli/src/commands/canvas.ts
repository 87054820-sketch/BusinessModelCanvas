import { Option } from 'clipanion';
import type {
  AiContext,
  CanvasDef,
  CanvasI18n,
  CanvasMeta,
  CreateCanvasInput,
  Lang,
  UpdateCanvasInput,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// Bilingual name on a CanvasDef list entry.
type DefListEntry = {
  id: string;
  name: { en: string; zh: string };
  plugin?: string;
  related?: string[];
};

type DefDetail = {
  def: CanvasDef;
  i18n: { en: CanvasI18n; zh: CanvasI18n };
  knowledge: {
    intro?: { en?: string; zh?: string };
    blocks: Record<string, { en?: string; zh?: string }>;
  };
};

// ─── Pure handlers ───────────────────────────────────────────────────────────

export async function canvasListHandler(
  args: { projectId?: string },
  ctx: Context,
): Promise<CanvasMeta[]> {
  const qs = args.projectId
    ? `?projectId=${encodeURIComponent(args.projectId)}`
    : '';
  return ctx.client.get<CanvasMeta[]>(`/canvases${qs}`);
}

export async function canvasGetHandler(
  args: { id: string },
  ctx: Context,
): Promise<CanvasMeta> {
  return ctx.client.get<CanvasMeta>(`/canvases/${encodeURIComponent(args.id)}`);
}

export async function canvasCreateHandler(
  args: CreateCanvasInput,
  ctx: Context,
): Promise<CanvasMeta> {
  return ctx.client.post<CanvasMeta>('/canvases', args);
}

export async function canvasUpdateHandler(
  args: { id: string; patch: UpdateCanvasInput },
  ctx: Context,
): Promise<CanvasMeta> {
  return ctx.client.patch<CanvasMeta>(
    `/canvases/${encodeURIComponent(args.id)}`,
    args.patch,
  );
}

export async function canvasDeleteHandler(
  args: { id: string },
  ctx: Context,
): Promise<void> {
  await ctx.client.delete<void>(`/canvases/${encodeURIComponent(args.id)}`);
}

/**
 * `canvas describe` — combine canvas metadata + its def + i18n + color
 * legend into one self-contained JSON. This is what an AI asks before
 * writing stickies to an existing canvas: it gets every zoneId, the
 * block prompts for the canvas's language, and the color legend in
 * one round trip.
 */
export interface CanvasDescription {
  canvas: CanvasMeta;
  def: CanvasDef;
  i18n: CanvasI18n;
  zones: Array<{
    id: string;
    title: string;
    prompt?: string;
    examples?: string[];
  }>;
  colorLegend?: CanvasDef['defaultColorLegend'];
}

export async function canvasDescribeHandler(
  args: { id: string; lang?: Lang },
  ctx: Context,
): Promise<CanvasDescription> {
  const canvas = await canvasGetHandler({ id: args.id }, ctx);
  const detail = await ctx.client.get<DefDetail>(
    `/canvas-defs/${encodeURIComponent(canvas.defId)}`,
  );
  const lang = args.lang ?? canvas.language;
  const i18n = detail.i18n[lang] ?? detail.i18n.en;
  const zones = detail.def.zones.map((z) => {
    const block = i18n.blocks[z.id];
    return {
      id: z.id,
      title: block?.title ?? z.id,
      prompt: block?.prompt,
      examples: block?.examples,
    };
  });
  return {
    canvas,
    def: detail.def,
    i18n,
    zones,
    colorLegend: detail.def.defaultColorLegend,
  };
}

/**
 * `canvas describe-template` — same shape as describe, but for a
 * canvas-def the user hasn't created yet. Used when the AI is
 * deciding which template to instantiate, or how to fill a brand-new
 * canvas before `canvas create`.
 */
export interface TemplateDescription {
  defId: string;
  name: { en: string; zh: string };
  i18n: CanvasI18n;
  zones: Array<{
    id: string;
    title: string;
    prompt?: string;
    examples?: string[];
  }>;
  colorLegend?: CanvasDef['defaultColorLegend'];
  related?: CanvasDef['related'];
  intro?: string;
}

export async function canvasDescribeTemplateHandler(
  args: { defId: string; lang?: Lang },
  ctx: Context,
): Promise<TemplateDescription> {
  const detail = await ctx.client.get<DefDetail>(
    `/canvas-defs/${encodeURIComponent(args.defId)}`,
  );
  const lang: Lang = args.lang ?? 'en';
  const i18n = detail.i18n[lang] ?? detail.i18n.en;
  const zones = detail.def.zones.map((z) => {
    const block = i18n.blocks[z.id];
    return {
      id: z.id,
      title: block?.title ?? z.id,
      prompt: block?.prompt,
      examples: block?.examples,
    };
  });
  return {
    defId: detail.def.id,
    name: detail.def.name,
    i18n,
    zones,
    colorLegend: detail.def.defaultColorLegend,
    related: detail.def.related,
    intro: detail.knowledge.intro?.[lang] ?? detail.knowledge.intro?.en,
  };
}

export async function canvasReadHandler(
  args: { id: string; lang?: Lang },
  ctx: Context,
): Promise<AiContext> {
  const qs = args.lang ? `?lang=${args.lang}` : '';
  return ctx.client.get<AiContext>(
    `/canvases/${encodeURIComponent(args.id)}/ai-context${qs}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

const langOption = () =>
  Option.String('--lang', {
    description: 'Language: en | zh',
    validator: { test: (v: unknown) => v === 'en' || v === 'zh' } as never,
  });

function parseLang(v: string | undefined): Lang | undefined {
  if (v === 'en' || v === 'zh') return v;
  if (v === undefined) return undefined;
  throw new CliError('BAD_INPUT', `--lang must be "en" or "zh", got "${v}"`);
}

export class CanvasListCommand extends BaseCommand {
  static override paths = [['canvas', 'list']];
  static override usage = BaseCommand.Usage({ description: 'List canvases (optionally scope to one project)' });

  project = Option.String('--project', { description: 'Filter by project id' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await canvasListHandler({ projectId: this.project }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((c) => ({
          id: c.id,
          title: c.title,
          defId: c.defId,
          lang: c.language,
          updatedAt: c.updatedAt,
        })),
      ),
    );
  }
}

export class CanvasGetCommand extends BaseCommand {
  static override paths = [['canvas', 'get']];
  static override usage = BaseCommand.Usage({ description: 'Show canvas metadata by id' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await canvasGetHandler({ id: this.id }, ctx);
    ctx.output.print(data);
  }
}

export class CanvasCreateCommand extends BaseCommand {
  static override paths = [['canvas', 'create']];
  static override usage = BaseCommand.Usage({
    description: 'Create a canvas in a project from a template (canvas-def)',
    examples: [
      [
        'Create a BMC',
        "$0 canvas create --project p1 --def business-model-canvas --title 'Coffee Co BMC' --lang en",
      ],
    ],
  });

  project = Option.String('--project', { required: true, description: 'Project id' });
  def = Option.String('--def', { required: true, description: 'Canvas def id (e.g. business-model-canvas)' });
  title = Option.String('--title', { required: true });
  lang = Option.String('--lang', 'en' as string, { description: 'Language: en | zh (default en)' });

  protected async run() {
    const ctx = this.makeContext();
    const lang = parseLang(this.lang) ?? 'en';
    const data = await canvasCreateHandler(
      {
        projectId: this.project,
        defId: this.def,
        title: this.title,
        language: lang,
      },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CanvasUpdateCommand extends BaseCommand {
  static override paths = [['canvas', 'update']];
  static override usage = BaseCommand.Usage({ description: 'Update canvas metadata' });

  id = Option.String({ required: true });
  title = Option.String('--title');
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const patch: UpdateCanvasInput = {};
    if (this.title !== undefined) patch.title = this.title;
    const lang = parseLang(this.lang);
    if (lang !== undefined) patch.language = lang;
    const data = await canvasUpdateHandler({ id: this.id, patch }, ctx);
    ctx.output.print(data);
  }
}

export class CanvasDeleteCommand extends BaseCommand {
  static override paths = [['canvas', 'delete']];
  static override usage = BaseCommand.Usage({ description: 'Delete a canvas (snapshots cascade)' });

  id = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    await canvasDeleteHandler({ id: this.id }, ctx);
    ctx.output.print({ deleted: this.id }, () => `✓ deleted canvas ${this.id}`);
  }
}

export class CanvasDescribeCommand extends BaseCommand {
  static override paths = [['canvas', 'describe']];
  static override usage = BaseCommand.Usage({
    description: 'Show canvas + zones + i18n + color legend (single JSON for AI consumption)',
  });

  id = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await canvasDescribeHandler(
      { id: this.id, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CanvasDescribeTemplateCommand extends BaseCommand {
  static override paths = [['canvas', 'describe-template']];
  static override usage = BaseCommand.Usage({
    description: 'Inspect a canvas template (def): zones, prompts, examples, color legend',
    examples: [
      ['BMC in Chinese', '$0 canvas describe-template business-model-canvas --lang zh --json'],
    ],
  });

  defId = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await canvasDescribeTemplateHandler(
      { defId: this.defId, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CanvasReadCommand extends BaseCommand {
  static override paths = [['canvas', 'read']];
  static override usage = BaseCommand.Usage({
    description: 'Read live AI-context (block-grouped JSON of stickies + pins)',
  });

  id = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await canvasReadHandler(
      { id: this.id, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}
