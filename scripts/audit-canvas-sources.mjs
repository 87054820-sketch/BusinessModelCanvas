import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CANVAS_DIR = join(ROOT, 'packages/canvases');
const RESOURCE_DIR = join(ROOT, 'packages/case-library/resources');

const FIRST_SLICE_CANVASES = [
  'business-model-canvas',
  'platform-ecosystem-map',
  'blue-ocean-strategy-canvas',
  'evidence-scorecard',
  'scenario-matrix',
];

const VALID_TIERS = new Set([
  'formal-book',
  'official-method-page',
  'professional-institution',
  'academic-or-industry-report',
]);

const args = new Set(process.argv.slice(2).filter((arg) => arg !== '--'));
const jsonMode = args.has('--json');
const allCanvases = args.has('--all');
const checkUrls = args.has('--check-urls');

const errors = [];
const warnings = [];

async function main() {
  const slugs = allCanvases ? await childDirs(CANVAS_DIR) : FIRST_SLICE_CANVASES;
  const rows = [];
  for (const slug of slugs) {
    const dir = join(CANVAS_DIR, slug);
    if (!existsSync(join(dir, 'manifest.json'))) continue;
    rows.push(await auditCanvas(slug, dir));
  }

  if (jsonMode) {
    console.log(JSON.stringify({ ok: errors.length === 0, data: { rows, errors, warnings } }, null, 2));
  } else {
    printReport(rows);
  }

  if (errors.length > 0) process.exitCode = 1;
}

async function auditCanvas(slug, dir) {
  const manifest = await readJson(join(dir, 'manifest.json'));
  const zones = Array.isArray(manifest.zones) ? manifest.zones.map((zone) => zone.id) : [];
  const ledgerPath = join(dir, 'knowledge/source-ledger.json');
  const row = {
    slug,
    path: relative(ROOT, ledgerPath),
    sources: 0,
    manualSourceCount: 0,
    blockCoverage: zones.length === 0 ? 1 : 0,
    status: 'ok',
  };

  if (!existsSync(ledgerPath)) {
    addError(ledgerPath, 'missing source-ledger.json');
    row.status = 'missing';
    return row;
  }

  const ledger = await readJson(ledgerPath);
  const sources = Array.isArray(ledger.sources) ? ledger.sources : [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  row.sources = sources.length;

  if (ledger.canvasId !== slug) addError(ledgerPath, `canvasId must be ${slug}`);
  if (sources.length < 2) addError(ledgerPath, 'each first-slice canvas needs at least two qualified sources');

  const duplicateIds = sources
    .map((source) => source.id)
    .filter((id, index, ids) => id && ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) addError(ledgerPath, `duplicate source ids: ${[...new Set(duplicateIds)].join(', ')}`);

  for (const source of sources) {
    await validateSource(ledgerPath, source);
  }

  const introRefs = refsFor(ledger.coverage?.intro);
  const bodyRefs = refsFor(ledger.coverage?.body);
  row.manualSourceCount = new Set([...introRefs, ...bodyRefs]).size;
  if (introRefs.length < 2) addError(ledgerPath, 'intro must cite at least two sources');
  if (bodyRefs.length < 2) addError(ledgerPath, 'body must cite at least two sources');
  validateRefs(ledgerPath, sourceById, 'intro', introRefs);
  validateRefs(ledgerPath, sourceById, 'body', bodyRefs);

  const blocks = ledger.coverage?.blocks ?? {};
  const coveredBlocks = zones.filter((zoneId) => {
    const refs = refsFor(blocks[zoneId]);
    validateRefs(ledgerPath, sourceById, `blocks.${zoneId}`, refs);
    return refs.length > 0;
  });
  row.blockCoverage = zones.length === 0 ? 1 : coveredBlocks.length / zones.length;
  const missing = zones.filter((zoneId) => refsFor(blocks[zoneId]).length === 0);
  if (missing.length > 0) addError(ledgerPath, `missing source coverage for blocks: ${missing.join(', ')}`);

  if (checkUrls) {
    for (const source of sources.filter((item) => item.url)) {
      await validateReachableUrl(ledgerPath, source);
    }
  }

  row.status = errors.some((issue) => issue.path === relative(ROOT, ledgerPath)) ? 'error' : 'ok';
  return row;
}

async function validateSource(path, source) {
  if (!source?.id) addError(path, 'source is missing id');
  if (!VALID_TIERS.has(source?.tier)) addError(path, `source ${source?.id ?? '(unknown)'} has invalid tier`);
  if (!source?.label) addError(path, `source ${source?.id ?? '(unknown)'} is missing label`);

  if (source.type === 'resourceChapter') {
    if (!source.resourceSlug || !source.chapterSlug) {
      addError(path, `resourceChapter source ${source.id} needs resourceSlug and chapterSlug`);
      return;
    }
    if (!existsSync(join(RESOURCE_DIR, source.resourceSlug, 'resource.json'))) {
      addError(path, `resource source ${source.id} points to missing resource ${source.resourceSlug}`);
    }
    const indexPath = join(RESOURCE_DIR, source.resourceSlug, 'chapters/index.json');
    if (!existsSync(indexPath)) {
      addError(path, `resource source ${source.id} points to resource without chapters`);
    } else {
      const chapters = await readJson(indexPath);
      const hasChapter = Array.isArray(chapters) && chapters.some((chapter) => chapter.slug === source.chapterSlug);
      if (!hasChapter) addError(path, `resource source ${source.id} points to missing chapter ${source.chapterSlug}`);
    }
  }

  if (source.type === 'professionalWeb') {
    if (!source.url) addError(path, `professionalWeb source ${source.id} needs url`);
    else validateUrlSyntax(path, source);
  }

  if (!source.type) addError(path, `source ${source.id ?? '(unknown)'} is missing type`);
}

function validateRefs(path, sourceById, label, refs) {
  if (refs.length === 0) return;
  for (const ref of refs) {
    if (!sourceById.has(ref)) addError(path, `${label} references unknown source id ${ref}`);
  }
}

function refsFor(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function validateUrlSyntax(path, source) {
  try {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol)) addError(path, `source ${source.id} URL must be http(s)`);
  } catch {
    addError(path, `source ${source.id} has invalid URL`);
  }
}

async function validateReachableUrl(path, source) {
  try {
    const res = await fetch(source.url, { method: 'HEAD', redirect: 'follow' });
    if (!res.ok) addError(path, `source ${source.id} URL returned ${res.status}`);
  } catch (err) {
    addWarning(path, `source ${source.id} URL reachability check failed: ${err.message}`);
  }
}

function printReport(rows) {
  printSection('Canvas Source Ledger Audit');
  console.log(`Scope: ${allCanvases ? 'all canvas bundles' : 'first slice'}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log('');
  console.log(['Status', 'Canvas', 'Sources', 'Manual refs', 'Block coverage'].join('  '));
  console.log('------  ------------------------------  -------  -----------  --------------');
  for (const row of rows) {
    console.log([
      row.status.padEnd(6),
      row.slug.padEnd(30),
      String(row.sources).padStart(7),
      String(row.manualSourceCount).padStart(11),
      `${Math.round(row.blockCoverage * 100)}%`.padStart(14),
    ].join('  '));
  }
  if (errors.length > 0) {
    printSection('Errors');
    for (const issue of errors) console.log(`- ${issue.path}: ${issue.message}`);
  }
  if (warnings.length > 0) {
    printSection('Warnings');
    for (const issue of warnings) console.log(`- ${issue.path}: ${issue.message}`);
  }
}

async function childDirs(path) {
  if (!existsSync(path)) return [];
  const names = await readdir(path);
  const dirs = [];
  for (const name of names) {
    const fullPath = join(path, name);
    if ((await stat(fullPath)).isDirectory()) dirs.push(name);
  }
  return dirs.sort();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function addError(path, message) {
  errors.push({ path: relative(ROOT, path), message });
}

function addWarning(path, message) {
  warnings.push({ path: relative(ROOT, path), message });
}

function printSection(title) {
  console.log(`\n== ${title} ==`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
