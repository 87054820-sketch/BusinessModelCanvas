import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import {
  readBundle,
  readExperimentBundle,
  readPatternBundle,
  type CanvasBundle,
  type ExperimentBundle,
  type PatternBundle,
} from './bundle.js';
import { CLI_VERSION } from '../lib/version.js';
import {
  REFERENCE_FILES,
  WORKFLOW_FILES,
  renderCanvasMd,
  renderExperimentMd,
  renderPatternMd,
  renderSkillMd,
} from './templates.js';

export interface GenerateOptions {
  /** Where the canvas bundles live (resolved by discoverBundlesDir). */
  bundlesDir: string;
  /**
   * Where the pattern bundles live (resolved by discoverPatternsDir).
   * Optional — `null`/missing produces a skill with no patterns/ tree.
   */
  patternsDir?: string | null;
  /**
   * Where the experiment bundles live (resolved by
   * discoverExperimentsDir). Optional — `null`/missing produces a skill
   * with no experiments/ tree.
   */
  experimentsDir?: string | null;
  /** Where to write the skill tree. */
  outDir: string;
  /** Restrict canvas md output to these languages. Defaults to both. */
  langs?: Array<'en' | 'zh'>;
}

export interface GenerateResult {
  files: string[];
  version: string;
  contentHash: string;
  canvasIds: string[];
  patternSlugs: string[];
  experimentSlugs: string[];
}

/**
 * Pure generator. Reads canvas bundles, emits a fully-deterministic
 * skill tree. Re-running with the same inputs produces byte-identical
 * output (so `diff -r out1 out2` is the idempotency test).
 *
 * The version string in SKILL.md frontmatter is derived from a hash
 * of every input file's contents — wall clock NEVER participates.
 */
export function generateSkill(opts: GenerateOptions): GenerateResult {
  const langs = opts.langs ?? ['en', 'zh'];

  // 1. Discover canvases (sorted by id for stability).
  const canvasIds = readdirSync(opts.bundlesDir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(opts.bundlesDir, d.name, 'manifest.json')),
    )
    .map((d) => d.name)
    .sort();

  // 2. Read every bundle.
  const bundles: CanvasBundle[] = [];
  for (const id of canvasIds) {
    const b = readBundle(opts.bundlesDir, id);
    if (b) bundles.push(b);
  }

  // 2b. Discover + read patterns. The order in `patterns/` on disk is
  //     not authoritative; we sort by slug for deterministic output.
  const patternBundles: PatternBundle[] = [];
  if (opts.patternsDir && existsSync(opts.patternsDir)) {
    const patternSlugs = readdirSync(opts.patternsDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          existsSync(join(opts.patternsDir!, d.name, 'pattern.json')),
      )
      .map((d) => d.name)
      .sort();
    for (const slug of patternSlugs) {
      const pb = readPatternBundle(opts.patternsDir, slug);
      if (pb) patternBundles.push(pb);
    }
  }

  // 2c. Discover + read experiments (TBI library). Same shape as
  //     patterns: sorted by slug, optional surface (no experiments dir
  //     => empty list, no experiments/ tree in output).
  const experimentBundles: ExperimentBundle[] = [];
  if (opts.experimentsDir && existsSync(opts.experimentsDir)) {
    const experimentSlugs = readdirSync(opts.experimentsDir, {
      withFileTypes: true,
    })
      .filter(
        (d) =>
          d.isDirectory() &&
          existsSync(join(opts.experimentsDir!, d.name, 'experiment.json')),
      )
      .map((d) => d.name)
      .sort();
    for (const slug of experimentSlugs) {
      const eb = readExperimentBundle(opts.experimentsDir, slug);
      if (eb) experimentBundles.push(eb);
    }
  }

  // 3. Compute content hash from every input that affects output.
  // Skill version = `<CLI semver>-<8-char content hash>`. The CLI
  // version is sourced from `apps/cli/package.json` (inlined by tsup
  // via `__PINGARDEN_CLI_VERSION__`). Bumping the CLI bumps the skill
  // prefix automatically; the trailing hash captures whether canvas,
  // pattern, OR experiment bundles actually changed. Identical inputs
  // always produce byte-identical zips.
  const contentHash = hashBundles(bundles, patternBundles, experimentBundles);
  const version = `${CLI_VERSION}-${contentHash.slice(0, 8)}`;

  // 4. Build the file map.
  const files: Record<string, string> = {};

  files['SKILL.md'] = renderSkillMd({
    version,
    canvasIds: bundles.map((b) => b.id),
    patternSlugs: patternBundles.map((p) => p.slug),
    experimentSlugs: experimentBundles.map((e) => e.slug),
  });

  for (const b of bundles) {
    for (const lang of langs) {
      files[`canvases/${b.id}.${lang}.md`] = renderCanvasMd({ bundle: b, lang });
    }
  }

  for (const pb of patternBundles) {
    for (const lang of langs) {
      files[`patterns/${pb.slug}.${lang}.md`] = renderPatternMd({ bundle: pb, lang });
    }
  }

  for (const eb of experimentBundles) {
    for (const lang of langs) {
      files[`experiments/${eb.slug}.${lang}.md`] = renderExperimentMd({
        bundle: eb,
        lang,
      });
    }
  }

  for (const [path, content] of Object.entries(WORKFLOW_FILES)) {
    files[path] = content;
  }
  for (const [path, content] of Object.entries(REFERENCE_FILES)) {
    files[path] = content;
  }

  // 5. Write atomically: stage to <outDir>.tmp, compare, rename.
  const stagingDir = `${opts.outDir}.tmp`;
  if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  const sortedFiles = Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1));
  const writtenPaths: string[] = [];
  for (const [relPath, body] of sortedFiles) {
    const abs = join(stagingDir, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, 'utf8');
    writtenPaths.push(relPath);
  }

  // Stamp the install with content hash + cli version so subsequent
  // installs can short-circuit when nothing changed.
  writeFileSync(
    join(stagingDir, '.pingarden-skill-hash'),
    `${contentHash}\n`,
    'utf8',
  );
  writeFileSync(
    join(stagingDir, '.pingarden-skill-version'),
    `${version}\n`,
    'utf8',
  );

  // 6. Replace target dir.
  if (existsSync(opts.outDir)) {
    rmSync(opts.outDir, { recursive: true, force: true });
  }
  mkdirSync(dirname(opts.outDir), { recursive: true });
  // Cross-device-safe move: rename within same parent (we made the parent above).
  renameDir(stagingDir, opts.outDir);

  return {
    files: writtenPaths,
    version,
    contentHash,
    canvasIds: bundles.map((b) => b.id),
    patternSlugs: patternBundles.map((p) => p.slug),
    experimentSlugs: experimentBundles.map((e) => e.slug),
  };
}

function renameDir(src: string, dest: string) {
  // Try a same-fs rename first; fall back to copy + delete on EXDEV.
  try {
    renameSync(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      copyDirRecursive(src, dest);
      rmSync(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

function copyDirRecursive(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      writeFileSync(d, readFileSync(s));
    }
  }
}

/**
 * Hash every input that affects generator output. Walks bundles in
 * sorted order; each bundle hashes its manifest (canonicalised),
 * i18n JSONs, intro markdown, every block markdown, and the optional
 * curated skill markdown. Pattern + experiment bundles are hashed in the
 * same sorted-by-slug order, with their JSON (canonicalised) +
 * description + skill markdown for both languages.
 */
function hashBundles(
  bundles: CanvasBundle[],
  patternBundles: PatternBundle[],
  experimentBundles: ExperimentBundle[],
): string {
  const h = createHash('sha256');
  for (const b of bundles) {
    h.update(`bundle:${b.id}\n`);
    h.update(canonicalJson(b.manifest));
    h.update('\n');
    h.update(canonicalJson(b.i18n.en));
    h.update('\n');
    h.update(canonicalJson(b.i18n.zh));
    h.update('\n');
    h.update(b.knowledge.intro.en ?? '');
    h.update('\n');
    h.update(b.knowledge.intro.zh ?? '');
    h.update('\n');
    const sortedZoneIds = Object.keys(b.knowledge.blocks).sort();
    for (const z of sortedZoneIds) {
      h.update(`zone:${z}\n`);
      h.update(b.knowledge.blocks[z]?.en ?? '');
      h.update('\n');
      h.update(b.knowledge.blocks[z]?.zh ?? '');
      h.update('\n');
    }
    h.update(b.curated.en ?? '');
    h.update('\n');
    h.update(b.curated.zh ?? '');
    h.update('\n');
  }
  for (const pb of patternBundles) {
    h.update(`pattern:${pb.slug}\n`);
    h.update(canonicalJson(pb.pattern));
    h.update('\n');
    h.update(pb.description.en ?? '');
    h.update('\n');
    h.update(pb.description.zh ?? '');
    h.update('\n');
    h.update(pb.skill.en ?? '');
    h.update('\n');
    h.update(pb.skill.zh ?? '');
    h.update('\n');
  }
  for (const eb of experimentBundles) {
    h.update(`experiment:${eb.slug}\n`);
    h.update(canonicalJson(eb.experiment));
    h.update('\n');
    h.update(eb.description.en ?? '');
    h.update('\n');
    h.update(eb.description.zh ?? '');
    h.update('\n');
    h.update(eb.skill.en ?? '');
    h.update('\n');
    h.update(eb.skill.zh ?? '');
    h.update('\n');
  }
  return h.digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

/**
 * Read the on-disk hash sentinel from a previously-installed skill.
 * Returns null when missing — fresh install.
 */
export function readInstalledHash(installDir: string): string | null {
  const path = join(installDir, '.pingarden-skill-hash');
  if (!existsSync(path)) return null;
  if (!statSync(path).isFile()) return null;
  return readFileSync(path, 'utf8').trim();
}
