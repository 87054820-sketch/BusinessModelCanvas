import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BusinessModelPattern,
  CanvasDef,
  CanvasI18n,
  Experiment,
  Lang,
} from '@pingarden/shared';

/**
 * Bundle-reading helpers used by the skill generator. Kept separate
 * from the templates so the read shape can evolve without churning
 * Markdown output.
 */

export interface CanvasBundle {
  id: string;
  manifest: CanvasDef;
  i18n: { en: CanvasI18n; zh: CanvasI18n };
  knowledge: {
    intro: { en?: string; zh?: string };
    blocks: Record<string, { en?: string; zh?: string }>;
  };
  /**
   * Optional curated TL;DR + fill-order + anti-patterns. Read from
   * `<bundle>/skill.{en,zh}.md` if present. Authored by humans in
   * Phase 5 — generator falls back gracefully when missing.
   */
  curated: { en?: string; zh?: string };
}

export function readBundle(bundlesDir: string, id: string): CanvasBundle | null {
  const dir = join(bundlesDir, id);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CanvasDef;

  const i18nEn = readJsonOrFallback<CanvasI18n>(join(dir, 'i18n', 'en.json'), {
    canvasTitle: manifest.name.en,
    blocks: {},
  });
  const i18nZh = readJsonOrFallback<CanvasI18n>(join(dir, 'i18n', 'zh.json'), {
    canvasTitle: manifest.name.zh,
    blocks: {},
  });

  const intro: CanvasBundle['knowledge']['intro'] = {
    en: readMarkdownOrUndefined(join(dir, 'knowledge', 'intro.en.md')),
    zh: readMarkdownOrUndefined(join(dir, 'knowledge', 'intro.zh.md')),
  };

  const blocks: CanvasBundle['knowledge']['blocks'] = {};
  for (const zone of manifest.zones) {
    const en = readMarkdownOrUndefined(
      join(dir, 'knowledge', 'blocks', `${zone.id}.en.md`),
    );
    const zh = readMarkdownOrUndefined(
      join(dir, 'knowledge', 'blocks', `${zone.id}.zh.md`),
    );
    if (en !== undefined || zh !== undefined) {
      const entry: { en?: string; zh?: string } = {};
      if (en !== undefined) entry.en = en;
      if (zh !== undefined) entry.zh = zh;
      blocks[zone.id] = entry;
    }
  }

  const curated: CanvasBundle['curated'] = {
    en: readMarkdownOrUndefined(join(dir, 'skill.en.md')),
    zh: readMarkdownOrUndefined(join(dir, 'skill.zh.md')),
  };

  return { id, manifest, i18n: { en: i18nEn, zh: i18nZh }, knowledge: { intro, blocks }, curated };
}

function readJsonOrFallback<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function readMarkdownOrUndefined(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, 'utf8');
}

/**
 * Pull the first 1–2 complete sentences (period-bounded) from a
 * markdown body. Used for the per-block Quality bar bullet, which
 * should fit comfortably on one screen line in an AI's context window.
 *
 * Sentence delimiters: `.`, `!`, `?`, `。`, `！`, `？`. We greedily
 * concatenate sentences until adding the next one would exceed
 * `softCapChars` — but always include at least the first sentence
 * (no mid-sentence truncation).
 *
 * Bullet / numbered-list lines and headings are skipped so we don't
 * splice a "1. foo" fragment without context.
 */
export function firstSentencesFromMarkdown(
  md: string | undefined,
  softCapChars = 120,
): string {
  if (!md) return '';

  const usefulLines: string[] = [];
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('![')) continue;
    if (line.startsWith('>')) continue;
    if (line.startsWith('- ') || line.startsWith('* ')) continue;
    if (/^\d+\.\s/.test(line)) continue;
    usefulLines.push(line);
    if (usefulLines.length >= 6) break;
  }
  if (usefulLines.length === 0) return '';

  const text = usefulLines.join(' ');

  // Sentence split — keep the closing punctuation attached to the
  // sentence it ends. Lookbehind is supported in Node 20+.
  const sentences = text
    .split(/(?<=[。！？.!?])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) return text;

  let out = sentences[0]!;
  for (let i = 1; i < sentences.length; i++) {
    const candidate = `${out}${out.endsWith(' ') ? '' : ' '}${sentences[i]}`;
    if (candidate.length > softCapChars) break;
    out = candidate;
  }
  return out;
}

/**
 * Pull the first N paragraphs of a markdown document, preserving
 * paragraph breaks. Used for the intro section of canvas skill docs.
 */
export function firstParagraphs(md: string | undefined, maxParagraphs: number): string {
  if (!md) return '';
  const paragraphs = md.split(/\n\s*\n/);
  const useful: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('![')) continue;
    if (trimmed.startsWith('>')) continue;
    useful.push(trimmed);
    if (useful.length >= maxParagraphs) break;
  }
  return useful.join('\n\n');
}

export function pickI18n(bundle: CanvasBundle, lang: Lang): CanvasI18n {
  return bundle.i18n[lang] ?? bundle.i18n.en;
}

/**
 * Pattern bundle — the parallel of `CanvasBundle` for business-model
 * patterns shipped under `packages/case-library/patterns/<slug>/`.
 *
 *   - `pattern`     — the parsed pattern.json (slug, name, summary,
 *                     sources, examples)
 *   - `description` — bilingual long-form markdown for end users (the
 *                     web UI's PatternList renders this)
 *   - `skill`       — bilingual concise AI-facing markdown (TL;DR /
 *                     signals / anti-patterns / cross-references). When
 *                     missing for a language, the skill generator
 *                     falls back to the first paragraphs of
 *                     `description.<lang>.md`.
 */
export interface PatternBundle {
  slug: string;
  pattern: BusinessModelPattern;
  description: { en?: string; zh?: string };
  skill: { en?: string; zh?: string };
}

export function readPatternBundle(
  patternsDir: string,
  slug: string,
): PatternBundle | null {
  const dir = join(patternsDir, slug);
  const patternJsonPath = join(dir, 'pattern.json');
  if (!existsSync(patternJsonPath)) return null;
  let pattern: BusinessModelPattern;
  try {
    pattern = JSON.parse(readFileSync(patternJsonPath, 'utf8')) as BusinessModelPattern;
  } catch {
    return null;
  }
  return {
    slug,
    pattern,
    description: {
      en: readMarkdownOrUndefined(join(dir, 'description.en.md')),
      zh: readMarkdownOrUndefined(join(dir, 'description.zh.md')),
    },
    skill: {
      en: readMarkdownOrUndefined(join(dir, 'skill.en.md')),
      zh: readMarkdownOrUndefined(join(dir, 'skill.zh.md')),
    },
  };
}

/**
 * Experiment bundle — the parallel of `PatternBundle` for the Testing
 * Business Ideas experiment library at
 * `packages/case-library/experiments/<slug>/`.
 *
 *   - `experiment`  — the parsed experiment.json (typed metadata, see
 *                     `Experiment` in `@pingarden/shared`)
 *   - `description` — bilingual long-form markdown: when to use, how to
 *                     run, what good looks like, anti-patterns
 *   - `skill`       — bilingual concise AI-facing markdown (TL;DR for
 *                     AI agents to recommend the experiment from a
 *                     riskiest assumption). Falls back to the first
 *                     paragraphs of `description.<lang>.md` when missing.
 */
export interface ExperimentBundle {
  slug: string;
  experiment: Experiment;
  description: { en?: string; zh?: string };
  skill: { en?: string; zh?: string };
}

export function readExperimentBundle(
  experimentsDir: string,
  slug: string,
): ExperimentBundle | null {
  const dir = join(experimentsDir, slug);
  const experimentJsonPath = join(dir, 'experiment.json');
  if (!existsSync(experimentJsonPath)) return null;
  let experiment: Experiment;
  try {
    experiment = JSON.parse(readFileSync(experimentJsonPath, 'utf8')) as Experiment;
  } catch {
    return null;
  }
  return {
    slug,
    experiment,
    description: {
      en: readMarkdownOrUndefined(join(dir, 'description.en.md')),
      zh: readMarkdownOrUndefined(join(dir, 'description.zh.md')),
    },
    skill: {
      en: readMarkdownOrUndefined(join(dir, 'skill.en.md')),
      zh: readMarkdownOrUndefined(join(dir, 'skill.zh.md')),
    },
  };
}
