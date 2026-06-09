import { Option } from 'clipanion';
import type { CanvasDef, CanvasI18n } from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

type TemplateListEntry = {
  id: string;
  name: { en: string; zh: string };
  plugin?: string;
  related?: CanvasDef['related'];
};

type TemplateDetail = {
  def: CanvasDef;
  i18n: { en: CanvasI18n; zh: CanvasI18n };
  knowledge: {
    intro?: { en?: string; zh?: string };
    blocks: Record<string, { en?: string; zh?: string }>;
  };
};

// ─── Pure handlers ───────────────────────────────────────────────────────────

export async function templateListHandler(
  _args: unknown,
  ctx: Context,
): Promise<TemplateListEntry[]> {
  return ctx.client.get<TemplateListEntry[]>('/canvas-defs');
}

export async function templateGetHandler(
  args: { defId: string },
  ctx: Context,
): Promise<TemplateDetail> {
  return ctx.client.get<TemplateDetail>(
    `/canvas-defs/${encodeURIComponent(args.defId)}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class TemplateListCommand extends BaseCommand {
  static override paths = [['template', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List available canvas templates (canvas-defs)',
  });

  protected async run() {
    const ctx = this.makeContext();
    const data = await templateListHandler({}, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((t) => ({
          id: t.id,
          'name.en': t.name.en,
          'name.zh': t.name.zh,
          plugin: t.plugin ?? '',
          related: (t.related ?? []).join(', '),
        })),
      ),
    );
  }
}

export class TemplateGetCommand extends BaseCommand {
  static override paths = [['template', 'get']];
  static override usage = BaseCommand.Usage({
    description: 'Show full canvas-def: structure, i18n (both langs), and knowledge markdown',
  });

  defId = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await templateGetHandler({ defId: this.defId }, ctx);
    ctx.output.print(data);
  }
}
