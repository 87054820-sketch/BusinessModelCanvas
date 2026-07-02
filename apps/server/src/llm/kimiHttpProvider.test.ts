import { afterEach, describe, expect, it, vi } from 'vitest';
import { KimiHttpProvider, resolveKimiHttpDefaults } from './kimiHttpProvider';

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});

describe('resolveKimiHttpDefaults', () => {
  it('uses Kimi K2.7 Code highspeed by default', () => {
    expect(resolveKimiHttpDefaults({} as NodeJS.ProcessEnv)).toMatchObject({
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'kimi-k2.7-code-highspeed',
      promptCache: false,
    });
  });

  it('can still opt back into the legacy Kimi Code API preset', () => {
    expect(
      resolveKimiHttpDefaults({
        PINGARDEN_KIMI_HTTP_PRESET: 'legacy-code',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      baseUrl: 'https://api.kimi.com/coding/v1',
      model: 'kimi-for-coding',
    });
  });

  it('parses speed-related highspeed options', () => {
    expect(
      resolveKimiHttpDefaults({
        PINGARDEN_KIMI_HTTP_MAX_COMPLETION_TOKENS: '1536',
        PINGARDEN_KIMI_HTTP_PROMPT_CACHE: '1',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'kimi-k2.7-code-highspeed',
      maxCompletionTokens: 1536,
      promptCache: true,
    });
  });

  it('lets explicit base URL and model override presets', () => {
    expect(
      resolveKimiHttpDefaults({
        PINGARDEN_KIMI_HTTP_PRESET: 'legacy-code',
        PINGARDEN_KIMI_HTTP_BASE_URL: 'https://example.test/v1/',
        PINGARDEN_KIMI_HTTP_MODEL: 'custom-kimi',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      baseUrl: 'https://example.test/v1',
      model: 'custom-kimi',
    });
  });
});

describe('KimiHttpProvider', () => {
  it('sends speed-related request options when configured', async () => {
    let requestUrl = '';
    let authorization = '';
    let requestBody: Record<string, unknown> | undefined;
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(url);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        'data: {"choices":[{"delta":{"content":"pong"}}]}\n\n'
          + 'data: [DONE]\n\n',
        {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        },
      );
    }));

    const provider = new KimiHttpProvider({
      baseUrl: 'https://example.test/v1',
      model: 'kimi-test',
      maxCompletionTokens: 256,
      promptCache: true,
      promptCacheKey: 'pingarden:test-session',
    });

    let output = '';
    for await (const chunk of provider.streamChat({
      apiKey: 'sk-test',
      systemPromptText: 'system context',
      conversation: [],
      latestUserMsg: 'ping',
    })) {
      if ('delta' in chunk) output += chunk.delta;
    }

    expect(output).toBe('pong');
    expect(requestUrl).toBe('https://example.test/v1/chat/completions');
    expect(authorization).toBe('Bearer sk-test');
    expect(requestBody).toMatchObject({
      model: 'kimi-test',
      stream: true,
      max_completion_tokens: 256,
      prompt_cache_key: 'pingarden:test-session',
    });
    expect(requestBody?.messages).toEqual([
      { role: 'system', content: 'system context' },
      { role: 'user', content: 'ping' },
    ]);
  });

  it('accepts pasted Authorization header values without double-prefixing Bearer', async () => {
    let authorization = '';
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(
        'data: {"choices":[{"delta":{"content":"pong"}}]}\n\n'
          + 'data: [DONE]\n\n',
        {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        },
      );
    }));

    const provider = new KimiHttpProvider({
      baseUrl: 'https://example.test/v1',
      model: 'model-test',
    });

    for await (const _chunk of provider.streamChat({
      apiKey: 'Authorization: Bearer sk-pasted',
      systemPromptText: 'system',
      conversation: [],
      latestUserMsg: 'ping',
    })) {
      // drain stream
    }

    expect(authorization).toBe('Bearer sk-pasted');
  });
});
