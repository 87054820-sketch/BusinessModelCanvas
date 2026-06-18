---
name: pingarden
description: Use whenever the user wants to draft, edit, translate, fork, copy, optimise, or narrate a business model — Business Model Canvas, Value Proposition Canvas, Jobs To Be Done, Empathy Map, Portfolio Map, Business Model Environment, Ad-Lib Value Proposition, Customer Journey, Strategy Canvas, Design Criteria Canvas, Experiment Canvas — OR wants to read / fork a curated company case (Spotify, Uber, Airbnb, Nespresso, Gillette, P&G, GSK, Tencent, Alibaba, Cemex, Patagonia, …) OR identify / apply a business-model pattern (Long Tail, Free, Multi-Sided Platforms, Open Business Models, Unbundling) OR run a test / experiment from the Testing Business Ideas library (Customer Interview, Smoke Test, Wizard of Oz, Concierge, Letter of Intent, Pre-Sale, …). English triggers: "draft a BMC", "fill the value proposition", "story for my project", "snapshot before editing", "fork this case", "what pattern is this", "what business model does X use", "copy and optimise this canvas", "give me other companies in the same pattern", "how do I test this assumption", "what experiment should I run", "is this a desirability / feasibility / viability risk", or any `pingarden` CLI invocation. Chinese triggers (中文触发): "帮我画/起一个商业模式画布", "做一份 BMC/VPC/JTBD", "复制画布优化模型", "fork 一个案例 / 从案例库开始", "Spotify/Uber/Nespresso 用了什么商业模式", "免费模式适合我吗 / 这是什么模式", "对比/翻译这张画布", "保存快照 / 回滚到上一版", "把这家公司的画布拿来改", "怎么验证这个假设 / 推荐一个实验", "我该跑客户访谈还是 smoke test"。On activation, **run `pingarden doctor` first** to confirm the CLI is on PATH and the PinGarden app is running; if `pingarden` returns "command not found", fall back to `node /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js` and prompt the user to follow INSTALL.md §三 to symlink it.
version: 0.4.1-133f98f7
---

# PinGarden — official skill

You are working with **PinGarden**, a local Strategyzer-style canvas tool. This skill teaches you how to fill each canvas correctly and how to call the `pingarden` CLI to read and write canvas state.

## First action when this skill activates

Don't wait for the user to ask twice — when this skill loads, do this **immediately**, before producing any canvas content:

1. Run `pingarden doctor` to confirm both halves are up:
   - **CLI on PATH.** If you get `command not found`, fall back to `node /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js <args>` AND tell the user to symlink it permanently per INSTALL.md §三 (`sudo ln -s /Applications/PinGarden.app/Contents/Resources/cli/dist/index.js /usr/local/bin/pingarden`). Don't silently keep typing the long path forever.
   - **PinGarden app/server.** Doctor reports the discovered port and a `/health` ping. If the server is down, tell the user to launch the PinGarden app — never try to write to `apps/server/data/` directly or parse Yjs binary as a workaround.
2. If both are green, **list what already exists** before suggesting fresh authoring:
   - `pingarden case list --json` — 23 curated company cases (Spotify, Uber, Airbnb, Tencent Games · Heima, Alibaba, Nespresso, Gillette, P&G, GSK, Patagonia, …). Often the user's question ("how does Uber make money?", "give me a freemium example") is already answered by an existing case — fork or read it instead of inventing.
   - `pingarden pattern list --json` — 5 BMG patterns (Long Tail, Unbundling, Multi-Sided Platforms, Free, Open Business Models). Patterns surface "which canvases / cases apply this".
3. Only after the environment is confirmed and the existing library is scanned should you start producing canvases / stickies / stories.

## How to use this skill (reading order)

1. **Always read `reference/cli-cheatsheet.md` first** — it lists the exact commands and JSON envelope shape you'll consume.
2. **Before writing to a canvas**, read its description with `pingarden canvas describe <id> --json` (existing canvas) or `pingarden canvas describe-template <defId> --json` (new canvas). NEVER hardcode `zoneId`s — they come from the live def.
3. **For each canvas the user works on**, consult `canvases/<id>.<lang>.md` for filling rules, fill order, examples, and anti-patterns.
4. **For "what pattern is this" / "companies in the same pattern" / "fork a case"** — go to `workflows/case-library.md` and `workflows/patterns.md` first; the case library already has 23 curated companies and 5 BMG patterns cross-linked both ways.
5. **For "how do I test this assumption" / "what experiment should I run"** — go to `workflows/experiments.md` and the `experiments/` library. Classify the assumption as Desirability / Feasibility / Viability, decide Discovery vs Validation, then pick 2–3 candidate experiments and present tradeoffs.
6. **For multi-step work** (greenfield from a chat, iterating, cross-canvas, story narration, snapshot/restore, translate), follow the workflow in `workflows/`.

## Index

### Canvases (one per template, both languages)
- `canvases/ad-lib-value-proposition.en.md` / `canvases/ad-lib-value-proposition.zh.md`
- `canvases/blue-ocean-strategy-canvas.en.md` / `canvases/blue-ocean-strategy-canvas.zh.md`
- `canvases/business-model-canvas.en.md` / `canvases/business-model-canvas.zh.md`
- `canvases/business-model-environment.en.md` / `canvases/business-model-environment.zh.md`
- `canvases/customer-journey.en.md` / `canvases/customer-journey.zh.md`
- `canvases/design-criteria-canvas.en.md` / `canvases/design-criteria-canvas.zh.md`
- `canvases/empathy-map.en.md` / `canvases/empathy-map.zh.md`
- `canvases/experiment-canvas.en.md` / `canvases/experiment-canvas.zh.md`
- `canvases/jobs-to-be-done.en.md` / `canvases/jobs-to-be-done.zh.md`
- `canvases/portfolio-map.en.md` / `canvases/portfolio-map.zh.md`
- `canvases/value-proposition-canvas.en.md` / `canvases/value-proposition-canvas.zh.md`

### Business model patterns (one per pattern, both languages)
- `patterns/free.en.md` / `patterns/free.zh.md`
- `patterns/long-tail.en.md` / `patterns/long-tail.zh.md`
- `patterns/multi-sided-platforms.en.md` / `patterns/multi-sided-platforms.zh.md`
- `patterns/open-business-models.en.md` / `patterns/open-business-models.zh.md`
- `patterns/unbundling-business-models.en.md` / `patterns/unbundling-business-models.zh.md`

### Experiment library (Testing Business Ideas — one per experiment, both languages)
- `experiments/boomerang.en.md` / `experiments/boomerang.zh.md`
- `experiments/clickable-prototype.en.md` / `experiments/clickable-prototype.zh.md`
- `experiments/concierge.en.md` / `experiments/concierge.zh.md`
- `experiments/customer-interview.en.md` / `experiments/customer-interview.zh.md`
- `experiments/discussion-forums.en.md` / `experiments/discussion-forums.zh.md`
- `experiments/letter-of-intent.en.md` / `experiments/letter-of-intent.zh.md`
- `experiments/online-survey.en.md` / `experiments/online-survey.zh.md`
- `experiments/pre-sale.en.md` / `experiments/pre-sale.zh.md`
- `experiments/search-trend-analysis.en.md` / `experiments/search-trend-analysis.zh.md`
- `experiments/smoke-test.en.md` / `experiments/smoke-test.zh.md`
- `experiments/storyboard.en.md` / `experiments/storyboard.zh.md`
- `experiments/wizard-of-oz.en.md` / `experiments/wizard-of-oz.zh.md`

### Workflows
- `workflows/discover.md` — first call into a fresh session
- `workflows/greenfield.md` — chat → app, brand new canvas
- `workflows/iterate.md` — refine an existing canvas (read → diff → write)
- `workflows/cross-canvas.md` — chain canvases (BMC → VPC → ...)
- `workflows/story.md` — write a project narrative with embedded canvases
- `workflows/snapshot.md` — when to milestone, how to restore
- `workflows/translate.md` — en ⇄ zh round trip
- `workflows/case-library.md` — read curated company cases for inspiration, or fork one to start fast
- `workflows/patterns.md` — when the user asks "what pattern is this", "give me other companies in the same pattern", or wants to draft a BMC by applying a pattern
- `workflows/authoring-patterns.md` — when the user asks to add a NEW pattern to the library (file layout, description template, audit checklist, manifest, skill regen)
- `workflows/experiments.md` — when the user has a riskiest assumption to test: classify it as Desirability / Feasibility / Viability and recommend 2–3 experiments from the library matched on theme + risk + cost

### Reference
- `reference/cli-cheatsheet.md` — top commands with JSON output examples
- `reference/color-legend.md` — sticky palette + how to interpret colours
- `reference/identity.md` — `X-Display-Name` / `--as` / audit trail
- `reference/ai-context-shape.md` — shape of the `/ai-context` JSON
- `reference/case-library.md` — case kinds, slug rules, read-only rules
- `reference/patterns.md` — pattern slug index, the `pingarden pattern <list|get>` commands, and the case ↔ pattern cross-link rules
- `reference/experiments.md` — experiment slug index with theme / risk / cost / strength columns, plus the matching heuristic for a given riskiest assumption

## Key invariants — never violate

- **Replace-mode writes**: `pingarden canvas write` REPLACES the entire stickies map (and any other root you include in the payload). Always send the complete intended state, not a delta.
- **Auto-snapshot first**: every `canvas write` takes a `pre-ai-edit-<ISO>` milestone before touching state. Failure recovery is one `pingarden snapshot restore --mode replace` away.
- **`zoneId` validation is local-first**: the CLI reads `/ai-context` to verify your `zoneId`s exist on the canvas before writing. Unknown zone → no snapshot, no write.
- **Never parse Yjs binary**: use `canvas read` (which calls `/ai-context`) for state, never `PUT /canvases/:id/state` directly.
- **One sticky = one concept**: don't write paragraphs into a sticky. If a sticky needs more than ~20 words, split it.
