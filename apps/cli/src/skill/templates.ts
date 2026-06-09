import type { Lang } from '@pingarden/shared';
import {
  firstParagraphs,
  firstSentencesFromMarkdown,
  pickI18n,
  type CanvasBundle,
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
}

export function renderSkillMd({ version, canvasIds }: SkillMdInput): string {
  const list = canvasIds.map((id) => `- \`canvases/${id}.en.md\` / \`canvases/${id}.zh.md\``).join('\n');
  return `---
name: pingarden
description: Use when the user asks to create, edit, translate, or narrate Business Model Canvas, Value Proposition Canvas, JTBD, Empathy Map, Portfolio Map, Business Model Environment, Ad-Lib Value Proposition, Customer Journey, Strategy Canvas, Design Criteria Canvas, or Experiment Canvas via the local PinGarden app. Triggers on phrases like "draft a BMC", "fill the value proposition", "story for my project", "snapshot before editing", or any \`pingarden\` CLI invocation.
version: ${version}
---

# PinGarden — official skill

You are working with **PinGarden**, a local Strategyzer-style canvas tool. This skill teaches you how to fill each canvas correctly and how to call the \`pingarden\` CLI to read and write canvas state.

## How to use this skill

1. **Always read \`reference/cli-cheatsheet.md\` first** — it lists the exact commands and JSON envelope shape you'll consume.
2. **Before writing to a canvas**, read its description with \`pingarden canvas describe <id> --json\` (existing canvas) or \`pingarden canvas describe-template <defId> --json\` (new canvas). NEVER hardcode \`zoneId\`s — they come from the live def.
3. **For each canvas the user works on**, consult \`canvases/<id>.<lang>.md\` for filling rules, fill order, examples, and anti-patterns.
4. **For multi-step work** (greenfield from a chat, iterating, cross-canvas, story narration, snapshot/restore, translate), follow the workflow in \`workflows/\`.

## Index

### Canvases (one per template, both languages)
${list}

### Workflows
- \`workflows/discover.md\` — first call into a fresh session
- \`workflows/greenfield.md\` — chat → app, brand new canvas
- \`workflows/iterate.md\` — refine an existing canvas (read → diff → write)
- \`workflows/cross-canvas.md\` — chain canvases (BMC → VPC → ...)
- \`workflows/story.md\` — write a project narrative with embedded canvases
- \`workflows/snapshot.md\` — when to milestone, how to restore
- \`workflows/translate.md\` — en ⇄ zh round trip

### Reference
- \`reference/cli-cheatsheet.md\` — top commands with JSON output examples
- \`reference/color-legend.md\` — sticky palette + how to interpret colours
- \`reference/identity.md\` — \`X-Display-Name\` / \`--as\` / audit trail
- \`reference/ai-context-shape.md\` — shape of the \`/ai-context\` JSON

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
};
