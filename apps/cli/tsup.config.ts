import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'tsup';

const ASSETS_CANVASES = resolve('assets/canvases');
const BUNDLES_SRC = resolve('../../packages/canvases');
const DIST_PACKAGE_JSON = resolve('dist/package.json');

const PKG_VERSION = (
  JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }
).version;

/**
 * After bundling, mirror packages/canvases into apps/cli/assets/canvases
 * so:
 *   1. The published npm tarball ships canvas bundles (no workspace siblings).
 *   2. The Mac app's electron-builder extraResources can pick up
 *      apps/cli/{dist,assets} as one tree.
 *
 * We exclude `bg.*.svg` (only used by the canvas UI, not the skill
 * generator) and `knowledge/book/`, `knowledge/assets/` (large
 * reference material). Everything else the generator reads is included:
 * manifest.json, i18n/*.json, intro markdown, blocks markdown,
 * skill.{en,zh}.md.
 *
 * Implemented as a manual recursive walker rather than `fs.cpSync`
 * because cpSync's `filter` + `recursive` interaction is finicky
 * across Node versions — we hit intermittent EEXIST in package-mac.sh
 * with the higher-level API.
 */
function syncCanvasesToAssets() {
  if (existsSync(ASSETS_CANVASES)) {
    // macOS rmSync is occasionally flaky with ENOTEMPTY on recursive
    // deletes — retry a few times with linear backoff.
    rmSync(ASSETS_CANVASES, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
  copyTree(BUNDLES_SRC, ASSETS_CANVASES);
}

function copyTree(src: string, dest: string) {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    if (shouldSkipDir(src)) return;
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyTree(join(src, entry), join(dest, entry));
    }
    return;
  }
  if (shouldSkipFile(src)) return;
  // mkdir parent in case the only files in this dir are non-skipped
  // (mkdirSync above only ran for directories we entered).
  mkdirSync(resolve(dest, '..'), { recursive: true });
  copyFileSync(src, dest);
}

function shouldSkipDir(absPath: string): boolean {
  // Skip large reference assets that aren't read by the skill generator.
  const norm = absPath.replace(/\\/g, '/');
  if (/\/knowledge\/book$/.test(norm)) return true;
  if (/\/knowledge\/assets$/.test(norm)) return true;
  return false;
}

function shouldSkipFile(absPath: string): boolean {
  const norm = absPath.replace(/\\/g, '/');
  if (/\/bg\.[a-z]{2}\.svg$/.test(norm)) return true;
  return false;
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  sourcemap: true,
  shims: false,
  splitting: false,
  // Inline every runtime dep so the published tarball / Mac-app
  // extraResources copy is self-contained — no node_modules needed
  // alongside dist/. Without this the CLI errors with
  // ERR_MODULE_NOT_FOUND when run from the packaged Mac app.
  noExternal: [/^@pingarden\//, 'clipanion', 'picocolors', 'zod'],
  // Inline the package version at build time so `pingarden --version`
  // and `pingarden doctor` report the real number from the bundle —
  // import.meta.url + readFile would point at the bundled file's
  // location, which is no longer adjacent to package.json.
  define: {
    __PINGARDEN_CLI_VERSION__: JSON.stringify(PKG_VERSION),
  },
  async onSuccess() {
    syncCanvasesToAssets();
    // Mark `dist/` as ESM. Without this sentinel, Node treats `.js`
    // as CommonJS — fatal when the CLI is run via Electron-as-Node
    // from inside the Mac app, where the parent app's package.json
    // (which declares `type:"module"` on the workspace) is not in
    // the resolution chain.
    writeFileSync(DIST_PACKAGE_JSON, '{"type":"module"}\n', 'utf8');
  },
});
