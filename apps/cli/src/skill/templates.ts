import type {
  BusinessModelPattern,
  Experiment,
  ExperimentDuration,
  ExperimentRisk,
  Lang,
  PatternReference,
  PatternReferenceType,
  StrategyFramework,
} from '@pingarden/shared';
import {
  firstParagraphs,
  firstSentencesFromMarkdown,
  pickI18n,
  type CanvasBundle,
  type ExperimentBundle,
  type PatternBundle,
  type StrategyFrameworkBundle,
} from './bundle.js';

/**
 * Markdown templates. All output is fully deterministic — the
 * generator runs through `String.raw` interpolations, so re-running
 * `pingarden skill build` against the same inputs produces
 * byte-identical files.
 *
 * NEVER use Date.now() / random ids in template bodies. The version
 * frontmatter on SKILL.md carries the only "freshness" indicator,
 * derived from the canvas content hash (not the wall clock).
 */

// ─── SKILL.md (entry) ────────────────────────────────────────────────────────

export interface SkillMdInput {
  version: string;
  canvasIds: string[];
  /** Pattern slugs (sorted) shipped with this skill build. Empty when
   *  no patterns directory exists or it's empty. */
  patternSlugs: string[];
  /** Experiment slugs (sorted) shipped with this skill build. Empty
   *  when no experiments directory exists or it's empty. Treated
   *  symmetrically to patterns: index entry, workflow link, and
   *  reference page only emit when the list is non-empty. */
  experimentSlugs: string[];
  /** Strategy framework slugs (sorted) shipped with this skill build. */
  strategyFrameworkSlugs: string[];
}

export function renderSkillMd({
  version,
  canvasIds,
  patternSlugs,
  experimentSlugs,
  strategyFrameworkSlugs,
}: SkillMdInput): string {
  const canvasList = canvasIds.map((id) => `- \`canvases/${id}.en.md\` / \`canvases/${id}.zh.md\``).join('\n');
  const patternsBlock =
    patternSlugs.length > 0
      ? `

### Business model patterns (one per pattern, both languages)
${patternSlugs.map((s) => `- \`patterns/${s}.en.md\` / \`patterns/${s}.zh.md\``).join('\n')}`
      : '';
  const experimentsBlock =
    experimentSlugs.length > 0
      ? `

### Experiment library (Testing Business Ideas — one per experiment, both languages)
${experimentSlugs.map((s) => `- \`experiments/${s}.en.md\` / \`experiments/${s}.zh.md\``).join('\n')}`
      : '';
  const strategyFrameworksBlock =
    strategyFrameworkSlugs.length > 0
      ? `

### Strategy frameworks (one per framework, both languages)
${strategyFrameworkSlugs.map((s) => `- \`strategy-frameworks/${s}.en.md\` / \`strategy-frameworks/${s}.zh.md\``).join('\n')}`
      : '';
  const patternsWorkflow =
    patternSlugs.length > 0
      ? `\n- \`workflows/patterns.md\` — when the user asks "what pattern is this", "give me other companies in the same pattern", or wants to draft a BMC by applying a pattern\n- \`workflows/authoring-patterns.md\` — when the user asks to add a NEW pattern to the library (file layout, description template, audit checklist, manifest, skill regen)`
      : '';
  const experimentsWorkflow =
    experimentSlugs.length > 0
      ? `\n- \`workflows/experiments.md\` — when the user has a riskiest assumption to test: classify it as Desirability / Feasibility / Viability and recommend 2–3 experiments from the library matched on theme + risk + cost`
      : '';
  const strategyFrameworksWorkflow =
    strategyFrameworkSlugs.length > 0
      ? `\n- \`workflows/strategy-frameworks.md\` — when the user asks for strategic analysis methods such as Blue Ocean Strategy or wants cases by framework\n- \`workflows/strategy-framework-combinations.md\` — when the user asks which frameworks to chain, which look similar but differ (PESTEL vs BMEScan, Ansoff vs BCG, Blue Ocean vs Disruption), or what to run after a given analysis`
      : '';
  const patternsReference =
    patternSlugs.length > 0
      ? `\n- \`reference/patterns.md\` — pattern slug index, the \`pingarden pattern <list|get>\` commands, and the case ↔ pattern cross-link rules`
      : '';
  const experimentsReference =
    experimentSlugs.length > 0
      ? `\n- \`reference/experiments.md\` — experiment slug index with theme / risk / cost / strength columns, plus the matching heuristic for a given riskiest assumption`
      : '';
  const strategyFrameworksReference =
    strategyFrameworkSlugs.length > 0
      ? `\n- \`reference/strategy-frameworks.md\` — strategy framework slug index and case ↔ framework cross-link rules`
      : '';
  return `---
name: pingarden
description: Use whenever the user wants to draft, edit, translate, fork, copy, optimise, or narrate a business model — Business Model Canvas, Value Proposition Canvas, Jobs To Be Done, Empathy Map, Portfolio Map, Business Model Environment, Ad-Lib Value Proposition, Customer Journey, Strategy Canvas, Design Criteria Canvas, Experiment Canvas — OR wants to read / fork a curated company case (Spotify, Uber, Airbnb, Nespresso, Gillette, P&G, GSK, Alibaba, Cemex, Patagonia, …) OR identify / apply a business-model pattern (Long Tail, Free, Multi-Sided Platforms, Open Business Models, Unbundling) OR run a test / experiment from the Testing Business Ideas library (Customer Interview, Smoke Test, Wizard of Oz, Concierge, Letter of Intent, Pre-Sale, …). English triggers: "draft a BMC", "fill the value proposition", "story for my project", "snapshot before editing", "fork this case", "what pattern is this", "what business model does X use", "copy and optimise this canvas", "give me other companies in the same pattern", "how do I test this assumption", "what experiment should I run", "is this a desirability / feasibility / viability risk", or any \`pingarden\` CLI invocation. Chinese triggers (中文触发): "帮我画/起一个商业模式画布", "做一份 BMC/VPC/JTBD", "复制画布优化模型", "fork 一个案例 / 从案例库开始", "Spotify/Uber/Nespresso 用了什么商业模式", "免费模式适合我吗 / 这是什么模式", "对比/翻译这张画布", "保存快照 / 回滚到上一版", "把这家公司的画布拿来改", "怎么验证这个假设 / 推荐一个实验", "我该跑客户访谈还是 smoke test"。On activation, **run \`pingarden doctor\` first** to confirm the CLI is on PATH and the PinGarden app is running; if \`pingarden\` returns "command not found", fall back to \`"\${HOME}/Library/Application Support/PinGarden/bin/pingarden"\` and tell the user to open PinGarden once or use Help → Install CLI to PATH.
version: ${version}
---

# PinGarden — official skill

You are working with **PinGarden**, a local Strategyzer-style canvas tool. This skill teaches you how to fill each canvas correctly and how to call the \`pingarden\` CLI to read and write canvas state.

## First action when this skill activates

Don't wait for the user to ask twice — when this skill loads, do this **immediately**, before producing any canvas content:

1. Run \`pingarden doctor\` to confirm both halves are up:
   - **CLI on PATH.** If you get \`command not found\`, first try \`"\${HOME}/Library/Application Support/PinGarden/bin/pingarden" <args>\`; if that path is missing, tell the user to launch PinGarden once, then use \`Help → Install CLI to PATH\`. Don't fall back to running bundled JS with \`node\`.
   - **PinGarden app/server.** Doctor reports the discovered port and a \`/health\` ping. If the server is down, tell the user to launch the PinGarden app — never try to write to \`apps/server/data/\` directly or parse Yjs binary as a workaround.
2. If both are green, **list what already exists** before suggesting fresh authoring:
   - \`pingarden case list --json\` — the curated company case library (Spotify, Uber, Airbnb, Alibaba, Nespresso, Gillette, P&G, GSK, Patagonia, …). Often the user's question ("how does Uber make money?", "give me a freemium example") is already answered by an existing case — fork or read it instead of inventing.
   - \`pingarden pattern list --json\` — the business-model pattern library (Long Tail, Unbundling, Multi-Sided Platforms, Free, Open Business Models, …). Patterns surface "which canvases / cases apply this".
3. **Self-update check after installation or app upgrades:** run \`pingarden skill install --dry-run\`. If it reports \`would change\`, run \`pingarden skill install\` when the user asked to install/update/release, then ask the user to reload the agent session if their tool caches skills.
4. Only after the environment is confirmed, the skill is current, and the existing library is scanned should you start producing canvases / stickies / stories.

## How to use this skill (reading order)

1. **Always read \`reference/cli-cheatsheet.md\` first** — it lists the exact commands and JSON envelope shape you'll consume.
2. **Before writing to a canvas**, read its description with \`pingarden canvas describe <id> --json\` (existing canvas) or \`pingarden canvas describe-template <defId> --json\` (new canvas). NEVER hardcode \`zoneId\`s — they come from the live def.
3. **For each canvas the user works on**, consult \`canvases/<id>.<lang>.md\` for filling rules, fill order, examples, and anti-patterns.
4. **For "what pattern is this" / "companies in the same pattern" / "fork a case"** — go to \`workflows/case-library.md\` and \`workflows/patterns.md\` first; the case library and pattern library are cross-linked both ways.
5. **For "how do I test this assumption" / "what experiment should I run"** — go to \`workflows/experiments.md\` and the \`experiments/\` library. Classify the assumption as Desirability / Feasibility / Viability, decide Discovery vs Validation, then pick 2–3 candidate experiments and present tradeoffs.
6. **For book/resources reading, chapter-quality, or source-material questions** — go to \`workflows/resource-reading.md\`. Resources are now chapter-aware: use chapter summaries first, then fetch the full chapter only when needed.
7. **For install/update/release or skill drift questions** — read \`workflows/self-iteration.md\` and keep the installed skill, project-local skill, zip, and DMG in sync.
8. **For multi-step work** (greenfield from a chat, iterating, cross-canvas, story narration, snapshot/restore, translate), follow the workflow in \`workflows/\`.

## Index

### Canvases (one per template, both languages)
${canvasList}${patternsBlock}${experimentsBlock}${strategyFrameworksBlock}

### Workflows
- \`workflows/discover.md\` — first call into a fresh session
- \`workflows/greenfield.md\` — chat → app, brand new canvas
- \`workflows/iterate.md\` — refine an existing canvas (read → diff → write)
- \`workflows/cross-canvas.md\` — chain canvases (BMC → VPC → ...)
- \`workflows/story.md\` — write a project narrative with embedded canvases
- \`workflows/snapshot.md\` — when to milestone, how to restore
- \`workflows/translate.md\` — en ⇄ zh round trip
- \`workflows/case-library.md\` — read curated company cases for inspiration, or fork one to start fast
- \`workflows/resource-reading.md\` — read curated books/resources with chapter-aware depth, and use the checklist → writing → audit quality gate when authoring resource chapters
- \`workflows/self-iteration.md\` — keep installed skills, project-local skills, skill zips, and app releases in sync after updates
- \`workflows/library-evolution.md\` — when adding a new canvas, case, pattern, experiment, strategy framework, or resource: decide the content layer, integrate it into cases/stories, validate, then regenerate the skill${patternsWorkflow}${experimentsWorkflow}${strategyFrameworksWorkflow}

### Reference
- \`reference/cli-cheatsheet.md\` — top commands with JSON output examples
- \`reference/color-legend.md\` — sticky palette + how to interpret colours
- \`reference/identity.md\` — \`X-Display-Name\` / \`--as\` / audit trail
- \`reference/ai-context-shape.md\` — shape of the \`/ai-context\` JSON
- \`reference/case-library.md\` — case kinds, slug rules, read-only rules
- \`reference/resource-quality.md\` — 12 source-verified resources, chapter quality gates, and audit expectations${patternsReference}${experimentsReference}${strategyFrameworksReference}

## Key invariants — never violate

- **Replace-mode writes**: \`pingarden canvas write\` REPLACES the entire stickies map (and any other root you include in the payload). Always send the complete intended state, not a delta.
- **Auto-snapshot first**: every \`canvas write\` takes a \`pre-ai-edit-<ISO>\` milestone before touching state. Failure recovery is one \`pingarden snapshot restore --mode replace\` away.
- **\`zoneId\` validation is local-first**: the CLI reads \`/ai-context\` to verify your \`zoneId\`s exist on the canvas before writing. Unknown zone → no snapshot, no write.
- **Never parse Yjs binary**: use \`canvas read\` (which calls \`/ai-context\`) for state, never \`PUT /canvases/:id/state\` directly.
- **One sticky = one concept**: don't write paragraphs into a sticky. If a sticky needs more than ~20 words, split it.
`;
}

// ─── Per-canvas .{en,zh}.md ──────────────────────────────────────────────────

export interface CanvasMdInput {
  bundle: CanvasBundle;
  lang: Lang;
}

export function renderCanvasMd({ bundle, lang }: CanvasMdInput): string {
  const i18n = pickI18n(bundle, lang);
  const name = bundle.manifest.name[lang] ?? bundle.manifest.name.en;
  const intro = firstParagraphs(bundle.knowledge.intro[lang], 2);
  const curated = bundle.curated[lang]?.trim() ?? '';

  const blocks = bundle.manifest.zones
    .map((z) => {
      const block = i18n.blocks[z.id];
      const title = block?.title ?? z.id;
      const prompt = block?.prompt ?? '';
      const example = block?.examples?.[0] ?? '';
      const qualityBar = firstSentencesFromMarkdown(
        bundle.knowledge.blocks[z.id]?.[lang],
        120,
      );
      const lines: string[] = [];
      lines.push(`### \`${z.id}\` — ${title}`);
      if (prompt) lines.push('', `**Prompt** — ${prompt}`);
      if (example) lines.push('', `**Example** — ${example}`);
      if (qualityBar) lines.push('', `**Quality bar** — ${qualityBar}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const colorLegend = renderColorLegend(bundle, lang);
  const cross = renderRelated(bundle, lang);

  // Header.
  const out: string[] = [];
  out.push('---');
  out.push(`canvas: ${bundle.id}`);
  out.push(`language: ${lang}`);
  out.push(`source: packages/canvases/${bundle.id}/`);
  out.push('---');
  out.push('');
  out.push(`# ${name}`);
  out.push('');

  // When-to-use: prefer curated, else fall back to intro.
  if (curated.length > 0) {
    out.push(curated);
  } else if (intro.length > 0) {
    out.push('## When to use');
    out.push('');
    out.push(intro);
  }

  out.push('');
  out.push('## Blocks');
  out.push('');
  out.push(
    lang === 'zh'
      ? '`zoneId` 是 API 的稳定标识符,`pingarden canvas write` payload 必须用它,不要翻译。'
      : 'The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.',
  );
  out.push('');
  out.push(blocks);

  if (colorLegend.length > 0) {
    out.push('');
    out.push('## Colour legend');
    out.push('');
    out.push(colorLegend);
  }

  if (cross.length > 0) {
    out.push('');
    out.push('## Pairs with');
    out.push('');
    out.push(cross);
  }

  out.push('');
  out.push('---');
  out.push(`Source: \`packages/canvases/${bundle.id}/\` — regenerate with \`pingarden skill build\`.`);
  out.push('');

  return out.join('\n');
}

function renderColorLegend(bundle: CanvasBundle, lang: Lang): string {
  const legend = bundle.manifest.defaultColorLegend;
  if (!legend) {
    return lang === 'zh'
      ? '_未自定义,使用六色 sticky 默认调色板。颜色无固定语义,作者可自行约定。_'
      : '_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._';
  }
  return Object.entries(legend)
    .map(([hex, entry]) => {
      const label = entry.label[lang] ?? entry.label.en;
      const desc = entry.description?.[lang] ?? entry.description?.en ?? '';
      return `- \`${hex}\` — **${label}**${desc ? `: ${desc}` : ''}`;
    })
    .join('\n');
}

function renderRelated(bundle: CanvasBundle, lang: Lang): string {
  const related = bundle.manifest.related ?? [];
  if (related.length === 0) return '';
  const notes = bundle.manifest.relatedNotes ?? {};
  const intro =
    lang === 'zh'
      ? `这张画布常和这些一起用,做完后引导用户接下去做:`
      : `This canvas typically pairs with the following — once done, suggest the user move to one of these next:`;
  const lines = related.map((id) => {
    const reason = notes[id]?.[lang] ?? notes[id]?.en;
    return reason ? `- \`${id}\` — ${reason}` : `- \`${id}\``;
  });
  return [intro, '', ...lines].join('\n');
}

// ─── Workflow markdowns (curated, static) ────────────────────────────────────

export const WORKFLOW_FILES: Record<string, string> = {
  'workflows/resource-reading.md': `# Resource reading — use source books as chapter-aware strategy material

Use this workflow whenever the user asks about a **book, report, article, paper, or source material** in the Resources tab, asks "what should I read", asks to explain a resource chapter, or asks to improve/add resource chapters.

## Reading workflow

1. Start from the resource metadata: title, recommendation, related canvases/frameworks/cases, and chapter index.
2. Prefer the chapter index first. Use chapter titles and summaries to identify the minimum relevant chapter instead of loading an entire book note.
3. Fetch full chapter content only when needed for a concrete question, teaching explanation, or source-grounded answer.
4. Connect the chapter back to PinGarden tools: canvases, patterns, strategy frameworks, experiments, and cases. Resources are the **source-material layer**, not the project layer.
5. When answering, distinguish:
   - **What the source says** (chapter-level concept / argument / case)
   - **What it means for the user's project** (canvas, strategic choice, assumption, or experiment)
   - **What to do next** (open a related canvas, read another chapter, fork a case, or run an experiment)

## Chapter-aware Resources UI

The Resources tab can expose book-like entries with chapter counts. The detail modal supports:

- a resource overview and recommendation
- a Chapters tab with left chapter navigation
- long-form bilingual chapter markdown
- chapter-level related cases/canvases/patterns
- references and source citations

Do not assume every resource has chapters. Articles, reports, papers, and web links may only have a reading note and references.

## Authoring / quality workflow for resource chapters

When creating, expanding, rewriting, or auditing files under \`packages/case-library/resources/<resource>/chapters/\`, follow the hard quality gate below. Do **not** write a thin summary copied from \`chapters/index.json\`.

### Three-role pipeline

1. **Checklist role** — read source extracts only and write \`checklists/<chapter>.json\`.
2. **Writing role** — write \`chapters/<chapter>.en.md\` and \`chapters/<chapter>.zh.md\` from the checklist.
3. **Audit role** — compare checklist vs EN/ZH prose and write \`audit-report.md\` with item-level PASS/FAIL.

Keep these roles conceptually separate. A chapter is complete only when the audit is all PASS.

### Checklist contents

Each checklist must include named concepts/frameworks, key arguments with evidence, cases/examples, logic chains, terminology, nuance, and valid cross-references. Cross-reference slugs must exist in the library manifest or canvas bundles.

### Validation commands

Run these from the repo root after authoring resource chapters:

\`\`\`bash
python3 .claude/skills/book-chapter-quality/scripts/check-orphans.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/check-thickness.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/check-bilingual.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/audit-coverage.py <resource-slug> <chapter-slug>
\`\`\`

Also run a cross-reference check when adding or changing related slugs. Do not mark work complete if any script reports missing files, stubs, bilingual gaps, invalid slugs, or audit failures.

## Current quality baseline

The bundled resource library includes 12 source-verified business books with chapter-level content, checklists, and audit reports: BMC, VPC, The Invincible Company, The Innovator's Dilemma, Testing Business Ideas, Scenario Planning in Organizations, Blue Ocean Strategy, Blue Ocean Shift, Competitive Strategy, Competitive Advantage, The Art of the Long View, and Platform Revolution.
`,
  'workflows/self-iteration.md': `# Self-iteration — keep the installed skill current

Use this workflow whenever the user asks to install, update, package, release, or verify the PinGarden skill, or when the app has just been upgraded.

## Activation self-check

1. Run \`pingarden doctor\` first. If the CLI is missing, ask the user to launch the PinGarden desktop app once or use **Help → Install CLI to PATH**.
2. Run a non-destructive update probe:

\`\`\`bash
pingarden skill install --dry-run --json
\`\`\`

3. Parse \`data.wouldChange\`:
   - \`false\` → the installed skill is current; continue normal work.
   - \`true\` → the app/CLI/library content can improve the installed skill. If the user asked for install/update/release, run \`pingarden skill install\`. If the host agent requires approval for writing outside the workspace, request it before installing.
4. After an update, run \`pingarden doctor\` again and tell the user to reload/restart the AI agent session if their tool caches skills.

## Source-repo release loop

When working inside the PinGarden repo and changing canvases, cases, patterns, experiments, strategy frameworks, skill templates, or install prompts:

\`\`\`bash
pnpm typecheck
pnpm --filter @pingarden/cli build
node apps/cli/dist/index.js skill install --local
pnpm package:mac
\`\`\`

\`pnpm package:mac\` is the canonical release path: it regenerates the project-local skill, creates the portable \`pingarden-skill-<version>.zip\`, and bundles that zip into the macOS DMG via \`extraResources → skill-pack\`.

## Drift rules

- Do not manually edit an installed global skill as the source of truth. Change generator inputs, rebuild the CLI, then reinstall.
- Do not keep multiple stale \`pingarden-skill-*.zip\` files around; packaging intentionally leaves one current zip.
- Do not parse \`.ydoc\` files or write runtime data while iterating the skill.
- Treat \`.pingarden-skill-version\` as the installed skill identity: it includes the CLI semver plus the content hash.
`,
  'workflows/discover.md': `# Discover — first call in a session

Before doing anything else, figure out what's already there. Ask in this order:

\`\`\`bash
pingarden doctor --json
pingarden project list --json
pingarden canvas list --json
pingarden template list --json
\`\`\`

If \`doctor\` reports the server isn't reachable, ask the user to open the PinGarden Mac app or run \`./start.sh\` in the repo. Don't try to spawn the server yourself.

If the user has existing canvases that match what they're asking about, **prefer iterate over greenfield** (\`workflows/iterate.md\`) — overwriting is recoverable via snapshot restore but still surprising.
`,

  'workflows/greenfield.md': `# Greenfield — turn a chat into a canvas

Use when the user has been discussing a business case (a new venture, a pivot, a strategic option) and wants the analysis written into PinGarden.

\`\`\`bash
# 1. See what templates exist (sanity)
pingarden template list --json

# 2. Get the structure of the canvas you'll fill — ZONE IDS COME FROM HERE
pingarden canvas describe-template <defId> --lang <en|zh> --json

# 3. Create the project (if it doesn't already exist)
pingarden project create --name "<name>" --description "<one line>" --json

# 4. Create the canvas under it
pingarden canvas create \\
  --project <projectId> \\
  --def <defId> \\
  --title "<canvas title>" \\
  --lang <en|zh> \\
  --json

# 5. Compose the bulk JSON locally — see canvases/<defId>.<lang>.md for fill order + quality bar
# 6. Preview the diff before writing
echo '<payload>' | pingarden canvas write <canvasId> --dry-run --json

# 7. Write for real (auto-snapshot fires before the bulk POST)
echo '<payload>' | pingarden canvas write <canvasId> --json
\`\`\`

**Sticky granularity**: 1 concept per sticky. ~5–15 words. Don't write essays. If a sticky needs more, it should be 2 stickies.

**Color**: leave \`color\` unset unless the canvas declares a \`defaultColorLegend\` (see the colour legend section in the per-canvas md). Default \`#FCF1A8\` is fine for vanilla notes.
`,

  'workflows/iterate.md': `# Iterate — refine an existing canvas

\`\`\`bash
# 1. Read current state
pingarden canvas read <canvasId> --lang <en|zh> --json

# 2. Read the methodology for this canvas (so refinements respect block semantics)
# → consult canvases/<defId>.<lang>.md

# 3. Compose your refined complete state — NOT a diff. Replace-mode means
#    every sticky you don't include is GONE.

# 4. Preview the diff
echo '<payload>' | pingarden canvas write <canvasId> --dry-run --json

# 5. Apply (auto-snapshot fires)
echo '<payload>' | pingarden canvas write <canvasId> --json
\`\`\`

**Diff sanity check**: if your dry-run shows a huge negative net, you probably forgot to include all existing stickies. Re-read the canvas, then send the FULL desired end state.

**When in doubt**, take an explicit milestone first:
\`\`\`bash
pingarden snapshot create <canvasId> --label "before-pricing-pivot"
\`\`\`
This is on top of the auto pre-edit snapshot. Two layers of undo is fine.
`,

  'workflows/cross-canvas.md': `# Cross-canvas — chain templates

When the user has finished one canvas and the methodology suggests filling a paired one, walk them through. Common chains:

- **BMC → VPC**: pick the most important Customer Segment from BMC and build its Value Proposition Canvas.
- **BMC → BME (Business Model Environment)**: surface the external forces that pressure the model.
- **VPC → Empathy Map**: deep-dive on the customer to back the pains/gains.
- **JTBD → VPC**: jobs / pains / gains feed VPC's customer side.

The \`Pairs with\` section in each \`canvases/<defId>.<lang>.md\` lists the canonical chains.

\`\`\`bash
# 1. Read source canvas to lift content
pingarden canvas read <sourceCanvasId> --json

# 2. See the target template
pingarden canvas describe-template <targetDefId> --json

# 3. Create the target
pingarden canvas create --project <pid> --def <targetDefId> --title "..." --json

# 4. Compose payload that REFERENCES (in text) the source canvas content,
#    then write it
echo '<payload>' | pingarden canvas write <newCanvasId> --json
\`\`\`

When the link is tight (e.g. one VPC per BMC Customer Segment), prefix the canvas title with the segment name so the user can scan the project page.
`,

  'workflows/story.md': `# Story — narrate canvases

Stories are markdown documents at the project level, optionally embedding canvases. Use stories to:

- Explain WHY a canvas is the way it is.
- Teach a newcomer the market context, strategic move, and operating logic.
- Tie multiple canvases into a coherent narrative with explanatory bridges.

## Quality bar for case-library stories

A case-library story is not a caption. It must include:

1. Context and tension — what market, customer problem, organizational constraint, or competitive trap existed before the move.
2. Strategic move — what the company changed, including trade-offs.
3. Canvas reading guide — introduce each embedded canvas and tell readers what to notice.
4. Mechanism — why the model works economically, operationally, and organizationally.
5. Risks and limits — what could break or what the case does not prove.
6. Transfer lesson — how to apply the insight elsewhere.

One company may have multiple stories. Preserve the business-model story when useful, then add framework-specific, pattern-specific, or culture-specific companion stories.

Framework-specific requirements:

- Blue Ocean Strategy: explain red-ocean baseline, noncustomers, ERRC logic, value-curve shape, and BMC consequences.
- Business Model Environment Scan: explain external forces, opportunities/threats, BMC pressure points, strategic response, and uncertainty.
- Business Model Portfolio Management: embed at least one \`portfolio-map\` canvas, then explain portfolio unit, Explore/Exploit split, map placement, portfolio actions, movement over time, evidence, and risks. For dynamic cases, use multiple dated Portfolio Maps or a movement table.

Pattern-specific stories must explain the reusable mechanism, the BMC blocks changed, why the case fits, failure modes, and transfer lesson. Culture stories must explain outcomes, behaviors, enablers, blockers, and how culture supports portfolio movement or experiments.

\`\`\`markdown
# Coffee Co — March narrative

## Context and tension

Specialty coffee delivery looked crowded because every player promised freshness, origin stories, and café-grade quality. The unresolved job was different: busy office workers wanted reliable weekday coffee without learning barista vocabulary.

## The strategic move

We reduced choice complexity and origin theatre, raised subscription reliability, and created a team-level replenishment ritual.

## Read the BMC first

::canvas[business-model-canvas]{canvasId="<bmc-uuid>"}

The important link is not the subscription sticky by itself; it is how recurring revenue funds predictable roasting batches and lower failed-delivery cost.

## What to test next

The riskiest assumption is office-manager willingness to own coffee replenishment. Validate it before scaling paid acquisition.
\`\`\`

\`\`\`bash
pingarden story create \\
  --project <projectId> \\
  --title "<title>" \\
  --file story.md \\
  --json
\`\`\`

The server validates that every \`::canvas[...]{canvasId="..."}\` directive points to a canvas in the same project. \`defId\` (the brackets) must match the canvas's actual def.
`,

  'workflows/snapshot.md': `# Snapshot — when to milestone, how to restore

You almost never need to call \`snapshot create\` explicitly — \`canvas write\` does it for you with the label \`pre-ai-edit-<ISO>\`.

Take an EXPLICIT milestone when:

- The user is committing to a strategic direction. Label it descriptively (\`"approved-pricing-v1"\`).
- You're about to do a destructive bulk write (e.g. wholesale rewrite from a workshop) — the auto-snapshot is fine, but a named one is searchable.

\`\`\`bash
# Explicit milestone
pingarden snapshot create <canvasId> --label "approved-pricing-v1" --description "Q2 2026 board approval"

# List
pingarden snapshot list <canvasId> --json

# Restore — REPLACE the live canvas
pingarden snapshot restore <canvasId> <sid> --mode replace

# Restore — FORK to a new canvas (keeps original intact)
pingarden snapshot restore <canvasId> <sid> --mode fork
\`\`\`

When a write fails, the CLI prints the snapshot id + restore command on the error path. Re-read it and surface the restore option to the user.
`,

  'workflows/translate.md': `# Translate — en ⇄ zh

\`\`\`bash
# 1. Read source language
pingarden canvas read <canvasId> --lang en --json

# 2. Translate the sticky text in your reply (the AI's job, not the CLI's)

# 3. Write the translated payload back. Replace-mode applies — all stickies
#    are recreated with new server-assigned ids, but the canvas language can
#    be flipped via canvas update if you want the UI to default to the new
#    language.
echo '<payload-with-translated-text>' | pingarden canvas write <canvasId> --json
pingarden canvas update <canvasId> --lang zh
\`\`\`

When translating, **do not translate \`zoneId\` keys** — they are stable API identifiers (\`customer-segments\`, etc.). Only the \`text\` field of each sticky should change.

The \`prompt\` and \`title\` shown in \`canvas describe\` already come back in the requested \`--lang\`, so use those as the anchor for what each block expects.
`,

  'workflows/case-library.md': `# Case library — read for inspiration, fork to edit

PinGarden ships a curated **case library** at \`packages/case-library/\` (read-only) — real company analyses across multiple canvases, with the user's local "my projects" living in writable user storage. The library and the user's projects are federated: the same HTTP routes (and the same CLI) read both, but the library cannot be edited.

Two flows you'll see most:

## 1. Read-only borrow — "show me how X did it"

User asks "how would Tesla fill the BMC?" or "I want a private-banking BMC like Maerki Baumann does it." Don't fork yet — first read the library, learn the shape, then apply that knowledge to the user's own canvases.

\`\`\`bash
# Browse what's available
pingarden case list --json
pingarden case list --tag automotive --json

# Get the structural shape (zone titles, color legend, canvas list) without
# pulling every sticky — cheap, good for orientation
pingarden case describe <slug> --lang <en|zh> --json

# THE KILLER COMMAND: pull every canvas + every story body of a case
# in one shot. Use this when the user wants you to actually mirror the
# analysis or quote from it.
pingarden case read <slug> --lang <en|zh> --json
\`\`\`

\`case read\` returns the full \`AiContext\` for every canvas (block-grouped sticky JSON, identical to \`canvas read\`) plus the markdown body of every story. Same shape as a normal canvas read — just batched and labelled by case.

The library is **read-only**: any \`canvas write\` against a library canvas returns 403. If the user wants to actually edit, you must fork first.

## 2. Fork to edit — "use Y as my starting point"

User wants their own copy of a library case (often "the structure looks great, change the company / details"). Fork = deep copy into user storage with new UUIDs; story \`::canvas[]{canvasId="..."}\` directives are rewritten to point at the new canvases so the forked story renders correctly.

\`\`\`bash
# 1. Fork — returns the new project + canvas + story IDs
pingarden case fork <slug> --json

# 2. From here it's standard editing. The new canvases are normal user
#    canvases — write, snapshot, restore, story all work as usual.
pingarden canvas read <newCanvasId> --json
echo '<payload>' | pingarden canvas write <newCanvasId> --json
\`\`\`

The fork does NOT track the upstream — future library updates won't propagate. That's deliberate; the user's copy is fully independent.

## When to read vs fork

- **Read** when the user wants insight, comparison, or to copy *concepts* into their own work. Don't pollute their workspace with a copy they didn't ask for.
- **Fork** only when the user explicitly says "I want my own version" / "use this as my starting point" / "edit it for me." Never auto-fork.

## Anti-patterns

- ❌ Trying to \`canvas write\` against a case-library canvas. The 403 will block you, and the user wasn't asking to edit the library anyway.
- ❌ Forking a case "just in case the user wants to edit later." Forks are visible in their project list — only fork when asked.
- ❌ Pulling \`case read\` for every case in the library at once to "have context." Pull the one(s) you actually need; \`case list\` gives you the slug + summary first.
`,

  'workflows/patterns.md': `# Patterns — abstract reusable models, separate from cases

A **business-model pattern** (Long Tail, Unbundling, Multi-Sided Platforms, …) is *not* a case — it has no BMC, no project, no fork. It's a curated explanation plus a list of concrete cases that exemplify it. Patterns live at \`packages/case-library/patterns/<slug>/\`, are listed in \`manifest.json.patterns\`, and are served by \`/library/patterns(/:slug)\`.

This workflow handles three user requests:

## "Is this Long Tail / Unbundling / [pattern X]?" — pattern lookup from a company

User points at a company and asks what pattern it follows.

1. \`pingarden case list --json\` (or \`--tag <foo>\` to narrow). Find the slug if the company is in the library.
2. \`pingarden case get <slug> --json\` — read \`appliesPatterns\` on the case.
3. For each pattern slug found: \`pingarden pattern get <pattern-slug> --json\` — its \`description.{en,zh}\` markdown explains the pattern, and \`exampleCases\` lists peer companies in the same family.
4. If the company isn't in the library, walk \`pingarden pattern list --json\`, read each pattern's \`patterns/<slug>.{en,zh}.md\` skill page (TL;DR + signals + how-to-spot-from-a-BMC), and reason about which fits.

## "Give me other companies in the same pattern" — discovery from a pattern

1. \`pingarden pattern list --json\` to remind yourself of which patterns exist.
2. \`pingarden pattern get <slug> --json\` — \`exampleCases\` is a hydrated array of \`CaseLibraryEntry\`. Each carries enough metadata (name, summary, tags) to recommend without a second round trip.
3. To go deeper into one example: \`pingarden case get <example-slug>\` → \`pingarden case canvases <example-slug>\` → \`pingarden canvas describe <id> --json\` for any specific BMC.

## "Help me draft a BMC by applying [pattern X]" — pattern application

The pattern's \`patterns/<slug>.{en,zh}.md\` skill page lists signals, how-to-spot-from-a-BMC, and anti-patterns. Walk the user's idea against each:

1. \`pingarden pattern get <slug>\` and read the skill page.
2. Make sure the user's idea matches the *signals* (e.g. Long Tail wants thousands of niche items, near-zero marginal inventory cost, strong search/recommend). If signals don't match, push back rather than forcing the pattern.
3. Walk through the skill page's "How to spot it from a BMC" — those are the cells you should populate first when drafting their canvas.
4. Show them at least one shipped example (\`pingarden case get <example-slug>\`) so they can see the pattern in real form.

## Cross-references between cases and patterns

Forward link (case → pattern): \`CaseLibraryEntry.appliesPatterns: string[]\` — what pattern slugs the case exemplifies. Many-to-many: a case can apply more than one.

Reverse link (pattern → case): \`BusinessModelPattern.examples: CaseExampleRef[]\` — curated by the pattern author. The runtime hydrates these in \`/library/patterns/:slug\`'s \`exampleCases\` field.

## Citing a pattern's origin — use the cite handle

Each pattern's \`pattern.json\` carries an annotated \`references\` array (see \`reference/patterns.md\`). Every entry has a short author-year \`cite\` handle (e.g. \`Anderson 2006\`, \`Hagel & Singer 1999\`, \`BMG 2010\`). When you cite the pattern's origin in a chat reply, **use the cite handle** — it's the same handle used inside the pattern's \`description.{en,zh}.md\` prose AND its skill page's \`## References\` block, so the user can connect what you say to the bibliography in the web modal without guessing.

Example: instead of *"the unbundling pattern was originally proposed in a 1999 HBR article"*, write *"the unbundling pattern was originally proposed in (Hagel & Singer 1999), and adapted into the BMC catalog as Pattern No. 1 in (BMG 2010)"*. The handles are stable across rebuilds.

## Anti-patterns

- ❌ Treating a pattern as a case. Patterns have no canvases — \`case get long-tail\` will 404. Use \`pattern get long-tail\` instead.
- ❌ Forcing a pattern onto a BMC where the signals don't match. Patterns are descriptions of *coherent* business models; misapplied, they make the user's BMC less coherent, not more.
- ❌ Ignoring \`appliesPatterns\` when reading a case. The pattern is half the story — read both.
- ❌ Inventing your own citation abbreviations. If the pattern's \`references\` says \`BMG 2010\`, don't write \`Osterwalder 2010\` or \`Strategyzer book\` — keep the handle stable so the user can scan the bibliography.
`,

  'workflows/authoring-patterns.md': `# Authoring a new business-model pattern

When the user says "let's add a new pattern" or "create a Multi-Sided Platforms pattern", follow this workflow. Patterns are SEPARATE first-class entities from cases — never the same path.

## Pre-conditions

- The user has named a specific pattern from a real source (BMG, Hagel, Strategyzer-newer-book, an HBR article, etc.). Don't invent patterns from a hunch.
- You can identify ≥ 1 case in the library that exemplifies the pattern. If no library case fits, you'll need to author a fresh exemplar case before or alongside the pattern (parallel to how Long Tail shipped with \`lulu-com\` + \`lego-long-tail\`, MSP shipped with \`google-multi-sided\` + \`visa\` + \`nintendo-wii\`).

## Steps

### 1. File layout

Create exactly five files at \`packages/case-library/patterns/<slug>/\`:

\`\`\`
pattern.json         BusinessModelPattern (slug, name, summary, sources, references?, examples)
description.en.md    long-form user-facing prose, 5-section template (~600-800 words)
description.zh.md
skill.en.md          AI-facing condensed page, 5-section template (~200 words)
skill.zh.md
\`\`\`

All five are required. Skipping any breaks \`pingarden case validate\`.

### 2. \`pattern.json\` shape

Use \`PatternReference\` (annotated bibliography), not \`CaseSource\`. Each reference must carry: \`type\` (book/article/paper/web), \`cite\` (author-year handle), \`label\`, \`year\`, optional \`pages\`/\`url\`, and a bilingual \`note\` saying *what THIS source contributes*. The \`cite\` handle is the ONLY citation form you should use in description.md prose — keep it stable across edits.

\`examples\` is curated reverse links to library cases. Every slug must resolve to a manifested case. Forward links from cases to patterns live on \`case.json.appliesPatterns\` — see step 4 below.

### 2a. When the pattern has structural sub-types

Some patterns are textbook-grouped under one chapter but have meaningfully different BMC shapes per flavor — the canonical example is **Free** (BMG Pattern No. 4) which has three sub-types: ad-supported (Google search side), freemium (Spotify, Dropbox), and bait-and-hook (Gillette, HP printers). Treating these as one opaque tag throws information away; treating them as three patterns over-fragments. The compromise: ONE pattern with explicit sub-typing.

\`pattern.json\` adds an optional \`subtypes[]\` array. Each entry carries:

- \`id\` — stable kebab-case within the pattern (e.g. \`ad-supported\`, \`freemium\`, \`bait-and-hook\`)
- \`name\` — bilingual short label
- \`summary\` — bilingual ~40-word blurb
- \`examples\` — curated cases for THIS sub-type (subset of the parent \`examples[]\`)

Cases tag the sub-type via the parallel field \`appliesPatternSubtypes\`:

\`\`\`json
"appliesPatterns": ["free"],
"appliesPatternSubtypes": { "free": "freemium" }
\`\`\`

The map key must appear in \`appliesPatterns[]\` (validator enforces) and the value must match a \`subtypes[].id\` on the referenced pattern (validator enforces). Cases that don't refine just omit \`appliesPatternSubtypes\` — fully optional, fully backward-compatible with patterns that don't sub-type.

The \`description.{en,zh}.md\` should have an explicit \`## Three sub-types\` (or N) section with \`### <Sub-type name>\` headers matching the \`subtypes[].name\` — the typography plugin renders these as visible sub-headings in the modal. Audit existing cases per sub-type, not just per pattern, to maintain cross-link granularity.

### 3. \`description.{en,zh}.md\` — 5-section structure

Every shipped pattern follows this skeleton. Don't deviate.

1. \`# <Pattern Name>\` + \`> *<pull-quote>*\` from canonical source with cite handle
2. \`## Why this pattern matters\` — origin (~250 words). Use cite handles in prose.
3. \`## What a <pattern> BMC looks like\` — block-by-block, **5–6 of the 9 BMC blocks**. Pick the signal blocks; skip the trivia ones.
4. \`## Concrete examples\` — 4–8 examples; at least 2 are library cases.
5. \`## What goes wrong\` — 3–5 failure modes, **bold lead-in then explanation**.
6. \`## Read the examples\` — direct slug pointers grouped by \`role: primary\` then \`secondary\`.

### 4. Pattern audit on existing cases — DO NOT SKIP

This is the step every prior pattern rollout almost forgot. After authoring the pattern files, walk EVERY existing case and decide whether it also applies the new pattern:

\`\`\`bash
ls packages/case-library/cases/
# For each case: read case.json, ask "does this also apply <new pattern>?"
\`\`\`

For each case that applies, edit \`case.json\` and append the new pattern's slug to \`appliesPatterns[]\`. Be biased toward fewer tags — only tag when the new pattern is clearly a primary or secondary description of the case, not a faint adjacency.

The 2026-06-15 MSP rollout is the worked example: 4 existing cases were tagged (\`udemy\`, \`aliexpress\`, \`lulu-com\`, \`lego-long-tail\`) and several adjacent cases were explicitly rejected (\`swiss-private-banking\`, \`mobile-telco-unbundling\`, \`patagonia\`, \`carvana\`, \`cainiao\`). The rejections matter as much as the tags.

### 5. Manifest entry

\`\`\`bash
# Edit packages/case-library/manifest.json
# Add the new pattern slug to "patterns" array.
# (If the rollout includes a new exemplar case, add that to "cases" too.)
\`\`\`

### 6. Validate + skill regen

\`\`\`bash
node apps/cli/dist/index.js case validate     # cross-checks both directions
node apps/cli/dist/index.js pattern list      # verify pattern parses
node apps/cli/dist/index.js pattern get <slug>  # verify hydrated examples
pnpm typecheck
pnpm --filter @pingarden/web build
pnpm --filter @pingarden/cli run build
node apps/cli/dist/index.js skill install --local
git diff .claude/skills/pingarden/   # expect: patterns/<slug>.{en,zh}.md +
                                     # SKILL.md version + workflows/patterns.md +
                                     # reference/patterns.md
\`\`\`

### 7. Smoke test

Restart \`./start.sh\` and open \`/library\` in the browser:
- Patterns tab shows N+1 patterns (the new one with its example count)
- Click the new pattern's card → modal opens with grouped References footer
- Click an example case in the modal → close + jump to Cases tab + open case modal
- Cases tab: cross-tagged cases show the new pattern's chip in their Applies-patterns strip
- Switch UI lang → all bilingual content translates correctly

## Anti-patterns

- ❌ Authoring \`description.md\` without \`references\` annotated. Without \`PatternReference\`, the modal renders a flat list and the skill can't tell originating papers from adapter books.
- ❌ Skipping the audit. The new pattern lives in isolation; existing cases that should exemplify it are never tagged. Cross-link graph silently weakens.
- ❌ Tagging too eagerly. If the pattern is only a *faint* description of a case, leave it untagged. Over-tagging dilutes the pattern's identity.
- ❌ Inventing a pattern that isn't in a real source. Patterns must come from BMG, Hagel & Singer, Eisenmann/Parker/Van Alstyne, Anderson, Rochet & Tirole, etc. Don't synthesise patterns from your own analysis — push back to the user and ask for the canonical source.
- ❌ Forgetting to rebuild the CLI before \`skill install --local\`. The CLI imports compiled \`@pingarden/shared/dist\` at runtime; new schema fields don't reach the skill output until the CLI is rebuilt.
`,

  'workflows/experiments.md': `# Workflow: pick an experiment from the library

When the user has a riskiest assumption to test (or asks "how do I validate X", "what experiment should I run", "我该怎么验证…"), don't free-style. The library at \`experiments/<slug>.{en,zh}.md\` ships ~12 curated TBI recipes; pick from those before inventing.

## The 3-step match

### 1. Classify the assumption — Desirability / Feasibility / Viability

TBI's three risk axes:

- **Desirability** — "Do customers want it?" The market is too small, customers don't care, the value proposition doesn't land.
- **Feasibility** — "Can we build / deliver it?" Tech, IP, key resources, partners, capabilities.
- **Viability** — "Can we earn money from it?" Pricing, revenue stream, willingness to pay, unit economics.

Most early-stage assumptions are Desirability-flavored ("users will pay $X / month for Y"). When the user names a structural / cost / supply assumption, it's Feasibility or Viability.

### 2. Decide Discovery vs Validation

- **Discovery** — first insights, course-correct rapidly. Cheap, weak evidence. Answers "is the direction even plausible?" Customer Interview, Online Survey, Discussion Forums, Search Trend Analysis, Boomerang, Storyboard, Clickable Prototype.
- **Validation** — confirm the direction with strong evidence. Costlier, slower, but the result is closer to "we should bet on this." Smoke Test, Wizard of Oz, Concierge, Letter of Intent, Pre-Sale.

Default to Discovery when the user has zero data; jump to Validation only when (a) Discovery has already pointed in the direction and (b) the user explicitly wants stronger evidence (board ask, funding gate, build commitment).

### 3. Match on cost + capabilities + canvas

Within the chosen Discovery / Validation set, narrow to 2-3 candidates by:

- **Cost band** — \`cheap\` / \`medium\` / \`expensive\`. Match user's stated budget; default to cheap.
- **Capabilities** — does the user's team actually have the skills? E.g. \`landing-page-copy\` for Smoke Test, \`interview-design\` for Customer Interview.
- **Canvas affinity** — \`experiment.appliesToCanvases[]\` lists which canvases each test most often validates. If the user is editing a VPC pain sticky, prefer experiments tagged \`value-proposition-canvas\`.

## Output shape

Return 2-3 candidate experiments with **trade-offs**, not a single "right" answer:

> Your assumption ("enterprises will pay $30k/yr for analytics dashboards") is **Desirability + Viability**. Three candidates:
>
> 1. \`customer-interview\` — cheap, hours to set up. Confirms whether the pain is real and chronic, but does NOT confirm willingness to pay.
> 2. \`smoke-test\` — medium cost, days to set up. Landing page with "Get pricing" CTA gates demand quantitatively, but doesn't verify enterprise procurement will sign.
> 3. \`letter-of-intent\` — medium cost, weeks to set up. Strong viability evidence (signed commitment), but slow and you need a target list of ~10 enterprises to approach.
>
> If you're at Discovery: do (1) first. If you've already done interviews and want stronger evidence: (2) → (3).

## Don't

- Don't recommend an experiment that the user can't actually run (no engineering team → no Wizard of Oz, no e-commerce site → no A/B Test).
- Don't claim weak-evidence tests (Customer Interview) "validated" anything; they Discover, not Validate.
- Don't invent experiments that aren't in the library. If genuinely none fit, recommend the closest two and flag the gap to the user.
- Don't fill the Experiment Canvas in the app yet — first agree on the experiment, then \`pingarden canvas write\` to populate the canvas's 6 zones.
`,

  'workflows/strategy-frameworks.md': `# Strategy frameworks — analysis methods, separate from patterns

A **strategy framework** (for example Blue Ocean Strategy) is an analysis method, not a case and not a business-model pattern. Frameworks live at \`packages/case-library/strategy-frameworks/<slug>/\`, are listed in \`manifest.json.strategyFrameworks\`, and are served by \`/library/strategy-frameworks(/:slug)\`.

## When to use

Use this workflow when the user asks for a strategic analysis method, wants examples of Blue Ocean Strategy / Business Model Environment Scan, or asks which cases demonstrate a framework.

1. \`pingarden strategy-framework list --json\` to see available methods.
2. \`pingarden strategy-framework get <slug> --json\` to read the framework description and hydrated example cases.
3. For a concrete company, read the case with \`pingarden case read <case-slug> --json\` and inspect \`appliesStrategyFrameworks[]\`.
4. For Blue Ocean Strategy specifically, pair the framework page with \`canvases/blue-ocean-strategy-canvas.<lang>.md\` before writing any value curve.
5. For Business Model Environment Scan specifically, pair the framework page with \`canvases/business-model-environment.<lang>.md\` and a concrete BMC; every environment signal must point back to one or more BMC blocks.

## Cross-link rules

- Framework → case: \`StrategyFramework.examples[]\` lists curated case slugs.
- Case → framework: \`CaseLibraryEntry.appliesStrategyFrameworks[]\` lists methods demonstrated by the case.
- Do not tag a case just because it is innovative. Tag it only when the framework is a clear teaching lens.
`,

  'workflows/strategy-framework-combinations.md': `# Strategy framework combinations — which methods chain, complement, or replace each other

PinGarden ships 16 strategy frameworks. They are not interchangeable. Some are sequenced (run A → then B), some are complementary (run side-by-side), some are alternatives (pick one). This workflow tells you which is which.

## When to use

Use this workflow when the user asks any of:

- "Should I use Framework A or Framework B?"
- "Where does Framework X fit in the process?"
- "What do I run after this analysis?"
- "Are these two frameworks saying the same thing?"

Read this BEFORE recommending a single framework — the answer is usually a *chain* of 2-4 frameworks, not one.

## The 6 categories (sorted by typical usage stage)

The library categorises every framework by what it analyses. Match the user's question to a category first, then pick the right framework inside the category.

| Category | Analyses | Frameworks |
| --- | --- | --- |
| environment-competition | What pressures the business from outside | pestel-analysis, business-model-environment-scan, porters-five-forces, blue-ocean-strategy |
| organization-ecosystem | What the firm itself / its ecosystem looks like inside | porters-value-chain, mckinsey-7s, platform-strategy |
| portfolio-growth | How a firm chooses what to invest in and how to grow | bcg-growth-share-matrix, ansoff-matrix, mckinsey-three-horizons, business-model-portfolio-management |
| innovation-evidence | How to manage / judge / measure innovation | disruptive-innovation, innovation-metrics |
| foresight-scenarios | How to plan under deep uncertainty | scenario-planning, performance-based-scenario-planning |
| customer-value-lens | How customers perceive value | bain-elements-of-value |

## Canonical chains by user question

### "Should we enter this market / industry?"

\`pestel-analysis\` → \`business-model-environment-scan\` → \`porters-five-forces\` → \`business-model-canvas\`

- PESTEL surfaces macro signals (Political/Economic/Social/Tech/Environmental/Legal).
- BMEScan compresses the BMC-relevant signals into BMG's 4 forces and pressure-tests against the BMC.
- Five Forces explains industry-level profit pressure (rivalry, buyers, suppliers, entrants, substitutes).
- BMC closes the loop: each pressure point must change a BMC block, or the analysis is unactionable.

### "Where is our actual moat?"

\`porters-value-chain\` → \`business-model-canvas (KA/KR/KP)\` → \`mckinsey-7s\` → \`design-criteria-canvas\`

- Value Chain locates the activity (or linkage) where cost or differentiation forms.
- BMC's Key Activities / Key Resources / Key Partners blocks are the higher-level map of those activities.
- 7-S checks whether the soft side (shared values, style, staff, skills) supports the activity hierarchy — without it, a service strategy or a quality strategy fails.
- Design Criteria encodes activity-level rules (e.g., gross margin ≥ 30%) the next iteration must respect.

### "What should we do with our current portfolio of businesses?"

\`bcg-growth-share-matrix\` → \`business-model-portfolio-management\` → \`mckinsey-three-horizons\` → \`portfolio-map\`

- BCG: classify every existing SBU (Star / Cash Cow / Question Mark / Dog).
- Business Model Portfolio Management: combine Explore (search) + Exploit (running businesses) on one map.
- Three Horizons: sequence in time (H1 core / H2 emerging / H3 future).
- Portfolio Map: PinGarden's canvas for risk × return × movement.

### "How should this one business grow next?"

\`ansoff-matrix\` → \`business-model-canvas\` → \`design-criteria-canvas\`

- Ansoff: pick a quadrant (penetration / market dev / product dev / diversification).
- BMC: identify which blocks must change for that quadrant.
- Design Criteria: encode constraints (must reuse channels / production base) so the team doesn't slip into a riskier quadrant by accident.

### "Is this new business a disruptive bet?"

\`disruption-diagnosis\` → \`mckinsey-three-horizons\` → \`innovation-metrics\` → \`experiment-canvas\`

- Disruption Diagnosis: pass Christensen's strict 3-part test (foothold + initial inferiority + upmarket trajectory), or honestly relabel it as sustaining / new-market entry / direct competition.
- Three Horizons: place the disruptive candidate as an H3 bet, organisationally insulated.
- Innovation Metrics: switch from mature-business KPIs to evidence-strength / learning-velocity / risk-reduction.
- Experiment Canvas: drive specific tests against the riskiest assumptions.

### "What if the future doesn't look like today?"

\`pestel-analysis\` → \`scenario-planning\` → \`performance-based-scenario-planning\` → \`design-criteria-canvas\`

- PESTEL: identify forces with high impact AND high uncertainty.
- Scenario Planning: build 2-4 plausible futures from the most uncertain forces.
- Performance-Based Scenario Planning: turn scenario work into an organisational project system that actually changes decisions.
- Design Criteria: encode the moves that are robust across multiple scenarios.

### "Why does our value proposition feel vague?"

\`value-proposition-canvas\` → \`jobs-to-be-done\` → \`bain-elements-of-value\` → \`customer-journey\`

- VPC: customer side (jobs / pains / gains) and value map (pain relievers / gain creators).
- JTBD: anchor functional / emotional / social jobs in concrete situations.
- Bain Elements: name which of the 30 value elements actually carry the value — instead of vague words like "convenient" or "premium".
- Customer Journey: locate where each element appears, strengthens, or breaks.

## Pairwise rules — when frameworks LOOK similar

These pairs cause the most confusion. Internalize the distinctions before recommending.

### PESTEL vs Business Model Environment Scan

Both scan external environment, but at different altitudes.

- PESTEL: 6 broad macro categories (Political/Economic/Social/Technological/Environmental/Legal). Output is raw signals.
- BMEScan: 4 BMG forces (Trends / Market / Industry / Macro). Output is BMC pressure points.
- BMEScan has a dedicated Industry Forces zone (competitors, new entrants, substitutes, suppliers, stakeholders) that PESTEL lacks.
- Flow: PESTEL upstream → BMEScan downstream → BMC pressure points. Use both; they are not interchangeable.

### Ansoff Matrix vs BCG Matrix

Both are 2×2 growth matrices, but they answer OPPOSITE questions.

- BCG: classifies *existing* businesses by share × growth → invest/harvest/divest decision. Portfolio-level, snapshot of present.
- Ansoff: picks the *direction* of growth for one business → product × market quadrant. Business-level, forward-looking.
- Per-BCG-quadrant mapping: Cash Cow → Ansoff penetration; Star → market or product dev; Question Mark → Ansoff is the decision tool; Dog → harvest or attempt diversification.
- Workflow: multi-business = BCG first, Ansoff per business. Single business = skip BCG, use Ansoff.

### Blue Ocean Strategy vs Disruptive Innovation

Both create new market space, but through DIFFERENT mechanics.

- Blue Ocean: value innovation — simultaneously RAISE buyer value and LOWER cost via the ERRC grid (Eliminate / Reduce / Raise / Create).
- Disruption: typically LOWERS initial mainstream performance to find a foothold in overshot or non-consumption customers, then climbs upmarket.
- They sometimes converge (e.g., new-market disruption can also reshape the value curve), but the strict tests differ. Blue Ocean does not require initial inferiority; Disruption requires it.

### Three Horizons vs Business Model Portfolio Management

Both manage a portfolio across time, but with different axes.

- Three Horizons: TIME-portfolio (today's core / 1-3y emerging / 3-10y future bets).
- Business Model Portfolio Management: RISK/RETURN portfolio (Explore searching for new models vs Exploit running existing ones), with Portfolio Map as the canvas.
- Use both: Three Horizons gives the time-sequencing question; Portfolio Management gives the search-vs-run question.

### McKinsey 7-S vs Porter's Value Chain

Both look inside the firm, but at different layers.

- 7-S: soft + hard alignment (Strategy / Structure / Systems / Shared Values / Style / Staff / Skills). Asks "is the organization coherent?"
- Value Chain: activity-level (9 activities + linkages). Asks "where in the activities does competitive advantage actually form?"
- Use both: Value Chain finds the load-bearing activity; 7-S checks whether the organisation can actually run that activity. A strategy that depends on activity X but has 7-S misalignment will fail.

## Anti-patterns — chains that LOOK reasonable but waste effort

- **PESTEL → BMEScan when you have no BMC yet**. BMEScan only adds value when there's something to pressure-test. If you're at "should we even enter?", stop at PESTEL.
- **Doing PESTEL AND BMEScan as two separate exhaustive sweeps**. The point of the chain is compression: BMEScan is the funnel for PESTEL signals. Don't double-count.
- **Running BCG on a single-business company**. There's only one bubble — the matrix doesn't help. Go straight to Ansoff.
- **Calling everything innovative "disruptive"** (the Uber misuse). If the new product is better than incumbents on mainstream dimensions, it's sustaining innovation. Honest labeling matters.
- **Putting a disruptive bet under the parent company's mature-business metrics**. Christensen's organisational prescription is insulation — without it, the disruption will be killed by margin pressure.
- **Treating Bain Elements as a 30-item checklist**. Strong propositions win by selecting a few elements that matter deeply to a segment, not by claiming all 30.
- **Doing 7-S without a strategy**. 7-S checks coherence WITH a strategy — without one, the seven boxes are just descriptive.

## Quick reference: user question → starting framework

| User question | Start with | Then |
| --- | --- | --- |
| "Should we enter this market?" | pestel-analysis | bmenvironment-scan, five-forces, BMC |
| "Why are our margins shrinking?" | porters-five-forces | porters-value-chain, BMC |
| "Where's our actual moat?" | porters-value-chain | mckinsey-7s, BMC |
| "Is our org ready for this strategy?" | mckinsey-7s | design-criteria-canvas |
| "Which businesses should we fund vs cut?" | bcg-growth-share-matrix | business-model-portfolio-management, ansoff-matrix per business |
| "How should this business grow next?" | ansoff-matrix | BMC, design-criteria-canvas |
| "What does our innovation portfolio look like over time?" | mckinsey-three-horizons | business-model-portfolio-management, innovation-metrics |
| "Is this candidate disruptive?" | disruption-diagnosis | three-horizons, innovation-metrics |
| "How do we measure exploration bets?" | innovation-metrics | experiment-canvas, evidence-scorecard |
| "What if the future is different?" | pestel-analysis | scenario-planning, performance-based-scenario-planning |
| "How do we run scenarios as a real process?" | performance-based-scenario-planning | design-criteria-canvas |
| "How does our network compound?" | platform-strategy | platform-ecosystem-map, BMC |
| "Why is our value prop vague?" | bain-elements-of-value | VPC, JTBD, customer-journey |
| "How do we open a new market with low cost + high value?" | blue-ocean-strategy | blue-ocean-canvas (strategy canvas / ERRC), BMC |

## What this workflow does NOT cover

- It does not tell you how to FILL a framework — that's in each framework's \`strategy-frameworks/<slug>.<lang>.md\` page.
- It does not tell you which CASES exemplify a framework — that's in each framework's \`examples[]\` and the case's \`appliesStrategyFrameworks[]\`.
- It does not enforce a single canonical chain. Strategy work is reflexive — finishing BMEScan might surface new PESTEL signals, finishing Disruption Diagnosis might invalidate the chosen H3 bet. Re-run upstream when downstream evidence demands it.
`,

  'workflows/library-evolution.md': `# Library evolution — add content without breaking the system

Use this workflow whenever you add a **new canvas template, case, business-model pattern, experiment, strategy framework, or resource**. The goal is to keep PinGarden's **Strategy Library** coherent: every new item must have a clear layer, cross-links, examples, UI surfacing, and skill guidance.

## Content architecture

PinGarden's Strategy Library has six layers. Pick the layer first; do not start by creating files.

1. **Case** — the application layer under \`packages/case-library/cases/<slug>/\`. Use when the content is a real company, industry, or comparison with canvases and stories.
2. **Canvas template** — the working-tool layer under \`packages/canvases/<defId>/\`. Use when users need a new structured place to think, analyse, or author stickies.
3. **Pattern** — the business-structure layer under \`packages/case-library/patterns/<slug>/\`. Use for reusable models like Multi-Sided Platforms, Free, Long Tail, or Open Innovation.
4. **Experiment** — the validation layer under \`packages/case-library/experiments/<slug>/\`. Use when the content tells users how to test a risky assumption.
5. **Strategy framework** — the analysis-lens layer under \`packages/case-library/strategy-frameworks/<slug>/\`. Use for lenses such as Blue Ocean, Scenario Planning, Platform Strategy, portfolio management, or environment scanning.
6. **Resource** — the source-material layer under \`packages/case-library/resources/<slug>/\`. Use for books, reports, articles, papers, or public material.

Keep the top-level UI name **Strategy Library / 策略库**. Keep **Resources / 资料** as a tab label only; do not rename the whole library to “resources” because resources are just the source-material layer.

## New canvas checklist

A canvas is not complete until all of these exist:

- \`manifest.json\` with stable \`id\`, bilingual \`name\`, zones, related canvases, display settings, and colour legend when useful.
- \`bg.en.svg\` and \`bg.zh.svg\` following the existing visual style: \`#FAFAF7\` background, \`#1F2937\` thin lines, no heavy decoration, no duplicate title/subtitle when the renderer supplies labels.
- \`i18n/{en,zh}.json\` with titles, prompts, and examples for every zone.
- \`knowledge/intro.{en,zh}.md\` and \`knowledge/body.{en,zh}.md\`.
- \`CanvasThumb\` branch so the Add Canvas picker has a recognizable thumbnail.
- At least one real case where the canvas is actually used, with a story embedding \`::canvas[defId]{canvasId="..."}\`.

## New framework / pattern checklist

A method page is not enough. For every new pattern or framework:

- Add metadata + bilingual description + skill pages.
- Add it to \`manifest.json\`.
- Link it to curated examples in \`examples[]\`.
- Add the reverse tag to each example case.
- Ensure each tagged case has story text that clearly teaches the method.
- If the method needs a new canvas to be understood, create that canvas and embed it in at least one example case.

## New resource checklist

Resources should help users choose what to read, not just cite sources.

- Use \`resources/<slug>/resource.json\` with type, authors, year, recommendation, related canvases/cases/patterns/experiments/frameworks, and sources.
- Add \`description.en.md\` and \`description.zh.md\` as reading notes.
- Add it to \`manifest.json.resources[]\`.
- Prefer the tab label **Resources / 资料** because the source may be a book, article, report, paper, or web page.

## Integration rules

- Never add a framework tag to a case without a story explaining it.
- Never add a canvas template without a thumbnail, Strategy Library surfacing, and at least one example case using it.
- Never create a resource that only lists a citation; it must say why it is recommended and what it helps answer.
- Prefer upgrading existing cases before creating new ones if the new method naturally explains them.
- When the library UI changes, keep the homepage CTA language, tab labels, tab intro copy, and workflow terminology aligned.
- If a packaged or desktop build is involved, verify the bundled \`case-library/resources/<slug>/resource.json\` files so the Resources tab cannot silently ship empty.

## Validation

After editing:

\`\`\`bash
pingarden case validate --case-library-dir packages/case-library/cases
pnpm typecheck
pnpm --filter @pingarden/web build
\`\`\`

If the generated skill is part of the release artifact, regenerate it after content changes so agents see the new canvases, workflows, frameworks, and references.
`,
};

export const REFERENCE_FILES: Record<string, string> = {
  'reference/cli-cheatsheet.md': `# CLI cheatsheet

The commands you'll use most, with the JSON envelope they return.

## Discovery

\`\`\`bash
pingarden doctor --json
# {"ok":true,"data":{"cliVersion":"...","displayName":"...","server":{"found":true,"url":"...","reachable":true}, "skill":{"installed":true,...}}}

pingarden project list --json
pingarden canvas list --json
pingarden template list --json
\`\`\`

## Read

\`\`\`bash
pingarden canvas describe <canvasId> --lang <en|zh> --json
pingarden canvas describe-template <defId> --lang <en|zh> --json
pingarden canvas read <canvasId> --lang <en|zh> --json
\`\`\`

## Create

\`\`\`bash
pingarden project create --name "..." --description "..." --json
pingarden canvas create --project <pid> --def <defId> --title "..." --lang <en|zh> --json
pingarden story create --project <pid> --title "..." --file story.md --json
\`\`\`

## Write & snapshot

\`\`\`bash
echo '{...}' | pingarden canvas write <canvasId> --dry-run --json   # preview only
echo '{...}' | pingarden canvas write <canvasId> --json              # auto-snapshot, then bulk POST
pingarden snapshot list <canvasId> --json
pingarden snapshot create <canvasId> --label "..." --json
pingarden snapshot restore <canvasId> <sid> --mode replace
pingarden snapshot restore <canvasId> <sid> --mode fork
\`\`\`

## Resource library (source books / articles / reports)

\`\`\`bash
pingarden resource list --json                          # resources + type + chapter count
pingarden resource get <slug> --json                    # metadata + reading note + chapter index
pingarden resource chapters <slug> --json               # chapter table of contents
pingarden resource chapter <slug> <chapterSlug> --json  # full bilingual chapter prose
\`\`\`

Use resources as reference reading, not as cases. For deeper guidance, start from \`resource list\`, inspect \`resource chapters\`, then read the minimum relevant chapter.

## Case library (read-only curated cases)

\`\`\`bash
pingarden case list --json                              # all slugs + companyName + tags + canvas/story counts
pingarden case list --tag <tag> --json                  # filter by tag
pingarden case describe <slug> --lang <en|zh> --json    # zone titles / prompts / colour legend per canvas (no sticky bodies)
pingarden case read <slug> --lang <en|zh> --json        # full canvases (block-grouped stickies) + full story bodies
pingarden case fork <slug> --json                       # deep-copy into a new editable user project
\`\`\`

Library canvases are read-only. \`canvas write\` against a library canvasId returns 403. See \`workflows/case-library.md\` for the read-vs-fork decision and \`reference/case-library.md\` for kinds, slugs, and the read-only enforcement story.

## Output envelope

Every \`--json\` invocation returns:

\`\`\`json
{ "ok": true,  "data": <result> }
{ "ok": false, "error": { "code": "...", "message": "...", "hint": "...", "details": <zod-error?> } }
\`\`\`

Exit codes:
- \`0\` — success
- \`1\` — bad input / not found
- \`2\` — server error (non-2xx response)
- \`3\` — connection / setup issue (server unreachable, port file missing)
`,

  'reference/color-legend.md': `# Sticky color palette

The six default sticky colours come from \`STICKY_PALETTE\` (\`packages/shared/src/index.ts\`). \`pingarden canvas write\` only accepts these hex values for the \`color\` field:

- \`#FCF1A8\` — cream (default; vanilla notes)
- \`#FFD9A8\` — peach
- \`#F4B8B8\` — rose
- \`#D5E2C0\` — sage
- \`#B8D5E2\` — sky
- \`#D5C0E2\` — lavender

Per-canvas semantics (when defined): see \`Colour legend\` section of each \`canvases/<defId>.<lang>.md\`. Most canvases don't define semantics — colours are then purely organisational, used by the user to cluster related stickies visually.

When you must encode meaning (e.g. JTBD encodes pain/gain via colour), include a \`colorLegend\` field in your bulk write so the meaning is visible in the canvas inspector:

\`\`\`json
{
  "stickies": [...],
  "colorLegend": {
    "#F4B8B8": { "label": "Pain", "description": "Friction, frustration, risk" },
    "#D5E2C0": { "label": "Gain", "description": "Outcomes, hopes, social wins" }
  }
}
\`\`\`

Off-palette hex values are rejected by the server.
`,

  'reference/identity.md': `# Identity & audit

PinGarden v1 has no real authentication. Every CLI request includes the header \`X-Display-Name: <name>\`, which the server records as \`createdBy\` / \`updatedBy\` on every entity.

Resolve order:

1. \`--as <name>\` flag
2. \`PINGARDEN_USER\` env var
3. \`<os user> (cli)\` — default fallback

The \`(cli)\` suffix on the default makes audit logs distinguish CLI/agent edits from web client edits at a glance. Don't strip it — it's deliberate.

When acting on behalf of a user during a chat session, you can pass \`--as "Alex (Claude)"\` so the audit trail reads cleanly.
`,

  'reference/ai-context-shape.md': `# \`canvas read\` / \`/ai-context\` shape

\`pingarden canvas read <canvasId> --json\` returns the full \`AiContext\`:

\`\`\`ts
interface AiContext {
  canvas: { id, defId, defName, title, language, project: {...} };
  blocks: Array<{
    id: string;            // zoneId
    title: string;         // localised
    prompt?: string;       // localised
    stickies: Array<{
      id: string;
      text: string;
      color?: string;
      x: number; y: number;
      authorName?: string;
      createdAt: string;
      zoneHistory: Array<{ zoneId: string; at: string; by: string }>;
    }>;
  }>;
  // Chart-canvas only:
  factors?: Array<{ id, label }>;
  yAxis?: { label, lowLabel?, highLabel? };
  pinClasses?: Array<{ id, label, color, icon }>;
  pins?: Array<{ id, classId, classLabel, x, y, label?, body? }>;
  valueCurves?: Array<{ classId, classLabel, color, points }>;
  // Per-canvas:
  colorLegend?: Record<hex, { label, description? }>;
  generatedAt: string;
}
\`\`\`

\`blocks\` includes EVERY zone defined on the canvas — empty zones come back as \`{ id, title, prompt, stickies: [] }\`. That's how you see what's missing.

\`zoneHistory\` is the per-sticky audit trail of every zone it has occupied. Useful when refining: a sticky that has bounced between zones is probably a sign of a fuzzy concept.

The \`generatedAt\` ISO timestamp is the only non-deterministic field — don't rely on it for diffs across reads.
`,

  'reference/case-library.md': `# Case library — quick reference

The case library is a **read-only** federated corpus that ships with the app. Each \`Project\` has a \`source\` field: \`'user'\` (default, writable) or \`'library'\` (read-only). Library writes return HTTP 403 with \`code: "CASE_LIBRARY_READ_ONLY"\`.

## Case kinds

The \`kind\` field in \`case.json\` is one of:

- **\`company\`** — a single real company analysed across multiple canvases (BMC + VPC + …). The default and most common kind. Example: \`airbnb\`.
- **\`industry\`** — an industry archetype + N concrete-company variants on the same canvas type. Use the \`variant\` field on each \`CanvasMeta\` (\`{ id, label, role: 'archetype' | 'variant' }\`) to label each one. Example use case: Strategyzer's "Unbundling" — one archetype BMC + Maerki Baumann (unbundled) + Pictet (integrated).
- **\`comparison\`** — multiple subjects placed side-by-side (Tesla vs BYD on the same BMC type).

The \`kind\` chip colour in the web LibraryPage is keyed off this field — \`company\` = emerald, \`industry\` = amber, \`comparison\` = sky.

> Business-model **patterns** (Unbundling, Long Tail, Multi-Sided Platforms, …) are NOT a case kind. They are a separate first-class entity at \`packages/case-library/patterns/<slug>/\` with their own HTTP routes (\`/library/patterns\`, \`/library/patterns/:slug\`). See \`reference/patterns.md\`.

## Slug rules

- Kebab-case (lowercase letters, digits, dashes). Validated by \`pingarden case author\` and \`case validate\`.
- Globally unique within the library — \`pingarden case validate\` fails packaging if two cases share a slug.
- Same-named companies disambiguated by suffix: \`apple-inc\` / \`apple-records\`.
- Same-company multi-source analyses: ONE slug, sticky \`createdBy\` field carries source labels ("HBR 2023" / "annual report 2024"). One canvas per analytic frame, never one canvas per source.

## Read-only enforcement layers

Three independent layers refuse library writes — they're redundant on purpose:

1. **\`BundleStorage\`** throws \`BundleReadOnlyError\` from every write method.
2. **\`FederatedStorage\`** checks bundle ownership before delegating to user storage.
3. **\`server.ts\` \`setErrorHandler\`** maps \`BundleReadOnlyError\` → HTTP 403 \`{ code: "CASE_LIBRARY_READ_ONLY", … }\`.

This means even if a future route forgets to consider the library, the storage layer still blocks the write. Don't try to "fix" library data via a sneakier write path — there isn't one.

## Authoring (offline)

\`pingarden case author --from <spec.json> --out packages/case-library/cases/<slug>/\` produces the full directory layout. The Yjs encoder used is the same \`encodeObjectsBulk\` from \`@pingarden/shared/yjs\` that the server uses for \`POST /objects/bulk\`, so authored cases round-trip through the runtime byte-identically.

## Localization quality

For bilingual cases, \`language: "zh"\` must mean the visible canvas and story content is actually Chinese — not just Chinese titles or metadata. After authoring or batch-importing a bilingual case, always inspect the real content with \`pingarden case read <slug> --lang zh --json\` and confirm the Chinese BMC / VPC / Strategy Canvas stickies are localized. \`pingarden case validate\` also performs a content-level heuristic check and will flag Chinese canvases or stories that still look like English text.

## Story quality

Every published case story must stand on its own for a newcomer. Required sections: context and tension, strategic move, canvas reading guide, operating/economic mechanism, risks and limits, and transfer lesson. Do not place embedded canvases back-to-back without explanation.

For Blue Ocean Strategy cases, the story must explain the red-ocean baseline, noncustomers, ERRC logic, value-curve shape, and BMC consequences. Keep the Strategy Canvas visually clean: use factors, curve classes, and score points only; write rationale in the Story instead of long sticky notes on the chart.

\`pingarden case validate\` runs as a packaging gate (\`scripts/package-mac.sh\`); a broken case fails the DMG build before electron-builder kicks in.
`,

  'reference/resource-quality.md': `# Resource chapter quality — quick reference

Resources are the **source-material layer** of the Strategy Library. They are recommended books, reports, articles, papers, and web sources that explain where the cases, canvases, patterns, experiments, and frameworks come from.

## Current source-verified resource baseline

The skill pack ships chapter-aware reading support for these 12 resources:

- \`business-model-generation\`
- \`value-proposition-design\`
- \`the-invincible-company\`
- \`christensen-innovators-dilemma\`
- \`testing-business-ideas\`
- \`scenario-planning-in-organizations\`
- \`blue-ocean-strategy\`
- \`blue-ocean-shift\`
- \`porter-competitive-strategy\`
- \`porter-competitive-advantage\`
- \`the-art-of-the-long-view\`
- \`platform-revolution\`

Each book resource should have:

- \`chapters/index.json\` — chapter truth source
- \`chapters/<slug>.en.md\` and \`chapters/<slug>.zh.md\` — bilingual chapter prose
- \`checklists/<slug>.json\` — coverage checklist
- \`audit-report.md\` — item-level EN/ZH coverage report

## Definition of done

A resource chapter is done only when:

1. Its checklist covers concepts, arguments, cases, logic chains, terminology, nuance, and cross-references.
2. EN and ZH chapter markdown cover the same checklist.
3. \`audit-report.md\` marks every item PASS for both EN and ZH.
4. Orphan, thickness, bilingual, audit, and cross-reference checks are clean.

## Anti-patterns

- Copying \`chapters/index.json\` summaries into chapter prose.
- Padding word count without adding concepts, evidence, cases, or logic chains.
- Using related slugs that do not resolve in \`manifest.json\` or \`packages/canvases/\`.
- Letting EN and ZH cover different ideas.
- Treating \`audit-report.md\` as decorative rather than a hard gate.

## UI implications

Resources with chapters appear as book-like entries with chapter counts. The detail modal can show a Chapters tab with chapter navigation and long-form markdown. When advising users, use chapter summaries to route them to the right chapter before loading full chapter prose.
`,

  'reference/patterns.md': `# Business-model patterns — quick reference

A **pattern** (e.g. \`long-tail\`, \`unbundling-business-models\`) is an abstract reusable model — *not* a project. Patterns ship at \`packages/case-library/patterns/<slug>/\` alongside the writable cases. They have no BMC, no canvases, no Yjs binary, no fork affordance.

## Storage layout

\`\`\`
packages/case-library/patterns/<slug>/
├── pattern.json         { slug, name, summary, sources, references?, examples }
├── description.en.md    long-form user-facing narrative (web UI shows this)
├── description.zh.md
├── skill.en.md          AI-facing concise guide (this skill renders this)
└── skill.zh.md
\`\`\`

\`pattern.json\` is BusinessModelPattern from \`@pingarden/shared\`. \`examples[]\` is curated reverse-links to concrete cases — every example slug must resolve to a manifested case. \`pingarden case validate\` enforces this at build time.

## Manifest entry

Patterns are listed in \`packages/case-library/manifest.json\` under a \`patterns\` array (sibling of \`cases\`). The on-disk manifest version bumped to 2 when patterns were introduced.

## CLI commands

\`\`\`bash
pingarden pattern list --json
pingarden pattern get long-tail --json
\`\`\`

\`pattern get\` returns \`BusinessModelPatternDetail\`: the pattern metadata + bilingual long-form \`description\` + a hydrated \`exampleCases: CaseLibraryEntry[]\` (so a single round trip gets you everything you need to recommend examples).

## Cross-link rules

- **Case → pattern (forward):** \`CaseLibraryEntry.appliesPatterns: string[]\`. Many-to-many; a case can apply multiple patterns. Slug-level reference; the case carries no extra metadata about *how* it applies.
- **Pattern → case (reverse):** \`BusinessModelPattern.examples: CaseExampleRef[]\` (\`{slug, role?}\`). Curated by the pattern author. Validation enforces every \`examples[].slug\` resolves to a manifested case AND every \`appliesPatterns[]\` slug resolves to a manifested pattern — the 0.2.x → 0.3.0 \`unbundling\` → \`unbundling-business-models\` rename was prompted by exactly this kind of dangling reference, and the validator now refuses to ship a build with one.
- **Sub-type refinement (optional):** \`CaseLibraryEntry.appliesPatternSubtypes?: Record<patternSlug, subtypeId>\`. Used when the parent pattern declares \`subtypes[]\` (currently \`free\` is the only such pattern, with three sub-types: \`ad-supported\`, \`freemium\`, \`bait-and-hook\`). Every key must appear in \`appliesPatterns[]\` and every value must match a \`subtypes[].id\` on the referenced pattern. Validator enforces both. Cases that don't refine simply omit the field.

## Authoring a new pattern

There is no \`pattern author\` CLI. The contents are pure markdown + JSON; hand-write the four files, then add the slug to \`manifest.json.patterns[]\` and run \`pingarden case validate\`.

## References (annotated bibliography)

\`BusinessModelPattern\` carries an optional \`references: PatternReference[]\` field — the canonical citation surface, supersedes the legacy flat \`sources[]\` when present. Each entry:

\`\`\`ts
{
  type: 'book' | 'article' | 'paper' | 'web';   // group + icon
  cite: string;                                   // e.g. "Anderson 2006"
  label: string;                                  // "Author · Title · Venue"
  year?: number;                                  // 2006
  pages?: string;                                 // "pp. 66–71" / "Ch. 3"
  url?: string;                                   // permalink / DOI
  note?: { en: string; zh: string };              // ~30 words on what this contributes
}
\`\`\`

The \`cite\` handle is the **single source of truth** for inline mentions inside \`description.{en,zh}.md\`. When the description prose mentions a citation, use the same handle (e.g. *"Hagel and Singer (Hagel & Singer 1999) argued…"*) so a careful reader can connect the prose to the bibliography. Don't invent new abbreviations per paragraph.

The \`note\` field turns a flat list into something an agent can actually reason about: it should explain *what this source contributes that the others don't* — "originating paper", "book-length expansion", "BMC pattern catalog adaptation", etc. Both languages are required when present.

Skill generator emits a grouped \`## References\` block (Books → Papers → Articles → Web) with the cite handle bolded as the entry headline. Patterns that haven't been migrated still emit the legacy flat list under the same \`## References\` heading — the migration is opt-in per pattern.

## What patterns are NOT

- ❌ Patterns are not a kind of case. \`CaseKind\` is now \`'company' | 'industry' | 'comparison'\` only — \`kind: 'pattern'\` was removed in 0.3.0.
- ❌ Patterns have no fork. Users do not fork a pattern; they read its description and walk the example cases.
- ❌ Patterns do not appear on \`/projects\` (the user's own work). They live exclusively under the case library — \`/library\` web page, "Patterns" tab.
`,

  'reference/experiments.md': `# Reference: experiment library

Curated test recipes from **Bland & Osterwalder · Testing Business Ideas · Wiley · 2019**. Each experiment ships at \`experiments/<slug>.{en,zh}.md\` with structured metadata at \`experiment.json\` (see \`Experiment\` interface in \`@pingarden/shared\`). The runtime app exposes experiments through the Library page and HTTP routes; the generated skill consumes the same bundles through markdown files.

## Cross-link to canvases

The forward edge is \`experiment.appliesToCanvases[]\` — each experiment names which canvases it most often validates. Canvases do NOT carry a reverse \`validatesWith[]\` field; the agent computes it on demand by walking the library when a user lands on a canvas.

## Match heuristic

When the user names a riskiest assumption, use this 3-step heuristic (full version in \`workflows/experiments.md\`):

1. Classify Desirability / Feasibility / Viability.
2. Decide Discovery (cheap, weak evidence, "is the direction plausible?") vs Validation (costlier, stronger evidence, "should we bet?").
3. Within the chosen set, narrow to 2-3 candidates by cost band, team capabilities, and canvas affinity. Return tradeoffs — never a single "right" answer.

## Filter signals

Each \`experiment.json\` carries:

- \`theme\`: \`discovery\` | \`validation\`
- \`risks[]\`: subset of \`desirability\` / \`feasibility\` / \`viability\`
- \`evidenceStrength\`: \`weak\` | \`medium\` | \`strong\`
- \`cost\`: \`cheap\` | \`medium\` | \`expensive\`
- \`setupTime\` / \`runTime\`: \`hours\` | \`days\` | \`weeks\`
- \`capabilities[]\`: kebab-case skill tags (e.g. \`interview-design\`, \`landing-page-copy\`, \`payment-processing\`)
- \`appliesToCanvases[]\`: canvas-id list (matches \`packages/canvases/<id>/manifest.json\`)

## What experiments are NOT

- ❌ Experiments are not patterns. Patterns describe HOW a business makes money; experiments describe HOW you test a hypothesis. Different content type, different surface.
- ❌ Experiments are not cases. Cases are concrete companies; experiments are reusable recipes that any case might run.
- ❌ The library is not exhaustive. V1 ships ~12 of the 44 in TBI; the agent should recommend "closest 2-3 from the library + flag the gap" if no perfect fit exists, rather than invent.
`,

  'reference/strategy-frameworks.md': `# Reference: strategy frameworks

Strategy frameworks are reusable analysis methods, not cases and not business-model patterns. They live at \`packages/case-library/strategy-frameworks/<slug>/\` with \`framework.json\`, bilingual descriptions, and AI-facing skill pages.

## CLI

\`\`\`bash
pingarden strategy-framework list --json
pingarden strategy-framework get blue-ocean-strategy --json
pingarden strategy-framework get business-model-portfolio-management --json
\`\`\`

## Cross-link rules

- Framework → case: \`StrategyFramework.examples[]\` points to manifested case slugs.
- Case → framework: \`CaseLibraryEntry.appliesStrategyFrameworks[]\` points back to manifested framework slugs.
- \`pingarden case validate\` enforces both directions.

## Blue Ocean Strategy note

Blue Ocean Strategy should be treated as a strategic analysis framework: Strategy Canvas, ERRC, noncustomers, and market-boundary reconstruction. Do not file it under business-model patterns.

## Business Model Portfolio Management note

Business Model Portfolio Management should be treated as a portfolio-level strategic management framework. It uses \`portfolio-map\` to manage Explore and Exploit portfolios, then expands important pins into BMCs or Experiment Canvases. A tagged case must include and embed a Portfolio Map in its story; dynamic cases should show dated movement. Do not file it under business-model patterns, and do not tag a case merely because the company is innovative.

## Bain Elements of Value note

Bain Elements of Value should be treated as a Customer Value Lens: a supporting strategy-analysis tool that deepens \`value-proposition-canvas\`, \`jobs-to-be-done\`, \`empathy-map\`, and \`customer-journey\`. Do not create a standalone Bain canvas or use it as a 30-element checklist; map selected value elements back to VPC gains, gain creators, pain relievers, and journey touchpoints.
`,
};

// ─── Per-pattern .{en,zh}.md ─────────────────────────────────────────────────

export interface PatternMdInput {
  bundle: PatternBundle;
  lang: Lang;
}

/**
 * Render the per-pattern skill markdown. Prefers the curated
 * \`skill.{en,zh}.md\` written by the pattern author (concise, AI-facing
 * — TL;DR / signals / anti-patterns / cross-references). When that's
 * missing for the requested language, falls back to the first 3
 * paragraphs of \`description.{en,zh}.md\` (longer, user-facing).
 *
 * The "front matter" — slug, references, examples — is always rendered
 * from \`pattern.json\` so the skill can answer "what's the slug",
 * "what's the canonical citation", and "what cases exemplify this"
 * without reading the prose body. References (when present in
 * pattern.json) emit a grouped, annotated \`## References\` section;
 * patterns that haven't been migrated still emit a flat \`## Sources\`
 * list from the legacy field.
 */
export function renderPatternMd({ bundle, lang }: PatternMdInput): string {
  const { pattern } = bundle;
  const name = pattern.name[lang] ?? pattern.name.en;
  const summary = pattern.summary[lang] ?? pattern.summary.en;

  const skill = bundle.skill[lang];
  const description = bundle.description[lang];
  const body = skill && skill.trim().length > 0
    ? skill
    : description && description.trim().length > 0
      ? firstParagraphs(description, 3)
      : '_(No description authored for this language yet.)_';

  const examplesSection = pattern.examples.length > 0
    ? pattern.examples
        .map((ex) => `- \`${ex.slug}\`${ex.role ? ` (${ex.role})` : ''}`)
        .join('\n')
    : '_(No examples curated yet.)_';

  const subtypesSection = renderPatternSubtypesSection(pattern, lang);
  const referencesSection = renderPatternReferencesSection(pattern, lang);

  return `# ${name}

> ${summary}

## Slug

\`${pattern.slug}\` — referenced by \`CaseLibraryEntry.appliesPatterns[]\` on cases that exemplify this pattern.

${body.trim()}
${subtypesSection}
## Examples shipped in this skill

${examplesSection}

To explore an example case's BMC, follow with \`pingarden case get <slug>\` → \`pingarden case canvases <slug>\` → \`pingarden canvas describe <canvas-id> --json\`.

${referencesSection}
`;
}

// ─── Per-strategy-framework .{en,zh}.md ───────────────────────────────────────

export interface StrategyFrameworkMdInput {
  bundle: StrategyFrameworkBundle;
  lang: Lang;
}

export function renderStrategyFrameworkMd({
  bundle,
  lang,
}: StrategyFrameworkMdInput): string {
  const { framework } = bundle;
  const name = framework.name[lang] ?? framework.name.en;
  const summary = framework.summary[lang] ?? framework.summary.en;
  const skill = bundle.skill[lang];
  const description = bundle.description[lang];
  const body = skill && skill.trim().length > 0
    ? skill
    : description && description.trim().length > 0
      ? firstParagraphs(description, 3)
      : '_(No description authored for this language yet.)_';
  const examplesSection = framework.examples.length > 0
    ? framework.examples
        .map((ex) => `- \`${ex.slug}\`${ex.role ? ` (${ex.role})` : ''}`)
        .join('\n')
    : '_(No examples curated yet.)_';
  const canvasSection = (framework.relatedCanvasDefIds ?? []).length > 0
    ? (framework.relatedCanvasDefIds ?? []).map((id) => `- \`${id}\``).join('\n')
    : '_(No related canvases declared yet.)_';
  const referencesSection = renderPatternReferencesSection(
    framework as unknown as BusinessModelPattern,
    lang,
  );

  return `# ${name}

> ${summary}

## Slug

\`${framework.slug}\` — referenced by \`CaseLibraryEntry.appliesStrategyFrameworks[]\` on cases that demonstrate this analysis method.

${body.trim()}

## Related canvases

${canvasSection}

## Example cases shipped in this skill

${examplesSection}

To explore an example case, follow with \`pingarden case read <slug> --json\`. To inspect the method itself, use \`pingarden strategy-framework get ${framework.slug} --json\`.

${referencesSection}
`;
}

// Group order in the rendered references block — books first since
// they tend to be the canonical / heaviest reference, web links last.
const PATTERN_REFERENCE_TYPE_ORDER: PatternReferenceType[] = [
  'book',
  'paper',
  'article',
  'web',
];

/**
 * Render a `## Sub-types` block when the pattern declares sub-typing
 * (Free → ad-supported / freemium / bait-and-hook). For patterns
 * without sub-typing returns an empty string so the surrounding
 * template falls through naturally to `## Examples shipped`.
 *
 * Each subtype gets its bilingual name as a `### Sub-type` header,
 * its summary as the body, and its curated examples as a slug list —
 * mirroring how the modal's Related Cases tab is grouped. Returning
 * a leading `\n` keeps the join clean when the block is interpolated.
 */
function renderPatternSubtypesSection(
  pattern: BusinessModelPattern,
  lang: Lang,
): string {
  const subtypes = pattern.subtypes ?? [];
  if (subtypes.length === 0) return '';
  const intro = lang === 'zh'
    ? `这个模式有 ${subtypes.length} 个结构上不同的子类型 —— 选对子类型是关键(走 \`description.${lang}.md\` 里的决策树)。`
    : `This pattern has ${subtypes.length} structurally distinct sub-types — picking the right one is the whole game (walk the decision tree in \`description.${lang}.md\`).`;
  const blocks = subtypes.map((st) => {
    const name = st.name[lang] ?? st.name.en;
    const summary = (st.summary[lang] ?? st.summary.en).trim();
    const examplesLabel = lang === 'zh' ? '范例' : 'Examples';
    const examples = st.examples.length > 0
      ? st.examples.map((ex) => `\`${ex.slug}\`${ex.role ? ` (${ex.role})` : ''}`).join(', ')
      : lang === 'zh' ? '_(暂无)_' : '_(none yet)_';
    return `### ${name}\n\n${summary}\n\n**${examplesLabel}**: ${examples}`;
  });
  return `\n## Sub-types\n\n${intro}\n\n${blocks.join('\n\n')}\n\n`;
}

const PATTERN_REFERENCE_TYPE_HEADER: Record<
  PatternReferenceType,
  { en: string; zh: string }
> = {
  book: { en: 'Books', zh: '书籍' },
  paper: { en: 'Papers', zh: '论文' },
  article: { en: 'Articles', zh: '文章' },
  web: { en: 'Web', zh: '网页' },
};

/**
 * Render the references / sources tail block. Two layouts:
 *
 *   - **Annotated** — when \`pattern.references\` is non-empty. Group by
 *     type, bold the cite handle, render meta (year · pages) on the
 *     headline line, indent the bilingual note below. Ordered by
 *     \`PATTERN_REFERENCE_TYPE_ORDER\`.
 *   - **Legacy flat** — when only \`sources\` is present. Renames the
 *     section heading to "References" but keeps the flat bullet list,
 *     so patterns we haven't migrated yet still surface their citations.
 */
function renderPatternReferencesSection(
  pattern: BusinessModelPattern,
  lang: Lang,
): string {
  const refs = pattern.references ?? [];
  if (refs.length > 0) {
    const grouped = new Map<PatternReferenceType, PatternReference[]>();
    for (const r of refs) {
      const arr = grouped.get(r.type) ?? [];
      arr.push(r);
      grouped.set(r.type, arr);
    }
    const groupBlocks: string[] = [];
    for (const type of PATTERN_REFERENCE_TYPE_ORDER) {
      const entries = grouped.get(type);
      if (!entries || entries.length === 0) continue;
      const header = PATTERN_REFERENCE_TYPE_HEADER[type][lang]
        ?? PATTERN_REFERENCE_TYPE_HEADER[type].en;
      const lines = entries.map((r) => renderPatternReferenceEntry(r, lang));
      groupBlocks.push(`### ${header}\n\n${lines.join('\n\n')}`);
    }
    return `## References\n\n${groupBlocks.join('\n\n')}`;
  }
  if (pattern.sources.length === 0) return '## References\n\n_(No sources cited.)_';
  const flat = pattern.sources
    .map((s) => (s.url ? `- [${s.label}](${s.url})` : `- ${s.label}`))
    .join('\n');
  return `## References\n\n${flat}`;
}

function renderPatternReferenceEntry(r: PatternReference, lang: Lang): string {
  const meta: string[] = [];
  if (typeof r.year === 'number') meta.push(String(r.year));
  if (r.pages) meta.push(r.pages);
  const headline = r.url
    ? `**${r.cite}** · *[${r.label}](${r.url})*`
    : `**${r.cite}** · *${r.label}*`;
  const metaLine = meta.length > 0 ? ` · ${meta.join(' · ')}` : '';
  const note = r.note?.[lang] || r.note?.en;
  const noteLine = note ? `\n  ${note}` : '';
  return `- ${headline}${metaLine}${noteLine}`;
}

// ─── Per-experiment .{en,zh}.md ──────────────────────────────────────────────

export interface ExperimentMdInput {
  bundle: ExperimentBundle;
  lang: Lang;
}

/**
 * Render the per-experiment skill markdown for the Testing Business
 * Ideas library. Mirrors `renderPatternMd`: prefers the curated
 * `skill.{en,zh}.md` body, falls back to first paragraphs of
 * `description.{en,zh}.md` when missing. Adds a structured `## At a
 * glance` block at the top — theme / risks / cost / strength / setup
 * / run / capabilities / canvases — derived from `experiment.json` so
 * the AI can answer "is this a cheap discovery test for desirability?"
 * without parsing prose.
 */
export function renderExperimentMd({ bundle, lang }: ExperimentMdInput): string {
  const { experiment } = bundle;
  const name = experiment.name[lang] ?? experiment.name.en;
  const summary = experiment.summary[lang] ?? experiment.summary.en;

  const skill = bundle.skill[lang];
  const description = bundle.description[lang];
  const body = skill && skill.trim().length > 0
    ? skill
    : description && description.trim().length > 0
      ? firstParagraphs(description, 3)
      : '_(No description authored for this language yet.)_';

  const ataGlance = renderExperimentAtAGlance(experiment, lang);
  const sourcesSection = renderExperimentSourcesSection(experiment, lang);

  return `# ${name}

> ${summary}

## Slug

\`${experiment.slug}\` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via \`experiment.appliesToCanvases[]\`.

${ataGlance}

${body.trim()}

${sourcesSection}
`;
}

const EXPERIMENT_THEME_LABEL: Record<'discovery' | 'validation', { en: string; zh: string }> = {
  discovery: { en: 'Discovery', zh: '探索 (Discovery)' },
  validation: { en: 'Validation', zh: '验证 (Validation)' },
};

const EXPERIMENT_RISK_LABEL: Record<ExperimentRisk, { en: string; zh: string }> = {
  desirability: { en: 'Desirability', zh: '需求性 (Desirability)' },
  feasibility: { en: 'Feasibility', zh: '可行性 (Feasibility)' },
  viability: { en: 'Viability', zh: '可营性 (Viability)' },
};

const EXPERIMENT_STRENGTH_LABEL: Record<'weak' | 'medium' | 'strong', { en: string; zh: string }> = {
  weak: { en: 'Weak', zh: '弱 (weak)' },
  medium: { en: 'Medium', zh: '中 (medium)' },
  strong: { en: 'Strong', zh: '强 (strong)' },
};

const EXPERIMENT_COST_LABEL: Record<'cheap' | 'medium' | 'expensive', { en: string; zh: string }> = {
  cheap: { en: 'Cheap', zh: '便宜 (cheap)' },
  medium: { en: 'Medium', zh: '中等 (medium)' },
  expensive: { en: 'Expensive', zh: '贵 (expensive)' },
};

const EXPERIMENT_DURATION_LABEL: Record<ExperimentDuration, { en: string; zh: string }> = {
  hours: { en: 'Hours', zh: '小时级' },
  days: { en: 'Days', zh: '天级' },
  weeks: { en: 'Weeks', zh: '周级' },
};

function renderExperimentAtAGlance(e: Experiment, lang: Lang): string {
  const heading = lang === 'zh' ? '## 速览' : '## At a glance';
  const themeLine = lang === 'zh' ? '阶段' : 'Theme';
  const risksLine = lang === 'zh' ? '风险类别' : 'Risks';
  const strengthLine = lang === 'zh' ? '证据强度' : 'Evidence strength';
  const costLine = lang === 'zh' ? '成本' : 'Cost';
  const setupLine = lang === 'zh' ? '准备时间' : 'Setup time';
  const runLine = lang === 'zh' ? '执行时间' : 'Run time';
  const capLine = lang === 'zh' ? '能力要求' : 'Capabilities';
  const canvasesLine = lang === 'zh' ? '关联画布' : 'Applies to canvases';

  const themeText = EXPERIMENT_THEME_LABEL[e.theme][lang];
  const risksText = e.risks
    .map((r) => EXPERIMENT_RISK_LABEL[r][lang])
    .join(' · ');
  const strengthText = EXPERIMENT_STRENGTH_LABEL[e.evidenceStrength][lang];
  const costText = EXPERIMENT_COST_LABEL[e.cost][lang];
  const setupText = EXPERIMENT_DURATION_LABEL[e.setupTime][lang];
  const runText = EXPERIMENT_DURATION_LABEL[e.runTime][lang];
  const capText = e.capabilities.length > 0
    ? e.capabilities.map((c) => `\`${c}\``).join(' · ')
    : (lang === 'zh' ? '_(\u672a\u8bf4\u660e)_' : '_(unspecified)_');
  const canvasesText = e.appliesToCanvases.length > 0
    ? e.appliesToCanvases.map((c) => `\`${c}\``).join(' · ')
    : (lang === 'zh' ? '_(\u4efb\u610f\u753b\u5e03)_' : '_(any canvas)_');

  return `${heading}

| | |
| --- | --- |
| **${themeLine}** | ${themeText} |
| **${risksLine}** | ${risksText} |
| **${strengthLine}** | ${strengthText} |
| **${costLine}** | ${costText} |
| **${setupLine}** | ${setupText} |
| **${runLine}** | ${runText} |
| **${capLine}** | ${capText} |
| **${canvasesLine}** | ${canvasesText} |`;
}

function renderExperimentSourcesSection(e: Experiment, lang: Lang): string {
  const header = lang === 'zh' ? '## 出处' : '## Sources';
  if (e.sources.length === 0) {
    return `${header}\n\n${lang === 'zh' ? '_(\u672a\u6807\u660e)_' : '_(No sources cited.)_'}`;
  }
  const flat = e.sources
    .map((s) => (s.url ? `- [${s.label}](${s.url})` : `- ${s.label}`))
    .join('\n');
  return `${header}\n\n${flat}`;
}
