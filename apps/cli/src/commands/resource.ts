import { Option } from 'clipanion';
import type {
  LibraryResource,
  LibraryResourceDetail,
  ResourceChapterMeta,
  ResourceChapterDetail,
} from '@pingarden/shared';
import { BaseCommand } from '../lib/baseCommand.js';
import type { Context } from '../lib/context.js';
import { table } from '../lib/output.js';

// ─── Pure handlers (MCP-friendly, no clipanion dep) ──────────────────────────

export async function resourceListHandler(
  _args: Record<string, never>,
  ctx: Context,
): Promise<LibraryResource[]> {
  return ctx.client.get<LibraryResource[]>('/library/resources');
}

export async function resourceGetHandler(
  args: { slug: string },
  ctx: Context,
): Promise<LibraryResourceDetail> {
  return ctx.client.get<LibraryResourceDetail>(
    `/library/resources/${encodeURIComponent(args.slug)}`,
  );
}

export async function resourceChaptersHandler(
  args: { slug: string },
  ctx: Context,
): Promise<ResourceChapterMeta[]> {
  return ctx.client.get<ResourceChapterMeta[]>(
    `/library/resources/${encodeURIComponent(args.slug)}/chapters`,
  );
}

export async function resourceChapterReadHandler(
  args: { slug: string; chapterSlug: string },
  ctx: Context,
): Promise<ResourceChapterDetail> {
  return ctx.client.get<ResourceChapterDetail>(
    `/library/resources/${encodeURIComponent(args.slug)}/chapters/${encodeURIComponent(args.chapterSlug)}`,
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class ResourceListCommand extends BaseCommand {
  static override paths = [['resource', 'list']];
  static override usage = BaseCommand.Usage({
    description: 'List resources (books, articles, papers, reports, web) shipped in the library',
    details: `
      Resources are the source-material layer of the library: books,
      articles, papers, reports, and web links. They carry chapter-level
      reading notes when the resource is a book. Use\nresource get <slug>\nto see the full detail, and\nresource chapter <slug> <chapter>\nto read bilingual chapter prose.
    `,
    examples: [['List all resources', '$0 resource list --json']],
  });

  protected async run() {
    const ctx = this.makeContext();
    const data = await resourceListHandler({}, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((r) => ({
          slug: r.slug,
          type: r.type,
          'title.en': r.title.en,
          'title.zh': r.title.zh,
          chapters: r.chapterCount ?? 0,
          year: r.year ?? '',
        })),
      ),
    );
  }
}

export class ResourceGetCommand extends BaseCommand {
  static override paths = [['resource', 'get']];
  static override usage = BaseCommand.Usage({
    description: 'Show one resource (metadata + reading note + related cases + chapters)',
    details: `
      The hydrated response includes the full resource metadata, a bilingual
      reading note, hydrated related cases, and a chapter index when the
      resource is a book. Follow up with\nresource chapter <slug> <chapter>\nto read a specific chapter's full prose.
    `,
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await resourceGetHandler({ slug: this.slug }, ctx);
    ctx.output.print(data);
  }
}

export class ResourceChaptersCommand extends BaseCommand {
  static override paths = [['resource', 'chapters']];
  static override usage = BaseCommand.Usage({
    description: 'List chapter index for a book-like resource',
    details: `
      Shows the chapter table of contents: order, bilingual title, and
      summary. Use\nresource chapter <slug> <chapter>\nto read the full
      bilingual chapter markdown.
    `,
  });

  slug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await resourceChaptersHandler({ slug: this.slug }, ctx);
    ctx.output.print(data, (rows) =>
      table(
        rows.map((ch) => ({
          order: ch.order,
          slug: ch.slug,
          'title.en': ch.title.en,
          'title.zh': ch.title.zh,
        })),
      ),
    );
  }
}

export class ResourceChapterReadCommand extends BaseCommand {
  static override paths = [['resource', 'chapter']];
  static override usage = BaseCommand.Usage({
    description: 'Read one chapter (bilingual markdown) from a book-like resource',
    details: `
      Returns the full bilingual chapter prose (en + zh). The chapter
      slug is the filename stem (e.g.\nch01-intro\n). Use\nresource chapters <slug>\nto discover available chapter slugs.
    `,
  });

  slug = Option.String({ required: true });
  chapterSlug = Option.String({ required: true });

  protected async run() {
    const ctx = this.makeContext();
    const data = await resourceChapterReadHandler(
      { slug: this.slug, chapterSlug: this.chapterSlug },
      ctx,
    );
    ctx.output.print(data);
  }
}
