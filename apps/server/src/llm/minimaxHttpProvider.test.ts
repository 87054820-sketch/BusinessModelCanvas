import { describe, expect, it } from 'vitest';
import { MiniMaxHttpProvider, resolveMiniMaxHttpDefaults } from './minimaxHttpProvider';

describe('resolveMiniMaxHttpDefaults', () => {
  it('uses the OpenAI-compatible MiniMax M3 endpoint by default', () => {
    expect(resolveMiniMaxHttpDefaults({} as NodeJS.ProcessEnv)).toMatchObject({
      baseUrl: 'https://api.minimax.io/v1',
      model: 'MiniMax-M3',
      requestTimeoutMs: 120_000,
    });
  });

  it('allows deployment env overrides', () => {
    expect(
      resolveMiniMaxHttpDefaults({
        PINGARDEN_MINIMAX_BASE_URL: 'https://gateway.example.test/v1',
        PINGARDEN_MINIMAX_MODEL: 'MiniMax-M2.7-highspeed',
        PINGARDEN_MINIMAX_TIMEOUT_MS: '90000',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      baseUrl: 'https://gateway.example.test/v1',
      model: 'MiniMax-M2.7-highspeed',
      requestTimeoutMs: 90_000,
    });
  });
});

describe('MiniMaxHttpProvider', () => {
  it('reports MiniMax model/provider health metadata', async () => {
    const provider = new MiniMaxHttpProvider({ baseUrl: 'https://example.test/v1', model: 'MiniMax-M3' });

    await expect(provider.health()).resolves.toMatchObject({
      provider: 'minimax-http',
      modelId: 'minimax',
      available: true,
      model: 'MiniMax-M3',
      requiresApiKey: true,
    });
  });
});
