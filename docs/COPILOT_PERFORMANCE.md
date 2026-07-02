# Copilot Performance Diagnostics

This document defines how to diagnose slow Auto Pilot / Copilot replies without logging secrets or full user content.

## Latency chain

A single turn is split into these phases:

| Layer | Metric | Meaning |
| --- | --- | --- |
| Client | `keyResolveMs` | Time to read/decrypt the request-scoped Kimi key. |
| Client | `contextFetchMs` | Time spent fetching library/case/project/canvas/story context before chat. |
| Client | `baselineCaptureMs` | Time spent capturing project update baseline. |
| Client | `responseHeaders` | Browser request start to `/copilot/chat` response headers. |
| Client | `firstSseFrame` | Browser request start to first SSE frame, including `stream-open`. |
| Client | `firstDelta` | Browser request start to first assistant delta visible to the reveal queue. |
| Client | `networkDone` | Browser request start to final `done` SSE frame. |
| Server | `preUpstreamDoneMs` | Request start to finished validation, memory context, and prompt build. |
| Server | `firstDownstreamDeltaMs` | Request start to first server-to-client delta write. |
| Server | `totalMs` | Full `/copilot/chat` handler duration. |
| Provider | `upstreamHeaders` | Request start to Kimi response headers. |
| Provider | `upstreamFirstFrame` | Request start to first upstream SSE/CLI frame. |
| Provider | `upstreamFirstDelta` | Request start to first upstream assistant delta. |
| Provider | `upstreamDone` | Request start to upstream completion. |

All metrics are safe: they record durations, counts, lengths, provider, model, status, and request id only. They do not record API keys, message bodies, image data URLs, or full payloads.

## Benchmark command

Use a real Kimi key through an environment variable:

```bash
PINGARDEN_SMOKE_KIMI_API_KEY=sk-xxx pnpm benchmark:copilot -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com --runs 5
```

Optional project context scenario:

```bash
PINGARDEN_SMOKE_KIMI_API_KEY=sk-xxx pnpm benchmark:copilot -- --runs 5 --project-id <projectId>
```

The benchmark prints per-run request ids plus p50/p95 for:

- `ttfbMs`
- `ttftMs`
- `totalMs`
- `charsPerSec`

## Kimi Speed Options

Kimi now defaults to the HTTP highspeed path:

- Provider: `kimi-http`
- Base URL: `https://api.moonshot.cn/v1`
- Model: `kimi-k2.7-code-highspeed`
- Request body: `stream: true`, optional `max_completion_tokens`, optional stable `prompt_cache_key`

The legacy local CLI path remains available through `PINGARDEN_AI_PROVIDER=kimi-cli`, but it has two built-in costs:

- Each turn spawns a Kimi CLI subprocess and prepares a temporary HOME/config.
- Current Kimi CLI `stream-json` output often returns the assistant reply as one full frame, so the UI may not see token-by-token streaming even though the drawer is ready for SSE.

Recommended speed settings:

```bash
PINGARDEN_AI_PROVIDER=kimi-http
PINGARDEN_KIMI_HTTP_MAX_COMPLETION_TOKENS=2048
PINGARDEN_KIMI_HTTP_PROMPT_CACHE=1
```

Use this with an API key that is valid for the Kimi / Moonshot API platform. If a deployment must use the old Kimi Code endpoint, set:

```bash
PINGARDEN_AI_PROVIDER=kimi-http
PINGARDEN_KIMI_HTTP_PRESET=legacy-code
```

Notes:

- The Kimi API already streams when `stream: true`; PinGarden always sets this for `kimi-http`.
- `max_completion_tokens` caps output length. It improves tail latency when prompts would otherwise produce long analysis, but setting it too low can truncate useful structured cards.
- `prompt_cache_key` improves cache hit rate for repeated or similar Copilot contexts. PinGarden generates a stable hashed key from provider/model/system context when `PINGARDEN_KIMI_HTTP_PROMPT_CACHE=1`.
- Kimi K2.7 Code does not support disabling thinking; do not add `thinking: { "type": "disabled" }` for that model.

## Initial baseline targets

These are diagnostic targets, not hard production SLOs yet:

| Scenario | Target |
| --- | --- |
| No context | TTFT < 8s |
| Filtered library context | TTFT < 12s |
| Project context | TTFT < 15s |
| Any scenario | Server `preUpstreamDoneMs` should usually stay under 1s unless project context is large. |
| Any scenario | If client `networkDone` is fast but visible completion is slow, inspect reveal queue behavior. |

## Diagnosis decision tree

1. **High `contextFetchMs`**
   - Check whether the same attached context is fetched repeatedly.
   - Prefer cached `attachedRef + lang + query` context.
   - For project context, inspect canvas/story counts and active canvas/story options.

2. **High `preUpstreamDoneMs` but low context fetch**
   - Check memory profile JSON reads and prompt assembly.
   - Inspect `systemPromptChars`, `latestUserPromptChars`, and `priorConversationChars`.

3. **High `upstreamHeaders`**
   - Kimi API connection or scheduling is slow.
   - Compare p50/p95 and check whether CloudRun instance is warm.

4. **High `upstreamFirstDelta` with normal `upstreamHeaders`**
   - Model reasoning/prompt size is the likely bottleneck.
   - Reduce attached context and prior conversation size.

5. **High client `firstDelta` but normal provider first delta**
   - Inspect server SSE forwarding, CloudRun/network buffering, and request id logs.

6. **High visible completion after `networkDone`**
   - Reveal pacing is the likely bottleneck.
   - Large reveal queues use an accelerated interval to avoid artificial delay.

## Streaming experience phases

The Copilot drawer uses real request events instead of a fake timer-only progress indicator:

| Phase | Trigger | User-facing meaning |
| --- | --- | --- |
| `preparing` | User message and assistant placeholder are created | Preparing the input before network work starts. |
| `context` | Attached library/project/canvas/story context is being fetched | Gathering and compressing relevant material. |
| `baseline` | Project update baseline is being captured | Recording current project state for safe update cards. |
| `connecting` | Request body is ready and `/copilot/chat` is being opened | Connecting to cloud Copilot. |
| `waitingModel` | Response headers / first SSE frame arrived, but no delta yet | Cloud is connected; waiting for Kimi's first output. |
| `generating` | First delta arrived | Content is actively streaming. |
| `revealing` | Network done but reveal queue still has content | Long answer is being organized into readable sections. |

Slow-wait copy is phase-specific and does not pretend progress has advanced. For example, `waitingModel` after 5 seconds says the model is analyzing; after 15 seconds it explains that the question or context may be complex.

## Request id workflow

The browser reads `X-Request-Id` and the final SSE `done.requestId`. The Copilot drawer shows the short id in the status row and inside the waiting card, then logs a safe `Copilot latency snapshot` to the browser console. Use that id to find the matching CloudRun structured log entry.
