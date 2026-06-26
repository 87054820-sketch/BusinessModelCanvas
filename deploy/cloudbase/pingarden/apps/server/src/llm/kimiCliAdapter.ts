import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { resolveKimiBinary, KimiBinaryNotFoundError } from './kimiBinaryResolver.js';

/**
 * Single adapter for the bundled Kimi CLI. Spawns `kimi -p
 * "<prompt>" --output-format stream-json --model kimi-code/kimi-for-coding`
 * in a per-spawn scratch tmpdir so the subprocess has no view of the
 * PinGarden source tree (defence in depth — kimi has no `--disallowed-tools`
 * flag, so we rely on `default_permission_mode = "manual"` in
 * config.toml + an empty cwd to keep tool use inert in `-p` mode).
 *
 * The stream-json format is OpenAI-compatible in shape: events arrive
 * as NDJSON lines, with `content_block_delta` carrying `delta.text` for
 * each token chunk and a final `result` line signalling done. We
 * forward each text fragment as `{delta: string}` and a final `{done}`,
 * matching the existing renderer SSE wire shape.
 *
 * Error frames are forwarded as `{error: <message>}`. The caller is
 * expected to write those into its own SSE response (no automatic SSE
 * formatting at this layer — keeps the adapter testable in isolation).
 */

export interface KimiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KimiStreamRequest {
  systemPromptText: string;
  /** Prior conversation. Folded into the prompt body — kimi has no `--system-prompt` flag. */
  conversation: KimiChatMessage[];
  latestUserMsg: string;
  /** Optional AbortSignal for client-disconnect propagation. */
  signal?: AbortSignal;
}

export interface KimiDelta {
  delta: string;
}
export interface KimiError {
  error: string;
}
export type KimiStreamChunk = KimiDelta | KimiError;

/** Stable model alias declared in kimiConfig.ts's TOML. */
const MODEL_ALIAS = 'kimi-code/kimi-for-coding';

/**
 * Yields chunks as they arrive from `kimi`. Returns normally on final
 * `result` line. Emits one terminal `{error}` chunk if the binary
 * can't be found, the subprocess exits non-zero, or the upstream stream
 * malforms.
 */
export async function* streamKimiChat(
  req: KimiStreamRequest,
): AsyncGenerator<KimiStreamChunk, void, void> {
  let bin: string;
  try {
    bin = resolveKimiBinary();
  } catch (err) {
    if (err instanceof KimiBinaryNotFoundError) {
      yield { error: err.message };
      return;
    }
    throw err;
  }

  // Build the single positional argument that kimi consumes as the user
  // input. The system prompt + prior turns are folded in — kimi has no
  // --system-prompt flag, so we shape the whole thing as one block of
  // text with clearly labelled sections.
  const promptText = buildPrompt(req);

  // Scratch cwd ensures kimi can't accidentally read PinGarden source
  // even if `default_permission_mode = "manual"` somehow falls through
  // and a tool gets approved. Cleaned up in finally.
  const scratchDir = mkdtempSync(join(tmpdir(), 'pingarden-copilot-'));

  let child: ReturnType<typeof spawn> | null = null;
  try {
    child = spawn(
      bin,
      [
        '-p', promptText,
        '--output-format', 'stream-json',
        '--model', MODEL_ALIAS,
      ],
      {
        cwd: scratchDir,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    // Wire client-disconnect → SIGTERM the subprocess.
    if (req.signal) {
      const onAbort = () => {
        if (child && !child.killed) child.kill('SIGTERM');
      };
      if (req.signal.aborted) onAbort();
      else req.signal.addEventListener('abort', onAbort, { once: true });
    }

    // Read NDJSON lines from stdout. Each line is one event.
    const rl = createInterface({ input: child.stdout!, crlfDelay: Infinity });
    let stderrBuf = '';
    child.stderr?.on('data', (chunk) => {
      stderrBuf += chunk.toString();
    });

    let sawTextDelta = false;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let evt: unknown;
      try {
        evt = JSON.parse(trimmed);
      } catch {
        // Non-JSON line — probably an info log. Skip.
        continue;
      }
      const delta = extractTextDelta(evt);
      if (delta) {
        sawTextDelta = true;
        yield { delta };
        continue;
      }
      if (isResultFrame(evt)) {
        // End of turn — break the read loop; the iterator returns
        // normally and the caller emits its `{done: true}` SSE frame.
        return;
      }
      if (isErrorFrame(evt)) {
        yield { error: extractErrorMessage(evt) };
        return;
      }
    }

    // Stream closed without a result frame. If we got any text deltas
    // the caller's `for await` will exit cleanly; otherwise surface
    // stderr (or a generic message) so the user sees something.
    if (!sawTextDelta) {
      yield {
        error: stderrBuf.trim().slice(0, 400) || 'kimi exited without producing output',
      };
    }
  } catch (err) {
    yield { error: normalizeKimiError(err instanceof Error ? err.message : String(err)) };
  } finally {
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* best-effort */
      }
    }
    try {
      rmSync(scratchDir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}

function buildPrompt(req: KimiStreamRequest): string {
  const lines: string[] = [];
  lines.push('## System');
  lines.push(req.systemPromptText.trim());
  lines.push('');
  if (req.conversation.length > 0) {
    lines.push('## Prior conversation');
    for (const msg of req.conversation) {
      lines.push(`${msg.role}: ${msg.content}`);
    }
    lines.push('');
  }
  lines.push('## Current question');
  lines.push(req.latestUserMsg);
  return lines.join('\n');
}

/**
 * Pull the assistant text out of one stream-json event.
 *
 * Kimi CLI's stream-json output is its own shape — not OpenAI deltas,
 * not Claude Code's nested `stream_event` envelope. Verified live on
 * kimi 0.11.0 (2026-06-22):
 *
 *   {"role":"assistant","content":"<full reply>"}
 *   {"role":"meta","type":"session.resume_hint","session_id":"...","content":"..."}
 *
 * The assistant line carries the whole reply in one shot (no per-token
 * streaming today). We surface it as a single `{delta}` so the
 * renderer's existing streaming append code works unchanged — the
 * bubble just fills in one frame instead of incrementally.
 *
 * As a defensive fallback we also accept the Claude-Code-style
 * `content_block_delta.text_delta.text` shape, so if Kimi ever ships
 * a true streaming mode under the same flag we'll pick it up without
 * a code change.
 *
 * Meta lines (`role: "meta"`) and anything else are skipped silently.
 */
export function extractTextDelta(evt: unknown): string | undefined {
  if (!evt || typeof evt !== 'object') return undefined;
  const obj = evt as Record<string, unknown>;

  // Kimi 0.11 stream-json: {"role":"assistant","content":"..."}
  if (obj.role === 'assistant' && typeof obj.content === 'string') {
    return obj.content;
  }

  // Kimi 1.47 stream-json: {"role":"assistant","content":[{"type":"think"},{"type":"text","text":"..."}]}
  if (obj.role === 'assistant' && Array.isArray(obj.content)) {
    const text = obj.content
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        const item = part as Record<string, unknown>;
        return item.type === 'text' && typeof item.text === 'string' ? item.text : '';
      })
      .join('');
    return text || undefined;
  }

  // Claude-Code-style nested envelope: {type:"stream_event", event:{...}}
  let inner: Record<string, unknown> | undefined;
  if (obj.type === 'stream_event' && obj.event && typeof obj.event === 'object') {
    inner = obj.event as Record<string, unknown>;
  } else if (obj.type === 'content_block_delta') {
    inner = obj;
  }
  if (inner && inner.type === 'content_block_delta') {
    const delta = inner.delta as Record<string, unknown> | undefined;
    if (delta && delta.type === 'text_delta' && typeof delta.text === 'string') {
      return delta.text;
    }
  }

  return undefined;
}

function isResultFrame(evt: unknown): boolean {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as Record<string, unknown>;
  return obj.type === 'result';
}

function isErrorFrame(evt: unknown): boolean {
  if (!evt || typeof evt !== 'object') return false;
  const obj = evt as Record<string, unknown>;
  if (obj.type === 'error') return true;
  if (obj.type === 'result' && obj.is_error === true) return true;
  return false;
}

function extractErrorMessage(evt: unknown): string {
  if (!evt || typeof evt !== 'object') return 'Unknown error';
  const obj = evt as Record<string, unknown>;
  if (typeof obj.error === 'string') return normalizeKimiError(obj.error);
  if (obj.error && typeof obj.error === 'object') {
    const e = obj.error as Record<string, unknown>;
    if (typeof e.message === 'string') return normalizeKimiError(e.message);
  }
  if (typeof obj.message === 'string') return normalizeKimiError(obj.message);
  return normalizeKimiError(JSON.stringify(obj).slice(0, 400));
}

function normalizeKimiError(message: string): string {
  if (message.includes('compaction.unable')) {
    return 'Kimi 上下文过长，当前原图或对话内容超出可处理范围。请减少图片数量、缩短对话，或换用小于上限的原图后重试。';
  }
  return message.slice(0, 400);
}
