import { Option } from 'clipanion';
import type {
  BusinessModelPattern,
  CaseLibraryEntry,
  Experiment,
  Lang,
  LibraryResource,
  StrategyFramework,
  CopilotReferenceCatalog,
  CopilotReferenceResolution,
} from '@pingarden/shared';
import { resolveCopilotReferences } from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { CliError } from '../lib/errors.js';

interface TemplateListEntry {
  id: string;
  name: { en: string; zh: string };
  related?: string[];
}

export async function referenceResolveHandler(
  args: { text: string; lang?: Lang },
  ctx: Context,
): Promise<CopilotReferenceResolution> {
  const [templates, cases, resources, patterns, strategyFrameworks, experiments] = await Promise.all([
    ctx.client.get<TemplateListEntry[]>('/canvas-defs'),
    ctx.client.get<CaseLibraryEntry[]>('/library/cases'),
    ctx.client.get<LibraryResource[]>('/library/resources'),
    ctx.client.get<BusinessModelPattern[]>('/library/patterns'),
    ctx.client.get<StrategyFramework[]>('/library/strategy-frameworks'),
    ctx.client.get<Experiment[]>('/library/experiments'),
  ]);

  return resolveCopilotReferences({
    text: args.text,
    lang: args.lang ?? 'en',
    catalog: buildCatalog(templates, cases, resources, patterns, strategyFrameworks, experiments),
  });
}

export class ReferenceResolveCommand extends BaseCommand {
  static override paths = [['reference', 'resolve']];
  static override usage = BaseCommand.Usage({
    description: 'Resolve free-form Copilot references into typed library/project categories',
    details: `
      Helps agents keep PinGarden taxonomy straight. Canvas templates,
      strategy frameworks, resources, and cases are resolved as separate
      kinds; a missing project canvas instance is not treated as missing
      library content.
    `,
    examples: [
      ['Resolve a Chinese recommendation', '$0 reference resolve --text "先看 BCG 增长份额矩阵和商业模式新生代" --lang zh --json'],
    ],
  });

  text = Option.String('--text', { required: true, description: 'Text to resolve' });
  langOpt = Option.String('--lang', { description: 'en | zh (default en)' });

  protected async run() {
    const ctx = this.makeContext();
    const data = await referenceResolveHandler({ text: this.text, lang: parseLang(this.langOpt) }, ctx);
    ctx.output.print(data);
  }
}

function parseLang(raw: string | undefined): Lang | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'en' || raw === 'zh') return raw;
  throw new CliError('BAD_INPUT', `--lang must be "en" or "zh", got "${raw}"`);
}

function buildCatalog(
  templates: TemplateListEntry[],
  cases: CaseLibraryEntry[],
  resources: LibraryResource[],
  patterns: BusinessModelPattern[],
  strategyFrameworks: StrategyFramework[],
  experiments: Experiment[],
): CopilotReferenceCatalog {
  return {
    entries: [
      ...templates.map((item) => ({
        kind: 'canvasTemplate' as const,
        id: item.id,
        defId: item.id,
        label: item.name.zh || item.name.en || item.id,
        aliases: [item.name.en, item.name.zh, item.id, ...(item.related ?? [])].filter(Boolean),
      })),
      ...cases.map((item) => ({
        kind: 'case' as const,
        id: item.slug,
        slug: item.slug,
        label: item.companyName.zh || item.companyName.en || item.slug,
        aliases: [item.companyName.en, item.companyName.zh, item.slug, ...item.tags].filter(Boolean),
        summary: item.summary.zh || item.summary.en,
      })),
      ...resources.map((item) => ({
        kind: 'resource' as const,
        id: item.slug,
        slug: item.slug,
        resourceSlug: item.slug,
        label: item.title.zh || item.title.en || item.slug,
        aliases: [item.title.en, item.title.zh, item.slug, ...(item.relatedCanvasDefIds ?? [])].filter(Boolean),
        summary: item.summary.zh || item.summary.en,
      })),
      ...patterns.map((item) => ({
        kind: 'pattern' as const,
        id: item.slug,
        slug: item.slug,
        label: item.name.zh || item.name.en || item.slug,
        aliases: [item.name.en, item.name.zh, item.slug].filter(Boolean),
        summary: item.summary.zh || item.summary.en,
      })),
      ...strategyFrameworks.map((item) => ({
        kind: 'strategyFramework' as const,
        id: item.slug,
        slug: item.slug,
        label: item.name.zh || item.name.en || item.slug,
        aliases: [item.name.en, item.name.zh, item.slug, ...(item.relatedCanvasDefIds ?? [])].filter(Boolean),
        summary: item.summary.zh || item.summary.en,
      })),
      ...experiments.map((item) => ({
        kind: 'experiment' as const,
        id: item.slug,
        slug: item.slug,
        label: item.name.zh || item.name.en || item.slug,
        aliases: [item.name.en, item.name.zh, item.slug, ...item.appliesToCanvases].filter(Boolean),
        summary: item.summary.zh || item.summary.en,
      })),
    ],
  };
}
