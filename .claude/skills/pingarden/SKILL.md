---
name: pingarden
description: Use when the user asks to create, edit, translate, or narrate Business Model Canvas, Value Proposition Canvas, JTBD, Empathy Map, Portfolio Map, Business Model Environment, Ad-Lib Value Proposition, Customer Journey, Strategy Canvas, Design Criteria Canvas, or Experiment Canvas via the local PinGarden app. Triggers on phrases like "draft a BMC", "fill the value proposition", "story for my project", "snapshot before editing", or any `pingarden` CLI invocation.
version: 0.1.0-ff95de6f
---

# PinGarden — official skill

You are working with **PinGarden**, a local Strategyzer-style canvas tool. This skill teaches you how to fill each canvas correctly and how to call the `pingarden` CLI to read and write canvas state.

## How to use this skill

1. **Always read `reference/cli-cheatsheet.md` first** — it lists the exact commands and JSON envelope shape you'll consume.
2. **Before writing to a canvas**, read its description with `pingarden canvas describe <id> --json` (existing canvas) or `pingarden canvas describe-template <defId> --json` (new canvas). NEVER hardcode `zoneId`s — they come from the live def.
3. **For each canvas the user works on**, consult `canvases/<id>.<lang>.md` for filling rules, fill order, examples, and anti-patterns.
4. **For multi-step work** (greenfield from a chat, iterating, cross-canvas, story narration, snapshot/restore, translate), follow the workflow in `workflows/`.

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

### Workflows
- `workflows/discover.md` — first call into a fresh session
- `workflows/greenfield.md` — chat → app, brand new canvas
- `workflows/iterate.md` — refine an existing canvas (read → diff → write)
- `workflows/cross-canvas.md` — chain canvases (BMC → VPC → ...)
- `workflows/story.md` — write a project narrative with embedded canvases
- `workflows/snapshot.md` — when to milestone, how to restore
- `workflows/translate.md` — en ⇄ zh round trip

### Reference
- `reference/cli-cheatsheet.md` — top commands with JSON output examples
- `reference/color-legend.md` — sticky palette + how to interpret colours
- `reference/identity.md` — `X-Display-Name` / `--as` / audit trail
- `reference/ai-context-shape.md` — shape of the `/ai-context` JSON

## Key invariants — never violate

- **Replace-mode writes**: `pingarden canvas write` REPLACES the entire stickies map (and any other root you include in the payload). Always send the complete intended state, not a delta.
- **Auto-snapshot first**: every `canvas write` takes a `pre-ai-edit-<ISO>` milestone before touching state. Failure recovery is one `pingarden snapshot restore --mode replace` away.
- **`zoneId` validation is local-first**: the CLI reads `/ai-context` to verify your `zoneId`s exist on the canvas before writing. Unknown zone → no snapshot, no write.
- **Never parse Yjs binary**: use `canvas read` (which calls `/ai-context`) for state, never `PUT /canvases/:id/state` directly.
- **One sticky = one concept**: don't write paragraphs into a sticky. If a sticky needs more than ~20 words, split it.
