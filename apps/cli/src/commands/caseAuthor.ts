import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Option } from 'clipanion';
import pc from 'picocolors';
import { z } from 'zod';
import * as Y from 'yjs';
import type {
  CanvasDef,
  CanvasMeta,
  CanvasVariant,
  CaseKind,
  CaseLibraryEntry,
  Lang,
  ObjectsBulkInput,
  Project,
  StoryMeta,
} from '@pingarden/shared';
import { encodeObjectsBulk, EncodeBulkInputError } from '@pingarden/shared/yjs';
import { BaseCommand } from '../lib/baseCommand.js';
import { CliError } from '../lib/errors.js';
import { discoverBundlesDir } from '../skill/discover.js';

/**
 * Local case-library authoring + validation. Both commands are
 * **pure filesystem operations** — they do not contact the running
 * server, so they work in CI and during `package-mac.sh`'s
 * pre-packaging gate.
 *
 *   pingarden case author --from <input.json> --out <dir>
 *   pingarden case validate [--all | <slug>] [--case-library-dir <dir>]
 *
 * The encoder used by `author` is the same `encodeObjectsBulk` from
 * `@pingarden/shared/yjs` that the server's `POST /objects/bulk`
 * uses, so a freshly-authored case round-trips through the runtime
 * exactly the same as user-created canvases.
 */

// ─── input schema for `case author` ──────────────────────────────────────────

const Localized = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const LocalizedOptional = z.object({
  en: z.string().min(1).optional(),
  zh: z.string().min(1).optional(),
});

const CaseSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
});

const CaseKindSchema = z.enum(['company', 'industry', 'comparison']);

const CanvasVariantSchema = z.object({
  id: z.string().min(1),
  label: Localized,
  description: LocalizedOptional.optional(),
  role: z.enum(['archetype', 'variant']).optional(),
});

const StickyAuthorInput = z.object({
  zoneId: z.string().min(1),
  text: z.string(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  authorName: z.string().optional(),
});

const PinClassAuthorInput = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  color: z.string().optional(),
  icon: z.enum(['circle', 'triangle', 'square', 'star', 'flag']).optional(),
  authorName: z.string().optional(),
});

const PinAuthorInput = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  body: z.string().optional(),
  authorName: z.string().optional(),
});

const XAxisItemAuthorInput = z.object({
  id: z.string().min(1),
  label: Localized,
});

const ColorLegendAuthorEntry = z.object({
  label: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
});

const CanvasAuthorInput = z.object({
  /**
   * Optional stable id for cross-references in stories
   * (`{{canvas:<key>}}`). Defaults to the array index.
   */
  key: z.string().optional(),
  /** Optional explicit canvas UUID for byte-stable rebuilds. */
  id: z.string().uuid().optional(),
  defId: z.string().min(1),
  title: z.string().min(1),
  language: z.enum(['en', 'zh']),
  contentDate: z.string().optional(),
  contentDatePrecision: z.enum(['year', 'month', 'day']).optional(),
  contentDateLabel: z.string().optional(),
  variant: CanvasVariantSchema.optional(),
  // bulk-import payload — mirrors `ObjectsBulkInput`
  stickies: z.array(StickyAuthorInput).max(500).optional(),
  pinClasses: z.array(PinClassAuthorInput).max(50).optional(),
  pins: z.array(PinAuthorInput).max(500).optional(),
  xAxisItems: z.array(XAxisItemAuthorInput).max(50).optional(),
  colorLegend: z.record(z.string(), ColorLegendAuthorEntry).optional(),
});

const StoryAuthorInput = z.object({
  /** Optional explicit story UUID for byte-stable rebuilds. */
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  /**
   * Authoring language — required so the workspace can show the
   * language-matching story when the user toggles UI lang. Library
   * convention is to ship parallel EN + ZH stories per case until the
   * shared schema upgrades to localised story content. Single-language
   * cases like the legacy wechat one still produce a `case validate`
   * warning at the case level, not the story level.
   */
  language: z.enum(['en', 'zh']),
  status: z.enum(['draft', 'published']).optional(),
  contentDate: z.string().optional(),
  contentDatePrecision: z.enum(['year', 'month', 'day']).optional(),
  contentDateLabel: z.string().optional(),
  /**
   * Markdown body. May contain `{{canvas:<key>}}` placeholders that
   * resolve to UUIDs of canvases declared above; placeholders are
   * substituted at encode time so the final stored content has real
   * canvas IDs in `::canvas[defId]{canvasId="<uuid>"}` directives.
   */
  contentMd: z.string(),
});

const ProjectAuthorInput = z.object({
  /** Optional explicit project UUID. Defaults to randomUUID. */
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
});

const CaseAuthorInput = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message: 'slug must be kebab-case (lowercase letters, digits, dashes)',
    }),
  version: z.number().int().positive().optional(),
  kind: CaseKindSchema,
  companyName: Localized,
  summary: Localized,
  tags: z.array(z.string().min(1)).default([]),
  sources: z.array(CaseSourceSchema).default([]),
  thumbnailDefId: z.string().optional(),
  // case → pattern forward link (slug points to packages/case-library/patterns/<slug>/)
  appliesPatterns: z.array(z.string().min(1)).optional(),
  // case → strategy framework forward link (slug points to packages/case-library/strategy-frameworks/<slug>/)
  appliesStrategyFrameworks: z.array(z.string().min(1)).optional(),
  // Optional sub-type refinement per pattern. Each value must match a
  // `subtypes[].id` on the referenced pattern. `case validate` enforces
  // both directions; this command just passes the field through.
  appliesPatternSubtypes: z.record(z.string(), z.string().min(1)).optional(),

  project: ProjectAuthorInput,
  canvases: z.array(CanvasAuthorInput).min(1),
  stories: z.array(StoryAuthorInput).default([]),
});

type CaseAuthorInputT = z.infer<typeof CaseAuthorInput>;

// ─── case author handler (pure) ──────────────────────────────────────────────

interface AuthorOpts {
  outDir: string;
  bundlesDir: string;
  defaultAuthor: string;
  /** Pinned `now` timestamp; defaults to `new Date().toISOString()`. */
  now?: string;
  dryRun?: boolean;
  force?: boolean;
}

interface AuthorResult {
  slug: string;
  outDir: string;
  filesWritten: string[];
  bytesWritten: number;
  canvasIds: string[];
  storyIds: string[];
  projectId: string;
  replaced: {
    stickies: number;
    pinClasses: number;
    pins: number;
    xAxisItems: number;
    colorLegend: number;
  };
  dryRun: boolean;
  /**
   * Non-fatal warnings that didn't prevent authoring but the user
   * should know about (e.g. missing language coverage). Pure data —
   * the clipanion class is responsible for surfacing them to stderr
   * in human mode, embedding in the JSON envelope in `--json` mode.
   */
  warnings: string[];
}

export async function caseAuthorHandler(
  rawInput: unknown,
  opts: AuthorOpts,
): Promise<AuthorResult> {
  const parsed = CaseAuthorInput.safeParse(rawInput);
  if (!parsed.success) {
    throw new CliError(
      'BAD_INPUT',
      'Author input failed schema validation',
      'Run with --json to see the full zod error.',
      parsed.error.format(),
    );
  }
  const input = parsed.data;
  const now = opts.now ?? new Date().toISOString();

  // outDir — refuse to write into a non-empty directory unless --force
  const outDir = resolve(opts.outDir);
  if (existsSync(outDir)) {
    const entries = readdirSync(outDir);
    if (entries.length > 0 && !opts.force && !opts.dryRun) {
      throw new CliError(
        'BAD_INPUT',
        `--out directory '${outDir}' is not empty`,
        'Pass --force to overwrite, or pick a fresh directory.',
      );
    }
  }

  // Resolve canvas defs — load each unique defId from the bundles dir.
  const uniqueDefIds = [...new Set(input.canvases.map((c) => c.defId))];
  const defsById = new Map<string, CanvasDef>();
  for (const defId of uniqueDefIds) {
    const manifestPath = join(opts.bundlesDir, defId, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new CliError(
        'BAD_INPUT',
        `Canvas def '${defId}' not found at ${manifestPath}`,
        'Pass --bundles <dir> if your canvas bundles live elsewhere.',
      );
    }
    try {
      const def = JSON.parse(readFileSync(manifestPath, 'utf8')) as CanvasDef;
      defsById.set(defId, def);
    } catch (err) {
      throw new CliError(
        'BAD_INPUT',
        `Could not parse manifest.json for '${defId}': ${(err as Error).message}`,
      );
    }
  }

  // Allocate IDs up front so stories can reference canvases by `key`.
  const projectId = input.project.id ?? randomUUID();
  const canvasKeyToId = new Map<string, string>();
  const canvasIds: string[] = [];
  input.canvases.forEach((c, idx) => {
    const id = c.id ?? randomUUID();
    canvasIds.push(id);
    const key = c.key ?? String(idx);
    if (canvasKeyToId.has(key)) {
      throw new CliError(
        'BAD_INPUT',
        `Duplicate canvas key '${key}' (used by canvases[${idx}] and another)`,
        'Each canvas needs a unique `key` for story directive substitution.',
      );
    }
    canvasKeyToId.set(key, id);
  });

  const storyIds = input.stories.map((s) => s.id ?? randomUUID());

  // ── Encode each canvas to live.ydoc bytes ──
  interface EncodedCanvas {
    id: string;
    canvas: (typeof input.canvases)[number];
    bytes: Uint8Array;
    replaced: AuthorResult['replaced'];
  }
  const encoded: EncodedCanvas[] = [];
  const totalReplaced: AuthorResult['replaced'] = {
    stickies: 0,
    pinClasses: 0,
    pins: 0,
    xAxisItems: 0,
    colorLegend: 0,
  };
  input.canvases.forEach((c, idx) => {
    const id = canvasIds[idx]!;
    const def = defsById.get(c.defId)!;
    const bulk: ObjectsBulkInput = {
      ...(c.stickies ? { stickies: c.stickies } : {}),
      ...(c.pinClasses ? { pinClasses: c.pinClasses } : {}),
      ...(c.pins ? { pins: c.pins } : {}),
      ...(c.xAxisItems ? { xAxisItems: c.xAxisItems } : {}),
      ...(c.colorLegend ? { colorLegend: c.colorLegend } : {}),
    };
    let result;
    try {
      result = encodeObjectsBulk(bulk, def, {
        defaultAuthor: opts.defaultAuthor,
        now,
      });
    } catch (err) {
      if (err instanceof EncodeBulkInputError) {
        throw new CliError(
          'BAD_INPUT',
          `canvases[${idx}] (${c.defId}): ${err.message}`,
          undefined,
          err.details,
        );
      }
      throw err;
    }
    encoded.push({ id, canvas: c, bytes: result.state, replaced: result.replaced });
    totalReplaced.stickies += result.replaced.stickies;
    totalReplaced.pinClasses += result.replaced.pinClasses;
    totalReplaced.pins += result.replaced.pins;
    totalReplaced.xAxisItems += result.replaced.xAxisItems;
    totalReplaced.colorLegend += result.replaced.colorLegend;
  });

  // ── Validate story canvas-key references before writing anything ──
  const placeholderRe = /\{\{\s*canvas:([^}\s]+)\s*\}\}/g;
  for (const [sIdx, story] of input.stories.entries()) {
    const referenced = new Set<string>();
    for (const m of story.contentMd.matchAll(placeholderRe)) {
      referenced.add(m[1]!);
    }
    const missing = [...referenced].filter((k) => !canvasKeyToId.has(k));
    if (missing.length > 0) {
      throw new CliError(
        'BAD_INPUT',
        `stories[${sIdx}] references unknown canvas keys: ${missing.join(', ')}`,
        `Known keys: ${[...canvasKeyToId.keys()].join(', ')}`,
      );
    }
  }

  // ── Build final files in memory (pure → easy --dry-run) ──
  const files = new Map<string, Buffer>();

  // case.json
  const caseJson: CaseLibraryEntry & { version: number; projectId: string } = {
    slug: input.slug,
    version: input.version ?? 1,
    kind: input.kind as CaseKind,
    companyName: input.companyName,
    summary: input.summary,
    tags: input.tags,
    sources: input.sources,
    ...(input.thumbnailDefId ? { thumbnailDefId: input.thumbnailDefId } : {}),
    projectId,
    canvasCount: input.canvases.length,
    storyCount: input.stories.length,
    ...(input.appliesPatterns ? { appliesPatterns: input.appliesPatterns } : {}),
    ...(input.appliesStrategyFrameworks
      ? { appliesStrategyFrameworks: input.appliesStrategyFrameworks }
      : {}),
    ...(input.appliesPatternSubtypes
      ? { appliesPatternSubtypes: input.appliesPatternSubtypes }
      : {}),
  };
  files.set(join(outDir, 'case.json'), Buffer.from(JSON.stringify(caseJson, null, 2) + '\n'));

  // project.json
  const project: Project = {
    id: projectId,
    name: input.project.name,
    ...(input.project.description ? { description: input.project.description } : {}),
    createdAt: now,
    createdBy: opts.defaultAuthor,
    updatedAt: now,
    updatedBy: opts.defaultAuthor,
  };
  files.set(
    join(outDir, 'projects', `${projectId}.json`),
    Buffer.from(JSON.stringify(project, null, 2) + '\n'),
  );

  // canvases — meta.json + live.ydoc
  for (const enc of encoded) {
    const c = enc.canvas;
    const meta: CanvasMeta = {
      id: enc.id,
      projectId,
      defId: c.defId,
      title: c.title,
      language: c.language as Lang,
      ...(c.contentDate ? { contentDate: c.contentDate } : {}),
      ...(c.contentDatePrecision ? { contentDatePrecision: c.contentDatePrecision } : {}),
      ...(c.contentDateLabel ? { contentDateLabel: c.contentDateLabel } : {}),
      ...(c.variant ? { variant: c.variant as CanvasVariant } : {}),
      createdAt: now,
      createdBy: opts.defaultAuthor,
      updatedAt: now,
      updatedBy: opts.defaultAuthor,
    };
    files.set(
      join(outDir, 'canvases', enc.id, 'meta.json'),
      Buffer.from(JSON.stringify(meta, null, 2) + '\n'),
    );
    files.set(join(outDir, 'canvases', enc.id, 'live.ydoc'), Buffer.from(enc.bytes));
  }

  // stories — meta.json + content.md (with canvas placeholders rewritten)
  input.stories.forEach((story, idx) => {
    const id = storyIds[idx]!;
    const rewritten = story.contentMd.replace(placeholderRe, (_m, key: string) => {
      // canvasKeyToId.has(key) was checked above
      return canvasKeyToId.get(key)!;
    });
    const meta: StoryMeta = {
      id,
      projectId,
      title: story.title,
      status: story.status ?? 'draft',
      language: story.language,
      ...(story.contentDate ? { contentDate: story.contentDate } : {}),
      ...(story.contentDatePrecision
        ? { contentDatePrecision: story.contentDatePrecision }
        : {}),
      ...(story.contentDateLabel ? { contentDateLabel: story.contentDateLabel } : {}),
      createdAt: now,
      createdBy: opts.defaultAuthor,
      updatedAt: now,
      updatedBy: opts.defaultAuthor,
    };
    files.set(
      join(outDir, 'stories', id, 'meta.json'),
      Buffer.from(JSON.stringify(meta, null, 2) + '\n'),
    );
    files.set(join(outDir, 'stories', id, 'content.md'), Buffer.from(rewritten));
  });

  let bytesWritten = 0;
  for (const [, buf] of files) bytesWritten += buf.byteLength;

  if (!opts.dryRun) {
    for (const [path, buf] of files) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, buf);
    }
  }

  // Bilingual coverage check — same rule the validate command
  // enforces. Authoring a single-language case is allowed but flagged,
  // so the user notices when they've forgotten the second language.
  const warnings: string[] = [];
  const langs = new Set(input.canvases.map((c) => c.language));
  if (!langs.has('en') || !langs.has('zh')) {
    const present = [...langs].sort().join(', ') || '(none)';
    warnings.push(
      `bilingual coverage: case has canvases only in language(s) [${present}]; PinGarden case-library convention requires both 'en' and 'zh'`,
    );
  }
  // Per-language story coverage — if a language has canvases, it
  // should have a matching story. Catches forgetting to translate
  // the long-form companion when adding a parallel canvas set.
  for (const lang of langs) {
    const hasStory = input.stories.some((s) => s.language === lang);
    if (!hasStory && input.stories.length > 0) {
      warnings.push(
        `story coverage: case has canvases tagged '${lang}' but no story in '${lang}'; library convention is one parallel story per language`,
      );
    }
  }

  return {
    slug: input.slug,
    outDir,
    filesWritten: [...files.keys()].map((p) => relative(outDir, p)).sort(),
    bytesWritten,
    canvasIds,
    storyIds,
    projectId,
    replaced: totalReplaced,
    dryRun: Boolean(opts.dryRun),
    warnings,
  };
}

// ─── case validate handler (pure) ────────────────────────────────────────────

export interface CaseValidateIssue {
  slug: string;
  level: 'error' | 'warn';
  message: string;
  path?: string;
}

export interface CaseValidateResult {
  caseLibraryDir: string;
  scannedSlugs: string[];
  ok: boolean;
  issues: CaseValidateIssue[];
}

const CaseJsonSchema = z.object({
  slug: z.string().min(1),
  version: z.number().int().positive().optional(),
  kind: CaseKindSchema,
  companyName: Localized,
  summary: Localized,
  tags: z.array(z.string()).default([]),
  sources: z.array(CaseSourceSchema).default([]),
  thumbnailDefId: z.string().optional(),
  projectId: z.string().min(1),
  canvasCount: z.number().int().nonnegative().optional(),
  storyCount: z.number().int().nonnegative().optional(),
  appliesPatterns: z.array(z.string().min(1)).optional(),
  appliesStrategyFrameworks: z.array(z.string().min(1)).optional(),
  appliesPatternSubtypes: z.record(z.string(), z.string().min(1)).optional(),
});

const LOCALIZED_CONTENT_DEF_IDS = new Set([
  'business-model-canvas',
  'value-proposition-canvas',
  'blue-ocean-strategy-canvas',
]);

function textStats(text: string): { cjk: number; latinWords: number; total: number } {
  const compact = text.replace(/\s+/g, '');
  return {
    cjk: compact.match(/[\u4e00-\u9fff]/g)?.length ?? 0,
    latinWords: text.match(/[A-Za-z][A-Za-z-]{3,}/g)?.length ?? 0,
    total: compact.length,
  };
}

function validateZhTextContent(
  slug: string,
  label: string,
  text: string,
  path: string,
  issues: CaseValidateIssue[],
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const stats = textStats(trimmed);
  const cjkRatio = stats.total === 0 ? 0 : stats.cjk / stats.total;
  if (stats.cjk < 4 && stats.latinWords >= 6) {
    issues.push({
      slug,
      level: 'error',
      message: `${label}: language='zh' but content appears untranslated (${stats.latinWords} English words, ${stats.cjk} Chinese chars)`,
      path,
    });
  } else if (stats.latinWords >= 12 && cjkRatio < 0.12) {
    issues.push({
      slug,
      level: 'warn',
      message: `${label}: language='zh' has low Chinese text ratio; inspect for mixed English content`,
      path,
    });
  }
}

function validateZhCanvasContent(
  slug: string,
  cid: string,
  defId: string | undefined,
  doc: Y.Doc,
  ydocPath: string,
  issues: CaseValidateIssue[],
) {
  if (!defId || !LOCALIZED_CONTENT_DEF_IDS.has(defId)) return;
  const texts: string[] = [];
  doc.getMap<Y.Map<unknown>>('stickies').forEach((value) => {
    const text = value.get('text');
    if (typeof text === 'string') texts.push(text);
  });
  validateZhTextContent(
    slug,
    `canvas ${cid} (${defId})`,
    texts.join(' '),
    ydocPath,
    issues,
  );
}

interface StorySupportProfile {
  label: string;
  terms: string[];
}

const STRATEGY_STORY_PROFILES: Record<string, StorySupportProfile> = {
  'blue-ocean-strategy': {
    label: 'Blue Ocean Strategy',
    terms: ['blue ocean', 'red ocean', 'errc', 'noncustomer', 'strategy canvas', 'value curve', '蓝海', '红海', '四步动作', '非顾客', '战略画布', '价值曲线'],
  },
  'business-model-environment-scan': {
    label: 'Business Model Environment Scan',
    terms: ['environment', 'trend', 'market forces', 'industry forces', 'macro', 'external forces', '环境', '趋势', '市场力量', '行业力量', '宏观', '外部力量'],
  },
  'business-model-portfolio-management': {
    label: 'Business Model Portfolio Management',
    terms: ['portfolio', 'portfolio map', 'explore', 'exploit', 'transfer', 'divest', '业务组合', '组合地图', '探索', '开发', '转入', '剥离'],
  },
  'innovation-metrics': {
    label: 'Innovation Metrics',
    terms: ['innovation metrics', 'evidence scorecard', 'evidence strength', 'learning velocity', 'risk reduction', '创新指标', '证据评分卡', '证据强度', '学习速度', '风险下降'],
  },
  'scenario-planning': {
    label: 'Scenario Planning',
    terms: ['scenario planning', 'scenario matrix', 'critical uncertainty', 'robust moves', 'early signals', '情景规划', '情景矩阵', '关键不确定性', '稳健动作', '早期信号'],
  },
  'platform-strategy': {
    label: 'Platform Strategy',
    terms: ['platform strategy', 'platform ecosystem', 'core interaction', 'network effects', 'governance', '平台战略', '平台生态', '核心交互', '网络效应', '治理'],
  },
};

const PATTERN_STORY_PROFILES: Record<string, StorySupportProfile> = {
  'long-tail': { label: 'Long Tail', terms: ['long tail', '长尾'] },
  'unbundling-business-models': { label: 'Unbundling Business Models', terms: ['unbundling', 'unbundle', '拆分', '解构'] },
  'multi-sided-platforms': { label: 'Multi-Sided Platforms', terms: ['multi-sided', 'platform', 'network effect', '多边', '平台', '网络效应'] },
  free: { label: 'Free', terms: ['free', 'freemium', 'ad-supported', 'bait-and-hook', '免费', '增值', '广告支持', '诱饵'] },
  'open-business-models': { label: 'Open Business Models', terms: ['open innovation', 'open business', 'outside-in', 'inside-out', '开放创新', '开放式', '由外而内', '由内而外'] },
  'from-closed-to-open-innovation': { label: 'From Closed to Open Innovation', terms: ['closed to open', 'open innovation', 'outside-in', 'inside-out', '封闭创新', '开放创新', '由外而内', '由内而外'] },
  'from-sales-to-platform': { label: 'From Sales to Platform', terms: ['sales to platform', 'platform', 'ecosystem', 'developer', '从销售到平台', '平台', '生态', '开发者'] },
  'from-transactional-to-recurring-revenue': { label: 'From Transactional to Recurring Revenue', terms: ['recurring revenue', 'subscription', 'retention', 'lifetime value', '经常性收入', '订阅', '留存', '生命周期价值'] },
};

function hasAnyTerm(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function validateStorySupport(
  slug: string,
  refs: string[] | undefined,
  profiles: Record<string, StorySupportProfile>,
  refKind: 'strategy framework' | 'pattern',
  allStoryText: string,
  issues: CaseValidateIssue[],
) {
  if (!refs?.length) return;
  const text = allStoryText.trim();
  for (const ref of refs) {
    const profile = profiles[ref];
    if (!profile) continue;
    if (!text || !hasAnyTerm(text, profile.terms)) {
      issues.push({
        slug,
        level: 'warn',
        message: `story support: ${refKind} '${ref}' is tagged but no story clearly explains ${profile.label}`,
      });
    }
  }
}

function extractEmbeddedCanvasIds(text: string): Set<string> {
  const out = new Set<string>();
  const re = /::canvas\[[^\]]+\]\{[^}]*canvasId="([^"]+)"[^}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const canvasId = match[1];
    if (canvasId) out.add(canvasId);
  }
  return out;
}

function validatePortfolioMapSupport(
  slug: string,
  refs: string[] | undefined,
  canvasDefIdsById: Map<string, string>,
  allStoryText: string,
  issues: CaseValidateIssue[],
) {
  if (!refs?.includes('business-model-portfolio-management')) return;
  const portfolioCanvasIds = [...canvasDefIdsById.entries()]
    .filter(([, defId]) => defId === 'portfolio-map')
    .map(([id]) => id);
  if (portfolioCanvasIds.length === 0) {
    issues.push({
      slug,
      level: 'warn',
      message: "portfolio support: business-model-portfolio-management is tagged but the case has no portfolio-map canvas",
    });
    return;
  }
  const embedded = extractEmbeddedCanvasIds(allStoryText);
  if (!portfolioCanvasIds.some((id) => embedded.has(id))) {
    issues.push({
      slug,
      level: 'warn',
      message: "portfolio support: case has portfolio-map canvas but no story embeds it with ::canvas[portfolio-map]",
    });
  }
}

export async function caseValidateHandler(args: {
  caseLibraryDir: string;
  slug?: string;
}): Promise<CaseValidateResult> {
  const issues: CaseValidateIssue[] = [];
  const root = resolve(args.caseLibraryDir);

  if (!existsSync(root)) {
    throw new CliError(
      'BAD_INPUT',
      `Case library directory not found: ${root}`,
      'Pass --case-library-dir <path>, or run from inside the PinGarden repo.',
    );
  }

  // Read manifest.json (one level up from cases/)
  const manifestPath = join(root, '..', 'manifest.json');
  let manifestSlugs: string[] = [];
  let manifestPatternSlugs: string[] = [];
  let manifestStrategyFrameworkSlugs: string[] = [];
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        cases?: Array<{ slug: string }>;
        patterns?: Array<{ slug: string }>;
        strategyFrameworks?: Array<{ slug: string }>;
      };
      manifestSlugs = (manifest.cases ?? []).map((c) => c.slug);
      manifestPatternSlugs = (manifest.patterns ?? []).map((p) => p.slug);
      manifestStrategyFrameworkSlugs = (manifest.strategyFrameworks ?? []).map((f) => f.slug);
      const seen = new Set<string>();
      for (const s of manifestSlugs) {
        if (seen.has(s)) {
          issues.push({
            slug: s,
            level: 'error',
            message: `Duplicate slug '${s}' in manifest.json`,
            path: manifestPath,
          });
        }
        seen.add(s);
      }
      const seenPattern = new Set<string>();
      for (const s of manifestPatternSlugs) {
        if (seenPattern.has(s)) {
          issues.push({
            slug: s,
            level: 'error',
            message: `Duplicate pattern slug '${s}' in manifest.json`,
            path: manifestPath,
          });
        }
        seenPattern.add(s);
      }
      const seenFramework = new Set<string>();
      for (const s of manifestStrategyFrameworkSlugs) {
        if (seenFramework.has(s)) {
          issues.push({
            slug: s,
            level: 'error',
            message: `Duplicate strategy framework slug '${s}' in manifest.json`,
            path: manifestPath,
          });
        }
        seenFramework.add(s);
      }
    } catch (err) {
      issues.push({
        slug: '<manifest>',
        level: 'error',
        message: `Could not parse manifest.json: ${(err as Error).message}`,
        path: manifestPath,
      });
    }
  } else {
    issues.push({
      slug: '<manifest>',
      level: 'warn',
      message: 'manifest.json not found at expected location',
      path: manifestPath,
    });
  }

  // Discover slugs on disk
  const casesOnDisk = existsSync(root)
    ? readdirSync(root).filter((entry) => {
        const full = join(root, entry);
        return statSync(full).isDirectory() && existsSync(join(full, 'case.json'));
      })
    : [];

  // Patterns live as a sibling directory to cases (../patterns/<slug>/).
  const patternsRoot = join(root, '..', 'patterns');
  const patternsOnDisk = existsSync(patternsRoot)
    ? readdirSync(patternsRoot).filter((entry) => {
        const full = join(patternsRoot, entry);
        return statSync(full).isDirectory() && existsSync(join(full, 'pattern.json'));
      })
    : [];

  // Strategy frameworks live as another sibling directory to cases.
  const strategyFrameworksRoot = join(root, '..', 'strategy-frameworks');
  const strategyFrameworksOnDisk = existsSync(strategyFrameworksRoot)
    ? readdirSync(strategyFrameworksRoot).filter((entry) => {
        const full = join(strategyFrameworksRoot, entry);
        return statSync(full).isDirectory() && existsSync(join(full, 'framework.json'));
      })
    : [];

  // Cross-check: every manifest slug must have a corresponding case dir
  for (const s of manifestSlugs) {
    if (!casesOnDisk.includes(s)) {
      issues.push({
        slug: s,
        level: 'error',
        message: `Manifest references slug '${s}' but no case.json found at cases/${s}/`,
      });
    }
  }
  // Reverse: case dirs not in manifest are warnings (orphaned content)
  for (const s of casesOnDisk) {
    if (manifestSlugs.length > 0 && !manifestSlugs.includes(s)) {
      issues.push({
        slug: s,
        level: 'warn',
        message: `Case directory '${s}' is not listed in manifest.json (will not be loaded by server)`,
      });
    }
  }

  // Same orphan / dangling check for patterns.
  for (const s of manifestPatternSlugs) {
    if (!patternsOnDisk.includes(s)) {
      issues.push({
        slug: s,
        level: 'error',
        message: `Manifest references pattern '${s}' but no pattern.json found at patterns/${s}/`,
      });
    }
  }
  for (const s of patternsOnDisk) {
    if (manifestPatternSlugs.length > 0 && !manifestPatternSlugs.includes(s)) {
      issues.push({
        slug: s,
        level: 'warn',
        message: `Pattern directory '${s}' is not listed in manifest.json (will not be loaded by server)`,
      });
    }
  }

  // Same orphan / dangling check for strategy frameworks.
  for (const s of manifestStrategyFrameworkSlugs) {
    if (!strategyFrameworksOnDisk.includes(s)) {
      issues.push({
        slug: s,
        level: 'error',
        message: `Manifest references strategy framework '${s}' but no framework.json found at strategy-frameworks/${s}/`,
      });
    }
  }
  for (const s of strategyFrameworksOnDisk) {
    if (manifestStrategyFrameworkSlugs.length > 0 && !manifestStrategyFrameworkSlugs.includes(s)) {
      issues.push({
        slug: s,
        level: 'warn',
        message: `Strategy framework directory '${s}' is not listed in manifest.json (will not be loaded by server)`,
      });
    }
  }

  // Validate each pattern bundle's structural shape + cross-references back
  // to cases. Failure to resolve an example slug is a hard error: a dangling
  // example breaks the UI's "examples strip" silently otherwise.
  for (const slug of patternsOnDisk) {
    validateOnePattern(patternsRoot, slug, manifestSlugs, issues);
  }

  for (const slug of strategyFrameworksOnDisk) {
    validateOneStrategyFramework(strategyFrameworksRoot, slug, manifestSlugs, issues);
  }

  // Build a slug → subtype-id-set index from each pattern.json so the
  // case-side validator can verify `appliesPatternSubtypes[slug]` resolves
  // to a real subtype on the referenced pattern.
  const patternSubtypeIndex = buildPatternSubtypeIndex(patternsRoot, patternsOnDisk);

  const targets = args.slug ? [args.slug] : casesOnDisk;
  for (const slug of targets) {
    validateOneCase(root, slug, issues);
    // Cross-validate: every appliesPatterns[] slug on this case must
    // resolve to a manifested pattern. Catches the "I forgot to author
    // the pattern entry" footgun the unbundling slug-rename was prompted by.
    validateAppliesPatterns(root, slug, manifestPatternSlugs, patternSubtypeIndex, issues);
    validateAppliesStrategyFrameworks(root, slug, manifestStrategyFrameworkSlugs, issues);
  }

  const errorCount = issues.filter((i) => i.level === 'error').length;
  return {
    caseLibraryDir: root,
    scannedSlugs: targets,
    ok: errorCount === 0,
    issues,
  };
}

function validateOneCase(root: string, slug: string, issues: CaseValidateIssue[]) {
  const caseDir = join(root, slug);
  if (!existsSync(caseDir)) {
    issues.push({ slug, level: 'error', message: `Case directory not found: ${caseDir}` });
    return;
  }

  const caseJsonPath = join(caseDir, 'case.json');
  if (!existsSync(caseJsonPath)) {
    issues.push({ slug, level: 'error', message: 'case.json missing', path: caseJsonPath });
    return;
  }

  let caseJson: z.infer<typeof CaseJsonSchema>;
  try {
    const parsed = CaseJsonSchema.safeParse(JSON.parse(readFileSync(caseJsonPath, 'utf8')));
    if (!parsed.success) {
      issues.push({
        slug,
        level: 'error',
        message: `case.json schema invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        path: caseJsonPath,
      });
      return;
    }
    caseJson = parsed.data;
  } catch (err) {
    issues.push({
      slug,
      level: 'error',
      message: `case.json parse failed: ${(err as Error).message}`,
      path: caseJsonPath,
    });
    return;
  }

  if (caseJson.slug !== slug) {
    issues.push({
      slug,
      level: 'error',
      message: `case.json slug '${caseJson.slug}' does not match directory name '${slug}'`,
      path: caseJsonPath,
    });
  }

  // project file
  const projectFile = join(caseDir, 'projects', `${caseJson.projectId}.json`);
  if (!existsSync(projectFile)) {
    issues.push({
      slug,
      level: 'error',
      message: `Project file missing: projects/${caseJson.projectId}.json`,
      path: projectFile,
    });
  } else {
    try {
      JSON.parse(readFileSync(projectFile, 'utf8'));
    } catch (err) {
      issues.push({
        slug,
        level: 'error',
        message: `Project file unparseable: ${(err as Error).message}`,
        path: projectFile,
      });
    }
  }

  // canvases
  const canvasesDir = join(caseDir, 'canvases');
  const canvasIds = existsSync(canvasesDir)
    ? readdirSync(canvasesDir).filter((d) => statSync(join(canvasesDir, d)).isDirectory())
    : [];
  const canvasDefIdsById = new Map<string, string>();
  if (caseJson.canvasCount !== undefined && canvasIds.length !== caseJson.canvasCount) {
    issues.push({
      slug,
      level: 'warn',
      message: `case.json canvasCount=${caseJson.canvasCount} but ${canvasIds.length} canvas directories exist`,
    });
  }
  for (const cid of canvasIds) {
    const cdir = join(canvasesDir, cid);
    const metaPath = join(cdir, 'meta.json');
    const ydocPath = join(cdir, 'live.ydoc');
    let canvasMeta: { defId?: string; language?: string } | undefined;
    if (!existsSync(metaPath)) {
      issues.push({ slug, level: 'error', message: `canvas ${cid}: meta.json missing`, path: metaPath });
    } else {
      try {
        canvasMeta = JSON.parse(readFileSync(metaPath, 'utf8')) as {
          defId?: string;
          language?: string;
        };
        if (canvasMeta.defId) canvasDefIdsById.set(cid, canvasMeta.defId);
      } catch (err) {
        issues.push({
          slug,
          level: 'error',
          message: `canvas ${cid}: meta.json unparseable: ${(err as Error).message}`,
          path: metaPath,
        });
      }
    }
    if (!existsSync(ydocPath)) {
      issues.push({ slug, level: 'error', message: `canvas ${cid}: live.ydoc missing`, path: ydocPath });
    } else {
      // Decode test — apply the update to a fresh Y.Doc and ensure no throw.
      try {
        const buf = readFileSync(ydocPath);
        const doc = new Y.Doc();
        try {
          Y.applyUpdate(doc, new Uint8Array(buf));
          if (canvasMeta?.language === 'zh') {
            validateZhCanvasContent(slug, cid, canvasMeta.defId, doc, ydocPath, issues);
          }
        } finally {
          doc.destroy();
        }
      } catch (err) {
        issues.push({
          slug,
          level: 'error',
          message: `canvas ${cid}: live.ydoc Y.applyUpdate failed: ${(err as Error).message}`,
          path: ydocPath,
        });
      }
    }
  }

  // stories
  const storiesDir = join(caseDir, 'stories');
  const storyIds = existsSync(storiesDir)
    ? readdirSync(storiesDir).filter((d) => statSync(join(storiesDir, d)).isDirectory())
    : [];
  if (caseJson.storyCount !== undefined && storyIds.length !== caseJson.storyCount) {
    issues.push({
      slug,
      level: 'warn',
      message: `case.json storyCount=${caseJson.storyCount} but ${storyIds.length} story directories exist`,
    });
  }
  const storyTexts: string[] = [];
  for (const sid of storyIds) {
    const sdir = join(storiesDir, sid);
    const metaPath = join(sdir, 'meta.json');
    const contentPath = join(sdir, 'content.md');
    let storyMeta: { language?: string } | undefined;
    if (!existsSync(metaPath)) {
      issues.push({ slug, level: 'error', message: `story ${sid}: meta.json missing`, path: metaPath });
    } else {
      try {
        storyMeta = JSON.parse(readFileSync(metaPath, 'utf8')) as { language?: string };
      } catch (err) {
        issues.push({
          slug,
          level: 'error',
          message: `story ${sid}: meta.json unparseable: ${(err as Error).message}`,
          path: metaPath,
        });
      }
    }
    if (!existsSync(contentPath)) {
      issues.push({ slug, level: 'error', message: `story ${sid}: content.md missing`, path: contentPath });
    } else {
      const content = readFileSync(contentPath, 'utf8');
      storyTexts.push(content);
      if (storyMeta?.language === 'zh') {
        validateZhTextContent(
          slug,
          `story ${sid}`,
          content,
          contentPath,
          issues,
        );
      }
    }
  }
  const allStoryText = storyTexts.join('\n\n');
  validateStorySupport(
    slug,
    caseJson.appliesStrategyFrameworks,
    STRATEGY_STORY_PROFILES,
    'strategy framework',
    allStoryText,
    issues,
  );
  validateStorySupport(
    slug,
    caseJson.appliesPatterns,
    PATTERN_STORY_PROFILES,
    'pattern',
    allStoryText,
    issues,
  );
  validatePortfolioMapSupport(
    slug,
    caseJson.appliesStrategyFrameworks,
    canvasDefIdsById,
    allStoryText,
    issues,
  );

  // Bilingual coverage — every shipped case must have canvases in both
  // `en` and `zh`. Missing either language is a packaging error.
  const canvasLangs = new Set<string>();
  for (const cid of canvasIds) {
    const metaPath = join(canvasesDir, cid, 'meta.json');
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { language?: string };
      if (typeof meta.language === 'string') canvasLangs.add(meta.language);
    } catch {
      // already reported above as an error
    }
  }
  if (canvasIds.length > 0 && (!canvasLangs.has('en') || !canvasLangs.has('zh'))) {
    const present = [...canvasLangs].sort().join(', ') || '(none)';
    issues.push({
      slug,
      level: 'error',
      message: `bilingual coverage: case has canvases only in language(s) [${present}]; PinGarden case-library convention requires both 'en' and 'zh'`,
    });
  }

  // Per-language story coverage — when stories are present every
  // canvas language should also have a matching story (the convention
  // is parallel EN + ZH stories per case). Untagged stories
  // (pre-2026-06-12 schema) are surfaced as their own warn so users
  // patch them up to the new shape.
  const storyLangs = new Map<string, number>();
  let untaggedStories = 0;
  for (const sid of storyIds) {
    const metaPath = join(storiesDir, sid, 'meta.json');
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { language?: string };
      if (typeof meta.language === 'string') {
        storyLangs.set(meta.language, (storyLangs.get(meta.language) ?? 0) + 1);
      } else {
        untaggedStories += 1;
      }
    } catch {
      // already reported above as an error
    }
  }
  if (untaggedStories > 0) {
    issues.push({
      slug,
      level: 'warn',
      message: `story language: ${untaggedStories} story/stories missing the 'language' field; PinGarden case-library convention requires it on every case story`,
    });
  }
  if (storyIds.length > 0) {
    for (const lang of canvasLangs) {
      if (!storyLangs.has(lang)) {
        issues.push({
          slug,
          level: 'warn',
          message: `story coverage: canvases tagged '${lang}' have no matching story in '${lang}'`,
        });
      }
    }
  }
}

/**
 * Validate one pattern bundle on disk:
 *   - pattern.json parses + has the required fields
 *   - description.{en,zh}.md both exist (bilingual hard rule)
 *   - skill.{en,zh}.md missing → warn only (skill generator falls back
 *     to a snippet of description; same fallback story as canvas skill)
 *   - examples[].slug all resolve to known case slugs in the manifest
 */
function validateOnePattern(
  patternsRoot: string,
  slug: string,
  manifestCaseSlugs: string[],
  issues: CaseValidateIssue[],
) {
  const dir = join(patternsRoot, slug);
  const patternJsonPath = join(dir, 'pattern.json');
  if (!existsSync(patternJsonPath)) {
    issues.push({ slug, level: 'error', message: `Pattern missing pattern.json`, path: patternJsonPath });
    return;
  }
  let pattern: {
    slug?: string;
    name?: { en?: string; zh?: string };
    summary?: { en?: string; zh?: string };
    examples?: Array<{ slug?: string }>;
    subtypes?: Array<{
      id?: string;
      name?: { en?: string; zh?: string };
      summary?: { en?: string; zh?: string };
      examples?: Array<{ slug?: string }>;
    }>;
  };
  try {
    pattern = JSON.parse(readFileSync(patternJsonPath, 'utf8'));
  } catch (err) {
    issues.push({ slug, level: 'error', message: `pattern.json parse failed: ${(err as Error).message}`, path: patternJsonPath });
    return;
  }
  if (pattern.slug && pattern.slug !== slug) {
    issues.push({ slug, level: 'error', message: `pattern.json slug='${pattern.slug}' does not match directory name '${slug}'` });
  }
  if (!pattern.name?.en || !pattern.name?.zh) {
    issues.push({ slug, level: 'error', message: `pattern.json must carry bilingual name (en + zh)` });
  }
  if (!pattern.summary?.en || !pattern.summary?.zh) {
    issues.push({ slug, level: 'error', message: `pattern.json must carry bilingual summary (en + zh)` });
  }
  for (const lang of ['en', 'zh'] as const) {
    if (!existsSync(join(dir, `description.${lang}.md`))) {
      issues.push({ slug, level: 'error', message: `Missing description.${lang}.md (bilingual descriptions are required)` });
    }
    if (!existsSync(join(dir, `skill.${lang}.md`))) {
      issues.push({
        slug,
        level: 'warn',
        message: `Missing skill.${lang}.md — skill generator will fall back to description.${lang}.md`,
      });
    }
  }
  for (const ex of pattern.examples ?? []) {
    if (!ex.slug) {
      issues.push({ slug, level: 'error', message: `examples[] entry missing slug` });
      continue;
    }
    if (manifestCaseSlugs.length > 0 && !manifestCaseSlugs.includes(ex.slug)) {
      issues.push({
        slug,
        level: 'error',
        message: `examples references unknown case '${ex.slug}' — add it to manifest.json or remove the reference`,
      });
    }
  }
  // Subtype validation. Each subtype must carry id + bilingual name +
  // bilingual summary; ids must be unique within the pattern; and every
  // subtype example slug must resolve to a manifested case (same rule as
  // the top-level examples list).
  const seenSubtypeIds = new Set<string>();
  for (const st of pattern.subtypes ?? []) {
    if (!st.id) {
      issues.push({ slug, level: 'error', message: `subtypes[] entry missing id` });
      continue;
    }
    if (seenSubtypeIds.has(st.id)) {
      issues.push({ slug, level: 'error', message: `subtypes[] duplicate id '${st.id}'` });
    }
    seenSubtypeIds.add(st.id);
    if (!st.name?.en || !st.name?.zh) {
      issues.push({ slug, level: 'error', message: `subtype '${st.id}' must carry bilingual name (en + zh)` });
    }
    if (!st.summary?.en || !st.summary?.zh) {
      issues.push({ slug, level: 'error', message: `subtype '${st.id}' must carry bilingual summary (en + zh)` });
    }
    for (const ex of st.examples ?? []) {
      if (!ex.slug) {
        issues.push({ slug, level: 'error', message: `subtype '${st.id}' examples[] entry missing slug` });
        continue;
      }
      if (manifestCaseSlugs.length > 0 && !manifestCaseSlugs.includes(ex.slug)) {
        issues.push({
          slug,
          level: 'error',
          message: `subtype '${st.id}' references unknown case '${ex.slug}' — add it to manifest.json or remove the reference`,
        });
      }
    }
  }
}

/**
 * Cross-check that every `appliesPatterns[]` entry on a case resolves
 * to a manifested pattern. The 0.2.x → 0.3.0 unbundling slug rename
 * (`unbundling` → `unbundling-business-models`) was prompted by exactly
 * this kind of dangling reference; this validator makes it impossible
 * to ship that footgun again.
 *
 * Also cross-checks `appliesPatternSubtypes` (introduced for the Free
 * pattern's three flavors): every key must appear in `appliesPatterns[]`,
 * and every value must resolve to a `subtypes[].id` declared on the
 * referenced pattern's `pattern.json`. A dangling subtype id silently
 * degrades to "no subtype" in the chip render — catching it at validate
 * time keeps that drift impossible.
 */
function validateOneStrategyFramework(
  frameworksRoot: string,
  slug: string,
  manifestCaseSlugs: string[],
  issues: CaseValidateIssue[],
) {
  const dir = join(frameworksRoot, slug);
  const frameworkJsonPath = join(dir, 'framework.json');
  if (!existsSync(frameworkJsonPath)) {
    issues.push({ slug, level: 'error', message: `Strategy framework missing framework.json`, path: frameworkJsonPath });
    return;
  }
  let framework: {
    slug?: string;
    name?: { en?: string; zh?: string };
    summary?: { en?: string; zh?: string };
    examples?: Array<{ slug?: string }>;
  };
  try {
    framework = JSON.parse(readFileSync(frameworkJsonPath, 'utf8'));
  } catch (err) {
    issues.push({ slug, level: 'error', message: `framework.json parse failed: ${(err as Error).message}`, path: frameworkJsonPath });
    return;
  }
  if (framework.slug && framework.slug !== slug) {
    issues.push({ slug, level: 'error', message: `framework.json slug='${framework.slug}' does not match directory name '${slug}'` });
  }
  if (!framework.name?.en || !framework.name?.zh) {
    issues.push({ slug, level: 'error', message: `framework.json must carry bilingual name (en + zh)` });
  }
  if (!framework.summary?.en || !framework.summary?.zh) {
    issues.push({ slug, level: 'error', message: `framework.json must carry bilingual summary (en + zh)` });
  }
  for (const lang of ['en', 'zh'] as const) {
    if (!existsSync(join(dir, `description.${lang}.md`))) {
      issues.push({ slug, level: 'error', message: `Missing description.${lang}.md (bilingual descriptions are required)` });
    }
    if (!existsSync(join(dir, `skill.${lang}.md`))) {
      issues.push({
        slug,
        level: 'warn',
        message: `Missing skill.${lang}.md — skill generator will fall back to description.${lang}.md`,
      });
    }
  }
  for (const ex of framework.examples ?? []) {
    if (!ex.slug) {
      issues.push({ slug, level: 'error', message: `examples[] entry missing slug` });
      continue;
    }
    if (manifestCaseSlugs.length > 0 && !manifestCaseSlugs.includes(ex.slug)) {
      issues.push({
        slug,
        level: 'error',
        message: `examples references unknown case '${ex.slug}' — add it to manifest.json or remove the reference`,
      });
    }
  }
}

function validateAppliesPatterns(
  root: string,
  slug: string,
  manifestPatternSlugs: string[],
  patternSubtypeIndex: Map<string, Set<string>>,
  issues: CaseValidateIssue[],
) {
  const caseJsonPath = join(root, slug, 'case.json');
  if (!existsSync(caseJsonPath)) return; // separate validator already reported
  let parsed: { appliesPatterns?: string[]; appliesPatternSubtypes?: Record<string, string> };
  try {
    parsed = JSON.parse(readFileSync(caseJsonPath, 'utf8'));
  } catch {
    return;
  }
  for (const ref of parsed.appliesPatterns ?? []) {
    if (manifestPatternSlugs.length > 0 && !manifestPatternSlugs.includes(ref)) {
      issues.push({
        slug,
        level: 'error',
        message: `appliesPatterns references unknown pattern '${ref}' — author the pattern at patterns/${ref}/ or remove the reference`,
        path: caseJsonPath,
      });
    }
  }
  // Subtype refinement check.
  const appliedSet = new Set(parsed.appliesPatterns ?? []);
  for (const [patternSlug, subtypeId] of Object.entries(parsed.appliesPatternSubtypes ?? {})) {
    if (!appliedSet.has(patternSlug)) {
      issues.push({
        slug,
        level: 'error',
        message: `appliesPatternSubtypes refines pattern '${patternSlug}' but that slug is not in appliesPatterns[] — add '${patternSlug}' to appliesPatterns or drop the subtype refinement`,
        path: caseJsonPath,
      });
      continue;
    }
    const known = patternSubtypeIndex.get(patternSlug);
    if (known && known.size > 0 && !known.has(subtypeId)) {
      issues.push({
        slug,
        level: 'error',
        message: `appliesPatternSubtypes['${patternSlug}']='${subtypeId}' does not match any subtypes[].id on pattern '${patternSlug}' (known: ${[...known].sort().join(', ')})`,
        path: caseJsonPath,
      });
    } else if (!known) {
      // The pattern has no `subtypes[]` declared at all. Refining a
      // subtype on a pattern that doesn't sub-type itself is meaningless.
      issues.push({
        slug,
        level: 'error',
        message: `appliesPatternSubtypes refines pattern '${patternSlug}' but that pattern declares no subtypes[] — drop the refinement, or author the subtype on the pattern`,
        path: caseJsonPath,
      });
    }
  }
}

function validateAppliesStrategyFrameworks(
  root: string,
  slug: string,
  manifestStrategyFrameworkSlugs: string[],
  issues: CaseValidateIssue[],
) {
  const caseJsonPath = join(root, slug, 'case.json');
  if (!existsSync(caseJsonPath)) return;
  let parsed: { appliesStrategyFrameworks?: string[] };
  try {
    parsed = JSON.parse(readFileSync(caseJsonPath, 'utf8'));
  } catch {
    return;
  }
  for (const ref of parsed.appliesStrategyFrameworks ?? []) {
    if (
      manifestStrategyFrameworkSlugs.length > 0 &&
      !manifestStrategyFrameworkSlugs.includes(ref)
    ) {
      issues.push({
        slug,
        level: 'error',
        message: `appliesStrategyFrameworks references unknown strategy framework '${ref}' — author the framework at strategy-frameworks/${ref}/ or remove the reference`,
        path: caseJsonPath,
      });
    }
  }
}

/**
 * Read every `pattern.json` once and produce a slug → set-of-subtype-ids
 * index. Only patterns that DECLARE `subtypes[]` get a populated set;
 * patterns without subtyping return undefined from `.get(slug)` so the
 * case-side validator can distinguish "subtype declared but unknown id"
 * from "no subtypes on this pattern at all".
 */
function buildPatternSubtypeIndex(
  patternsRoot: string,
  slugs: string[],
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const slug of slugs) {
    const patternJsonPath = join(patternsRoot, slug, 'pattern.json');
    if (!existsSync(patternJsonPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(patternJsonPath, 'utf8')) as {
        subtypes?: Array<{ id?: string }>;
      };
      const ids = new Set<string>();
      for (const st of parsed.subtypes ?? []) {
        if (typeof st.id === 'string' && st.id.length > 0) ids.add(st.id);
      }
      if (ids.size > 0) out.set(slug, ids);
    } catch {
      // pattern.json parse failure already surfaced by validateOnePattern.
    }
  }
  return out;
}

// ─── default case-library dir resolution ─────────────────────────────────────

function discoverCaseLibraryDir(override?: string): string {
  if (override) {
    if (!existsSync(override)) {
      throw new CliError('BAD_INPUT', `Case library dir not found: ${override}`);
    }
    return resolve(override);
  }
  // Walk up from cwd looking for `packages/case-library/cases`
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'case-library', 'cases');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new CliError(
    'BAD_INPUT',
    'Could not locate packages/case-library/cases',
    'Pass --case-library-dir <path>, or run from inside the PinGarden repo.',
  );
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class CaseAuthorCommand extends BaseCommand {
  static override paths = [['case', 'author']];
  static override usage = BaseCommand.Usage({
    description: 'Author a case-library entry from a JSON spec → full directory tree (case.json + projects + canvases + stories)',
    details: `
      Reads a JSON spec describing a case (slug, kind, company name,
      summary, tags, sources, plus an array of canvases with their
      stickies/pins/legend, and an array of stories) and produces a
      complete \`packages/case-library/cases/<slug>/\` directory.

      Canvas Yjs binaries (\`live.ydoc\`) are encoded by the same
      shared encoder the server uses for \`POST /objects/bulk\`, so the
      output round-trips through the runtime exactly the same as
      user-created canvases.

      Stories may reference canvases declared above by their \`key\`:
      \`{{canvas:bmc}}\` placeholders are rewritten to the real canvas
      UUID before content.md is written.

      Use \`--now <iso>\` and pre-set \`id\` fields on canvas/story/project
      to make output byte-stable across rebuilds (handy for CI checks).
    `,
    examples: [
      ['Author a new case', '$0 case author --from spec.json --out packages/case-library/cases/tesla'],
      ['Dry-run / validate input', '$0 case author --from spec.json --out /tmp/x --dry-run --json'],
    ],
  });

  from = Option.String('--from', { required: true, description: 'Path to author spec JSON (or "-" for stdin)' });
  out = Option.String('--out', { required: true, description: 'Target directory (case slug subdir)' });
  bundles = Option.String('--bundles', { description: 'Override canvas bundles dir (defaults to packages/canvases)' });
  now = Option.String('--now', { description: 'Pin the timestamp for byte-stable output (ISO 8601)' });
  dryRun = Option.Boolean('--dry-run', false, { description: 'Validate + log without writing files' });
  force = Option.Boolean('--force', false, { description: 'Overwrite non-empty target directory' });

  protected async run() {
    const { readJsonInput } = await import('../lib/input.js');
    const raw = await readJsonInput(this.from);
    const bundlesDir = discoverBundlesDir({ override: this.bundles });
    const author = this.as ?? 'PinGarden Library';

    const result = await caseAuthorHandler(raw, {
      outDir: this.out,
      bundlesDir,
      defaultAuthor: author,
      now: this.now,
      dryRun: this.dryRun,
      force: this.force,
    });

    const output = (await import('../lib/output.js')).createOutput(this.json);
    output.print(result, (r) => {
      const tag = r.dryRun ? pc.yellow('[dry-run]') : pc.green('✓');
      const lines = [
        `${tag} authored case '${r.slug}' → ${r.outDir}`,
        `  project ${r.projectId}`,
        `  canvases ${r.canvasIds.length}  (stickies ${r.replaced.stickies}, pins ${r.replaced.pins}, pinClasses ${r.replaced.pinClasses}, xAxisItems ${r.replaced.xAxisItems}, colorLegend ${r.replaced.colorLegend})`,
        `  stories  ${r.storyIds.length}`,
        `  files    ${r.filesWritten.length}  (${(r.bytesWritten / 1024).toFixed(1)} KB)`,
      ];
      for (const w of r.warnings) {
        lines.push(`  ${pc.yellow('warn')}  ${w}`);
      }
      return lines.join('\n');
    });
  }
}

export class CaseValidateCommand extends BaseCommand {
  static override paths = [['case', 'validate']];
  static override usage = BaseCommand.Usage({
    description: 'Validate the case-library directory: schemas, manifest consistency, ydoc decodability',
    details: `
      Pure filesystem check — does not contact the server. Used by CI
      and \`scripts/package-mac.sh\` as a gate against shipping a
      broken case library. Run without arguments to scan every case
      that lives under \`packages/case-library/cases/\`; pass a slug
      to validate just one.

      Errors fail with exit code 1 (e.g. missing files, broken ydoc,
      schema mismatch). Warnings (e.g. orphaned case directories not
      in manifest, count mismatches) report but do not fail.
    `,
    examples: [
      ['Validate everything', '$0 case validate'],
      ['Validate one case',  '$0 case validate swiss-private-banking'],
    ],
  });

  slug = Option.String({ required: false });
  caseLibraryDir = Option.String('--case-library-dir', {
    description: 'Override the case library cases/ directory',
  });
  all = Option.Boolean('--all', false, {
    description: 'Validate every case (default behaviour when no slug is passed)',
  });

  protected async run() {
    void this.all; // accepted but no-op when slug is absent
    const dir = discoverCaseLibraryDir(this.caseLibraryDir);
    const result = await caseValidateHandler({
      caseLibraryDir: dir,
      slug: this.slug,
    });

    const output = (await import('../lib/output.js')).createOutput(this.json);
    output.print(result, (r) => {
      const errors = r.issues.filter((i) => i.level === 'error');
      const warns = r.issues.filter((i) => i.level === 'warn');
      const lines = [
        r.ok
          ? pc.green(`✓ case-library valid (scanned ${r.scannedSlugs.length} case${r.scannedSlugs.length === 1 ? '' : 's'})`)
          : pc.red(`✗ case-library has ${errors.length} error${errors.length === 1 ? '' : 's'}`),
      ];
      for (const e of errors) {
        lines.push(`  ${pc.red('error')} [${e.slug}] ${e.message}`);
        if (e.path) lines.push(`           ${pc.dim(e.path)}`);
      }
      for (const w of warns) {
        lines.push(`  ${pc.yellow('warn')}  [${w.slug}] ${w.message}`);
        if (w.path) lines.push(`           ${pc.dim(w.path)}`);
      }
      return lines.join('\n');
    });

    return result.ok ? 0 : 1;
  }
}
