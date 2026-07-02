import { describe, expect, it } from 'vitest';
import { createCopilotAiRouter } from './copilotAiRouter.js';
import { FixtureAiProvider } from './fixtureAiProvider.js';

describe('CopilotAiRouter catalog', () => {
  it('hides internal-test providers from default health', async () => {
    const router = createCopilotAiRouter('kimi-cli', {
      includeInternalProviders: true,
      enableAgentBridge: true,
    });

    const health = await router.health();
    expect(health.providers.map((item) => item.provider)).toEqual(['kimi-cli', 'kimi-http', 'deepseek-http', 'minimax-http']);
    expect(health.models.map((item) => item.model)).toEqual(['kimi', 'deepseek', 'minimax']);
  });

  it('can expose internal-test providers for test harnesses', async () => {
    const router = createCopilotAiRouter('kimi-cli', {
      includeInternalProviders: true,
      enableAgentBridge: true,
    });

    const health = await router.health({ includeInternal: true });
    expect(health.providers.map((item) => item.provider)).toContain('fixture-ai');
    expect(health.providers.map((item) => item.provider)).toContain('agent-bridge-ai');
  });

  it('requires an explicit internal access flag to resolve internal providers', () => {
    const router = createCopilotAiRouter('kimi-cli', { includeInternalProviders: true });

    expect(() => router.resolve({ provider: 'fixture-ai' })).toThrow(/internal-test only/);
    expect(router.resolve({ provider: 'fixture-ai' }, { allowInternal: true }).descriptor.requiresApiKey).toBe(false);
  });

  it('rejects providers that do not belong to the requested model', () => {
    const router = createCopilotAiRouter('kimi-cli');

    expect(() => router.resolve({ model: 'kimi', provider: 'deepseek-http' })).toThrow(/does not belong/);
    expect(() => router.resolve({ model: 'minimax', provider: 'deepseek-http' })).toThrow(/does not belong/);
  });

  it('resolves MiniMax as a user-visible model/provider', () => {
    const router = createCopilotAiRouter('minimax-http');

    const selection = router.resolve({ model: 'minimax' });

    expect(selection.model).toBe('minimax');
    expect(selection.providerId).toBe('minimax-http');
    expect(selection.descriptor.defaultModelName).toBe('MiniMax-M3');
  });
});

describe('FixtureAiProvider', () => {
  it('streams deterministic structured text without an API key', async () => {
    const provider = new FixtureAiProvider();
    let text = '';
    for await (const chunk of provider.streamChat({
      apiKey: '',
      systemPromptText: 'system',
      conversation: [],
      latestUserMsg: 'ping',
    })) {
      if ('delta' in chunk) text += chunk.delta;
    }
    expect(text).toContain('pingarden.response.v1');
  });
});
