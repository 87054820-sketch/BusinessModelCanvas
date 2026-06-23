import type { CopilotImageAttachment, Lang } from '@pingarden/shared';
import { ensureOk } from './errors';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export interface CopilotHealth {
  kimi: {
    available: boolean;
    version?: string;
  };
}

export interface SupportedAgent {
  id: string;
  label: string;
}

export interface SkillPackInfo {
  version: string;
  filename: string;
  sizeBytes: number;
  supportedAgents: SupportedAgent[];
}

export interface CopilotChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageAttachments?: CopilotImageAttachment[];
}

export type CopilotIntent = 'project-draft';

export interface CopilotStreamRequest {
  /** Plaintext Kimi Code API key (decrypted by the renderer just before sending). */
  apiKey: string;
  /** Conversation history including the latest user turn. */
  messages: CopilotChatMessage[];
  /** Optional pre-fetched case/pattern markdown digest. */
  attachedContext?: string;
  /** Optional hidden task protocol selected by the UI. */
  intent?: CopilotIntent;
}

export interface CopilotStreamCallbacks {
  onDelta(delta: string): void;
  onDone(): void;
  onError(message: string): void;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return (await res.json()) as T;
}

export const copilotApi = {
  getHealth(): Promise<CopilotHealth> {
    return fetchJson<CopilotHealth>(`${BASE}/copilot/health`);
  },

  /**
   * Probe whether the candidate API key works. Server writes Kimi's
   * config.toml with the key, spawns one tiny `kimi --print -p` turn,
   * returns `{ok}` based on the first frame. The 测试连接 button consumes this.
   */
  testKey(apiKey: string): Promise<{ ok: boolean; message?: string }> {
    return fetchJson<{ ok: boolean; message?: string }>(
      `${BASE}/copilot/test-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      },
    );
  },

  /** Wipe ~/.kimi-code/config.toml back to its empty stub. */
  clearKey(): Promise<{ ok: boolean }> {
    return fetchJson<{ ok: boolean }>(`${BASE}/copilot/clear-key`, { method: 'POST' });
  },

  fetchLibraryContext(lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(`${BASE}/copilot/library-context?lang=${lang}`);
  },

  fetchCaseContext(slug: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/case-context/${encodeURIComponent(slug)}?lang=${lang}`,
    );
  },

  fetchPatternContext(slug: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/pattern-context/${encodeURIComponent(slug)}?lang=${lang}`,
    );
  },

  fetchProjectContext(
    projectId: string,
    lang: Lang,
    opts?: { activeCanvasId?: string; activeStoryId?: string },
  ): Promise<{ markdown: string }> {
    const qs = new URLSearchParams({ lang });
    if (opts?.activeCanvasId) qs.set('activeCanvasId', opts.activeCanvasId);
    if (opts?.activeStoryId) qs.set('activeStoryId', opts.activeStoryId);
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/project-context/${encodeURIComponent(projectId)}?${qs.toString()}`,
    );
  },

  fetchCanvasContext(canvasId: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/canvas-context/${encodeURIComponent(canvasId)}?lang=${lang}`,
    );
  },

  fetchStoryContext(storyId: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/story-context/${encodeURIComponent(storyId)}?lang=${lang}`,
    );
  },

  // ── Mode B: skill pack ────────────────────────────────────────────

  getSkillPackInfo(): Promise<SkillPackInfo> {
    return fetchJson<SkillPackInfo>(`${BASE}/copilot/skill-pack/info`);
  },

  /** Absolute URL the browser can use for direct `<a download>` triggers. */
  skillPackDownloadUrl(): string {
    return `${BASE}/copilot/skill-pack`;
  },

  /**
   * Stream a chat turn. Same SSE wire shape as Round 1 — server emits
   * `data: {"delta":"..."}\n\n` then `data: {"done":true}\n\n`, error
   * frames look like `data: {"error":"..."}\n\n`. Returns an abort
   * function the caller invokes to cut the stream short; the server
   * propagates the disconnect to the bundled kimi subprocess via
   * SIGTERM.
   */
  streamChat(req: CopilotStreamRequest, cb: CopilotStreamCallbacks): () => void {
    const abort = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`${BASE}/copilot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          let bodyText = '';
          try {
            bodyText = await res.text();
          } catch {
            /* best-effort */
          }
          cb.onError(bodyText || `HTTP ${res.status}`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        let saw = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const normalised = buf.replace(/\r\n/g, '\n');
          const parts = normalised.split('\n\n');
          buf = parts.pop() ?? '';
          for (const frame of parts) {
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              try {
                const parsed = JSON.parse(payload);
                if (typeof parsed.error === 'string') {
                  cb.onError(parsed.error);
                  return;
                }
                if (parsed.done === true) {
                  cb.onDone();
                  return;
                }
                if (typeof parsed.delta === 'string') {
                  saw = true;
                  cb.onDelta(parsed.delta);
                }
              } catch {
                // Non-JSON SSE comments or upstream noise — skip.
              }
            }
          }
        }
        if (saw) cb.onDone();
        else cb.onError('Empty response from kimi');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        cb.onError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => abort.abort();
  },
};
