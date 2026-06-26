import type {
  CopilotAiChatMessage,
  CopilotAiProvider,
  CopilotAiProviderHealth,
  CopilotAiStreamInput,
  CopilotAiStreamChunk,
} from './aiProvider.js';

const DEFAULT_BASE_URL = 'https://api.kimi.com/coding/v1';
const DEFAULT_MODEL = 'kimi-for-coding';
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

interface KimiHttpProviderOptions {
  baseUrl?: string;
  model?: string;
}

export class KimiHttpProvider implements CopilotAiProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(options: KimiHttpProviderOptions = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? process.env.PINGARDEN_KIMI_HTTP_BASE_URL ?? DEFAULT_BASE_URL);
    this.model = options.model ?? process.env.PINGARDEN_KIMI_HTTP_MODEL ?? DEFAULT_MODEL;
    this.requestTimeoutMs = parsePositiveInt(process.env.PINGARDEN_KIMI_HTTP_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);
  }

  async health(): Promise<CopilotAiProviderHealth> {
    return {
      provider: 'kimi-http',
      available: true,
      model: this.model,
      requiresApiKey: true,
      storesKeyServerSide: false,
    };
  }

  async testKey(apiKey: string): Promise<{ ok: boolean; message?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      for await (const chunk of this.streamChat({
        apiKey,
        systemPromptText: 'Reply with exactly the word "pong".',
        conversation: [],
        latestUserMsg: 'ping',
        signal: controller.signal,
      })) {
        if ('error' in chunk) return { ok: false, message: chunk.error };
        if (chunk.delta) return { ok: true };
      }
      return { ok: false, message: 'Empty response from Kimi API' };
    } finally {
      clearTimeout(timer);
    }
  }

  async clearKey(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async *streamChat(input: CopilotAiStreamInput): AsyncGenerator<CopilotAiStreamChunk, void, void> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    if (input.signal?.aborted) controller.abort();
    else input.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: buildMessages(input.systemPromptText, input.conversation, input.latestUserMsg),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        yield { error: await responseError(res, input.apiKey) };
        return;
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream')) {
        yield* parseNonStreamingResponse(res, input.apiKey);
        return;
      }

      yield* parseSseResponse(res, input.apiKey);
    } catch (err) {
      yield { error: normalizeHttpError(err, input.apiKey) };
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener('abort', onAbort);
    }
  }
}

function buildMessages(systemPromptText: string, conversation: CopilotAiChatMessage[], latestUserMsg: string) {
  return [
    { role: 'system' as const, content: systemPromptText.trim() },
    ...conversation.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: 'user' as const, content: latestUserMsg },
  ];
}

async function* parseSseResponse(res: Response, apiKey: string): AsyncGenerator<CopilotAiStreamChunk, void, void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const normalised = buf.replace(/\r\n/g, '\n');
      const frames = normalised.split('\n\n');
      buf = frames.pop() ?? '';
      for (const frame of frames) {
        const chunk = parseSseFrame(frame, apiKey);
        if (!chunk) continue;
        if ('done' in chunk) return;
        yield chunk;
      }
    }
    if (buf.trim()) {
      const chunk = parseSseFrame(buf, apiKey);
      if (chunk && !('done' in chunk)) yield chunk;
    }
  } catch (err) {
    yield { error: normalizeHttpError(err, apiKey) };
  }
}

function parseSseFrame(frame: string, apiKey: string): CopilotAiStreamChunk | { done: true } | null {
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    if (payload === '[DONE]') return { done: true };
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const error = extractUpstreamError(parsed);
      if (error) return { error: redact(error, apiKey) };
      const delta = extractOpenAiDelta(parsed);
      if (delta) return { delta };
    } catch {
      continue;
    }
  }
  return null;
}

async function* parseNonStreamingResponse(res: Response, apiKey: string): AsyncGenerator<CopilotAiStreamChunk, void, void> {
  try {
    const parsed = await res.json() as Record<string, unknown>;
    const error = extractUpstreamError(parsed);
    if (error) {
      yield { error: redact(error, apiKey) };
      return;
    }
    const text = extractOpenAiMessage(parsed);
    if (text) yield { delta: text };
    else yield { error: 'Empty response from Kimi API' };
  } catch (err) {
    yield { error: normalizeHttpError(err, apiKey) };
  }
}

function extractOpenAiDelta(parsed: Record<string, unknown>): string | undefined {
  const choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0] as Record<string, unknown> | undefined;
  const delta = first?.delta as Record<string, unknown> | undefined;
  if (typeof delta?.content === 'string') return delta.content;
  const message = first?.message as Record<string, unknown> | undefined;
  if (typeof message?.content === 'string') return message.content;
  return undefined;
}

function extractOpenAiMessage(parsed: Record<string, unknown>): string | undefined {
  const choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  return typeof message?.content === 'string' ? message.content : undefined;
}

function extractUpstreamError(parsed: Record<string, unknown>): string | undefined {
  const error = parsed.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const item = error as Record<string, unknown>;
    if (typeof item.message === 'string') return item.message;
    return JSON.stringify(item).slice(0, 400);
  }
  if (typeof parsed.message === 'string' && parsed.type === 'error') return parsed.message;
  return undefined;
}

async function responseError(res: Response, apiKey: string): Promise<string> {
  let body = '';
  try {
    body = (await res.text()).slice(0, 800);
  } catch {
    body = '';
  }
  const message = body || `Kimi API request failed with HTTP ${res.status}`;
  return redact(message, apiKey);
}

function normalizeHttpError(err: unknown, apiKey: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Kimi API request timed out. Please retry or reduce the attached context.';
  }
  if (err instanceof Error) return redact(err.message, apiKey);
  return redact(String(err), apiKey);
}

function redact(message: string, apiKey: string): string {
  let output = message;
  if (apiKey) output = output.split(apiKey).join('[redacted]');
  output = output.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, 'Bearer [redacted]');
  output = output.replace(/sk-[A-Za-z0-9._\-]+/g, 'sk-[redacted]');
  return output.slice(0, 400);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '');
}
