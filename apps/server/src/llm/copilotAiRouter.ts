import type {
  CopilotAiModelHealth,
  CopilotAiProvider,
  CopilotAiProviderHealth,
  CopilotAiProviderKind,
  CopilotModelId,
} from './aiProvider.js';
import { DeepSeekHttpProvider } from './deepSeekHttpProvider.js';
import { KimiCliProvider } from './kimiCliProvider.js';
import { KimiHttpProvider } from './kimiHttpProvider.js';

export const COPILOT_MODEL_VALUES = ['kimi', 'deepseek'] as const;
export const COPILOT_PROVIDER_VALUES = ['kimi-cli', 'kimi-http', 'deepseek-http'] as const;

export interface CopilotAiRouterHealth {
  defaultModel: CopilotModelId;
  defaultProvider: CopilotAiProviderKind;
  models: CopilotAiModelHealth[];
  providers: CopilotAiProviderHealth[];
  /** Legacy compatibility: active/default provider health. */
  provider: CopilotAiProviderHealth;
  /** Legacy compatibility for old renderer checks. */
  kimi: {
    available: boolean;
    version?: string;
  };
}

export interface CopilotAiSelectionInput {
  model?: CopilotModelId;
  provider?: CopilotAiProviderKind;
}

export interface CopilotAiSelection {
  model: CopilotModelId;
  providerId: CopilotAiProviderKind;
  provider: CopilotAiProvider;
}

interface CopilotModelProfile {
  model: CopilotModelId;
  providers: CopilotAiProviderKind[];
  defaultProvider: CopilotAiProviderKind;
}

export class CopilotAiSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CopilotAiSelectionError';
  }
}

export class CopilotAiRouter {
  private readonly providers: Map<CopilotAiProviderKind, CopilotAiProvider>;
  private readonly profiles: Map<CopilotModelId, CopilotModelProfile>;
  private readonly defaultProvider: CopilotAiProviderKind;
  private readonly defaultModel: CopilotModelId;

  constructor(defaultProvider: CopilotAiProviderKind) {
    const kimiDefaultProvider = defaultProvider === 'kimi-http' ? 'kimi-http' : 'kimi-cli';
    this.providers = new Map<CopilotAiProviderKind, CopilotAiProvider>([
      ['kimi-cli', new KimiCliProvider()],
      ['kimi-http', new KimiHttpProvider()],
      ['deepseek-http', new DeepSeekHttpProvider()],
    ]);
    this.profiles = new Map<CopilotModelId, CopilotModelProfile>([
      ['kimi', { model: 'kimi', providers: ['kimi-cli', 'kimi-http'], defaultProvider: kimiDefaultProvider }],
      ['deepseek', { model: 'deepseek', providers: ['deepseek-http'], defaultProvider: 'deepseek-http' }],
    ]);
    this.defaultProvider = this.providers.has(defaultProvider) ? defaultProvider : 'kimi-cli';
    this.defaultModel = modelForProvider(this.defaultProvider);
  }

  resolve(input: CopilotAiSelectionInput = {}): CopilotAiSelection {
    const model = input.model ?? (input.provider ? modelForProvider(input.provider) : this.defaultModel);
    const profile = this.profiles.get(model);
    if (!profile) throw new CopilotAiSelectionError(`Unknown AI model: ${model}`);

    const providerId = input.provider ?? profile.defaultProvider;
    if (!profile.providers.includes(providerId)) {
      throw new CopilotAiSelectionError(`Provider ${providerId} does not belong to model ${model}`);
    }

    const provider = this.providers.get(providerId);
    if (!provider) throw new CopilotAiSelectionError(`Unknown AI provider: ${providerId}`);
    return { model, providerId, provider };
  }

  async health(): Promise<CopilotAiRouterHealth> {
    const providers = await Promise.all([...this.providers.values()].map((provider) => provider.health()));
    const byProvider = new Map(providers.map((item) => [item.provider, item]));
    const models = [...this.profiles.values()].map<CopilotAiModelHealth>((profile) => {
      const modelProviders = profile.providers
        .map((provider) => byProvider.get(provider))
        .filter((provider): provider is CopilotAiProviderHealth => Boolean(provider));
      const provider = byProvider.get(profile.defaultProvider) ?? modelProviders[0]!;
      return {
        model: profile.model,
        provider,
        providers: modelProviders,
        defaultProvider: profile.defaultProvider,
        available: provider.available,
        requiresApiKey: provider.requiresApiKey,
        ...(provider.message ? { message: provider.message } : {}),
      };
    });

    const provider = byProvider.get(this.defaultProvider) ?? providers[0]!;
    const kimiProvider = byProvider.get(this.profiles.get('kimi')!.defaultProvider)
      ?? byProvider.get('kimi-cli')
      ?? byProvider.get('kimi-http');
    return {
      defaultModel: this.defaultModel,
      defaultProvider: this.defaultProvider,
      models,
      providers,
      provider,
      kimi: {
        available: kimiProvider?.available ?? false,
        ...(kimiProvider?.version ? { version: kimiProvider.version } : {}),
      },
    };
  }
}

export function createCopilotAiRouter(defaultProvider: CopilotAiProviderKind): CopilotAiRouter {
  return new CopilotAiRouter(defaultProvider);
}

function modelForProvider(provider: CopilotAiProviderKind): CopilotModelId {
  return provider === 'deepseek-http' ? 'deepseek' : 'kimi';
}
