import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RESOURCE_DIR = join(ROOT, 'packages/case-library/resources');

const DIMENSIONS = [
  ['surfaceReadiness', 'Surface readiness', 20],
  ['descriptionDepth', 'Description depth', 15],
  ['chapterCoverage', 'Chapter coverage', 25],
  ['chapterLearning', 'Chapter learning', 15],
  ['practiceConnection', 'Practice connection', 15],
  ['sourceGovernance', 'Source governance', 10],
];

const EXTRACT_DIRS = {
  'blue-ocean-shift': ['extracts/bos-shift-en'],
  'blue-ocean-strategy': ['extracts/bos-en'],
  'business-model-generation': ['extracts/bmc-en', 'extracts/bmc-zh'],
  'christensen-innovators-dilemma': ['extracts/christensen-en'],
  'platform-revolution': ['extracts/platform-revolution'],
  'porter-competitive-advantage': ['extracts/porter-ca-en'],
  'porter-competitive-strategy': ['extracts/porter-cs-en'],
  'scenario-planning-in-organizations': ['extracts/scenario-planning-en'],
  'testing-business-ideas': ['extracts/testing-bi-en'],
  'the-art-of-the-long-view': ['extracts/art-of-long-view'],
  'the-invincible-company': ['extracts/invincible-en'],
  'value-proposition-design': ['extracts/vpc-en', 'extracts/vpc-zh'],
};

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const argSet = new Set(args);
const failUnder = Number(args.find((arg) => arg.startsWith('--fail-under='))?.split('=')[1] ?? '0');
const jsonMode = argSet.has('--json');

async function main() {
  const rows = [];
  for (const slug of await childDirs(RESOURCE_DIR)) {
    const dir = join(RESOURCE_DIR, slug);
    const resourcePath = join(dir, 'resource.json');
    if (!existsSync(resourcePath)) continue;

    const resource = await readJson(resourcePath);
    const chapterIndexPath = join(dir, 'chapters/index.json');
    const hasChapters = existsSync(chapterIndexPath);

    if (argSet.has('--books') && (resource.type !== 'book' || !hasChapters)) continue;
    if (!argSet.has('--all') && !argSet.has('--books') && (resource.type !== 'book' || !hasChapters)) continue;

    rows.push(await auditResource({ slug, dir, resource, hasChapters }));
  }

  rows.sort((a, b) => a.score - b.score || a.slug.localeCompare(b.slug));

  if (jsonMode) {
    console.log(JSON.stringify({ ok: true, data: { rows } }, null, 2));
  } else {
    printReport(rows);
  }

  if (failUnder > 0 && rows.some((row) => row.score < failUnder)) {
    process.exitCode = 1;
  }
}

async function auditResource({ slug, dir, resource, hasChapters }) {
  const chapterIndexPath = join(dir, 'chapters/index.json');
  const chapters = hasChapters ? await readJson(chapterIndexPath) : [];
  const description = {
    en: await optionalText(join(dir, 'description.en.md')),
    zh: await optionalText(join(dir, 'description.zh.md')),
  };
  const auditReport = await optionalText(join(dir, 'audit-report.md'));
  const checklists = new Set((await childFiles(join(dir, 'checklists'))).map((file) => file.replace(/\.json$/, '')));
  const chapterStats = await loadChapterStats(dir, chapters);

  const dimensions = {
    surfaceReadiness: scoreSurfaceReadiness(resource),
    descriptionDepth: scoreDescriptionDepth(description, resource),
    chapterCoverage: scoreChapterCoverage({ chapters, chapterStats, checklists, auditReport, hasChapters }),
    chapterLearning: scoreChapterLearning(chapters),
    practiceConnection: scorePracticeConnection(resource, chapters),
    sourceGovernance: scoreSourceGovernance({ slug, dir, resource, auditReport, checklists, chapters }),
  };

  let score = Object.values(dimensions).reduce((sum, item) => sum + item.score, 0);
  const caps = [];
  if (!resource.learning) caps.push({ cap: 89, reason: 'A cap: missing resource.learning.' });
  if (hasChapters && chapters.length === 0) caps.push({ cap: 89, reason: 'A cap: missing chapter index rows.' });
  if (hasChapters && !/Overall:[\s\S]*PASS/i.test(auditReport)) {
    caps.push({ cap: 89, reason: 'A cap: missing audit-report Overall PASS.' });
  }
  if (chapters.some((chapter) => !chapter.learning)) {
    caps.push({ cap: 89, reason: 'A cap: at least one chapter lacks learning metadata.' });
  }
  if (caps.length > 0) score = Math.min(score, ...caps.map((item) => item.cap));

  return {
    slug,
    title: label(resource.title, slug),
    path: relative(ROOT, dir),
    score: round1(score),
    grade: gradeFor(score),
    chapters: chapters.length,
    dimensions,
    caps,
    improvements: improvementList(dimensions, caps),
  };
}

function scoreSurfaceReadiness(resource) {
  const issues = [];
  const learning = resource.learning;
  if (!learning) {
    return dim(20, 0, ['surfaceReadiness: add resource.learning so the first modal tab can stand alone.']);
  }

  let raw = 0;
  let max = 0;
  for (const field of ['headline', 'whyOpen', 'audience']) {
    max += 2;
    if (hasBilingualLabel(learning[field])) raw += 2;
    else issues.push(`surfaceReadiness: learning.${field} must be bilingual.`);
  }

  for (const [field, target, weight] of [
    ['keyConcepts', 4, 3],
    ['firstSteps', 2, 2],
    ['outcomes', 1, 2],
    ['practicePrompts', 1, 2],
  ]) {
    max += weight;
    const count = bilingualCount(learning[field]);
    raw += weight * ratio(count, target);
    if (count < target) issues.push(`surfaceReadiness: learning.${field} needs ${target} bilingual item(s).`);
  }

  for (const group of ['sourceRefs', 'relatedRefs', 'nextRefs']) {
    max += 1;
    if ((learning[group]?.length ?? 0) > 0) raw += 1;
    else issues.push(`surfaceReadiness: add learning.${group}.`);
  }

  return dim(20, (20 * raw) / max, issues);
}

function scoreDescriptionDepth(description, resource) {
  const issues = [];
  const text = `${description.en}\n${description.zh}`;
  const lengthScore = avg([ratio(description.en.length, 1800), ratio(description.zh.length, 900)]);
  const headingScore = ratio(markdownHeadingCount(description.en) + markdownHeadingCount(description.zh), 6);
  const conceptScore = ratio(keywordHits(text, [
    'concept', 'framework', 'method', 'chapter', 'read', 'practice', 'canvas', 'case', 'experiment',
    '概念', '框架', '方法', '章节', '阅读', '实践', '画布', '案例', '实验',
  ]), 7);
  const fitScore = ratio(keywordHits(text, [
    'when to use', 'when not', 'not for', 'output', 'next', 'apply', '适合', '不适合', '不用', '产出', '下一步', '应用',
  ]), 5);

  if (!hasText(description.en) || !hasText(description.zh)) issues.push('descriptionDepth: description must be bilingual.');
  if (lengthScore < 0.85) issues.push('descriptionDepth: description is too thin for a book detail tab.');
  if (headingScore < 0.7) issues.push('descriptionDepth: add sectioned reading guidance, not only a bibliographic summary.');
  if (conceptScore < 0.7) issues.push('descriptionDepth: connect core concepts to canvases, cases, chapters, or experiments.');
  if (fitScore < 0.7) issues.push('descriptionDepth: include use/not-use, output, and next-step cues.');
  if ((resource.relatedCanvasDefIds?.length ?? 0) === 0) issues.push('descriptionDepth: resource should connect to at least one canvas.');

  return dim(15, 15 * avg([lengthScore, headingScore, conceptScore, fitScore]), issues);
}

function scoreChapterCoverage({ chapters, chapterStats, checklists, auditReport, hasChapters }) {
  const issues = [];
  if (!hasChapters) return dim(25, 0, ['chapterCoverage: book resources must ship chapters/index.json.']);
  if (chapters.length === 0) return dim(25, 0, ['chapterCoverage: chapters/index.json has no rows.']);

  const fileRatio = chapters.length
    ? chapterStats.filter((row) => row.hasEn && row.hasZh).length / chapters.length
    : 0;
  const checklistRatio = chapters.length
    ? chapters.filter((chapter) => checklists.has(chapter.slug)).length / chapters.length
    : 0;
  const thicknessRatio = chapters.length
    ? avg(chapterStats.map((row) => avg([ratio(row.enLength, 2400), ratio(row.zhLength, 1200)])))
    : 0;
  const auditRatio = /Overall:[\s\S]*PASS/i.test(auditReport) ? 1 : 0;

  if (fileRatio < 1) issues.push('chapterCoverage: every chapter needs EN and ZH markdown files.');
  if (checklistRatio < 1) issues.push('chapterCoverage: every chapter needs a matching checklist JSON.');
  if (thicknessRatio < 0.9) issues.push('chapterCoverage: one or more chapters are thin and should go through book-chapter-quality audit.');
  if (auditRatio < 1) issues.push('chapterCoverage: audit-report.md must include an Overall PASS line.');

  return dim(25, 25 * avg([fileRatio, checklistRatio, thicknessRatio, auditRatio]), issues);
}

function scoreChapterLearning(chapters) {
  const issues = [];
  if (chapters.length === 0) return dim(15, 0, ['chapterLearning: no chapter metadata to score.']);

  const rows = chapters.map((chapter) => {
    const learning = chapter.learning;
    if (!learning) return 0;
    let raw = 0;
    let max = 0;
    for (const field of ['headline', 'whyOpen']) {
      max += 2;
      if (hasBilingualLabel(learning[field])) raw += 2;
    }
    for (const [field, target, weight] of [
      ['keyConcepts', 3, 2],
      ['outcomes', 1, 1.5],
      ['practicePrompts', 1, 1.5],
    ]) {
      max += weight;
      raw += weight * ratio(bilingualCount(learning[field]), target);
    }
    max += 1;
    if (hasAnyRefs(learning) || hasAnyChapterRelation(chapter)) raw += 1;
    return raw / max;
  });

  const weak = chapters.filter((chapter, index) => rows[index] < 0.9).map((chapter) => chapter.slug);
  if (weak.length > 0) {
    issues.push(`chapterLearning: weak or incomplete chapter learning metadata: ${weak.join(', ')}.`);
  }

  return dim(15, 15 * avg(rows), issues);
}

function scorePracticeConnection(resource, chapters) {
  const issues = [];
  const learning = resource.learning ?? {};
  const resourceRefs = countRefs(learning);
  const relatedGroups = [
    resource.relatedCanvasDefIds,
    resource.relatedCaseSlugs,
    resource.relatedPatternSlugs,
    resource.relatedExperimentSlugs,
    resource.relatedStrategyFrameworkSlugs,
  ];
  const resourceRelated = relatedGroups.reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
  const chapterConnections = chapters.filter((chapter) => hasAnyChapterRelation(chapter) || hasAnyRefs(chapter.learning)).length;
  const promptScore = ratio(bilingualCount(learning.practicePrompts), 1);
  const outcomeScore = ratio(bilingualCount(learning.outcomes), 1);

  const score = 15 * avg([
    ratio(resourceRefs, 3),
    ratio(resourceRelated, 3),
    chapters.length ? chapterConnections / chapters.length : 0,
    promptScore,
    outcomeScore,
  ]);

  if (resourceRefs < 3) issues.push('practiceConnection: resource learning should point to source, related, and next references.');
  if (resourceRelated < 3) issues.push('practiceConnection: resource should connect to canvases/cases/patterns/experiments.');
  if (chapterConnections < chapters.length) issues.push('practiceConnection: every chapter should land on at least one canvas, case, pattern, experiment, or learning ref.');
  if (promptScore < 1) issues.push('practiceConnection: add resource-level practicePrompts.');

  return dim(15, score, issues);
}

function scoreSourceGovernance({ slug, dir, resource, auditReport, checklists, chapters }) {
  const issues = [];
  const sourceScore = ratio((resource.sources ?? []).length, 2);
  const bibliographicScore = ['authors', 'publisher', 'year'].filter((field) => {
    const value = resource[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length / 3;
  const auditScore = /Overall:[\s\S]*PASS/i.test(auditReport) ? 1 : 0;
  const checklistScore = chapters.length ? ratio(checklists.size, chapters.length) : 0;
  const extractScore = (EXTRACT_DIRS[slug] ?? []).some((relPath) => existsSync(join(dir, relPath))) ? 1 : 0;

  if (sourceScore < 1) issues.push('sourceGovernance: add at least two source rows.');
  if (bibliographicScore < 1) issues.push('sourceGovernance: fill authors, publisher, and year.');
  if (auditScore < 1) issues.push('sourceGovernance: audit-report.md must include Overall PASS.');
  if (checklistScore < 1) issues.push('sourceGovernance: checklist coverage is incomplete.');
  if (extractScore < 1) issues.push('sourceGovernance: expected extracts directory is missing or not mapped.');

  return dim(10, 10 * avg([sourceScore, bibliographicScore, auditScore, checklistScore, extractScore]), issues);
}

async function loadChapterStats(dir, chapters) {
  const chapterDir = join(dir, 'chapters');
  return Promise.all(chapters.map(async (chapter) => {
    const en = await optionalText(join(chapterDir, `${chapter.slug}.en.md`));
    const zh = await optionalText(join(chapterDir, `${chapter.slug}.zh.md`));
    return {
      slug: chapter.slug,
      hasEn: hasText(en),
      hasZh: hasText(zh),
      enLength: en.length,
      zhLength: zh.length,
    };
  }));
}

function improvementList(dimensions, caps) {
  const issues = [];
  for (const cap of caps) issues.push(cap.reason);
  for (const [key] of DIMENSIONS) {
    issues.push(...dimensions[key].issues.slice(0, 3));
  }
  return issues.slice(0, 8);
}

function printReport(rows) {
  console.log('Resource Knowledge Quality Audit');
  console.log(`Rows: ${rows.length}`);
  console.log('');
  console.log('Score  Grade  Chapters  Resource');
  console.log('-----  -----  --------  --------');
  for (const row of rows) {
    console.log(`${String(row.score).padStart(5)}  ${row.grade.padEnd(5)}  ${String(row.chapters).padStart(8)}  ${row.slug}`);
    const weak = DIMENSIONS
      .map(([key, name, max]) => [name, row.dimensions[key].score, max])
      .filter(([, score, max]) => score < max * 0.92)
      .map(([name, score, max]) => `${name} ${round1(score)}/${max}`);
    if (weak.length > 0) console.log(`       Weak: ${weak.join('; ')}`);
    for (const issue of row.improvements.slice(0, 4)) console.log(`       - ${issue}`);
  }
}

async function childDirs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const result = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if ((await stat(path)).isDirectory()) result.push(entry);
  }
  return result.sort();
}

async function childFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const result = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if ((await stat(path)).isFile()) result.push(entry);
  }
  return result.sort();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function optionalText(path) {
  if (!existsSync(path)) return '';
  return readFile(path, 'utf8');
}

function label(value, fallback) {
  if (!value) return fallback;
  return value.en || value.zh || fallback;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasBilingualLabel(value) {
  return Boolean(value && hasText(value.en) && hasText(value.zh));
}

function bilingualCount(values) {
  return Array.isArray(values) ? values.filter((value) => hasBilingualLabel(value)).length : 0;
}

function hasAnyRefs(learning) {
  if (!learning) return false;
  return ['sourceRefs', 'relatedRefs', 'nextRefs'].some((key) => (learning[key]?.length ?? 0) > 0);
}

function countRefs(learning) {
  if (!learning) return 0;
  return ['sourceRefs', 'relatedRefs', 'nextRefs'].reduce((sum, key) => sum + (learning[key]?.length ?? 0), 0);
}

function hasAnyChapterRelation(chapter) {
  return [
    chapter.relatedCanvasDefIds,
    chapter.relatedCaseSlugs,
    chapter.relatedPatternSlugs,
    chapter.relatedExperimentSlugs,
    chapter.relatedStrategyFrameworkSlugs,
  ].some((rows) => (rows?.length ?? 0) > 0);
}

function markdownHeadingCount(markdown) {
  return (markdown.match(/^#{2,4}\s+/gm) ?? []).length;
}

function keywordHits(text, keywords) {
  const haystack = text.toLowerCase();
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(value, target) {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, value / target));
}

function dim(max, score, issues) {
  return { score: round1(Math.max(0, Math.min(max, score))), max, issues };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function gradeFor(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
