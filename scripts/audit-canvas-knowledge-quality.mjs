import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CANVAS_DIR = join(ROOT, 'packages/canvases');

const FIRST_SLICE_CANVASES = [
  'business-model-canvas',
  'platform-ecosystem-map',
  'blue-ocean-strategy-canvas',
  'evidence-scorecard',
  'scenario-matrix',
];

const DIMENSIONS = [
  ['surface', 'Surface readiness', 15],
  ['manual', 'Canvas manual', 14],
  ['modules', 'Module coverage', 16],
  ['depth', 'Module depth', 16],
  ['scaffolding', 'Beginner scaffolding', 12],
  ['practice', 'Practice transfer', 10],
  ['reuse', 'Reuse navigation', 10],
  ['sources', 'Source governance', 4],
  ['bilingual', 'Bilingual parity', 3],
];

const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');
const firstSliceOnly = args.has('--first-slice');
const failUnder = Number(
  process.argv
    .find((arg) => arg.startsWith('--fail-under='))
    ?.split('=')[1] ?? '0',
);

async function main() {
  const slugs = firstSliceOnly ? FIRST_SLICE_CANVASES : await childDirs(CANVAS_DIR);
  const rows = [];

  for (const slug of slugs) {
    const dir = join(CANVAS_DIR, slug);
    const manifestPath = join(dir, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    rows.push(await auditCanvas(slug, dir));
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

async function auditCanvas(slug, dir) {
  const manifestPath = join(dir, 'manifest.json');
  const manifest = await readJson(manifestPath);
  const name = label(manifest.name, slug);
  const knowledgeDir = join(dir, 'knowledge');
  const intro = {
    en: await optionalText(join(knowledgeDir, 'intro.en.md')),
    zh: await optionalText(join(knowledgeDir, 'intro.zh.md')),
  };
  const body = {
    en: await optionalText(join(knowledgeDir, 'body.en.md')),
    zh: await optionalText(join(knowledgeDir, 'body.zh.md')),
  };
  const i18n = {
    en: await optionalJson(join(dir, 'i18n/en.json')),
    zh: await optionalJson(join(dir, 'i18n/zh.json')),
  };
  const zones = Array.isArray(manifest.zones) ? manifest.zones : [];
  const blocks = await loadBlockStats(knowledgeDir, zones, i18n);
  const sourceLedger = await optionalJson(join(knowledgeDir, 'source-ledger.json'));
  const allText = [intro.en, intro.zh, body.en, body.zh, ...blocks.flatMap((block) => [block.en, block.zh])].join('\n\n');

  const dimensions = {
    surface: scoreSurfaceReadiness(manifest, intro, body, blocks, zones),
    manual: scoreManual(intro, body, allText),
    modules: scoreModules(zones, blocks),
    depth: scoreDepth(zones, blocks, sourceLedger),
    scaffolding: scoreScaffolding(allText),
    practice: scorePractice(allText, manifest),
    reuse: scoreReuse(manifest),
    sources: scoreSources(sourceLedger, zones),
    bilingual: scoreBilingual(intro, body, blocks, i18n, zones),
  };
  const rawScore = Object.values(dimensions).reduce((sum, item) => sum + item.score, 0);
  const score = round1(applyQualityCaps(rawScore, dimensions, sourceLedger, zones, blocks, manifest));

  return {
    slug,
    name,
    path: relative(ROOT, dir),
    score,
    grade: gradeFor(score),
    priority: priorityFor(score),
    firstSlice: FIRST_SLICE_CANVASES.includes(slug),
    stats: {
      zones: zones.length,
      bilingualBlockFiles: blocks.filter((block) => block.hasEn && block.hasZh).length,
      introChars: { en: intro.en.length, zh: intro.zh.length },
      bodyChars: { en: body.en.length, zh: body.zh.length },
    },
    dimensions,
    improvements: improvementList({ slug, zones, blocks, intro, body, manifest, dimensions }),
  };
}

function scoreSurfaceReadiness(manifest, intro, body, blocks, zones) {
  const issues = [];
  const learning = scoreLearningGuideReadiness(manifest.learning);
  const introReady = scoreIntroReadiness(intro);
  const bodyReady = scoreBodyHandoffReadiness(body, blocks, zones);

  issues.push(...learning.issues, ...introReady.issues, ...bodyReady.issues);

  return dim(
    15,
    5 * learning.ratio + 7 * introReady.ratio + 3 * bodyReady.ratio,
    issues,
    {
      learningGuideReadiness: round1(learning.ratio * 100),
      introReadiness: round1(introReady.ratio * 100),
      bodyHandoffReadiness: round1(bodyReady.ratio * 100),
    },
  );
}

function scoreLearningGuideReadiness(learning) {
  const issues = [];
  if (!learning) {
    return {
      ratio: 0,
      issues: ['learningGuideReadiness: add manifest.learning; default modal guide cannot be empty.'],
    };
  }

  let score = 0;
  for (const field of ['headline', 'whyOpen', 'audience']) {
    if (hasBilingualLabel(learning[field])) score += 1;
    else issues.push(`learningGuideReadiness: add bilingual learning.${field}.`);
  }

  for (const [field, target, weight] of [
    ['keyConcepts', 3, 1.25],
    ['firstSteps', 2, 1],
    ['outcomes', 1, 1],
    ['practicePrompts', 1, 1],
  ]) {
    const items = Array.isArray(learning[field]) ? learning[field] : [];
    const bilingualCount = items.filter((item) => hasBilingualLabel(item)).length;
    score += weight * ratio(bilingualCount, target);
    if (bilingualCount < target) {
      issues.push(`learningGuideReadiness: learning.${field} needs ${target} bilingual item(s).`);
    }
  }

  for (const group of ['sourceRefs', 'relatedRefs', 'nextRefs']) {
    if ((learning[group]?.length ?? 0) > 0) score += 0.75;
    else issues.push(`learningGuideReadiness: add learning.${group}.`);
  }

  if ((learning.commonMisreads ?? []).some((item) => hasBilingualLabel(item))) score += 0.5;

  return { ratio: ratio(score, 11.75), issues };
}

function scoreIntroReadiness(intro) {
  const issues = [];
  const text = `${intro.en}\n${intro.zh}`;
  const hasPair = hasText(intro.en) && hasText(intro.zh);
  const thickness = avg([ratio(intro.en.length, 900), ratio(intro.zh.length, 420)]);
  const headings = markdownHeadingCount(intro.en) + markdownHeadingCount(intro.zh);
  const sectionShape = ratio(headings, 4);
  const cueGroups = [
    ['problem scenario', ['problem', 'question', 'decide', 'portfolio', '场景', '问题', '判断', '组合']],
    ['use and not-use', ['when to use', 'use it when', 'when not', 'skip', 'not use', '适合', '何时', '不适合', '不用']],
    ['pre-read concepts', ['concept', 'means', 'definition', 'growth', 'share', '概念', '意味着', '定义', '增长', '份额']],
    ['first step', ['first', 'start', 'step', 'begin', '先', '第一步', '开始', '步骤']],
    ['output', ['output', 'produce', 'decision', 'action', '产出', '得到', '决策', '动作']],
    ['next step', ['next', 'related', 'canvas', 'experiment', '下一步', '下一张', '相关', '画布', '实验']],
  ];
  const cueHits = cueGroups.filter(([, terms]) => keywordHits(text, terms) > 0).length;

  if (!hasPair) issues.push('introReadiness: add bilingual intro files.');
  if (intro.en.length < 900 || intro.zh.length < 420) {
    issues.push('introReadiness: intro must be thick enough to stand alone in the modal usage tab.');
  }
  if (headings < 4) issues.push('introReadiness: intro needs section headings for scenario, use/not-use, first step, output, and next step.');
  if (cueHits < cueGroups.length) {
    const missing = cueGroups
      .filter(([, terms]) => keywordHits(text, terms) === 0)
      .map(([name]) => name);
    issues.push(`introReadiness: intro is missing ${missing.join(', ')}.`);
  }

  return {
    ratio: avg([hasPair ? 1 : 0, thickness, sectionShape, cueHits / cueGroups.length]),
    issues,
  };
}

function scoreBodyHandoffReadiness(body, blocks, zones) {
  const issues = [];
  const text = `${body.en}\n${body.zh}`;
  const bodyPair = hasText(body.en) && hasText(body.zh);
  const modulePairRatio = zones.length
    ? blocks.filter((block) => block.hasEn && block.hasZh).length / zones.length
    : 1;
  const hasDocShape =
    keywordHits(text, [
      'input',
      'output',
      'sequence',
      'quality checklist',
      'quality habits',
      'common mistakes',
      'failure modes',
      'tips',
      'how to fill',
      'what this canvas is not',
      '输入',
      '输出',
      '顺序',
      '质量检查',
      '常见误用',
      '填写',
      '提示',
      '不是',
    ]) >= 3;
  const hasHandoff =
    keywordHits(text, [
      'module',
      'block',
      'next canvas',
      'related',
      'experiment',
      'pair with',
      'pairs with',
      'feed into',
      'downstream',
      'what to do with',
      'BMC',
      'VPC',
      '模块',
      '下一张',
      '相关',
      '实验',
      '配合',
      '进入',
      '下一步',
    ]) >= 2;

  if (!bodyPair) issues.push('bodyHandoffReadiness: add bilingual body manual.');
  if (!hasDocShape) issues.push('bodyHandoffReadiness: body must explain inputs, outputs, fill order, quality checks, or mistakes.');
  if (!hasHandoff) issues.push('bodyHandoffReadiness: body must hand off to modules, related canvas, or experiment.');
  if (modulePairRatio < 1) issues.push('bodyHandoffReadiness: every module needs bilingual block docs.');

  return {
    ratio: avg([bodyPair ? 1 : 0, hasDocShape ? 1 : 0, hasHandoff ? 1 : 0, modulePairRatio]),
    issues,
  };
}

function scoreManual(intro, body, allText) {
  const issues = [];
  let score = 0;

  const hasIntroPair = hasText(intro.en) && hasText(intro.zh);
  const hasBodyPair = hasText(body.en) && hasText(body.zh);
  if (hasIntroPair) score += 3;
  else issues.push('Add bilingual intro files.');
  if (hasBodyPair) score += 3;
  else issues.push('Add bilingual body files.');

  score += 6 * avg([
    ratio(intro.en.length, 600),
    ratio(intro.zh.length, 300),
    ratio(body.en.length, 1400),
    ratio(body.zh.length, 800),
  ]);

  const headingCount = markdownHeadingCount(body.en) + markdownHeadingCount(body.zh);
  score += 4 * ratio(headingCount, 8);
  if (headingCount < 4) issues.push('Structure body as a readable manual with more section headings.');

  const operatingCues = keywordHits(allText, [
    'when to use',
    'when not',
    'input',
    'output',
    'sequence',
    'first',
    'next',
    '何时',
    '不适合',
    '输入',
    '输出',
    '顺序',
    '先',
    '下一',
  ]);
  score += 4 * ratio(operatingCues, 6);
  if (operatingCues < 4) issues.push('Explain when to use it, when not to use it, inputs, outputs, and fill order.');

  return dim(14, score * 0.7, issues);
}

function scoreModules(zones, blocks) {
  const issues = [];
  if (zones.length === 0) return dim(16, 12.4, ['Canvas has no zones; module chapter score is capped.']);

  const fullPairs = blocks.filter((block) => block.hasEn && block.hasZh).length;
  const i18nCoverage = blocks.filter((block) => block.hasPrompt && block.hasExamples).length;
  const exampleQuestionBlocks = blocks.filter((block) =>
    keywordHits(block.en + block.zh, ['example', 'question', 'sticky', '示例', '问题', '便签']) >= 2,
  ).length;

  let score = 0;
  score += 10 * (fullPairs / zones.length);
  score += 4 * (i18nCoverage / zones.length);
  score += 4 * (exampleQuestionBlocks / zones.length);

  const missing = blocks.filter((block) => !(block.hasEn && block.hasZh)).map((block) => block.id);
  if (missing.length > 0) issues.push(`Add bilingual module markdown for ${missing.length} zone(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '...' : ''}.`);
  if (i18nCoverage < zones.length) issues.push('Fill i18n prompt/examples for every module so cards and fallback docs stay useful.');

  return dim(16, score * (16 / 18), issues);
}

function scoreDepth(zones, blocks, sourceLedger) {
  const issues = [];
  if (zones.length === 0) return dim(16, 12, ['Canvas has no zones; depth score is capped.']);

  const coverage = sourceLedger?.coverage?.blocks ?? {};
  const rows = blocks.map((block) => {
    const text = `${block.en}\n${block.zh}`;
    const enChars = block.en.length;
    const zhChars = block.zh.length;
    const structureHits = [
      keywordHits(text, ['purpose', 'module', '作用', '模块']) > 0 || enChars > 700 || zhChars > 350,
      keywordHits(text, ['good answer', 'weak answer', 'good vs', 'quality checklist', 'check', '好答案', '弱答案', '质量']) > 0,
      keywordHits(text, ['pitfall', 'mistake', 'misread', 'avoid', 'common', '误区', '常见', '避免']) > 0,
      keywordHits(text, ['example', 'case', 'sticky', 'note', '示例', '案例', '便签']) > 0,
      keywordHits(text, ['transfer question', 'question', 'your project', 'your business', '迁移问题', '问题', '自己的项目']) > 0,
      refsFor(coverage[block.id]).length > 0 || keywordHits(text, ['source', 'reference', 'book', '来源', '参考', '书']) > 0,
    ].filter(Boolean).length;
    const thickness = avg([ratio(enChars, 900), ratio(zhChars, 450)]);
    const shallowTemplate =
      /^# .+\n+\s*.+?\n+\s*## Examples[\s\S]+?## Flow[\s\S]+$/m.test(block.en.trim()) &&
      structureHits < 4;
    return {
      id: block.id,
      score: avg([structureHits / 6, thickness]) * (shallowTemplate ? 0.55 : 1),
      structureHits,
      shallowTemplate,
    };
  });

  const avgDepth = avg(rows.map((row) => row.score));
  const shallow = rows.filter((row) => row.structureHits < 4 || row.shallowTemplate);
  const noGoodWeak = rows.filter((row) => row.structureHits < 2);

  if (shallow.length > 0) {
    issues.push(`Deepen shallow module chapter(s): ${shallow.slice(0, 8).map((row) => row.id).join(', ')}${shallow.length > 8 ? '...' : ''}.`);
  }
  if (noGoodWeak.length > 0) {
    issues.push('Module chapters need teaching structure: purpose, good/weak answers, pitfalls, examples, transfer questions, and source grounding.');
  }

  return dim(16, 16 * avgDepth, issues);
}

function scoreScaffolding(allText) {
  const conceptHits = keywordHits(allText, ['concept', 'means', 'definition', 'why', '概念', '意味着', '定义', '为什么']);
  const mistakeHits = keywordHits(allText, ['mistake', 'misread', 'avoid', 'not ', 'common', '误区', '不要', '不是', '常见']);
  const exampleHits = keywordHits(allText, ['example', 'case', 'Uber', 'Airbnb', 'Nespresso', '示例', '案例', '比如']);
  const pathHits = keywordHits(allText, ['first', 'then', 'step', 'sequence', 'start', '先', '然后', '步骤', '顺序', '开始']);
  const issues = [];

  if (conceptHits < 3) issues.push('Add beginner concept explanations before advanced terms.');
  if (mistakeHits < 3) issues.push('Add common mistakes and misreadings.');
  if (exampleHits < 3) issues.push('Add concrete cases or sticky-level examples.');
  if (pathHits < 3) issues.push('Add a recommended reading/filling path.');

  const score =
    5 * ratio(conceptHits, 5) +
    5 * ratio(mistakeHits, 5) +
    5 * ratio(exampleHits, 5) +
    5 * ratio(pathHits, 5);
  return dim(12, score * 0.6, issues);
}

function scorePractice(allText, manifest) {
  const stickyHits = keywordHits(allText, ['sticky', 'note', 'write', '便签', '写下', '写成']);
  const transferHits = keywordHits(allText, ['your project', 'your business', 'ask', 'question', '自己的项目', '你的项目', '提问', '问题']);
  const nextHits = keywordHits(allText, ['next canvas', 'related', 'BMC', 'VPC', 'experiment', '下一张', '相关', '画布', '实验']);
  const outputHits = keywordHits(allText, ['output', 'decision', 'produce', '结果', '产出', '决策']);
  const issues = [];

  if (stickyHits < 3) issues.push('Include sticky-ready examples, not only explanations.');
  if (transferHits < 3) issues.push('Add transfer questions that help readers apply the canvas to their own project.');
  if (nextHits < 3 && !(manifest.related?.length > 0)) issues.push('Name the next canvas or adjacent method.');
  if (outputHits < 2) issues.push('Clarify what the reader should produce after reading/filling this canvas.');

  const score =
    4 * ratio(stickyHits, 5) +
    4 * ratio(transferHits, 5) +
    4 * ratio(nextHits + (manifest.related?.length ?? 0), 5) +
    3 * ratio(outputHits, 3);
  return dim(10, score * (10 / 15), issues);
}

function scoreReuse(manifest) {
  const issues = [];
  let score = 0;
  const learning = manifest.learning;
  if (learning?.headline?.en && learning?.headline?.zh && learning?.whyOpen?.en && learning?.whyOpen?.zh) score += 4;
  else issues.push('Add bilingual learning.headline and learning.whyOpen metadata.');

  const refCount = [
    ...(learning?.sourceRefs ?? []),
    ...(learning?.relatedRefs ?? []),
    ...(learning?.nextRefs ?? []),
  ].length;
  score += 4 * ratio(refCount, 5);
  if (refCount < 3) issues.push('Add source, related, and next LearningReference links.');

  score += 3 * ratio((manifest.related?.length ?? 0) + (manifest.defaultColorLegend?.length ?? 0), 5);
  if (!manifest.related?.length) issues.push('Add related canvas links.');
  if (!manifest.defaultColorLegend?.length) issues.push('Add defaultColorLegend so examples carry meaning without duplicated prose.');

  const navFields = [
    learning?.audience,
    ...(learning?.keyConcepts ?? []),
    ...(learning?.firstSteps ?? []),
    ...(learning?.practicePrompts ?? []),
  ].filter(Boolean);
  score += 2 * ratio(navFields.length, 8);
  if (navFields.length < 5) issues.push('Add short learning navigation metadata for cards and modal guide.');

  const longLabels = navFields.some((field) => (field.en?.length ?? 0) > 700 || (field.zh?.length ?? 0) > 700);
  if (!longLabels) score += 2;
  else issues.push('Move long learning metadata prose back into knowledge markdown.');

  return dim(10, score * (10 / 15), issues);
}

function scoreSources(sourceLedger, zones) {
  const issues = [];
  if (!sourceLedger) return dim(4, 0, ['Add knowledge/source-ledger.json; canvases without source governance cannot earn an A.']);

  const sourceCount = Array.isArray(sourceLedger.sources) ? sourceLedger.sources.length : 0;
  const introRefs = refsFor(sourceLedger.coverage?.intro);
  const bodyRefs = refsFor(sourceLedger.coverage?.body);
  const blockCoverage = zones.length
    ? zones.filter((zone) => refsFor(sourceLedger.coverage?.blocks?.[zone.id]).length > 0).length / zones.length
    : 1;

  let score = 0;
  score += 1 * ratio(sourceCount, 2);
  score += 1 * ratio(introRefs.length, 2);
  score += 1 * ratio(bodyRefs.length, 2);
  score += 2 * blockCoverage;

  if (sourceCount < 2) issues.push('Each canvas needs at least two qualified sources.');
  if (introRefs.length < 2 || bodyRefs.length < 2) issues.push('Intro and body should each cite at least two sources.');
  if (blockCoverage < 1) issues.push('Every module block needs source coverage.');

  return dim(4, score * (4 / 5), issues);
}

function scoreBilingual(intro, body, blocks, i18n, zones) {
  const issues = [];
  let score = 0;
  if (hasText(intro.en) === hasText(intro.zh)) score += 1;
  else issues.push('Intro exists in only one language.');
  if (hasText(body.en) === hasText(body.zh)) score += 1;
  else issues.push('Body exists in only one language.');
  if (zones.length > 0) {
    score += 2 * (blocks.filter((block) => block.hasEn === block.hasZh).length / zones.length);
    score += 1 * (zones.filter((zone) => hasI18nBlock(i18n.en, zone.id) && hasI18nBlock(i18n.zh, zone.id)).length / zones.length);
  } else {
    score += 3;
  }
  if (score < 4.5) issues.push('Keep EN/ZH block docs and i18n prompts in pairs.');
  return dim(3, score * (3 / 5), issues);
}

function improvementList({ zones, blocks, intro, body, manifest, dimensions }) {
  const items = [];
  for (const [id, labelName] of DIMENSIONS) {
    const dimension = dimensions[id];
    if (dimension.score < dimension.max * 0.72) {
      for (const issue of dimension.issues.slice(0, 2)) items.push(`${labelName}: ${issue}`);
    }
  }
  if (zones.length > 1 && blocks.filter((block) => block.hasEn && block.hasZh).length === 0) {
    items.unshift('First upgrade slice: create bilingual module chapters for every zone, using existing i18n prompt/examples as the seed.');
  }
  if (intro.zh.length < 420 || intro.en.length < 900) {
    items.unshift('Strengthen the usage intro so it can stand alone as the modal usage tab: scenario, use/not-use, first step, output, and next step.');
  }
  if (body.zh.length < 800 || body.en.length < 1400) {
    items.unshift('Strengthen the canvas-level body into a real manual: purpose, use/not-use, inputs/outputs, fill order, cases, and next canvas.');
  }
  if (!manifest.learning) {
    items.push('Add lightweight learning metadata; keep long prose in knowledge markdown.');
  }
  return [...new Set(items)].slice(0, 6);
}

async function loadBlockStats(knowledgeDir, zones, i18n) {
  return Promise.all(
    zones.map(async (zone) => {
      const en = await optionalText(join(knowledgeDir, 'blocks', `${zone.id}.en.md`));
      const zh = await optionalText(join(knowledgeDir, 'blocks', `${zone.id}.zh.md`));
      const enBlock = i18n.en?.blocks?.[zone.id];
      const zhBlock = i18n.zh?.blocks?.[zone.id];
      return {
        id: zone.id,
        en,
        zh,
        hasEn: hasText(en),
        hasZh: hasText(zh),
        hasPrompt: Boolean(enBlock?.prompt?.trim() && zhBlock?.prompt?.trim()),
        hasExamples: Boolean((enBlock?.examples?.length ?? 0) > 0 && (zhBlock?.examples?.length ?? 0) > 0),
      };
    }),
  );
}

function printReport(rows) {
  printSection('Canvas Knowledge Quality Audit');
  const average = rows.length ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : 0;
  console.log(`Canvases: ${rows.length}`);
  console.log(`Average score: ${round1(average)}`);
  console.log(`Scope: ${firstSliceOnly ? 'first slice' : 'all canvas bundles'}`);
  console.log('');

  console.log(['Score', 'Grade', 'Priority', 'Canvas', 'Blocks', 'Weakest dimensions'].join('  '));
  console.log('-----  -----  --------  ------------------------------  -------  ------------------');
  for (const row of rows) {
    const weakest = Object.entries(row.dimensions)
      .sort((a, b) => a[1].score / a[1].max - b[1].score / b[1].max)
      .slice(0, 2)
      .map(([id, item]) => formatDimensionSummary(id, item))
      .join(', ');
    console.log([
      String(row.score).padStart(5),
      row.grade.padEnd(5),
      row.priority.padEnd(8),
      row.slug.padEnd(30),
      `${row.stats.bilingualBlockFiles}/${row.stats.zones}`.padEnd(7),
      weakest,
    ].join('  '));
  }

  const focus = rows.filter((row) => row.priority !== 'maintain').slice(0, 8);
  if (focus.length > 0) {
    printSection('Recommended Upgrade Focus');
    for (const row of focus) {
      console.log(`- ${row.slug} (${row.score}, ${row.priority}): ${row.improvements[0] ?? 'Keep improving learner scaffolding.'}`);
    }
  }
}

function dim(max, score, issues = [], details = undefined) {
  const row = { score: round1(Math.min(max, Math.max(0, score))), max, issues };
  if (details) row.details = details;
  return row;
}

function formatDimensionSummary(id, item) {
  const base = `${id} ${round1(item.score)}/${item.max}`;
  if (id !== 'surface' || !item.details) return base;
  return `${base} (guide ${item.details.learningGuideReadiness}, intro ${item.details.introReadiness}, body ${item.details.bodyHandoffReadiness})`;
}

function applyQualityCaps(rawScore, dimensions, sourceLedger, zones, blocks, manifest) {
  let score = sourceLedger ? rawScore : Math.min(rawScore, 84.9);
  if (!manifest.learning) score = Math.min(score, 84.9);
  if ((dimensions.surface.details?.learningGuideReadiness ?? 0) < 80) score = Math.min(score, 89.9);
  if ((dimensions.surface.details?.introReadiness ?? 0) < 80) score = Math.min(score, 89.9);
  if ((dimensions.surface.details?.bodyHandoffReadiness ?? 0) < 70) score = Math.min(score, 89.9);
  if (zones.length > 0 && blocks.filter((block) => block.hasEn && block.hasZh).length < zones.length) {
    score = Math.min(score, 89.9);
  }
  return score;
}

function ratio(value, target) {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, value / target));
}

function avg(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function keywordHits(text, terms) {
  const normalized = text.toLowerCase();
  return terms.reduce((count, term) => {
    const needle = term.toLowerCase();
    return normalized.includes(needle) ? count + 1 : count;
  }, 0);
}

function refsFor(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function markdownHeadingCount(text) {
  return (text.match(/^#{1,3}\s+/gm) ?? []).length;
}

function hasText(text) {
  return Boolean(text?.trim());
}

function hasBilingualLabel(label) {
  return Boolean(label?.en?.trim() && label?.zh?.trim());
}

function hasI18nBlock(i18n, zoneId) {
  const block = i18n?.blocks?.[zoneId];
  return Boolean(block?.title?.trim() && block?.prompt?.trim());
}

function label(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  return value.en || value.zh || fallback;
}

function gradeFor(score) {
  if (score >= 90) return 'A';
  if (score >= 72) return 'B';
  if (score >= 58) return 'C';
  return 'D';
}

function priorityFor(score) {
  if (score >= 90) return 'maintain';
  if (score >= 72) return 'medium';
  if (score >= 58) return 'high';
  return 'urgent';
}

function round1(value) {
  return Math.round(value * 10) / 10;
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

function printSection(title) {
  console.log(`\n== ${title} ==`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
