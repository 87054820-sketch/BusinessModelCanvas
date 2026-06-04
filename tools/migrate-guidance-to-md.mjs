#!/usr/bin/env node
/**
 * One-off migration: extract per-block `guidance` strings from each
 * canvas's `i18n/{en,zh}.json` into individual markdown files at
 * `knowledge/blocks/<zoneId>.<lang>.md`, then strip `guidance` keys from
 * the JSON. Idempotent — re-running over an already-migrated tree
 * leaves it untouched (no `guidance` keys = nothing to do).
 *
 * Run from the repo root:
 *   node tools/migrate-guidance-to-md.mjs
 *
 * After running, inspect with `git diff` and commit.
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = dirname(dirname(__filename));
const canvasesDir = join(repoRoot, 'packages/canvases');

const langs = /** @type {const} */ (['en', 'zh']);

const stats = {
  bundles: 0,
  blocksMigrated: 0,
  filesWritten: 0,
  jsonRewritten: 0,
};

async function main() {
  const entries = await fs.readdir(canvasesDir);
  for (const entry of entries) {
    const bundleDir = join(canvasesDir, entry);
    const stat = await fs.stat(bundleDir).catch(() => null);
    if (!stat?.isDirectory()) continue;
    await migrateBundle(bundleDir);
  }
  console.log(JSON.stringify(stats, null, 2));
}

/**
 * For one canvas bundle, write out per-block markdown files for each
 * language (when guidance text exists), then rewrite both i18n JSONs
 * with `guidance` keys removed.
 */
async function migrateBundle(bundleDir) {
  // Read both languages first so a partial failure halts before we
  // rewrite anything.
  const i18nByLang = {};
  for (const lang of langs) {
    const path = join(bundleDir, `i18n/${lang}.json`);
    const raw = await fs.readFile(path, 'utf8').catch(() => null);
    if (raw === null) return; // bundle has no i18n file for this lang — skip
    i18nByLang[lang] = JSON.parse(raw);
  }

  // Union of zone ids that exist across languages.
  const zoneIds = new Set();
  for (const lang of langs) {
    for (const zoneId of Object.keys(i18nByLang[lang].blocks ?? {})) {
      zoneIds.add(zoneId);
    }
  }
  if (zoneIds.size === 0) return;

  stats.bundles += 1;

  // Ensure target dir exists once.
  const blocksDir = join(bundleDir, 'knowledge/blocks');
  await fs.mkdir(blocksDir, { recursive: true });

  for (const zoneId of zoneIds) {
    let migratedThisZone = false;
    for (const lang of langs) {
      const block = i18nByLang[lang].blocks?.[zoneId];
      if (!block) continue;
      const guidance = typeof block.guidance === 'string' ? block.guidance.trim() : '';
      if (guidance) {
        await fs.writeFile(
          join(blocksDir, `${zoneId}.${lang}.md`),
          guidance + '\n',
          'utf8',
        );
        stats.filesWritten += 1;
        migratedThisZone = true;
      }
      // Strip the key whether it was empty or not — JSON should no longer carry it.
      if ('guidance' in block) delete block.guidance;
    }
    if (migratedThisZone) stats.blocksMigrated += 1;
  }

  // Rewrite the i18n JSONs with guidance keys removed.
  for (const lang of langs) {
    const path = join(bundleDir, `i18n/${lang}.json`);
    await fs.writeFile(path, JSON.stringify(i18nByLang[lang], null, 2) + '\n', 'utf8');
    stats.jsonRewritten += 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
