import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { CanvasDef, CanvasI18n, Lang } from '@pingarden/shared';

const ZoneShape = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rect'),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
  z.object({
    type: z.literal('polygon'),
    points: z.array(z.tuple([z.number(), z.number()])).min(3),
  }),
  z.object({
    type: z.literal('circle-segment'),
    cx: z.number(),
    cy: z.number(),
    r: z.number().positive(),
    fromDeg: z.number(),
    toDeg: z.number(),
  }),
]);

const ZoneDef = z.object({
  id: z.string().min(1),
  shape: ZoneShape,
  label: z
    .object({
      x: z.number(),
      y: z.number(),
      align: z.enum(['left', 'center', 'right']).optional(),
      fontSize: z.number().positive().optional(),
    })
    .optional(),
  axes: z
    .object({
      x: z.object({
        min: z.number(),
        max: z.number(),
        label: z.object({ en: z.string(), zh: z.string() }),
        kind: z.enum(['risk', 'return']).optional(),
      }),
      y: z.object({
        min: z.number(),
        max: z.number(),
        label: z.object({ en: z.string(), zh: z.string() }),
        kind: z.enum(['risk', 'return']).optional(),
      }),
    })
    .optional(),
});

const LocalizedLabel = z.object({ en: z.string(), zh: z.string() });

const LearningReferenceSchema = z.object({
  type: z.enum([
    'canvas',
    'canvasBlock',
    'case',
    'caseStory',
    'resource',
    'resourceChapter',
    'pattern',
    'strategyFramework',
    'experiment',
  ]),
  slug: z.string().min(1),
  chapterSlug: z.string().min(1).optional(),
  canvasDefId: z.string().min(1).optional(),
  blockId: z.string().min(1).optional(),
  storyId: z.string().min(1).optional(),
  label: LocalizedLabel.optional(),
  note: LocalizedLabel.optional(),
});

const LearningIndexSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  headline: LocalizedLabel.optional(),
  whyOpen: LocalizedLabel.optional(),
  audience: LocalizedLabel.optional(),
  keyConcepts: z.array(LocalizedLabel).optional(),
  commonMisreads: z.array(LocalizedLabel).optional(),
  firstSteps: z.array(LocalizedLabel).optional(),
  outcomes: z.array(LocalizedLabel).optional(),
  practicePrompts: z.array(LocalizedLabel).optional(),
  sourceRefs: z.array(LearningReferenceSchema).optional(),
  relatedRefs: z.array(LearningReferenceSchema).optional(),
  nextRefs: z.array(LearningReferenceSchema).optional(),
});

const DefaultColorLegendSchema = z.object({
  hex: z.enum([
    '#FCF1A8',
    '#FBD0D9',
    '#CFE3F5',
    '#CFEBD3',
    '#E2D5F0',
    '#FBDDC0',
  ]),
  label: LocalizedLabel,
  description: LocalizedLabel.optional(),
});

const ChartConfigSchema = z.object({
  yAxis: z.object({
    min: z.number(),
    max: z.number(),
    label: LocalizedLabel,
    lowLabel: LocalizedLabel.optional(),
    highLabel: LocalizedLabel.optional(),
  }),
  factorsDefault: z.array(
    z.object({
      id: z.string().min(1),
      label: LocalizedLabel,
    }),
  ),
});

const GroupLabelSchema = z.object({
  id: z.string().min(1),
  label: LocalizedLabel,
  description: LocalizedLabel.optional(),
  x: z.number(),
  y: z.number(),
  align: z.enum(['left', 'center', 'right']).optional(),
  fontSize: z.number().positive().optional(),
});

const DisplayConfigSchema = z.object({
  canvas: z
    .object({
      showBlockLabels: z.boolean().optional(),
      showBlockPrompts: z.boolean().optional(),
      groupLabels: z.array(GroupLabelSchema).optional(),
      showPinConnections: z.boolean().optional(),
    })
    .optional(),
  preview: z
    .object({
      mode: z.enum(['image', 'structured', 'chart-sample']).optional(),
      showTitle: z.boolean().optional(),
      showSubtitle: z.boolean().optional(),
      showBlockLabels: z.boolean().optional(),
      showBlockPrompts: z.boolean().optional(),
      subtitle: LocalizedLabel.optional(),
      groupLabels: z.array(GroupLabelSchema).optional(),
    })
    .optional(),
});

const ManifestSchema = z.object({
  id: z.string().min(1),
  name: z.object({ en: z.string(), zh: z.string() }),
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  background: z.object({
    en: z.string().min(1),
    zh: z.string().min(1).optional(),
  }),
  zones: z.array(ZoneDef).min(1),
  plugin: z.enum(['axis-grid', 'chart-canvas']).optional(),
  related: z.array(z.string().min(1)).optional(),
  relatedNotes: z.record(z.string(), LocalizedLabel).optional(),
  learning: LearningIndexSchema.optional(),
  display: DisplayConfigSchema.optional(),
  defaultColorLegend: z.array(DefaultColorLegendSchema).optional(),
  /**
   * Declarative list of editable object types this canvas allows.
   * Defaults to `['sticky']` when omitted, matching pre-existing canvases.
   * Mirrors `ObjectType` in `packages/shared/src/index.ts`.
   */
  objectTypes: z
    .array(z.enum(['sticky', 'pin', 'pinClass', 'xAxisItem']))
    .optional(),
  /** Required for chart-canvas plugin canvases; otherwise unused. */
  chart: ChartConfigSchema.optional(),
});

const I18nSchema = z.object({
  canvasTitle: z.string(),
  blocks: z.record(
    z.string(),
    z.object({
      title: z.string(),
      prompt: z.string().optional(),
      guidance: z.string().optional(),
      examples: z.array(z.string()).optional(),
    }),
  ),
});

export interface LoadedCanvasDef {
  def: CanvasDef;
  i18n: Record<Lang, CanvasI18n>;
  /** Absolute paths to background SVGs by language, for static serving. */
  backgroundPaths: Record<Lang, string | undefined>;
  /**
   * Absolute path to this bundle's directory. Used by the canvas-defs
   * HTTP route to lazily read knowledge markdown on each request — see
   * `loadKnowledgeForBundle` below for the rationale.
   */
  bundleDir: string;
}

/**
 * Optional bundled knowledge content per language. Each language slot may
 * carry a short `intro` (when/why to use this canvas), a longer `body`
 * (theory, methodology, references), and a per-zone `blocks` map keyed by
 * zone id (rich guidance shown in the BlockInspector when a zone is
 * selected). All fields are independently optional — bundles without
 * them are valid.
 *
 * Read-only at runtime; edited in source under `<bundleDir>/knowledge/`.
 */
export interface CanvasKnowledge {
  intro?: string;
  body?: string;
  blocks: Record<string, string>;
}

/**
 * Walk packages/canvases/* on startup. Each subdirectory must contain a
 * manifest.json + i18n/{en,zh}.json. We validate everything once so the
 * server fails fast if a bundle is malformed.
 *
 * Knowledge markdown files (intro/body/blocks) are NOT read here —
 * they're loaded lazily on each `GET /canvas-defs/:id` via
 * `loadKnowledgeForBundle`. That way new MD files appear without a
 * server restart.
 */
export async function loadCanvasDefs(rootDir: string): Promise<LoadedCanvasDef[]> {
  const out: LoadedCanvasDef[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(rootDir);
  } catch (err) {
    throw new Error(`Canvas defs dir not found: ${rootDir} (${(err as Error).message})`);
  }

  for (const entry of entries) {
    const bundleDir = join(rootDir, entry);
    const stat = await fs.stat(bundleDir).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const manifestRaw = await tryReadJson(join(bundleDir, 'manifest.json'));
    if (!manifestRaw) continue;
    const def = ManifestSchema.parse(manifestRaw) as CanvasDef;

    const i18nEn = I18nSchema.parse(
      await tryReadJson(join(bundleDir, 'i18n/en.json')) ?? {},
    ) as CanvasI18n;
    const i18nZhRaw = await tryReadJson(join(bundleDir, 'i18n/zh.json'));
    const i18nZh = I18nSchema.parse(i18nZhRaw ?? i18nEn) as CanvasI18n;

    const backgroundPaths: Record<Lang, string | undefined> = {
      en: join(bundleDir, def.background.en),
      zh: def.background.zh ? join(bundleDir, def.background.zh) : undefined,
    };

    out.push({
      def,
      i18n: { en: i18nEn, zh: i18nZh },
      backgroundPaths,
      bundleDir,
    });
  }

  return out;
}

/**
 * Read every markdown file under `<bundleDir>/knowledge/` for both
 * languages — `intro.{en,zh}.md`, `body.{en,zh}.md`, and one per zone at
 * `blocks/<zoneId>.{en,zh}.md`. Missing files are simply omitted from
 * the result; only filesystem errors other than ENOENT propagate.
 *
 * Called PER REQUEST in the canvas-defs and ai-context HTTP routes so
 * authors can drop in new MD files without restarting the server.
 * The cost is one stat + read per file (kb-scale, OS-cached on
 * subsequent reads); not worth a TTL cache at this scale.
 */
export async function loadKnowledgeForBundle(
  bundleDir: string,
  zoneIds: readonly string[],
): Promise<Record<Lang, CanvasKnowledge>> {
  async function loadLang(lang: Lang): Promise<CanvasKnowledge> {
    const [intro, body, ...blockEntries] = await Promise.all([
      tryReadText(join(bundleDir, `knowledge/intro.${lang}.md`)),
      tryReadText(join(bundleDir, `knowledge/body.${lang}.md`)),
      ...zoneIds.map(async (id) => {
        const text = await tryReadText(
          join(bundleDir, `knowledge/blocks/${id}.${lang}.md`),
        );
        return [id, text] as const;
      }),
    ]);
    const blocks: Record<string, string> = {};
    for (const [id, text] of blockEntries) {
      if (text !== undefined && text.length > 0) blocks[id] = text;
    }
    return { intro, body, blocks };
  }

  const [en, zh] = await Promise.all([loadLang('en'), loadLang('zh')]);
  return { en, zh };
}

async function tryReadJson(path: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Read a UTF-8 text file, returning undefined when it doesn't exist. Used
 * for optional knowledge markdown — bundles without these files are valid.
 */
async function tryReadText(path: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}
