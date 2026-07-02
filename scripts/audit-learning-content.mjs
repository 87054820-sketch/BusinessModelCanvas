import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CANVAS_DIR = join(ROOT, 'packages/canvases');
const CASE_DIR = join(ROOT, 'packages/case-library/cases');
const RESOURCE_DIR = join(ROOT, 'packages/case-library/resources');
const PATTERN_DIR = join(ROOT, 'packages/case-library/patterns');
const FRAMEWORK_DIR = join(ROOT, 'packages/case-library/strategy-frameworks');
const EXPERIMENT_DIR = join(ROOT, 'packages/case-library/experiments');

const FIRST_SLICE_CANVASES = [
  'business-model-canvas',
  'platform-ecosystem-map',
  'blue-ocean-strategy-canvas',
  'evidence-scorecard',
  'scenario-matrix',
];

const LIGHTHOUSE_CASES = [
  'nespresso',
  'gillette',
  'uber',
  'airbnb',
  'visa',
  'nvidia-cuda',
  'yellow-tail',
  'cirque-du-soleil',
  'nintendo-wii',
];

const LIGHTHOUSE_RESOURCES = [
  'business-model-generation',
  'platform-revolution',
  'blue-ocean-strategy',
];

const errors = [];
const warnings = [];

const rel = (path) => relative(ROOT, path);
const addError = (path, message) => errors.push({ path: rel(path), message });
const addWarning = (path, message) => warnings.push({ path: rel(path), message });

async function main() {
  const catalog = await loadCatalog();

  await auditFirstSliceLearning(catalog);
  await auditLearningReferences(catalog);
  await auditStoryQuality();
  await auditCanvasKnowledge(catalog);

  printSection('Learning Content Audit');
  console.log(`Canvases: ${catalog.canvases.size}`);
  console.log(`Cases: ${catalog.cases.size}`);
  console.log(`Resources: ${catalog.resources.size}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    printSection('Errors');
    for (const issue of errors) console.log(`- ${issue.path}: ${issue.message}`);
  }

  if (warnings.length > 0) {
    printSection('Warnings');
    for (const issue of warnings.slice(0, 80)) {
      console.log(`- ${issue.path}: ${issue.message}`);
    }
    if (warnings.length > 80) {
      console.log(`- ... ${warnings.length - 80} more warnings omitted`);
    }
  }

  if (errors.length > 0) process.exitCode = 1;
}

async function loadCatalog() {
  const canvases = new Map();
  for (const slug of await childDirs(CANVAS_DIR)) {
    const path = join(CANVAS_DIR, slug, 'manifest.json');
    if (!existsSync(path)) continue;
    const manifest = await readJson(path);
    canvases.set(slug, { path, data: manifest });
  }

  const cases = new Map();
  for (const slug of await childDirs(CASE_DIR)) {
    const path = join(CASE_DIR, slug, 'case.json');
    if (!existsSync(path)) continue;
    cases.set(slug, { path, data: await readJson(path) });
  }

  const resources = new Map();
  const resourceChapters = new Map();
  for (const slug of await childDirs(RESOURCE_DIR)) {
    const path = join(RESOURCE_DIR, slug, 'resource.json');
    if (!existsSync(path)) continue;
    resources.set(slug, { path, data: await readJson(path) });
    const chapterIndexPath = join(RESOURCE_DIR, slug, 'chapters/index.json');
    if (existsSync(chapterIndexPath)) {
      const chapters = await readJson(chapterIndexPath);
      resourceChapters.set(slug, {
        path: chapterIndexPath,
        rows: Array.isArray(chapters) ? chapters : [],
      });
    }
  }

  return {
    canvases,
    cases,
    resources,
    resourceChapters,
    patterns: new Set(await childDirs(PATTERN_DIR)),
    strategyFrameworks: new Set(await childDirs(FRAMEWORK_DIR)),
    experiments: new Set(await childDirs(EXPERIMENT_DIR)),
  };
}

async function auditFirstSliceLearning(catalog) {
  for (const slug of FIRST_SLICE_CANVASES) {
    const item = catalog.canvases.get(slug);
    if (!item) {
      addError(join(CANVAS_DIR, slug), 'first-slice canvas is missing');
      continue;
    }
    requireLearning(item.path, item.data.learning, 'first-slice canvas');
  }

  for (const slug of LIGHTHOUSE_CASES) {
    const item = catalog.cases.get(slug);
    if (!item) {
      addError(join(CASE_DIR, slug), 'lighthouse case is missing');
      continue;
    }
    requireLearning(item.path, item.data.learning, 'lighthouse case');
  }

  for (const slug of LIGHTHOUSE_RESOURCES) {
    const item = catalog.resources.get(slug);
    if (!item) {
      addError(join(RESOURCE_DIR, slug), 'lighthouse resource is missing');
      continue;
    }
    requireLearning(item.path, item.data.learning, 'lighthouse resource');

    const chapters = catalog.resourceChapters.get(slug);
    if (!chapters || chapters.rows.length === 0) {
      addError(join(RESOURCE_DIR, slug, 'chapters/index.json'), 'lighthouse resource has no chapter index');
      continue;
    }
    const missingLearning = chapters.rows.filter((row) => !row.learning).map((row) => row.slug);
    if (missingLearning.length > 0) {
      addWarning(chapters.path, `chapters without learning metadata: ${missingLearning.join(', ')}`);
    }
  }
}

function requireLearning(path, learning, label) {
  if (!learning) {
    addError(path, `${label} lacks learning metadata`);
    return;
  }
  for (const field of ['headline', 'whyOpen']) {
    if (!hasBilingualLabel(learning[field])) {
      addError(path, `${label} learning.${field} must be bilingual`);
    }
  }
  if (!Array.isArray(learning.keyConcepts) || learning.keyConcepts.length === 0) {
    addError(path, `${label} needs keyConcepts`);
  }
  if (!hasAnyRefs(learning)) {
    addWarning(path, `${label} learning has no source/related/next references`);
  }
}

async function auditLearningReferences(catalog) {
  for (const item of allLearningItems(catalog)) {
    auditBilingualAndLength(item.path, item.learning);
    for (const ref of collectRefs(item.learning)) {
      validateReference(catalog, item.path, ref);
    }
  }
}

function* allLearningItems(catalog) {
  for (const item of catalog.canvases.values()) {
    if (item.data.learning) yield { path: item.path, learning: item.data.learning };
  }
  for (const item of catalog.cases.values()) {
    if (item.data.learning) yield { path: item.path, learning: item.data.learning };
  }
  for (const item of catalog.resources.values()) {
    if (item.data.learning) yield { path: item.path, learning: item.data.learning };
  }
  for (const chapters of catalog.resourceChapters.values()) {
    for (const row of chapters.rows) {
      if (row.learning) yield { path: chapters.path, learning: row.learning };
    }
  }
}

function auditBilingualAndLength(path, learning) {
  const labels = [];
  for (const key of ['headline', 'whyOpen', 'audience']) {
    if (learning[key]) labels.push({ key, label: learning[key] });
  }
  for (const key of ['keyConcepts', 'commonMisreads', 'firstSteps', 'outcomes', 'practicePrompts']) {
    for (const label of learning[key] ?? []) labels.push({ key, label });
  }
  for (const group of ['sourceRefs', 'relatedRefs', 'nextRefs']) {
    for (const ref of learning[group] ?? []) {
      if (ref.label) labels.push({ key: `${group}.label`, label: ref.label });
      if (ref.note) labels.push({ key: `${group}.note`, label: ref.note });
    }
  }

  for (const { key, label } of labels) {
    if (!hasBilingualLabel(label)) {
      addWarning(path, `learning.${key} is missing en or zh`);
    }
    for (const lang of ['en', 'zh']) {
      if ((label?.[lang] ?? '').length > 700) {
        addWarning(path, `learning.${key}.${lang} is too long; keep long-form prose in the source document`);
      }
    }
  }
}

function validateReference(catalog, path, ref) {
  if (!ref || typeof ref !== 'object') return;
  const slug = ref.slug;
  if (!slug || !ref.type) {
    addError(path, 'learning reference lacks type or slug');
    return;
  }
  if (ref.type === 'canvas' && !catalog.canvases.has(slug)) {
    addError(path, `learning reference points to missing canvas: ${slug}`);
  }
  if (ref.type === 'canvasBlock') {
    const canvasId = ref.canvasDefId || slug;
    const canvas = catalog.canvases.get(canvasId);
    if (!canvas) {
      addError(path, `learning reference points to missing canvas block canvas: ${canvasId}`);
    } else if (ref.blockId && !canvas.data.zones?.some((zone) => zone.id === ref.blockId)) {
      addError(path, `learning reference points to missing canvas block: ${canvasId}/${ref.blockId}`);
    }
  }
  if ((ref.type === 'case' || ref.type === 'caseStory') && !catalog.cases.has(slug)) {
    addError(path, `learning reference points to missing case: ${slug}`);
  }
  if (ref.type === 'resource' && !catalog.resources.has(slug)) {
    addError(path, `learning reference points to missing resource: ${slug}`);
  }
  if (ref.type === 'resourceChapter') {
    const chapters = catalog.resourceChapters.get(slug);
    if (!chapters) {
      addError(path, `learning reference points to resource without chapters: ${slug}`);
    } else if (ref.chapterSlug && !chapters.rows.some((row) => row.slug === ref.chapterSlug)) {
      addError(path, `learning reference points to missing resource chapter: ${slug}/${ref.chapterSlug}`);
    }
  }
  if (ref.type === 'pattern' && !catalog.patterns.has(slug)) {
    addError(path, `learning reference points to missing pattern: ${slug}`);
  }
  if (ref.type === 'strategyFramework' && !catalog.strategyFrameworks.has(slug)) {
    addError(path, `learning reference points to missing strategy framework: ${slug}`);
  }
  if (ref.type === 'experiment' && !catalog.experiments.has(slug)) {
    addError(path, `learning reference points to missing experiment: ${slug}`);
  }
}

async function auditStoryQuality() {
  for (const caseSlug of await childDirs(CASE_DIR)) {
    const storiesDir = join(CASE_DIR, caseSlug, 'stories');
    if (!existsSync(storiesDir)) continue;
    for (const storyId of await childDirs(storiesDir)) {
      const contentPath = join(storiesDir, storyId, 'content.md');
      if (!existsSync(contentPath)) continue;
      const content = await readFile(contentPath, 'utf8');
      if (content.trim().length < 1200) {
        addWarning(contentPath, 'short story; consider adding concept scaffolding and canvas interpretation');
      }
      if (!content.includes('::canvas')) {
        addWarning(contentPath, 'story has no canvas directive; readers may not see how the case lands on a canvas');
      }
    }
  }
}

async function auditCanvasKnowledge(catalog) {
  for (const [slug, item] of catalog.canvases.entries()) {
    const knowledgeDir = join(CANVAS_DIR, slug, 'knowledge');
    const i18nEn = await optionalJson(join(CANVAS_DIR, slug, 'i18n/en.json'));
    const i18nZh = await optionalJson(join(CANVAS_DIR, slug, 'i18n/zh.json'));
    const introEn = await optionalText(join(knowledgeDir, 'intro.en.md'));
    const introZh = await optionalText(join(knowledgeDir, 'intro.zh.md'));
    const bodyEn = await optionalText(join(knowledgeDir, 'body.en.md'));
    const bodyZh = await optionalText(join(knowledgeDir, 'body.zh.md'));

    if ((introEn && introEn.trim().length < 280) || (introZh && introZh.trim().length < 160)) {
      addWarning(knowledgeDir, 'canvas intro looks thin for a library browsing context');
    }
    if ((bodyEn && bodyEn.trim().length < 700) || (bodyZh && bodyZh.trim().length < 350)) {
      addWarning(knowledgeDir, 'canvas body looks thin; consider strengthening source knowledge');
    }

    const blockDir = join(knowledgeDir, 'blocks');
    const blockFiles = existsSync(blockDir)
      ? new Set((await readdir(blockDir)).filter((name) => name.endsWith('.md')))
      : new Set();
    for (const zone of item.data.zones ?? []) {
      const hasMd = blockFiles.has(`${zone.id}.en.md`) && blockFiles.has(`${zone.id}.zh.md`);
      const hasI18nFallback =
        hasBlockI18n(i18nEn, zone.id) && hasBlockI18n(i18nZh, zone.id);
      if (!hasMd && !hasI18nFallback) {
        addWarning(blockDir, `missing bilingual block knowledge for zone ${zone.id}`);
      }
    }
  }
}

function collectRefs(learning) {
  return [
    ...(learning.sourceRefs ?? []),
    ...(learning.relatedRefs ?? []),
    ...(learning.nextRefs ?? []),
  ];
}

function hasAnyRefs(learning) {
  return collectRefs(learning).length > 0;
}

function hasBilingualLabel(label) {
  return Boolean(label?.en?.trim() && label?.zh?.trim());
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

async function optionalJson(path) {
  if (!existsSync(path)) return null;
  return readJson(path);
}

async function optionalText(path) {
  if (!existsSync(path)) return '';
  return readFile(path, 'utf8');
}

function hasBlockI18n(i18n, zoneId) {
  const block = i18n?.blocks?.[zoneId];
  return Boolean(block?.guidance?.trim() || block?.prompt?.trim() || block?.title?.trim());
}

function printSection(title) {
  console.log(`\n== ${title} ==`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
