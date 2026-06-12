import { Option } from 'clipanion';
import pc from 'picocolors';
import type {
  AiContext,
  CanvasDef,
  CanvasI18n,
  CaseForkResult,
  CaseLibraryDetail,
  CaseLibraryEntry,
  Lang,
  Project,
  Story,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers (MCP-friendly, no clipanion dep) ──────────────────────────

interface DefDetail {
  def: CanvasDef;
  i18n: { en: CanvasI18n; zh: CanvasI18n };
  knowledge: {
    intro?: { en?: string; zh?: string };
    blocks: Record<string, { en?: string; zh?: string }>;
  };
}

export async function caseListHandler(
  args: { tag?: string },
  ctx: Context,
): Promise<CaseLibraryEntry[]> {
  const all = await ctx.client.get<CaseLibraryEntry[]>('/library/cases');
  if (!args.tag) return all;
  const needle = args.tag.toLowerCase();
  return all.filter((c) => c.tags.some((t) => t.toLowerCase() === needle));
}

export async function caseGetHandler(
  args: { slug: string },
  ctx: Context,
): Promise<CaseLibraryDetail> {
  return ctx.client.get<CaseLibraryDetail>(
    `/library/cases/${encodeURIComponent(args.slug)}`,
  );
}

export interface CaseDescribeCanvas {
  id: string;
  defId: string;
  title: string;
  language: Lang;
  variant?: import('@pingarden/shared').CanvasVariant;
  zones: Array<{ id: string; title: string; prompt?: string; examples?: string[] }>;
  colorLegend?: CanvasDef['defaultColorLegend'];
}

export interface CaseDescription {
  case: CaseLibraryEntry;
  project: Project;
  canvases: CaseDescribeCanvas[];
  stories: Array<{ id: string; title: string; status: string }>;
}

export async function caseDescribeHandler(
  args: { slug: string; lang?: Lang },
  ctx: Context,
): Promise<CaseDescription> {
  const detail = await caseGetHandler({ slug: args.slug }, ctx);
  // De-dup def fetches by defId — cases often reuse the same def across
  // archetype + variants, no need to fetch once per canvas.
  const defCache = new Map<string, DefDetail>();
  const canvases: CaseDescribeCanvas[] = [];
  for (const c of detail.canvases) {
    let def = defCache.get(c.defId);
    if (!def) {
      def = await ctx.client.get<DefDetail>(
        `/canvas-defs/${encodeURIComponent(c.defId)}`,
      );
      defCache.set(c.defId, def);
    }
    const lang = args.lang ?? c.language;
    const i18n = def.i18n[lang] ?? def.i18n.en;
    canvases.push({
      id: c.id,
      defId: c.defId,
      title: c.title,
      language: c.language,
      ...(c.variant ? { variant: c.variant } : {}),
      zones: def.def.zones.map((z) => {
        const block = i18n.blocks[z.id];
        return {
          id: z.id,
          title: block?.title ?? z.id,
          ...(block?.prompt ? { prompt: block.prompt } : {}),
          ...(block?.examples ? { examples: block.examples } : {}),
        };
      }),
      ...(def.def.defaultColorLegend ? { colorLegend: def.def.defaultColorLegend } : {}),
    });
  }
  return {
    case: detail.case,
    project: detail.project,
    canvases,
    stories: detail.stories.map((s) => ({ id: s.id, title: s.title, status: s.status })),
  };
}

export interface CaseReadCanvas {
  id: string;
  defId: string;
  title: string;
  language: Lang;
  variant?: import('@pingarden/shared').CanvasVariant;
  aiContext: AiContext;
}

export interface CaseReadResult {
  slug: string;
  case: CaseLibraryEntry;
  project: Project;
  canvases: CaseReadCanvas[];
  stories: Story[];
}

export async function caseReadHandler(
  args: { slug: string; lang?: Lang },
  ctx: Context,
): Promise<CaseReadResult> {
  const detail = await caseGetHandler({ slug: args.slug }, ctx);
  const langQ = args.lang ? `?lang=${args.lang}` : '';

  const canvases: CaseReadCanvas[] = [];
  for (const c of detail.canvases) {
    const aiContext = await ctx.client.get<AiContext>(
      `/canvases/${encodeURIComponent(c.id)}/ai-context${langQ}`,
    );
    canvases.push({
      id: c.id,
      defId: c.defId,
      title: c.title,
      language: c.language,
      ...(c.variant ? { variant: c.variant } : {}),
      aiContext,
    });
  }

  const stories: Story[] = [];
  for (const meta of detail.stories) {
    const full = await ctx.client.get<Story>(`/stories/${encodeURIComponent(meta.id)}`);
    stories.push(full);
  }

  return {
    slug: detail.case.slug,
    case: detail.case,
    project: detail.project,
    canvases,
    stories,
  };
}

export async function caseCanvasesHandler(
  args: { slug: string },
  ctx: Context,
): Promise<CaseLibraryDetail['canvases']> {
  const detail = await caseGetHandler({ slug: args.slug }, ctx);
  return detail.canvases;
}

export async function caseStickiesHandler(
  args: { slug: string; canvasId: string; lang?: Lang },
  ctx: Context,
): Promise<AiContext> {
  // Validate the canvasId belongs to the case so the AI doesn't get a
  // confusing 404 from /ai-context if it picks the wrong id.
  const detail = await caseGetHandler({ slug: args.slug }, ctx);
  const found = detail.canvases.find((c) => c.id === args.canvasId);
  if (!found) {
    throw new CliError(
      'NOT_FOUND',
      `Canvas ${args.canvasId} not found in case ${args.slug}`,
      `Run \`pingarden case canvases ${args.slug}\` to see valid canvas ids.`,
    );
  }
  const langQ = args.lang ? `?lang=${args.lang}` : '';
  return ctx.client.get<AiContext>(
    `/canvases/${encodeURIComponent(args.canvasId)}/ai-context${langQ}`,
  );
}

export async function caseForkHandler(
  args: { slug: string },
  ctx: Context,
): Promise<CaseForkResult> {
  return ctx.client.post<CaseForkResult>(
    `/library/cases/${encodeURIComponent(args.slug)}/fork`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

function parseLang(v: string | undefined): Lang | undefined {
  if (v === undefined) return undefined;
  if (v === 'en' || v === 'zh') return v;
  throw new CliError('BAD_INPUT', `--lang must be "en" or "zh", got "${v}"`);
}

export class CaseListCommand extends BaseCommand {
  static override paths = [['case', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List case-library entries (read-only curated business analyses)',
    examples: [
      ['List all cases', '$0 case list --json'],
      ['Filter by tag', '$0 case list --tag automotive'],
    ],
  });

  tag = Option.String('--tag', { description: 'Filter to cases carrying this tag' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseListHandler({ tag: this.tag }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((c) => ({
          slug: c.slug,
          kind: c.kind,
          'company.en': c.companyName.en,
          'company.zh': c.companyName.zh,
          tags: c.tags.join(', '),
          canvases: c.canvasCount,
          stories: c.storyCount,
        })),
      ),
    );
  }
}

export class CaseGetCommand extends BaseCommand {
  static override paths = [['case', 'get']];
  static override usage = BaseCommand.Usage({
    description: 'Show one case (case.json + project + canvas + story metadata)',
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseGetHandler({ slug: this.slug }, ctx);
    ctx.output.print(data);
  }
}

export class CaseDescribeCommand extends BaseCommand {
  static override paths = [['case', 'describe']];
  static override usage = BaseCommand.Usage({
    description: 'Show case + every canvas\'s zone titles / prompts / colour legend (no live sticky content)',
    details: `
      Use this BEFORE \`case read\` if you need the structural shape of
      each canvas (e.g. to plan which zones to mirror in your own
      project) without paying the cost of fetching live sticky content
      for every canvas.
    `,
  });

  slug = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseDescribeHandler(
      { slug: this.slug, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CaseReadCommand extends BaseCommand {
  static override paths = [['case', 'read']];
  static override usage = BaseCommand.Usage({
    description: 'Read every canvas + story in a case (full block-grouped sticky JSON, story bodies)',
    details: `
      The killer command for AI agents — one shot pulls the entire case
      content into context for analysis or to use as a reference when
      filling another project's canvases. Read-only; never mutates.
    `,
    examples: [
      ['Pull everything', '$0 case read wechat-private-domain --json'],
    ],
  });

  slug = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseReadHandler(
      { slug: this.slug, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CaseCanvasesCommand extends BaseCommand {
  static override paths = [['case', 'canvases']];
  static override usage = BaseCommand.Usage({
    description: 'List canvases in a case (id, defId, title, variant, language)',
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseCanvasesHandler({ slug: this.slug }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((c) => ({
          id: c.id,
          defId: c.defId,
          title: c.title,
          variant: c.variant?.id ?? '',
          lang: c.language,
        })),
      ),
    );
  }
}

export class CaseStickiesCommand extends BaseCommand {
  static override paths = [['case', 'stickies']];
  static override usage = BaseCommand.Usage({
    description: 'Stickies of a single canvas inside a case (block-grouped /ai-context JSON)',
  });

  slug = Option.String({ required: true });
  canvasId = Option.String({ required: true });
  lang = Option.String('--lang');

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseStickiesHandler(
      { slug: this.slug, canvasId: this.canvasId, lang: parseLang(this.lang) },
      ctx,
    );
    ctx.output.print(data);
  }
}

export class CaseForkCommand extends BaseCommand {
  static override paths = [['case', 'fork']];
  static override usage = BaseCommand.Usage({
    description: 'Deep-copy a case into a new editable user project',
    details: `
      The new project is independent: editing it does not affect the
      library original, and library updates in future app versions do
      not propagate to the fork. Story content has its embedded canvas
      ids rewritten so the user's copy is fully self-contained.
    `,
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await caseForkHandler({ slug: this.slug }, ctx);
    ctx.output.print(data, (r) =>
      [
        pc.green(`✓ forked '${this.slug}' → user project ${r.project.id} "${r.project.name}"`),
        `  canvases ${r.canvasIds.length}`,
        `  stories  ${r.storyIds.length}`,
      ].join('\n'),
    );
  }
}
