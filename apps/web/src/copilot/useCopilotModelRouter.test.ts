import { describe, expect, it } from 'vitest';
import type { CopilotHealth } from '../api/copilot';
import { __modelRouterTest } from './useCopilotModelRouter';

describe('useCopilotModelRouter catalog helpers', () => {
  it('normalizes future user-visible models from health without hardcoded ids', () => {
    const health: CopilotHealth = {
      defaultModel: 'future-model',
      defaultProvider: 'future-http',
      provider: {
        provider: 'future-http',
        modelId: 'future-model',
        label: 'Future Model',
        statusLabel: 'Future API',
        visibility: 'user',
        available: true,
        requiresApiKey: true,
        storesKeyServerSide: false,
      },
      providers: [],
      models: [
        {
          model: 'future-model',
          label: 'Future Model',
          provider: {
            provider: 'future-http',
            modelId: 'future-model',
            label: 'Future Model',
            statusLabel: 'Future API',
            visibility: 'user',
            available: true,
            requiresApiKey: true,
            storesKeyServerSide: false,
          },
          providers: [],
          defaultProvider: 'future-http',
          available: true,
          requiresApiKey: true,
        },
      ],
      kimi: { available: false },
    };

    const models = __modelRouterTest.normalizeHealthModels(health);

    expect(models).toHaveLength(1);
    expect(models[0]?.model).toBe('future-model');
    expect(__modelRouterTest.chooseSelectedModel(models, health.defaultModel, null)).toBe('future-model');
    expect(__modelRouterTest.providerLabel(models[0]!.provider)).toBe('Future API');
  });

  it('filters internal-test providers from frontend model choices', () => {
    const health: CopilotHealth = {
      defaultModel: 'kimi',
      defaultProvider: 'kimi-cli',
      provider: {
        provider: 'kimi-cli',
        modelId: 'kimi',
        label: 'Kimi',
        statusLabel: 'Kimi Code',
        visibility: 'user',
        available: true,
        requiresApiKey: true,
        storesKeyServerSide: false,
      },
      providers: [],
      models: [
        {
          model: 'kimi',
          provider: {
            provider: 'kimi-cli',
            modelId: 'kimi',
            visibility: 'user',
            available: true,
            requiresApiKey: true,
            storesKeyServerSide: false,
          },
          providers: [
            {
              provider: 'kimi-cli',
              modelId: 'kimi',
              visibility: 'user',
              available: true,
              requiresApiKey: true,
              storesKeyServerSide: false,
            },
            {
              provider: 'fixture-ai',
              modelId: 'test-fixture',
              visibility: 'internal-test',
              available: true,
              requiresApiKey: false,
              storesKeyServerSide: false,
            },
          ],
          defaultProvider: 'kimi-cli',
          available: true,
          requiresApiKey: true,
        },
        {
          model: 'test-fixture',
          provider: {
            provider: 'fixture-ai',
            modelId: 'test-fixture',
            visibility: 'internal-test',
            available: true,
            requiresApiKey: false,
            storesKeyServerSide: false,
          },
          providers: [],
          defaultProvider: 'fixture-ai',
          available: true,
          requiresApiKey: false,
        },
      ],
      kimi: { available: true },
    };

    const models = __modelRouterTest.normalizeHealthModels(health);

    expect(models.map((item) => item.model)).toEqual(['kimi']);
    expect(models[0]?.providers.map((item) => item.provider)).toEqual(['kimi-cli']);
  });
});
