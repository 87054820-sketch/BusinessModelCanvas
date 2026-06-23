import { Option } from 'clipanion';
import type {
  StrategyFramework,
  StrategyFrameworkDetail,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers (MCP-friendly, no clipanion dep) ──────────────────────────

export async function strategyFrameworkListHandler(
  _args: Record<string, never>,
  ctx: Context,
): Promise<StrategyFramework[]> {
  return ctx.client.get<StrategyFramework[]>('/library/strategy-frameworks');
}

export async function strategyFrameworkGetHandler(
  args: { slug: string },
  ctx: Context,
): Promise<StrategyFrameworkDetail> {
  return ctx.client.get<StrategyFrameworkDetail>(
    `/library/strategy-frameworks/${encodeURIComponent(args.slug)}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class StrategyFrameworkListCommand extends BaseCommand {
  static override paths = [['strategy-framework', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List strategy frameworks shipped in the case library',
    details: `
      Strategy frameworks are abstract analysis methods (Blue Ocean
      Strategy, Five Forces, PESTEL, ...). They are NOT cases and NOT
      business-model patterns. Each framework links to concrete example
      cases via examples[].
    `,
    examples: [
      ['List all strategy frameworks', '$0 strategy-framework list --json'],
    ],
  });

  protected async run() {
    const ctx = this.makeContext();
    const data = await strategyFrameworkListHandler({}, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((f) => ({
          slug: f.slug,
          'name.en': f.name.en,
          'name.zh': f.name.zh,
          category: f.category ?? '',
          examples: f.examples.length,
        })),
      ),
    );
  }
}

export class StrategyFrameworkGetCommand extends BaseCommand {
  static override paths = [['strategy-framework', 'get']];
  static override usage = BaseCommand.Usage({
    description: 'Show one strategy framework (metadata + bilingual description + example cases)',
    details: `
      The hydrated exampleCases array carries each linked case's
      CaseLibraryEntry, so agents can decide which concrete case to read
      next without another list request.
    `,
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await strategyFrameworkGetHandler({ slug: this.slug }, ctx);
    ctx.output.print(data);
  }
}
