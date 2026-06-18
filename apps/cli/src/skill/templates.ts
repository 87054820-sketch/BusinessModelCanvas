import type {
  BusinessModelPattern,
  Experiment,
  ExperimentDuration,
  ExperimentRisk,
  Lang,
  PatternReference,
  PatternReferenceType,
} from '@pingarden/shared';
import {
  firstParagraphs,
  firstSentencesFromMarkdown,
  pickI18n,
  type CanvasBundle,
  type ExperimentBundle,
  type PatternBundle,
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
}

export function renderSkillMd({
  version,
  canvasIds,
  patternSlugs,
  experimentSlugs,
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
  const patternsWorkflow =
    patternSlugs.length > 0
      ? `\n- \`workflows/patterns.md\` — when the user asks "what pattern is this", "give me other companies in the same pattern", or wants to draft a BMC by applying a pattern\n- \`workflows/authoring-patterns.md\` — when the user asks to add a NEW pattern to the library (file layout, description template, audit checklist, manifest, skill regen)`
      : '';
  const experimentsWorkflow =
    experimentSlugs.length > 0
      ? `\n- \`workflows/experiments.md\` — when the user has a riskiest assumption to test: classify it as Desirability / Feasibility / Viability and recommend 2–3 experiments from the library matched on theme + risk + cost`
      : '';
  const patternsReference =
    patternSlugs.length > 0
      ? `\n- \`reference/patterns.md\` — pattern slug index, the \`pingarden pattern <list|get>\` commands, and the case ↔ pattern cross-link rules`
      : '';
  const experimentsReference =
    experimentSlugs.length > 0
      ? `\n- \`reference/experiments.md\` — experiment slug index with theme / risk / cost / strength columns, plus the matching heuristic for a given riskiest assumption`
      : '';
  return `---
name: pingarden
description: Use whenever the user wants to draft, edit, translate, fork, copy, optimise, or narrate a business model — Business Model Canvas, Value Proposition Canvas, Jobs To Be Done, Empathy Map, Portfolio Map, Business Model Environment, Ad-Lib Value Proposition, Customer Journey, Strategy Canvas, Design Criteria Canvas, Experiment Canvas — OR wants to read / fork a curated company case (Spotify, Uber, Airbnb, Nespresso, Gillette, P&G, GSK, Tencent, Alibaba, Cemex, Patagonia, …) OR identify / apply a business-model pattern (Long Tail, Free, Multi-Sided Platforms, Open Business Models, Unbundling) OR run a test / experiment from the Testing Business Ideas library (Customer Interview, Smoke Test, Wizard of Oz, Concierge, Letter of Intent, Pre-Sale, …). English triggers: "draft a BMC", "fill the value proposition", "story for my project", "snapshot before editing", "fork this case", "what pattern is this", "what business model does X use", "copy and optimise this canvas", "give me other companies in the same pattern", "how do I test this assumption", "what experiment should I run", "is this a desirability / feasibility / viability risk", or any \`pingarden\` CLI invocation. Chinese triggers (中文触发): "帮我画/起一个商业模式画布", "做一份 BMC/VPC/JTBD", "复制画布优化模型", "fork 一个案例 / 从案例库开始", "Spotify/Uber/Nespresso 用了什么商业模式", "免费模式适合我吗 / 这是什么模式", "对比/翻译这张画布", "保存快照 / 回滚到上一版", "把这家公司的画布拿来改", "怎么验证这个假设 / 推荐一个实验", "我该跑客户访谈还是 smoke test"。On activation, **run \`pingarden doctor\` first** to confirm the CLI is on PATH and the PinGarden app is running; if \`pingarden\` returns "command not found", fall back to \`node /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js\` and prompt the user to follow INSTALL.md §三 to symlink it.
version: ${version}
---

# PinGarden — official skill

You are working with **PinGarden**, a local Strategyzer-style canvas tool. This skill teaches you how to fill each canvas correctly and how to call the \`pingarden\` CLI to read and write canvas state.

## First action when this skill activates

Don't wait for the user to ask twice — when this skill loads, do this **immediately**, before producing any canvas content:

1. Run \`pingarden doctor\` to confirm both halves are up:
   - **CLI on PATH.** If you get \`command not found\`, fall back to \`node /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js <args>\` AND tell the user to symlink it permanently per INSTALL.md §三 (\`sudo ln -s /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js /usr/local/bin/pingarden\`). Don't silently keep typing the long path forever.
   - **PinGarden app/server.** Doctor reports the discovered port and a \`/health\` ping. If the server is down, tell the user to launch the PinGarden app — never try to write to \`apps/server/data/\` directly or parse Yjs binary as a workaround.
2. If both are green, **list what already exists** before suggesting fresh authoring:
   - \`pingarden case list --json\` — 23 curated company cases (Spotify, Uber, Airbnb, Tencent Games · Heima, Alibaba, Nespresso, Gillette, P&G, GSK, Patagonia, …). Often the user's question ("how does Uber make money?", "give me a freemium example") is already answered by an existing case — fork or read it instead of inventing.
   - \`pingarden pattern list --json\` — 5 BMG patterns (Long Tail, Unbundling, Multi-Sided Platforms, Free, Open Business Models). Patterns surface "which canvases / cases apply this".
3. Only after the environment is confirmed and the existing library is scanned should you start producing canvases / stickies / stories.

## How to use this skill (reading order)

1. **Always read \`reference/cli-cheatsheet.md\` first** — it lists the exact commands and JSON envelope shape you'll consume.
2. **Before writing to a canvas**, read its description with \`pingarden canvas describe <id> --json\` (existing canvas) or \`pingarden canvas describe-template <defId> --json\` (new canvas). NEVER hardcode \`zoneId\`s — they come from the live def.
3. **For each canvas the user works on**, consult \`canvases/<id>.<lang>.md\` for filling rules, fill order, examples, and anti-patterns.
4. **For "what pattern is this" / "companies in the same pattern" / "fork a case"** — go to \`workflows/case-library.md\` and \`workflows/patterns.md\` first; the case library already has 23 curated companies and 5 BMG patterns cross-linked both ways.
5. **For "how do I test this assumption" / "what experiment should I run"** — go to \`workflows/experiments.md\` and the \`experiments/\` library. Classify the assumption as Desirability / Feasibility / Viability, decide Discovery vs Validation, then pick 2–3 candidate experiments and present tradeoffs.
6. **For multi-step work** (greenfield from a chat, iterating, cross-canvas, story narration, snapshot/restore, translate), follow the workflow in \`workflows/\`.

## Index

### Canvases (one per template, both languages)
${canvasList}${patternsBlock}${experimentsBlock}

### Workflows
- \`workflows/discover.md\` — first call into a fresh session
- \`workflows/greenfield.md\` — chat → app, brand new canvas
- \`workflows/iterate.md\` — refine an existing canvas (read → diff → write)
- \`workflows/cross-canvas.md\` — chain canvases (BMC → VPC → ...)
- \`workflows/story.md\` — write a project narrative with embedded canvases
- \`workflows/snapshot.md\` — when to milestone, how to restore
- \`workflows/translate.md\` — en ⇄ zh round trip
- \`workflows/case-library.md\` — read curated company cases for inspiration, or fork one to start fast${patternsWorkflow}${experimentsWorkflow}

### Reference
- \`reference/cli-cheatsheet.md\` — top commands with JSON output examples
- \`reference/color-legend.md\` — sticky palette + how to interpret colours
- \`reference/identity.md\` — \`X-Display-Name\` / \`--as\` / audit trail
- \`reference/ai-context-shape.md\` — shape of the \`/ai-context\` JSON
- \`reference/case-library.md\` — case kinds, slug rules, read-only rules${patternsReference}${experimentsReference}

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
- Capture decisions, dates, and people.
- Tie multiple canvases into a coherent narrative.

\`\`\`markdown
# Coffee Co — March narrative

We targeted urban specialty coffee drinkers and decided on weekly subscription delivery.

::canvas[business-model-canvas]{canvasId="<bmc-uuid>"}

The unit economics still need stress testing.

::canvas[value-proposition-canvas]{canvasId="<vpc-uuid>"}

Next: validate the wholesale-cafés segment with a 4-week pilot.
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

The 2026-06-15 MSP rollout is the worked example: 4 of 10 existing cases were tagged (\`udemy\`, \`aliexpress\`, \`lulu-com\`, \`lego-long-tail\`) and 6 were explicitly rejected (\`wechat-private-domain\`, \`swiss-private-banking\`, \`mobile-telco-unbundling\`, \`patagonia\`, \`carvana\`, \`cainiao\`). The rejections matter as much as the tags.

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

- **\`company\`** — a single real company analysed across multiple canvases (BMC + VPC + …). The default and most common kind. Example: \`wechat-private-domain\`.
- **\`industry\`** — an industry archetype + N concrete-company variants on the same canvas type. Use the \`variant\` field on each \`CanvasMeta\` (\`{ id, label, role: 'archetype' | 'variant' }\`) to label each one. Example use case: Strategyzer's "Unbundling" — one archetype BMC + Maerki Baumann (unbundled) + Pictet (integrated).
- **\`comparison\`** — multiple subjects placed side-by-side (Tesla vs BYD on the same BMC type).

The \`kind\` chip colour in the web LibraryPage is keyed off this field — \`company\` = emerald, \`industry\` = amber, \`comparison\` = sky.

> Business-model **patterns** (Unbundling, Long Tail, Multi-Sided Platforms, …) are NOT a case kind. They are a separate first-class entity at \`packages/case-library/patterns/<slug>/\` with their own HTTP routes (\`/library/patterns\`, \`/library/patterns/:slug\`). See \`reference/patterns.md\`.

## Slug rules

- Kebab-case (lowercase letters, digits, dashes). Validated by \`pingarden case author\` and \`case validate\`.
- Globally unique within the library — \`pingarden case validate\` fails packaging if two cases share a slug.
- Same-named companies disambiguated by suffix: \`apple-inc\` / \`apple-records\`.
- Same-company multi-source analyses: ONE slug, sticky \`createdBy\` field carries source labels ("HBR 2023" / "Tencent 财报"). One canvas per analytic frame, never one canvas per source.

## Read-only enforcement layers

Three independent layers refuse library writes — they're redundant on purpose:

1. **\`BundleStorage\`** throws \`BundleReadOnlyError\` from every write method.
2. **\`FederatedStorage\`** checks bundle ownership before delegating to user storage.
3. **\`server.ts\` \`setErrorHandler\`** maps \`BundleReadOnlyError\` → HTTP 403 \`{ code: "CASE_LIBRARY_READ_ONLY", … }\`.

This means even if a future route forgets to consider the library, the storage layer still blocks the write. Don't try to "fix" library data via a sneakier write path — there isn't one.

## Authoring (offline)

\`pingarden case author --from <spec.json> --out packages/case-library/cases/<slug>/\` produces the full directory layout. The Yjs encoder used is the same \`encodeObjectsBulk\` from \`@pingarden/shared/yjs\` that the server uses for \`POST /objects/bulk\`, so authored cases round-trip through the runtime byte-identically.

\`pingarden case validate\` runs as a packaging gate (\`scripts/package-mac.sh\`); a broken case fails the DMG build before electron-builder kicks in.
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

Curated test recipes from **Bland & Osterwalder · Testing Business Ideas · Wiley · 2019**. Each experiment ships at \`experiments/<slug>.{en,zh}.md\` with structured metadata at \`experiment.json\` (see \`Experiment\` interface in \`@pingarden/shared\`). Skill-only surface for V1 — no HTTP routes, no LibraryPage tab, no \`pingarden experiment\` CLI subcommand. The library is consumed by AI agents through the markdown files.

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
