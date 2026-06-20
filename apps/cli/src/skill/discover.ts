import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from '../lib/errors.js';

/**
 * Find the canvas bundles directory at runtime.
 *
 *   1. `--bundles <dir>` flag (passed through opts)
 *   2. `<binDir>/../assets/canvases` — packaged with the npm bundle
 *   3. Walk up from cwd looking for `packages/canvases/business-model-canvas/manifest.json`
 *      — the dev-tree shape
 */
export function discoverBundlesDir(opts: { override?: string }): string {
  if (opts.override && opts.override.length > 0) {
    if (!existsSync(opts.override)) {
      throw new CliError(
        'BAD_INPUT',
        `Bundles dir not found: ${opts.override}`,
      );
    }
    return opts.override;
  }

  // Packaged: assets sit next to dist/.
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packaged = resolve(here, '..', 'assets', 'canvases');
    if (looksLikeBundlesDir(packaged)) return packaged;
    // dev (running via tsx from src/skill/discover.ts):
    const dev = resolve(here, '..', '..', 'assets', 'canvases');
    if (looksLikeBundlesDir(dev)) return dev;
  } catch {
    /* import.meta.url shenanigans — fall through */
  }

  // Walk up from cwd looking for the workspace shape.
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'canvases');
    if (looksLikeBundlesDir(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  throw new CliError(
    'NO_SERVER_FOUND', // re-using exit code 3 — install/setup issue
    'Could not locate canvas bundles directory.',
    'Pass --bundles <path>, or run from inside the PinGarden repo, or reinstall the CLI so its bundled assets are in place.',
  );
}

function looksLikeBundlesDir(path: string): boolean {
  if (!existsSync(path)) return false;
  if (!statSync(path).isDirectory()) return false;
  // A real bundles dir has a sentinel canvas with a manifest.
  return existsSync(join(path, 'business-model-canvas', 'manifest.json'));
}

/**
 * Find the case-library patterns directory at runtime.
 *
 *   1. `--patterns <dir>` flag (passed through opts)
 *   2. `<binDir>/../assets/patterns` — packaged with the npm bundle
 *   3. Walk up from cwd looking for `packages/case-library/patterns/`
 *      — the dev-tree shape
 *
 * Returns `null` (rather than throwing) when no patterns dir is found —
 * patterns are an optional content surface, the CLI should still work
 * for canvas-only flows when none ship.
 */
export function discoverPatternsDir(opts: { override?: string }): string | null {
  if (opts.override && opts.override.length > 0) {
    if (!existsSync(opts.override)) {
      throw new CliError(
        'BAD_INPUT',
        `Patterns dir not found: ${opts.override}`,
      );
    }
    return opts.override;
  }

  // Packaged: assets sit next to dist/ (mirrors the canvases convention).
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packaged = resolve(here, '..', 'assets', 'patterns');
    if (looksLikePatternsDir(packaged)) return packaged;
    // dev (running via tsx from src/skill/discover.ts):
    const dev = resolve(here, '..', '..', 'assets', 'patterns');
    if (looksLikePatternsDir(dev)) return dev;
  } catch {
    /* import.meta.url shenanigans — fall through */
  }

  // Walk up from cwd looking for the workspace shape.
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'case-library', 'patterns');
    if (looksLikePatternsDir(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function looksLikePatternsDir(path: string): boolean {
  if (!existsSync(path)) return false;
  if (!statSync(path).isDirectory()) return false;
  // A real patterns dir is just a directory with one or more
  // `<slug>/pattern.json` children. Probe for the directory shape;
  // empty patterns dirs (manifest declares zero) are acceptable.
  return true;
}

/**
 * Find the case-library experiments directory at runtime. Same fallback
 * chain as `discoverPatternsDir`, but for the parallel
 * `packages/case-library/experiments/` tree (Testing Business Ideas
 * recipes — see `Experiment` in `@pingarden/shared`).
 *
 * Returns `null` when no experiments dir is found — the surface is
 * optional just like patterns, so the CLI still works for canvas-only
 * flows when none ship.
 */
export function discoverExperimentsDir(opts: {
  override?: string;
}): string | null {
  if (opts.override && opts.override.length > 0) {
    if (!existsSync(opts.override)) {
      throw new CliError(
        'BAD_INPUT',
        `Experiments dir not found: ${opts.override}`,
      );
    }
    return opts.override;
  }

  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packaged = resolve(here, '..', 'assets', 'experiments');
    if (looksLikeExperimentsDir(packaged)) return packaged;
    const dev = resolve(here, '..', '..', 'assets', 'experiments');
    if (looksLikeExperimentsDir(dev)) return dev;
  } catch {
    /* import.meta.url shenanigans — fall through */
  }

  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'case-library', 'experiments');
    if (looksLikeExperimentsDir(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function looksLikeExperimentsDir(path: string): boolean {
  if (!existsSync(path)) return false;
  if (!statSync(path).isDirectory()) return false;
  return true;
}

/**
 * Find the case-library strategy frameworks directory at runtime. Same
 * fallback chain as patterns and experiments, but for the parallel
 * `packages/case-library/strategy-frameworks/` tree.
 */
export function discoverStrategyFrameworksDir(opts: {
  override?: string;
}): string | null {
  if (opts.override && opts.override.length > 0) {
    if (!existsSync(opts.override)) {
      throw new CliError(
        'BAD_INPUT',
        `Strategy frameworks dir not found: ${opts.override}`,
      );
    }
    return opts.override;
  }

  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packaged = resolve(here, '..', 'assets', 'strategy-frameworks');
    if (looksLikeStrategyFrameworksDir(packaged)) return packaged;
    const dev = resolve(here, '..', '..', 'assets', 'strategy-frameworks');
    if (looksLikeStrategyFrameworksDir(dev)) return dev;
  } catch {
    /* import.meta.url shenanigans — fall through */
  }

  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'packages', 'case-library', 'strategy-frameworks');
    if (looksLikeStrategyFrameworksDir(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function looksLikeStrategyFrameworksDir(path: string): boolean {
  if (!existsSync(path)) return false;
  if (!statSync(path).isDirectory()) return false;
  return true;
}
