import { Option } from 'clipanion';
import type {
  BusinessModelPattern,
  BusinessModelPatternDetail,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers (MCP-friendly, no clipanion dep) ──────────────────────────

export async function patternListHandler(
  _args: Record<string, never>,
  ctx: Context,
): Promise<BusinessModelPattern[]> {
  return ctx.client.get<BusinessModelPattern[]>('/library/patterns');
}

export async function patternGetHandler(
  args: { slug: string },
  ctx: Context,
): Promise<BusinessModelPatternDetail> {
  return ctx.client.get<BusinessModelPatternDetail>(
    `/library/patterns/${encodeURIComponent(args.slug)}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class PatternListCommand extends BaseCommand {
  static override paths = [['pattern', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List business-model patterns shipped in the case library',
    details: `
      Patterns are abstract reusable models (Long Tail, Unbundling, ...).
      They are NOT cases — they have no BMC of their own. Each pattern
      links to one or more example cases via \`examples[]\`. Use
      \`pattern get <slug>\` to see the full description + examples
      hydrated, or pair with \`case get\` to walk an example case's BMC.
    `,
    examples: [
      ['List all patterns', '$0 pattern list --json'],
    ],
  });

  protected async run() {
    const ctx = this.makeContext();
    const data = await patternListHandler({}, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((p) => ({
          slug: p.slug,
          'name.en': p.name.en,
          'name.zh': p.name.zh,
          examples: p.examples.length,
        })),
      ),
    );
  }
}

export class PatternGetCommand extends BaseCommand {
  static override paths = [['pattern', 'get']];
  static override usage = BaseCommand.Usage({
    description: 'Show one pattern (metadata + bilingual long-form description + hydrated example cases)',
    details: `
      The hydrated \`exampleCases\` array carries each example case's
      full \`CaseLibraryEntry\` so the AI can decide which one to walk
      next without an extra round trip. To then explore an example
      case's BMC content, follow up with \`case get\`, \`case describe\`,
      or \`case read\`.
    `,
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await patternGetHandler({ slug: this.slug }, ctx);
    ctx.output.print(data);
  }
}
