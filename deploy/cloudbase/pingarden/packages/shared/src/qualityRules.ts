/**
 * Three-layer quality rules for PinGarden drafts.
 *
 * - **Hard rules** live here in `shared` so the server (prompt injection,
 *   future server-side apply gate) and the web client (parse-time
 *   decoration, apply button gating) consume one source of truth.
 * - **Soft hints** are canvas-specific copy surfaced to the user from
 *   `CanvasDef.quality.softHints` (manifest). They never block apply.
 * - A draft's `quality` field carries the merged `QualityIssue[]` with
 *   per-issue `severity`, `code`, bilingual `message`, and a `target`
 *   pointer so the UI can group issues by canvas / story / project.
 */
import type { Lang, LocalizedLabel } from './index.js';
import type {
  CopilotDraftCanvas,
  CopilotDraftStory,
  CopilotProjectDraft,
  CopilotProjectUpdateDraft,
  CopilotProjectUpdateOperation,
} from './copilot.js';

export type QualitySeverity = 'hard' | 'soft';

export type QualityTarget =
  | { kind: 'project'; field: 'name' | 'description' | 'coverage' }
  | { kind: 'canvas'; defId: string; canvasIndex: number; zoneId?: string }
  | { kind: 'story'; storyIndex: number; field?: 'title' | 'content' | 'directive' }
  | { kind: 'operation'; operationIndex: number; field?: 'stickies' | 'title' | 'content' };

export interface QualityIssue {
  severity: QualitySeverity;
  code: string;
  message: LocalizedLabel;
  target: QualityTarget;
}

export interface QualityReport {
  issues: QualityIssue[];
  hardCount: number;
  softCount: number;
}

export interface CanvasHardRules {
  /** Minimum stickies per zone id. Zones in the manifest not listed here
   *  default to `minPerZoneDefault`. Sticky-style canvases typically list
   *  every zone id with at least 1; pin/chart canvases list nothing here. */
  minStickiesByZone?: Record<string, number>;
  /** Fallback minimum when a zone isn't explicitly listed. */
  minPerZoneDefault?: number;
  /** Pin/chart canvases only. Minimum pins per class id. */
  minPinsByClass?: Record<string, number>;
  /** Pin/chart canvases only. Minimum distinct pin classes (curves). */
  minPinClasses?: number;
  /** Pin/chart canvases only. Minimum xAxisItems (factors / stages). */
  minXAxisItems?: number;
  /** Total minimum stickies on the canvas (across all zones). 0 disables. */
  minStickiesTotal?: number;
}

const MESSAGES = {
  projectNameEmpty: {
    en: 'Project name is required.',
    zh: '项目名称不能为空。',
  },
  projectNameTooShort: {
    en: 'Project name should be at least {min} characters.',
    zh: '项目名称至少需要 {min} 个字符。',
  },
  projectDescriptionEmpty: {
    en: 'Project description is required.',
    zh: '项目描述不能为空。',
  },
  projectDescriptionTooShort: {
    en: 'Project description should be at least {min} characters.',
    zh: '项目描述至少需要 {min} 个字符。',
  },
  noCanvas: {
    en: 'A project must include at least one canvas.',
    zh: '项目至少需要包含一张画布。',
  },
  emptyCanvas: {
    en: 'Canvas "{title}" has no stickies — every canvas needs at least one note.',
    zh: '画布「{title}」没有任何便签 —— 每张画布至少需要 1 条便签。',
  },
  zoneEmpty: {
    en: 'Canvas "{title}" is missing a sticky in zone "{zone}".',
    zh: '画布「{title}」在「{zone}」区域缺少便签。',
  },
  zoneSoftHint: {
    en: 'Canvas "{title}" has only {count} sticky in zone "{zone}" — methodology recommends at least {expected}.',
    zh: '画布「{title}」在「{zone}」区域只有 {count} 条便签 —— 方法论建议至少 {expected} 条。',
  },
  chartFewPins: {
    en: 'Chart "{title}" has only {count} pin(s) in class "{classId}" — methodology recommends at least {min}.',
    zh: '图表「{title}」在「{classId}」曲线只有 {count} 个 pin —— 方法论建议至少 {min} 个。',
  },
  chartFewClasses: {
    en: 'Chart "{title}" has only {count} curve(s) — methodology recommends at least {min}.',
    zh: '图表「{title}」只有 {count} 条曲线 —— 方法论建议至少 {min} 条。',
  },
  chartFewFactors: {
    en: 'Chart "{title}" has only {count} factor(s) on the X axis — methodology recommends at least {min}.',
    zh: '图表「{title}」X 轴只有 {count} 个因子 —— 方法论建议至少 {min} 个。',
  },
  storyTitleEmpty: {
    en: 'Story #{index} has an empty title.',
    zh: 'Story #{index} 标题为空。',
  },
  storyTitleShort: {
    en: 'Story "#{title}" title should be at least {min} characters.',
    zh: 'Story「{title}」标题至少需要 {min} 个字符。',
  },
  storyContentEmpty: {
    en: 'Story "#{title}" has empty content.',
    zh: 'Story「{title}」内容为空。',
  },
  storyContentShort: {
    en: 'Story "#{title}" content is only {count} characters — should be at least {min}.',
    zh: 'Story「{title}」内容只有 {count} 个字符 —— 至少需要 {min} 个。',
  },
  storyDirectiveUnknown: {
    en: 'Story "#{title}" references canvas def "{defId}" but the project has no canvas of that type.',
    zh: 'Story「{title}」引用了画布类型「{defId}」,但项目里没有该类型的画布。',
  },
  storyDirectiveUnknownCanvasId: {
    en: 'Story "#{title}" references canvasId "{canvasId}" which does not exist in this project.',
    zh: 'Story「{title}」引用了 canvasId「{canvasId}」,项目里找不到。',
  },
  operationEmptyStickies: {
    en: 'Operation #{index} (canvas) has no stickies.',
    zh: '操作 #{index}(画布)没有任何便签。',
  },
  operationEmptyStory: {
    en: 'Operation #{index} (story) has empty title or content.',
    zh: '操作 #{index}(Story)标题或内容为空。',
  },
  canvasIdNotInProject: {
    en: 'Operation #{index} targets canvasId "{canvasId}" which is outside this project.',
    zh: '操作 #{index} 指向的 canvasId「{canvasId}」不在本项目内。',
  },
  storyIdNotInProject: {
    en: 'Operation #{index} targets storyId "{storyId}" which is outside this project.',
    zh: '操作 #{index} 指向的 storyId「{storyId}」不在本项目内。',
  },
} as const satisfies Record<string, LocalizedLabel>;

function m<K extends keyof typeof MESSAGES>(key: K): LocalizedLabel {
  return MESSAGES[key];
}

function tmpl(label: LocalizedLabel, vars: Record<string, string | number>): LocalizedLabel {
  const format = (s: string) =>
    s.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const v = vars[name];
      return v === undefined ? `{${name}}` : String(v);
    });
  return { en: format(label.en), zh: format(label.zh) };
}

// ──────────────────────────────────────────────────────────────────────────
// Hard rules table — 20 canvases, curated baseline per methodology.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Methodology-grounded hard rules for every canvas shipped in
 * `packages/canvases/* /manifest.json`. A `minStickiesByZone` entry of
 * `1` is the floor; canvases that demand a richer baseline list higher
 * numbers (MoSCoW, JTBD, Customer Journey).
 *
 * Chart-canvas / pin-canvas canvases use `minPinsByClass` and
 * `minPinClasses` instead. `minXAxisItems` is shared by both
 * `blue-ocean-strategy-canvas` and the future journey-emotion chart.
 */
export const CANVAS_HARD_RULES: Record<string, CanvasHardRules> = {
  // 9-block Business Model Canvas — Osterwalder 2010
  // Each block needs at least one concrete note; key-resources and
  // key-activities usually need more but we keep 1 as the floor.
  'business-model-canvas': {
    minStickiesByZone: {
      'key-partners': 1,
      'key-activities': 1,
      'key-resources': 1,
      'value-propositions': 1,
      'customer-relationships': 1,
      channels: 1,
      'customer-segments': 1,
      'cost-structure': 1,
      'revenue-streams': 1,
    },
    minPerZoneDefault: 1,
  },
  // Value Proposition Canvas — 3 value-map + 3 customer-profile = 6 zones.
  'value-proposition-canvas': {
    minStickiesByZone: {
      'products-and-services': 1,
      'pain-relievers': 1,
      'gain-creators': 1,
      'customer-jobs': 1,
      pains: 1,
      gains: 1,
    },
    minPerZoneDefault: 1,
  },
  // JTBD Story — situation / motivation / ideal-outcome + emotional-social.
  'jobs-to-be-done': {
    minStickiesByZone: {
      situation: 1,
      motivation: 1,
      'ideal-outcome': 1,
      'emotional-social': 1,
    },
    minPerZoneDefault: 1,
  },
  // Customer Journey — persona + needs + key-moment + satisfaction.
  'customer-journey': {
    minStickiesByZone: {
      persona: 1,
      needs: 1,
      'key-moment': 1,
      satisfaction: 1,
    },
    minPerZoneDefault: 1,
  },
  // Empathy Map — persona + 4 directions + pain + gain = 7 zones.
  empathy_map: {
    minStickiesByZone: {
      persona: 1,
      'think-and-feel': 1,
      see: 1,
      'say-and-do': 1,
      hear: 1,
      pain: 1,
      gain: 1,
    },
    minPerZoneDefault: 1,
  },
  // Porter's Value Chain — 9 activities + margin. Support activities at
  // top, primary activities below. Each one matters for the analysis.
  'porters-value-chain': {
    minStickiesByZone: {
      'firm-infrastructure': 1,
      'human-resource-management': 1,
      'technology-development': 1,
      procurement: 1,
      'inbound-logistics': 1,
      operations: 1,
      'outbound-logistics': 1,
      'marketing-sales': 1,
      service: 1,
    },
    minPerZoneDefault: 1,
  },
  // Ansoff — 4 quadrants + growth-rationale.
  'ansoff-matrix': {
    minStickiesByZone: {
      'market-penetration': 1,
      'market-development': 1,
      'product-development': 1,
      diversification: 1,
      'growth-rationale': 1,
    },
    minPerZoneDefault: 1,
  },
  // BCG — 4 quadrants + portfolio-actions.
  'bcg-growth-share-matrix': {
    minStickiesByZone: {
      stars: 1,
      'cash-cows': 1,
      'question-marks': 1,
      dogs: 1,
      'portfolio-actions': 1,
    },
    minPerZoneDefault: 1,
  },
  // Business Model Environment — 4 PESTEL-style zones.
  'business-model-environment': {
    minStickiesByZone: {
      'key-trends': 1,
      'industry-forces': 1,
      'market-forces': 1,
      'macroeconomic-forces': 1,
    },
    minPerZoneDefault: 1,
  },
  // Disruption Diagnosis — 6 zones, all required.
  'disruption-diagnosis': {
    minStickiesByZone: {
      'foothold-customer': 1,
      'worse-on-dimension': 1,
      'acceptable-on-dimension': 1,
      'incumbent-rational-ignore': 1,
      'upmarket-migration-path': 1,
      'riskiest-assumptions': 1,
    },
    minPerZoneDefault: 1,
  },
  // Design Criteria — MoSCoW: all 4 quadrants must have at least 1
  // candidate, otherwise the team is shipping wishlist.
  'design-criteria-canvas': {
    minStickiesByZone: {
      'must-have': 1,
      'should-have': 1,
      'could-have': 1,
      'wont-have': 1,
    },
    minPerZoneDefault: 1,
  },
  // Evidence Scorecard — 7 zones.
  'evidence-scorecard': {
    minStickiesByZone: {
      'critical-assumption': 1,
      'current-evidence': 1,
      'evidence-strength': 1,
      'learning-velocity': 1,
      'risk-reduction': 1,
      'portfolio-decision': 1,
      'next-experiment': 1,
    },
    minPerZoneDefault: 1,
  },
  // Experiment Canvas — 6 zones. The first three (assumption / hypothesis /
  // setup) are non-negotiable; the last three may be empty until run.
  'experiment-canvas': {
    minStickiesByZone: {
      'riskiest-assumption': 1,
      'falsifiable-hypothesis': 1,
      'experiment-setup': 1,
      'metrics-criteria': 1,
      'results-conclusion': 1,
      'next-steps': 1,
    },
    minPerZoneDefault: 1,
  },
  // Innovation Culture Map — 6 zones. Current/desired side-by-side.
  'innovation-culture-map': {
    minStickiesByZone: {
      'current-outcomes': 1,
      'desired-outcomes': 1,
      'current-behaviors': 1,
      'desired-behaviors': 1,
      'current-enablers-blockers': 1,
      'desired-enablers-blockers': 1,
    },
    minPerZoneDefault: 1,
  },
  // Platform Ecosystem Map — 7 zones. Each row of the map is a row of
  // analysis; missing a row means the team skipped a major risk lens.
  'platform-ecosystem-map': {
    minStickiesByZone: {
      'demand-side': 1,
      'core-interaction': 1,
      'supply-side': 1,
      'network-effects': 1,
      'governance-trust': 1,
      monetization: 1,
      'cold-start-risks': 1,
    },
    minPerZoneDefault: 1,
  },
  // Portfolio Map — pin/chart-free; it's a scatter plot of bets. Pins
  // only, so we set a soft min via manifest. No sticky zones.
  'portfolio-map': {
    minStickiesByZone: {},
    minPerZoneDefault: 0,
  },
  // Scenario Matrix — 2 uncertainties + 4 scenarios + robust moves.
  'scenario-matrix': {
    minStickiesByZone: {
      'uncertainty-a': 1,
      'uncertainty-b': 1,
      'scenario-1': 1,
      'scenario-2': 1,
      'scenario-3': 1,
      'scenario-4': 1,
      'robust-moves': 1,
    },
    minPerZoneDefault: 1,
  },
  // Three Horizons — 3 horizon quadrants + migration + evidence/risks.
  'three-horizons-map': {
    minStickiesByZone: {
      'horizon-1-core': 1,
      'horizon-2-emerging': 1,
      'horizon-3-options': 1,
      'migration-actions': 1,
      'evidence-risks': 1,
    },
    minPerZoneDefault: 1,
  },
  // Ad-Lib Value Proposition — 8 sentence-fragment slots. Each slot is
  // part of one sentence, so all 8 must be filled.
  'ad-lib-value-proposition': {
    minStickiesByZone: {
      'products-services': 1,
      'customer-segment': 1,
      'jobs-to-be-done': 1,
      'pain-verb': 1,
      'customer-pain': 1,
      'gain-verb': 1,
      'customer-gain': 1,
      'competing-value-proposition': 1,
    },
    minPerZoneDefault: 1,
  },
  // Blue Ocean Strategy Canvas — pin/chart-driven. The chart's
  // methodology (Kim & Mauborgne) demands ≥1 curve and ≥1 pin per
  // factor on the chosen curve. Manifest's `factorsDefault` already
  // lists 6 factors, so we set 6 here.
  'blue-ocean-strategy-canvas': {
    minStickiesByZone: {},
    minPerZoneDefault: 0,
    minPinClasses: 1,
    minPinsByClass: {},
    minXAxisItems: 3,
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Per-canvas soft hints — methodology nudges. Re-exported separately so
// the same source can seed `manifest.quality.softHints`.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Curated soft-hint catalogue. Each entry becomes a yellow "info" issue
 * when the corresponding draft is light, and is also the canonical text
 * used to seed `manifest.quality.softHints` in the canvas bundle.
 *
 * `id` is the stable code the renderer uses to match a manifest hint
 * to a draft issue. `text` is bilingual.
 */
export const CANVAS_SOFT_HINTS: Record<string, Array<{ id: string; text: LocalizedLabel }>> = {
  'business-model-canvas': [
    {
      id: 'bmc.cross-check.vp-segments',
      text: {
        en: 'Cross-check Value Propositions against Customer Segments — each VP should be aimed at a specific segment.',
        zh: '交叉验证价值主张与客户细分 —— 每条价值主张都应明确指向某个具体细分。',
      },
    },
    {
      id: 'bmc.cross-check.channels-relationships',
      text: {
        en: 'Each channel in Channels should be reachable by a Customer Relationship in the adjacent block.',
        zh: 'Channels 中的每条渠道都应能被相邻的 Customer Relationships 中某种关系触达。',
      },
    },
  ],
  'value-proposition-canvas': [
    {
      id: 'vpc.fit.check',
      text: {
        en: 'A VPC "fits" when at least one Pain Reliever answers a Pain, and at least one Gain Creator matches a Gain.',
        zh: '当至少一条 Pain Reliever 回应 Pains、一条 Gain Creator 回应 Gains 时,VPC 才算"匹配"。',
      },
    },
  ],
  'jobs-to-be-done': [
    {
      id: 'jtbd.all-three',
      text: {
        en: 'A complete JTBD story has all three: a Situation, a Motivation, and an Ideal Outcome.',
        zh: '完整的 JTBD 故事应同时包含情境、动机和理想结果三段。',
      },
    },
  ],
  'empathy-map': [
    {
      id: 'empathy.balanced',
      text: {
        en: 'Pair each Pain with a Gain in the same scenario — without that link, the persona feels one-sided.',
        zh: '同一场景下的 Pain 与 Gain 应成对出现 —— 缺一个角色画像就失衡。',
      },
    },
  ],
  'customer-journey': [
    {
      id: 'cj.dip-source',
      text: {
        en: 'The deepest dip in the satisfaction curve usually points at an unmet Job — feed it back into JTBD.',
        zh: '满意度曲线最深的凹陷通常对应未满足的工作 —— 回写到 JTBD。',
      },
    },
  ],
  'porters-value-chain': [
    {
      id: 'pvc.margin-source',
      text: {
        en: 'At least one activity should explicitly justify the margin — otherwise the value chain reads as a cost list.',
        zh: '至少应有一项活动明确支撑 Margin —— 否则价值链读起来只是一份成本清单。',
      },
    },
  ],
  'blue-ocean-strategy-canvas': [
    {
      id: 'bosc.curve-distinct',
      text: {
        en: 'A Blue Ocean curve should look clearly different from a competitor curve on at least 3 factors.',
        zh: '蓝海曲线应在至少 3 个因子上明显区别于竞品曲线。',
      },
    },
  ],
  'ansoff-matrix': [
    {
      id: 'ansoff.growth-rationale',
      text: {
        en: 'The growth rationale zone is non-negotiable — without it the quadrant is just a guess.',
        zh: 'Growth rationale 区域不可省略 —— 没有它,象限选择只是猜测。',
      },
    },
  ],
  'bcg-growth-share-matrix': [
    {
      id: 'bcg.actions-defined',
      text: {
        en: 'Portfolio actions should be explicit: invest, harvest, divest, or reposition.',
        zh: '业务组合动作应明确:投入、收割、剥离或重新定位。',
      },
    },
  ],
  'disruption-diagnosis': [
    {
      id: 'disruption.three-part-test',
      text: {
        en: 'A real disruption candidate must pass all three of Christensen\'s test: foothold, initially-inferior, upmarket-improvement.',
        zh: '真正的颠覆候选必须同时通过 Christensen 三段判定:立足点、起步低维劣势、向上改进。',
      },
    },
  ],
  'design-criteria-canvas': [
    {
      id: 'dcc.must-trace',
      text: {
        en: 'Each must-have should trace back to a VPC Pain or Gain — without that link, it is a wishlist item.',
        zh: '每条 must-have 都应追溯到 VPC 的某条 Pain 或 Gain —— 否则就是 wishlist。',
      },
    },
  ],
  'experiment-canvas': [
    {
      id: 'ec.falsifiable',
      text: {
        en: 'A good experiment has a falsifiable hypothesis: "if X, then we expect Y by date Z."',
        zh: '好的实验应有一个可证伪假设:「若 X,则预计在 Y 之前观察到 Z」。',
      },
    },
  ],
  'innovation-culture-map': [
    {
      id: 'icm.behaviors-not-values',
      text: {
        en: 'Use observed behaviors in the current side, not values or slogans — culture is what people actually do.',
        zh: 'Current 一侧填的是被观察到的行为,不是价值观或口号 —— 文化是人们实际做的。',
      },
    },
  ],
  'platform-ecosystem-map': [
    {
      id: 'pem.cold-start',
      text: {
        en: 'A platform without a cold-start plan in the bottom row is not a platform — it is a wish.',
        zh: '底部「冷启动」一栏缺失的平台不是平台,是愿望。',
      },
    },
  ],
  'portfolio-map': [
    {
      id: 'pf.both-quadrants',
      text: {
        en: 'A balanced portfolio has bets in both Explore and Exploit quadrants.',
        zh: '健康的组合应在 Explore 与 Exploit 两个象限都有押注。',
      },
    },
  ],
  'scenario-matrix': [
    {
      id: 'sm.robust-moves',
      text: {
        en: 'Robust moves should appear in 3+ scenarios — that is what makes them robust.',
        zh: 'Robust moves 应在 3+ 个情景下都成立 —— 这才是「稳健」的真正含义。',
      },
    },
  ],
  'three-horizons-map': [
    {
      id: 'thm.migration-defined',
      text: {
        en: 'Each H2 / H3 bet needs at least one explicit migration action to the next horizon.',
        zh: '每个 H2 / H3 押注都应有至少一条明确的迁移动作指向下一层。',
      },
    },
  ],
  'ad-lib-value-proposition': [
    {
      id: 'alvp.all-slots',
      text: {
        en: 'Fill all 8 sentence slots — the test is whether the team can read the sentence out loud without flinching.',
        zh: '8 个槽位都要填 —— 测试标准是团队能一口气把整句读出来而不磕巴。',
      },
    },
  ],
  'business-model-environment': [
    {
      id: 'bme.four-lenses',
      text: {
        en: 'A complete BME covers all four lenses: trends, industry, market, macro. Skipping one blinds the model.',
        zh: '完整的 BME 应覆盖 4 个视角:趋势、行业、市场、宏观。少一个就让模型失明。',
      },
    },
  ],
  'evidence-scorecard': [
    {
      id: 'es.evidence-over-opinion',
      text: {
        en: 'Current-evidence should be observed facts, not opinions — the scorecard is only as honest as its evidence.',
        zh: 'Current-evidence 应填观察事实,不是观点 —— 评分卡的可信度取决于证据的诚实度。',
      },
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// Project / Story / Draft validators
// ──────────────────────────────────────────────────────────────────────────

const PROJECT_NAME_MIN = 2;
const PROJECT_DESCRIPTION_MIN = 10;
const STORY_TITLE_MIN = 3;
const STORY_CONTENT_MIN = 50;

export interface ValidateProjectMetaInput {
  name: string;
  description?: string;
}

export function validateProjectMeta(
  input: ValidateProjectMetaInput,
  options: { nameMin?: number; descriptionMin?: number } = {},
): QualityIssue[] {
  const nameMin = options.nameMin ?? PROJECT_NAME_MIN;
  const descriptionMin = options.descriptionMin ?? PROJECT_DESCRIPTION_MIN;
  const issues: QualityIssue[] = [];
  const name = (input.name ?? '').trim();
  if (!name) {
    issues.push({
      severity: 'hard',
      code: 'project.name.empty',
      message: m('projectNameEmpty'),
      target: { kind: 'project', field: 'name' },
    });
  } else if (name.length < nameMin) {
    issues.push({
      severity: 'hard',
      code: `project.name.too-short:${name.length}<${nameMin}`,
      message: tmpl(m('projectNameTooShort'), { min: nameMin }),
      target: { kind: 'project', field: 'name' },
    });
  }
  const description = (input.description ?? '').trim();
  if (!description) {
    issues.push({
      severity: 'hard',
      code: 'project.description.empty',
      message: m('projectDescriptionEmpty'),
      target: { kind: 'project', field: 'description' },
    });
  } else if (description.length < descriptionMin) {
    issues.push({
      severity: 'hard',
      code: `project.description.too-short:${description.length}<${descriptionMin}`,
      message: tmpl(m('projectDescriptionTooShort'), { min: descriptionMin }),
      target: { kind: 'project', field: 'description' },
    });
  }
  return issues;
}

export interface ValidateCanvasInput {
  defId: string;
  title: string;
  stickies: ReadonlyArray<{ zoneId: string; text: string }>;
  /** For pin/chart canvases — required when the canvas uses pins. */
  pinClasses?: ReadonlyArray<{ id: string }>;
  pins?: ReadonlyArray<{ classId: string }>;
  xAxisItems?: ReadonlyArray<{ id: string }>;
  /** Optional manifest override for hard rules. */
  rules?: CanvasHardRules;
  /** Optional manifest soft hints. Three forms accepted:
   *  - `true`  → use the default hint catalogue from `CANVAS_SOFT_HINTS[defId]`
   *  - `Array<{id, text}>` → custom hint list (must be in stable code order)
   *  - `undefined` → no soft hints surfaced
   *  In every case the validator never blocks apply on a soft issue. */
  softHints?: true | ReadonlyArray<{ id: string; text: LocalizedLabel; appliesWhen?: 'always' | 'empty' | 'thin' }>;
}

export function validateCanvas(input: ValidateCanvasInput, canvasIndex = 0): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const title = (input.title ?? '').trim() || input.defId;
  const stickies = input.stickies ?? [];
  const effectiveRules = input.rules ?? CANVAS_HARD_RULES[input.defId] ?? { minPerZoneDefault: 1 };
  const minPerZoneDefault = effectiveRules.minPerZoneDefault ?? 0;
  const minByZone = effectiveRules.minStickiesByZone ?? {};

  // 1. At least one sticky on the canvas (hard floor).
  if (stickies.length === 0) {
    issues.push({
      severity: 'hard',
      code: 'canvas.empty',
      message: tmpl(m('emptyCanvas'), { title }),
      target: { kind: 'canvas', defId: input.defId, canvasIndex },
    });
  }

  // 2. Per-zone minimum. Compute counts by zoneId first.
  const countByZone = new Map<string, number>();
  for (const sticky of stickies) {
    const zoneId = (sticky.zoneId ?? '').trim();
    if (!zoneId) continue;
    countByZone.set(zoneId, (countByZone.get(zoneId) ?? 0) + 1);
  }

  // Check declared zones.
  const declaredZones = new Set(Object.keys(minByZone));
  for (const [zoneId, min] of Object.entries(minByZone)) {
    const count = countByZone.get(zoneId) ?? 0;
    if (count < min) {
      issues.push({
        severity: 'hard',
        code: `canvas.zone.empty:${input.defId}:${zoneId}`,
        message: tmpl(m('zoneEmpty'), { title, zone: zoneId }),
        target: { kind: 'canvas', defId: input.defId, canvasIndex, zoneId },
      });
    } else if (count < min + 1 && min >= 1) {
      // Soft hint: at the floor — methodology usually wants a bit more.
      issues.push({
        severity: 'soft',
        code: `canvas.zone.thin:${input.defId}:${zoneId}`,
        message: tmpl(m('zoneSoftHint'), { title, zone: zoneId, count, expected: min + 1 }),
        target: { kind: 'canvas', defId: input.defId, canvasIndex, zoneId },
      });
    }
  }

  // If we don't have declared zones but there is a default minimum,
  // apply it to whatever zones the draft actually used.
  if (declaredZones.size === 0 && minPerZoneDefault > 0) {
    for (const [zoneId, count] of countByZone.entries()) {
      if (count < minPerZoneDefault) {
        issues.push({
          severity: 'hard',
          code: `canvas.zone.empty:${input.defId}:${zoneId}`,
          message: tmpl(m('zoneEmpty'), { title, zone: zoneId }),
          target: { kind: 'canvas', defId: input.defId, canvasIndex, zoneId },
        });
      }
    }
  }

  // 3. Total minimum.
  if (effectiveRules.minStickiesTotal && stickies.length < effectiveRules.minStickiesTotal) {
    issues.push({
      severity: 'hard',
      code: `canvas.total.too-few:${stickies.length}<${effectiveRules.minStickiesTotal}`,
      message: tmpl(m('emptyCanvas'), { title }),
      target: { kind: 'canvas', defId: input.defId, canvasIndex },
    });
  }

  // 4. Pin/chart rules.
  if (effectiveRules.minPinsByClass || effectiveRules.minPinClasses || effectiveRules.minXAxisItems) {
    const pinClasses = input.pinClasses ?? [];
    const pins = input.pins ?? [];
    const xAxisItems = input.xAxisItems ?? [];
    if (effectiveRules.minPinClasses && pinClasses.length < effectiveRules.minPinClasses) {
      issues.push({
        severity: 'hard',
        code: `canvas.chart.few-classes:${pinClasses.length}<${effectiveRules.minPinClasses}`,
        message: tmpl(m('chartFewClasses'), { title, count: pinClasses.length, min: effectiveRules.minPinClasses }),
        target: { kind: 'canvas', defId: input.defId, canvasIndex },
      });
    }
    if (effectiveRules.minXAxisItems && xAxisItems.length < effectiveRules.minXAxisItems) {
      issues.push({
        severity: 'hard',
        code: `canvas.chart.few-factors:${xAxisItems.length}<${effectiveRules.minXAxisItems}`,
        message: tmpl(m('chartFewFactors'), { title, count: xAxisItems.length, min: effectiveRules.minXAxisItems }),
        target: { kind: 'canvas', defId: input.defId, canvasIndex },
      });
    }
    if (effectiveRules.minPinsByClass) {
      const pinsByClass = new Map<string, number>();
      for (const pin of pins) {
        pinsByClass.set(pin.classId, (pinsByClass.get(pin.classId) ?? 0) + 1);
      }
      for (const [classId, min] of Object.entries(effectiveRules.minPinsByClass)) {
        const count = pinsByClass.get(classId) ?? 0;
        if (count < min) {
          issues.push({
            severity: 'hard',
            code: `canvas.chart.few-pins:${classId}:${count}<${min}`,
            message: tmpl(m('chartFewPins'), { title, classId, count, min }),
            target: { kind: 'canvas', defId: input.defId, canvasIndex },
          });
        }
      }
    }
  }

  // 5. Manifest soft hints. The validator is the single source of truth
  // for which hint fires; the manifest only supplies the text. A `true`
  // opt-in pulls the default catalogue from `CANVAS_SOFT_HINTS[defId]`.
  let hintList: ReadonlyArray<{ id: string; text: LocalizedLabel }> | undefined;
  if (input.softHints === true) {
    hintList = CANVAS_SOFT_HINTS[input.defId];
  } else if (Array.isArray(input.softHints)) {
    hintList = input.softHints;
  }
  if (hintList) {
    for (const hint of hintList) {
      // We render ALL soft hints as a soft issue at severity:soft so the
      // UI can decide whether to show them all or only when relevant.
      issues.push({
        severity: 'soft',
        code: `canvas.soft-hint:${input.defId}:${hint.id}`,
        message: hint.text,
        target: { kind: 'canvas', defId: input.defId, canvasIndex },
      });
    }
  }

  return issues;
}

export interface ValidateStoryInput {
  title: string;
  content: string;
  /** Index of the story in the parent draft (for stable codes). */
  index: number;
  /** defIds of canvases that exist in the same project / draft. */
  availableCanvasDefIds?: ReadonlySet<string>;
  /** canvasIds that exist in the same project / draft. */
  availableCanvasIds?: ReadonlySet<string>;
  /** When provided, the validator also checks `::canvas[defId]{canvasId}` directives. */
  parseDirectives?: (content: string) => ReadonlyArray<{ defId?: string; canvasId?: string }>;
}

export function validateStory(input: ValidateStoryInput): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const title = (input.title ?? '').trim();
  const content = (input.content ?? '').trim();
  if (!title) {
    issues.push({
      severity: 'hard',
      code: `story.title.empty:${input.index}`,
      message: tmpl(m('storyTitleEmpty'), { index: input.index + 1 }),
      target: { kind: 'story', storyIndex: input.index, field: 'title' },
    });
  } else if (title.length < STORY_TITLE_MIN) {
    issues.push({
      severity: 'hard',
      code: `story.title.short:${title.length}<${STORY_TITLE_MIN}`,
      message: tmpl(m('storyTitleShort'), { title, min: STORY_TITLE_MIN }),
      target: { kind: 'story', storyIndex: input.index, field: 'title' },
    });
  }
  if (!content) {
    issues.push({
      severity: 'hard',
      code: `story.content.empty:${input.index}`,
      message: tmpl(m('storyContentEmpty'), { title: title || `#${input.index + 1}` }),
      target: { kind: 'story', storyIndex: input.index, field: 'content' },
    });
  } else if (content.length < STORY_CONTENT_MIN) {
    issues.push({
      severity: 'hard',
      code: `story.content.short:${content.length}<${STORY_CONTENT_MIN}`,
      message: tmpl(m('storyContentShort'), {
        title: title || `#${input.index + 1}`,
        count: content.length,
        min: STORY_CONTENT_MIN,
      }),
      target: { kind: 'story', storyIndex: input.index, field: 'content' },
    });
  }

  // Directive integrity — only when both a parser and a canvas roster
  // are provided.
  if (input.parseDirectives && (input.availableCanvasDefIds || input.availableCanvasIds)) {
    const directives = input.parseDirectives(content);
    for (const directive of directives) {
      if (directive.defId && input.availableCanvasDefIds && !input.availableCanvasDefIds.has(directive.defId)) {
        issues.push({
          severity: 'hard',
          code: `story.directive.unknown-def:${input.index}:${directive.defId}`,
          message: tmpl(m('storyDirectiveUnknown'), {
            title: title || `#${input.index + 1}`,
            defId: directive.defId,
          }),
          target: { kind: 'story', storyIndex: input.index, field: 'directive' },
        });
      }
      if (directive.canvasId && input.availableCanvasIds && !input.availableCanvasIds.has(directive.canvasId)) {
        issues.push({
          severity: 'hard',
          code: `story.directive.unknown-canvas:${input.index}:${directive.canvasId}`,
          message: tmpl(m('storyDirectiveUnknownCanvasId'), {
            title: title || `#${input.index + 1}`,
            canvasId: directive.canvasId,
          }),
          target: { kind: 'story', storyIndex: input.index, field: 'directive' },
        });
      }
    }
  }

  return issues;
}

export interface ValidateProjectDraftInput {
  draft: CopilotProjectDraft;
  /** Def ids of canvases that already exist in the project (for update-flow parity). */
  existingCanvasDefIds?: ReadonlySet<string>;
  existingCanvasIds?: ReadonlySet<string>;
  parseDirectives?: (content: string) => ReadonlyArray<{ defId?: string; canvasId?: string }>;
}

export function validateProjectDraft(input: ValidateProjectDraftInput): QualityReport {
  const issues: QualityIssue[] = [];
  const draft = input.draft;

  issues.push(...validateProjectMeta({
    name: draft.project.name,
    description: draft.project.description,
  }));

  if (!draft.canvases || draft.canvases.length === 0) {
    issues.push({
      severity: 'hard',
      code: 'project.no-canvas',
      message: m('noCanvas'),
      target: { kind: 'project', field: 'coverage' },
    });
  }

  const canvasDefIds = new Set<string>();
  for (const [canvasIndex, canvas] of (draft.canvases ?? []).entries()) {
    canvasDefIds.add(canvas.defId);
    const hintList = CANVAS_SOFT_HINTS[canvas.defId];
    issues.push(
      ...validateCanvas({
        defId: canvas.defId,
        title: canvas.title,
        stickies: canvas.stickies ?? [],
        rules: CANVAS_HARD_RULES[canvas.defId],
        softHints: hintList && hintList.length > 0 ? true : undefined,
      }, canvasIndex),
    );
  }

  if (draft.stories) {
    for (const [storyIndex, story] of draft.stories.entries()) {
      issues.push(
        ...validateStory({
          title: story.title,
          content: story.content,
          index: storyIndex,
          availableCanvasDefIds: unionWith(canvasDefIds, input.existingCanvasDefIds),
          availableCanvasIds: input.existingCanvasIds,
          ...(input.parseDirectives ? { parseDirectives: input.parseDirectives } : {}),
        }),
      );
    }
  }

  return summarise(issues);
}

export interface ValidateProjectUpdateDraftInput {
  draft: CopilotProjectUpdateDraft;
  /** Def ids and canvasIds of canvases already in the project. */
  projectCanvasDefIds: ReadonlySet<string>;
  projectCanvasIds: ReadonlySet<string>;
  projectStoryIds?: ReadonlySet<string>;
  parseDirectives?: (content: string) => ReadonlyArray<{ defId?: string; canvasId?: string }>;
}

export function validateProjectUpdateDraft(input: ValidateProjectUpdateDraftInput): QualityReport {
  const issues: QualityIssue[] = [];
  const draft = input.draft;

  if (!draft.operations || draft.operations.length === 0) {
    issues.push({
      severity: 'hard',
      code: 'project.no-operations',
      message: m('noCanvas'),
      target: { kind: 'project', field: 'coverage' },
    });
  }

  const draftCanvasDefIds = new Set<string>();

  for (const [operationIndex, op] of (draft.operations ?? []).entries()) {
    if (op.type === 'createCanvas') {
      draftCanvasDefIds.add(op.defId);
      const hintList = CANVAS_SOFT_HINTS[op.defId];
      issues.push(
        ...validateCanvas({
          defId: op.defId,
          title: op.title,
          stickies: op.stickies ?? [],
          rules: CANVAS_HARD_RULES[op.defId],
          softHints: hintList && hintList.length > 0 ? true : undefined,
        }, operationIndex),
      );
    } else if (op.type === 'replaceCanvasStickies') {
      if (!input.projectCanvasIds.has(op.canvasId)) {
        issues.push({
          severity: 'hard',
          code: `op.canvas.outside-project:${op.canvasId}`,
          message: tmpl(m('canvasIdNotInProject'), { index: operationIndex + 1, canvasId: op.canvasId }),
          target: { kind: 'operation', operationIndex, field: 'stickies' },
        });
      } else {
        // We don't know the canvas's defId from the op alone — but the
        // caller can supply a richer baseline; without it, we still
        // require ≥ 1 sticky on the replacement.
        if (!op.stickies || op.stickies.length === 0) {
          issues.push({
            severity: 'hard',
            code: `op.canvas.empty-stickies:${operationIndex}`,
            message: tmpl(m('operationEmptyStickies'), { index: operationIndex + 1 }),
            target: { kind: 'operation', operationIndex, field: 'stickies' },
          });
        }
      }
    } else if (op.type === 'createStory') {
      issues.push(
        ...validateStory({
          title: op.title,
          content: op.content,
          index: operationIndex,
          availableCanvasDefIds: unionWith(draftCanvasDefIds, input.projectCanvasDefIds),
          availableCanvasIds: input.projectCanvasIds,
          ...(input.parseDirectives ? { parseDirectives: input.parseDirectives } : {}),
        }),
      );
    } else if (op.type === 'replaceStory') {
      if (input.projectStoryIds && !input.projectStoryIds.has(op.storyId)) {
        issues.push({
          severity: 'hard',
          code: `op.story.outside-project:${op.storyId}`,
          message: tmpl(m('storyIdNotInProject'), { index: operationIndex + 1, storyId: op.storyId }),
          target: { kind: 'operation', operationIndex, field: 'content' },
        });
      }
      if (!op.content || !op.content.trim()) {
        issues.push({
          severity: 'hard',
          code: `op.story.empty:${operationIndex}`,
          message: tmpl(m('operationEmptyStory'), { index: operationIndex + 1 }),
          target: { kind: 'operation', operationIndex, field: 'content' },
        });
      } else {
        issues.push(
          ...validateStory({
            title: op.title ?? op.storyId,
            content: op.content,
            index: operationIndex,
            availableCanvasDefIds: unionWith(draftCanvasDefIds, input.projectCanvasDefIds),
            availableCanvasIds: input.projectCanvasIds,
            ...(input.parseDirectives ? { parseDirectives: input.parseDirectives } : {}),
          }),
        );
      }
    }
  }

  return summarise(issues);
}

function unionWith<T>(a: ReadonlySet<T>, b: ReadonlySet<T> | undefined): ReadonlySet<T> {
  if (!b) return a;
  const out = new Set<T>(a);
  for (const v of b) out.add(v);
  return out;
}

function summarise(issues: QualityIssue[]): QualityReport {
  let hard = 0;
  let soft = 0;
  for (const issue of issues) {
    if (issue.severity === 'hard') hard += 1;
    else soft += 1;
  }
  return { issues, hardCount: hard, softCount: soft };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers for UI
// ──────────────────────────────────────────────────────────────────────────

export function isApplyBlocker(report: QualityReport | undefined): boolean {
  return Boolean(report && report.hardCount > 0);
}

export function pickIssueMessage(issue: QualityIssue, lang: Lang): string {
  return issue.message[lang] ?? issue.message.en;
}

export function summariseIssuesByTarget(
  report: QualityReport | undefined,
): Array<{ target: QualityTarget; issues: QualityIssue[] }> {
  if (!report) return [];
  const groups = new Map<string, { target: QualityTarget; issues: QualityIssue[] }>();
  for (const issue of report.issues) {
    const key = targetKey(issue.target);
    let group = groups.get(key);
    if (!group) {
      group = { target: issue.target, issues: [] };
      groups.set(key, group);
    }
    group.issues.push(issue);
  }
  return Array.from(groups.values());
}

function targetKey(target: QualityTarget): string {
  switch (target.kind) {
    case 'project':
      return `project:${target.field}`;
    case 'canvas':
      return `canvas:${target.defId}:${target.canvasIndex}:${target.zoneId ?? ''}`;
    case 'story':
      return `story:${target.storyIndex}:${target.field ?? ''}`;
    case 'operation':
      return `operation:${target.operationIndex}:${target.field ?? ''}`;
  }
}

export interface QualityDraftExtensions {
  quality?: QualityReport;
}

export function attachQualityToProjectDraft(
  draft: CopilotProjectDraft,
  options?: Omit<ValidateProjectDraftInput, 'draft'>,
): CopilotProjectDraft & QualityDraftExtensions {
  const report = validateProjectDraft({ draft, ...(options ?? {}) });
  return { ...draft, quality: report };
}

export function attachQualityToProjectUpdateDraft(
  draft: CopilotProjectUpdateDraft,
  options: Omit<ValidateProjectUpdateDraftInput, 'draft'>,
): CopilotProjectUpdateDraft & QualityDraftExtensions {
  const report = validateProjectUpdateDraft({ draft, ...options });
  return { ...draft, quality: report };
}

// ──────────────────────────────────────────────────────────────────────────
// Prompt-summary helpers — used by the server to inject a one-paragraph
// rules briefing into the LLM prompt so the model generates drafts that
// are likely to pass apply.
// ──────────────────────────────────────────────────────────────────────────

export interface RulesPromptOptions {
  lang: Lang;
  /** Def ids of canvases the project currently has. The prompt will then
   *  list "additions must satisfy …" for the new ones being created. */
  canvasDefIds?: string[];
  /** Show the soft-hint catalogue (yellow issues) as well. */
  includeSoftHints?: boolean;
}

export function buildQualityRulesPrompt(options: RulesPromptOptions): string {
  const lang = options.lang;
  const isZh = lang === 'zh';
  const lines: string[] = [];
  if (isZh) {
    lines.push('# 草稿质量规则(必读,生成的草稿必须能通过 apply)');
    lines.push('');
    lines.push('**项目级硬规则**:');
    lines.push('- 项目名 ≥ 2 字,描述 ≥ 10 字。');
    lines.push('- 项目至少包含 1 张画布。');
    lines.push('');
    lines.push('**画布级硬规则**(每张画布的每个 zone 至少 1 条便签):');
  } else {
    lines.push('# Draft Quality Rules (read first; the draft must pass apply)');
    lines.push('');
    lines.push('**Project-level hard rules**:');
    lines.push('- Project name ≥ 2 characters; description ≥ 10 characters.');
    lines.push('- At least one canvas per project.');
    lines.push('');
    lines.push('**Canvas-level hard rules** (every zone needs at least one sticky):');
  }
  for (const [defId, rules] of Object.entries(CANVAS_HARD_RULES)) {
    const zoneCount = Object.keys(rules.minStickiesByZone ?? {}).length;
    const chartNote = rules.minPinClasses
      ? (isZh ? `chart 型:至少 ${rules.minPinClasses} 条曲线,每类至少 1 pin`
              : `chart canvas: ≥ ${rules.minPinClasses} curve(s), ≥ 1 pin per class`)
      : '';
    const factorNote = rules.minXAxisItems
      ? (isZh ? `,≥ ${rules.minXAxisItems} 个 X 轴因子`
              : `, ≥ ${rules.minXAxisItems} X-axis factor(s)`)
      : '';
    if (zoneCount > 0) {
      lines.push(`- \`${defId}\`: ${zoneCount} 个 zone,每个 ≥ 1 便签`);
    } else if (chartNote) {
      lines.push(`- \`${defId}\`: ${chartNote}${factorNote}`);
    }
  }
  if (isZh) {
    lines.push('');
    lines.push('**Story 级硬规则**:');
    lines.push('- 标题 ≥ 3 字,内容 ≥ 50 字。');
    lines.push('- 嵌入的 `::canvas[defId]{canvasId=…}` 指令的 defId 必须在项目的画布列表内。');
  } else {
    lines.push('');
    lines.push('**Story-level hard rules**:');
    lines.push('- Title ≥ 3 characters; content ≥ 50 characters.');
    lines.push('- Any `::canvas[defId]{canvasId=…}` directive must reference a defId that exists in the project.');
  }
  if (options.includeSoftHints) {
    if (isZh) {
      lines.push('');
      lines.push('**软提示(只展示,不阻塞)**:');
    } else {
      lines.push('');
      lines.push('**Soft hints (informational only — never block apply)**:');
    }
    for (const [defId, hints] of Object.entries(CANVAS_SOFT_HINTS)) {
      for (const hint of hints) {
        lines.push(`- \`${defId}\` / \`${hint.id}\`: ${hint.text[lang]}`);
      }
    }
  }
  if (options.canvasDefIds && options.canvasDefIds.length > 0) {
    if (isZh) {
      lines.push('');
      lines.push(`**当前项目已有的画布类型**: ${options.canvasDefIds.join(', ')}。新增画布时若引用,defId 必须存在。`);
    } else {
      lines.push('');
      lines.push(`**Canvas types already in the project**: ${options.canvasDefIds.join(', ')}. New canvases that reference existing ones must use a defId from this list.`);
    }
  }
  return lines.join('\n');
}
