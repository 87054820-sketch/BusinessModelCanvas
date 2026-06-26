import type {
  CopilotImageAttachment,
  CopilotMemoryState,
  CopilotMemorySuggestion,
  CopilotPlaybookDescriptor,
  CopilotUserProfile,
  Lang,
} from '@pingarden/shared';
import { ensureOk } from './errors';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export type CopilotAiProviderKind = 'kimi-cli' | 'kimi-http';

export interface CopilotProviderHealth {
  provider: CopilotAiProviderKind;
  available: boolean;
  version?: string;
  model?: string;
  requiresApiKey: boolean;
  storesKeyServerSide: false;
  message?: string;
}

export interface CopilotHealth {
  provider: CopilotProviderHealth;
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

export type CopilotIntent = 'project-draft' | 'project-update' | 'discussion-insight' | 'apply-learning-to-project';

export interface CopilotStreamRequest {
  /** Plaintext Kimi API key resolved by the renderer just before sending; the server must not persist it. */
  apiKey: string;
  /** Conversation history including the latest user turn. */
  messages: CopilotChatMessage[];
  /** Display name used only for local user-profile isolation. */
  displayName?: string;
  /** Optional pre-fetched case/pattern markdown digest. */
  attachedContext?: string;
  /** Optional hidden task protocol selected by the UI. */
  intent?: CopilotIntent;
  /** UI language — controls backend protocol prompt language. */
  lang?: Lang;
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

function normalizeCopilotStreamError(status: number, body: string): string {
  const text = body.trim();
  if (isHtmlResponse(text)) {
    if (status === 504 || /504\s+Gateway\s+Time-?out/i.test(text)) {
      return '云端 AI 请求超时，请重试或缩小资料范围。';
    }
    return `云端 AI 请求失败（HTTP ${status}），请稍后重试。`;
  }
  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = typeof parsed.error === 'string' ? parsed.error : parsed.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  } catch {
    /* not JSON */
  }
  return text.slice(0, 400) || `HTTP ${status}`;
}

function isHtmlResponse(text: string): boolean {
  return /^<!doctype\s+html/i.test(text) || /^<html[\s>]/i.test(text) || /<body[\s>]/i.test(text);
}

export const copilotApi = {
  getHealth(): Promise<CopilotHealth> {
    return fetchJson<CopilotHealth>(`${BASE}/copilot/health`);
  },

  /**
   * Probe whether the candidate API key works for the active provider.
   * CLI mode may render a local Kimi config; HTTP BYOK mode only uses
   * the key for this request and never stores it server-side.
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

  fetchLibraryContext(lang: Lang, query?: string): Promise<{ markdown: string }> {
    const qs = new URLSearchParams({ lang });
    if (query?.trim()) qs.set('q', query.trim());
    return fetchJson<{ markdown: string }>(`${BASE}/copilot/library-context?${qs.toString()}`);
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

  getMemoryState(displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory`, {
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  consolidateMemory(
    displayName: string,
    input: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      projectId?: string;
      contextLabel?: string;
    },
  ): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/consolidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Display-Name': encodeURIComponent(displayName),
      },
      body: JSON.stringify(input),
    });
  },

  archiveMemoryItem(id: string, displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/items/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  deleteMemoryItem(id: string, displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  revertLatestMemoryChange(displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/revert-latest`, {
      method: 'POST',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  acceptMemorySuggestion(id: string, displayName: string): Promise<CopilotUserProfile> {
    return fetchJson<CopilotUserProfile>(`${BASE}/copilot/memory/suggestions/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  ignoreMemorySuggestion(id: string, displayName: string): Promise<CopilotMemorySuggestion> {
    return fetchJson<CopilotMemorySuggestion>(`${BASE}/copilot/memory/suggestions/${encodeURIComponent(id)}/ignore`, {
      method: 'POST',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  deleteUserPreference(id: string, displayName: string): Promise<{ ok: true }> {
    return fetchJson<{ ok: true }>(`${BASE}/copilot/memory/preferences/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  exportMemory(displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/export`, {
      headers: { 'X-Display-Name': encodeURIComponent(displayName) },
    });
  },

  getBundledPlaybooks(): Promise<CopilotPlaybookDescriptor[]> {
    return fetchJson<CopilotPlaybookDescriptor[]>(`${BASE}/copilot/playbooks/bundled`);
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
          headers: {
            'Content-Type': 'application/json',
            ...(req.displayName ? { 'X-Display-Name': encodeURIComponent(req.displayName) } : {}),
          },
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
          cb.onError(normalizeCopilotStreamError(res.status, bodyText));
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
