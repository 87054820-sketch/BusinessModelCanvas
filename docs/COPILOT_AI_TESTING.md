# Copilot AI Testing

This document is the regression contract for PinGarden Copilot AI work. Any change to prompts, providers, model routing, structured cards, reference resolution, CLI skill output, or Copilot UI parsing must update or consciously re-run this matrix.

## Test Commands

- `pnpm test:ai` — deterministic offline AI contract tests. No Kimi, DeepSeek, or MiniMax key required.
- `pnpm test:ai:agent` — optional local agent-bridge smoke. Set `PINGARDEN_AI_AGENT_BRIDGE=1` and `PINGARDEN_AI_AGENT_BRIDGE_COMMAND`; skipped by default.
- `pnpm test:ai:smoke` — optional real-provider smoke. Set `PINGARDEN_SMOKE_AI_KEY` plus optional `PINGARDEN_SMOKE_AI_MODEL` / `PINGARDEN_SMOKE_AI_PROVIDER`.
- `pnpm typecheck` — all workspaces.
- `pnpm --filter @pingarden/web build` — Vite production build.

## Test Layers

- Shared contract: `pingarden.response.v1`, legacy block fallback, source coverage, quality rules.
- Reference resolver: canvas templates, canvas instances, cases, resources, resource chapters, patterns, strategy frameworks, experiments, aliases, ambiguous/missing targets.
- Provider contracts: Kimi CLI / Kimi HTTP / DeepSeek HTTP / MiniMax HTTP error normalization, empty response, auth error, stream done metadata.
- Internal providers: `fixture-ai` must be deterministic and keyless; `agent-bridge-ai` must remain opt-in and hidden from the product UI.
- Router/key storage: model selection, provider selection, Kimi/DeepSeek/MiniMax key isolation, legacy key migration.
- UI parsing/rendering: structured blocks are hidden from markdown, cards render from structured payloads, missing hints appear only for true open-target misses.
- CLI/skill parity: `pingarden reference resolve`, generated skill copies, and skill pack zip agree on taxonomy.

## Fixture Policy

Fixtures live under `fixtures/copilot/`.

- `answers/` stores model replies: normal structured envelope, legacy JSON, malformed-but-common output, Chinese mixed markdown.
- `references/` stores historical false-positive cases. Add one whenever a user reports "this exists but Copilot says missing".
- New AI features should add fixtures before or alongside implementation tests.
- If a bug fix reveals a corner case, keep the smallest fixture that reproduces it.

## AI Change Checklist

For every AI-related change, check:

- Did we add or update tests for the new behavior?
- Did we add a regression fixture for any historical or newly found corner case?
- Does `pingarden.response.v1` still parse while legacy blocks remain compatible?
- Does the resolver keep cases, resources, canvas templates, canvas instances, patterns, strategy frameworks, and experiments distinct?
- Do Kimi, DeepSeek, and MiniMax routes still preserve provider/model metadata and key isolation?
- Are internal providers still filtered out of normal `/copilot/health` and the user model picker?
- Does the skill documentation still match CLI capabilities?
- Does cloud smoke need a new case in `scripts/cloud-smoke-test.mjs` or `pnpm test:ai:smoke`?

Do not treat real-provider smoke as a replacement for offline tests. Smoke proves the external chain is alive; fixtures prove behavior stays stable.
