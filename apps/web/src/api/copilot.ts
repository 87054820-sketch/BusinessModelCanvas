import type {
  CopilotImageAttachment,
  CopilotMemoryState,
  CopilotMemorySuggestion,
  CopilotPlaybookDescriptor,
  CopilotUserProfile,
  Lang,
} from '@pingarden/shared';
import type { CopilotClientTimingEvent, CopilotLatencySnapshot } from '../copilot/performance';
import { nowMs, roundMs } from '../copilot/performance';
import { ensureOk } from './errors';
import { authHeaders, authHeadersJson } from './authHeaders';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export type CopilotModelId = 'kimi' | 'deepseek';
export type CopilotProviderId = 'kimi-cli' | 'kimi-http' | 'deepseek-http';
export type CopilotAiProviderKind = CopilotProviderId;

export interface CopilotProviderHealth {
  provider: CopilotProviderId;
  modelId: CopilotModelId;
  available: boolean;
  version?: string;
  model?: string;
  requiresApiKey: boolean;
  storesKeyServerSide: false;
  message?: string;
}

export interface CopilotModelHealth {
  model: CopilotModelId;
  provider: CopilotProviderHealth;
  providers: CopilotProviderHealth[];
  defaultProvider: CopilotProviderId;
  available: boolean;
  requiresApiKey: boolean;
  message?: string;
}

export interface CopilotHealth {
  defaultModel: CopilotModelId;
  defaultProvider: CopilotProviderId;
  models: CopilotModelHealth[];
  provider: CopilotProviderHealth;
  providers: CopilotProviderHealth[];
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
  /** Plaintext provider API key resolved by the renderer just before sending; the server must not persist it. */
  apiKey: string;
  /** Optional model profile selected by the UI. */
  model?: CopilotModelId;
  /** Optional provider override for this turn; omitted means server default. */
  provider?: CopilotProviderId;
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

export interface CopilotStreamDonePayload {
  requestId?: string;
  model?: CopilotModelId;
  provider?: CopilotProviderId;
  timings?: Record<string, number>;
  providerTimings?: Record<string, number>;
}

export interface CopilotStreamCallbacks {
  onDelta(delta: string): void;
  onDone(payload?: CopilotStreamDonePayload): void;
  onError(message: string, requestId?: string): void;
  onRequestId?(requestId: string): void;
  onTiming?(event: CopilotClientTimingEvent): void;
  onSnapshot?(snapshot: CopilotLatencySnapshot): void;
}

export interface CopilotProviderSelection {
  model?: CopilotModelId;
  provider?: CopilotProviderId;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return (await res.json()) as T;
}

export function normalizeCopilotRuntimeError(input: unknown): string {
  const message = extractCopilotErrorMessage(input)?.trim() || String(input).trim();
  if (/load failed|failed to fetch|networkerror|internet connection|network request failed|fetch.*failed/i.test(message)) {
    return '移动端网络连接中断或当前 WebView 拦截了请求，请检查网络后重试。';
  }
  if (/message at position \d+ with role ['"]assistant['"] must not be empty/i.test(message)) {
    return '上一轮 AI 回复没有成功完成，请重试上一条。';
  }
  return message;
}

export function normalizeCopilotFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') return '请求已取消。';
  return normalizeCopilotRuntimeError(err);
}

function normalizeCopilotStreamError(status: number, body: string): string {
  const text = body.trim();
  if (isHtmlResponse(text)) {
    if (status === 504 || /504\s+Gateway\s+Time-?out/i.test(text)) {
      return '云端 AI 请求超时，请重试或缩小资料范围。';
    }
    return `云端 AI 请求失败（HTTP ${status}），请稍后重试。`;
  }
  return normalizeCopilotRuntimeError(text.slice(0, 400) || `HTTP ${status}`);
}

function extractCopilotErrorMessage(input: unknown): string | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      return extractCopilotErrorMessage(JSON.parse(trimmed)) ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  return (
    extractCopilotErrorMessage(record.message) ??
    extractCopilotErrorMessage(record.error) ??
    (typeof record.type === 'string' ? null : null)
  );
}

function isHtmlResponse(text: string): boolean {
  return /^<!doctype\s+html/i.test(text) || /^<html[\s>]/i.test(text) || /<body[\s>]/i.test(text);
}

export const copilotApi = {
  getHealth(): Promise<CopilotHealth> {
    return fetchJson<CopilotHealth>(`${BASE}/copilot/health`);
  },

  /**
   * Probe whether the candidate API key works for the selected provider.
   * CLI mode may render a local Kimi config; HTTP BYOK modes only use
   * the key for this request and never store it server-side.
   */
  testKey(apiKey: string, selection?: CopilotProviderSelection): Promise<{ ok: boolean; message?: string }> {
    return fetchJson<{ ok: boolean; message?: string }>(
      `${BASE}/copilot/test-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, ...selection }),
      },
    );
  },

  /** Clear any server-side provider runtime key material, where applicable. */
  clearKey(selection?: CopilotProviderSelection): Promise<{ ok: boolean }> {
    return fetchJson<{ ok: boolean }>(`${BASE}/copilot/clear-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection ?? {}),
    });
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

  fetchResourceContext(slug: string, lang: Lang, query?: string): Promise<{ markdown: string }> {
    const qs = new URLSearchParams({ lang });
    if (query?.trim()) qs.set('q', query.trim());
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/resource-context/${encodeURIComponent(slug)}?${qs.toString()}`,
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
      { headers: authHeaders() },
    );
  },

  fetchCanvasContext(canvasId: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/canvas-context/${encodeURIComponent(canvasId)}?lang=${lang}`,
      { headers: authHeaders() },
    );
  },

  fetchStoryContext(storyId: string, lang: Lang): Promise<{ markdown: string }> {
    return fetchJson<{ markdown: string }>(
      `${BASE}/copilot/story-context/${encodeURIComponent(storyId)}?lang=${lang}`,
      { headers: authHeaders() },
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
      headers: authHeaders(displayName),
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
      headers: authHeadersJson(displayName),
      body: JSON.stringify(input),
    });
  },

  archiveMemoryItem(id: string, displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/items/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: authHeaders(displayName),
    });
  },

  deleteMemoryItem(id: string, displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },

  revertLatestMemoryChange(displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/revert-latest`, {
      method: 'POST',
      headers: authHeaders(displayName),
    });
  },

  acceptMemorySuggestion(id: string, displayName: string): Promise<CopilotUserProfile> {
    return fetchJson<CopilotUserProfile>(`${BASE}/copilot/memory/suggestions/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
      headers: authHeaders(displayName),
    });
  },

  ignoreMemorySuggestion(id: string, displayName: string): Promise<CopilotMemorySuggestion> {
    return fetchJson<CopilotMemorySuggestion>(`${BASE}/copilot/memory/suggestions/${encodeURIComponent(id)}/ignore`, {
      method: 'POST',
      headers: authHeaders(displayName),
    });
  },

  deleteUserPreference(id: string, displayName: string): Promise<{ ok: true }> {
    return fetchJson<{ ok: true }>(`${BASE}/copilot/memory/preferences/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },

  exportMemory(displayName: string): Promise<CopilotMemoryState> {
    return fetchJson<CopilotMemoryState>(`${BASE}/copilot/memory/export`, {
      headers: authHeaders(displayName),
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
   * propagates the disconnect to the selected upstream provider.
   */
  streamChat(req: CopilotStreamRequest, cb: CopilotStreamCallbacks): () => void {
    const abort = new AbortController();
    const startedAt = nowMs();
    const clientTimings: Record<string, number> = {};
    let requestId: string | undefined;
    const mark = (phase: string, details?: Record<string, string | number | boolean | null>) => {
      const elapsedMs = roundMs(nowMs() - startedAt);
      clientTimings[phase] = elapsedMs;
      cb.onTiming?.({ phase, elapsedMs, requestId, details });
    };

    mark('requestStart', {
      messageCount: req.messages.length,
      attachedContextChars: req.attachedContext?.length ?? 0,
      attachmentCount: req.messages.reduce((total, message) => total + (message.imageAttachments?.length ?? 0), 0),
    });

    void (async () => {
      try {
        const res = await fetch(`${BASE}/copilot/chat`, {
          method: 'POST',
          headers: authHeadersJson(req.displayName),
          body: JSON.stringify(req),
          signal: abort.signal,
        });
        requestId = res.headers.get('x-request-id') ?? undefined;
        if (requestId) cb.onRequestId?.(requestId);
        mark('responseHeaders', { status: res.status });
        if (!res.ok || !res.body) {
          let bodyText = '';
          try {
            bodyText = await res.text();
          } catch {
            /* best-effort */
          }
          cb.onError(normalizeCopilotStreamError(res.status, bodyText), requestId);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        let saw = false;
        let sawFrame = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const normalised = buf.replace(/\r\n/g, '\n');
          const parts = normalised.split('\n\n');
          buf = parts.pop() ?? '';
          for (const frame of parts) {
            if (!sawFrame) {
              sawFrame = true;
              mark('firstSseFrame');
            }
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              try {
                const parsed = JSON.parse(payload) as CopilotStreamDonePayload & { error?: string; delta?: string; done?: boolean };
                if (typeof parsed.error === 'string') {
                  mark('streamError');
                  cb.onError(parsed.error, parsed.requestId ?? requestId);
                  return;
                }
                if (parsed.done === true) {
                  mark('networkDone');
                  cb.onSnapshot?.({
                    requestId: parsed.requestId ?? requestId,
                    client: { ...clientTimings },
                    server: parsed.timings,
                    provider: parsed.providerTimings,
                  });
                  cb.onDone(parsed);
                  return;
                }
                if (typeof parsed.delta === 'string') {
                  if (!saw) mark('firstDelta', { deltaChars: parsed.delta.length });
                  saw = true;
                  cb.onDelta(parsed.delta);
                }
              } catch {
                // Non-JSON SSE comments or upstream noise — skip.
              }
            }
          }
        }
        if (saw) {
          mark('networkDone');
          cb.onSnapshot?.({ requestId, client: { ...clientTimings } });
          cb.onDone({ requestId });
        } else cb.onError('Empty response from AI provider', requestId);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        cb.onError(normalizeCopilotFetchError(err), requestId);
      }
    })();
    return () => abort.abort();
  },
};
