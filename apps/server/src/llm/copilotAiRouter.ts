import type {
  CopilotAiModelHealth,
  CopilotAiProvider,
  CopilotAiProviderHealth,
  CopilotAiProviderKind,
  CopilotModelId,
} from './aiProvider.js';
import {
  buildCopilotAiCatalog,
  type CopilotAiProviderDescriptor,
  type CopilotAiProviderRegistration,
} from './copilotAiCatalog.js';

export const COPILOT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

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
  descriptor: CopilotAiProviderDescriptor;
  provider: CopilotAiProvider;
}

interface CopilotModelProfile {
  model: CopilotModelId;
  providers: CopilotAiProviderKind[];
  defaultProvider: CopilotAiProviderKind;
}

export interface CopilotAiRouterOptions {
  includeInternalProviders?: boolean;
  enableAgentBridge?: boolean;
}

export interface CopilotAiResolveOptions {
  allowInternal?: boolean;
}

export interface CopilotAiHealthOptions {
  includeInternal?: boolean;
}

export class CopilotAiSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CopilotAiSelectionError';
  }
}

export class CopilotAiRouter {
  private readonly registrations: Map<CopilotAiProviderKind, CopilotAiProviderRegistration>;
  private readonly profiles: Map<CopilotModelId, CopilotModelProfile>;
  private readonly defaultProvider: CopilotAiProviderKind;
  private readonly defaultModel: CopilotModelId;

  constructor(defaultProvider: CopilotAiProviderKind, options: CopilotAiRouterOptions = {}) {
    const registrations = buildCopilotAiCatalog(options);
    this.registrations = new Map(registrations.map((entry) => [entry.descriptor.providerId, entry]));
    this.profiles = buildProfiles(registrations, defaultProvider);
    const fallbackProvider = firstUserProvider(registrations) ?? registrations[0]?.descriptor.providerId;
    this.defaultProvider = this.registrations.has(defaultProvider)
      ? defaultProvider
      : fallbackProvider ?? 'kimi-cli';
    this.defaultModel = this.registrations.get(this.defaultProvider)?.descriptor.modelId ?? 'kimi';
  }

  resolve(input: CopilotAiSelectionInput = {}, options: CopilotAiResolveOptions = {}): CopilotAiSelection {
    const model = input.model ?? (input.provider ? this.modelForProvider(input.provider) : this.defaultModel);
    const profile = this.profiles.get(model);
    if (!profile) throw new CopilotAiSelectionError(`Unknown AI model: ${model}`);

    const providerId = input.provider ?? profile.defaultProvider;
    if (!profile.providers.includes(providerId)) {
      throw new CopilotAiSelectionError(`Provider ${providerId} does not belong to model ${model}`);
    }

    const registration = this.registrations.get(providerId);
    if (!registration) throw new CopilotAiSelectionError(`Unknown AI provider: ${providerId}`);
    if (registration.descriptor.visibility === 'internal-test' && !options.allowInternal) {
      throw new CopilotAiSelectionError(`AI provider ${providerId} is internal-test only`);
    }
    return { model, providerId, descriptor: registration.descriptor, provider: registration.provider };
  }

  async health(options: CopilotAiHealthOptions = {}): Promise<CopilotAiRouterHealth> {
    const includeInternal = options.includeInternal === true;
    const allProviders = await Promise.all(
      [...this.registrations.values()].map((registration) => this.healthForRegistration(registration)),
    );
    const visibleProviders = allProviders.filter((provider) => includeInternal || provider.visibility !== 'internal-test');
    const byProvider = new Map(allProviders.map((item) => [item.provider, item]));
    const visibleProviderIds = new Set(visibleProviders.map((item) => item.provider));

    const models = [...this.profiles.values()]
      .map<CopilotAiModelHealth | null>((profile) => {
        const modelProviders = profile.providers
          .filter((provider) => visibleProviderIds.has(provider))
          .map((provider) => byProvider.get(provider))
          .filter((provider): provider is CopilotAiProviderHealth => Boolean(provider));
        if (!modelProviders.length) return null;
        const provider = modelProviders.find((item) => item.provider === profile.defaultProvider) ?? modelProviders[0]!;
        return {
          model: profile.model,
          label: provider.label,
          provider,
          providers: modelProviders,
          defaultProvider: provider.provider,
          available: provider.available,
          requiresApiKey: provider.requiresApiKey,
          visibility: provider.visibility,
          ...(provider.message ? { message: provider.message } : {}),
        };
      })
      .filter((model): model is CopilotAiModelHealth => Boolean(model));

    const provider = visibleProviders.find((item) => item.provider === this.defaultProvider) ?? visibleProviders[0] ?? allProviders[0]!;
    const kimiProvider = visibleProviders.find((item) => item.modelId === 'kimi') ?? allProviders.find((item) => item.modelId === 'kimi');
    return {
      defaultModel: provider.modelId,
      defaultProvider: provider.provider,
      models,
      providers: visibleProviders,
      provider,
      kimi: {
        available: kimiProvider?.available ?? false,
        ...(kimiProvider?.version ? { version: kimiProvider.version } : {}),
      },
    };
  }

  private modelForProvider(providerId: CopilotAiProviderKind): CopilotModelId {
    const registration = this.registrations.get(providerId);
    if (!registration) throw new CopilotAiSelectionError(`Unknown AI provider: ${providerId}`);
    return registration.descriptor.modelId;
  }

  private async healthForRegistration(registration: CopilotAiProviderRegistration): Promise<CopilotAiProviderHealth> {
    const health = await registration.provider.health();
    const descriptor = registration.descriptor;
    return {
      ...health,
      provider: descriptor.providerId,
      modelId: descriptor.modelId,
      label: descriptor.label,
      statusLabel: descriptor.statusLabel,
      visibility: descriptor.visibility,
      model: health.model ?? descriptor.defaultModelName,
      defaultModelName: descriptor.defaultModelName,
      requiresApiKey: descriptor.requiresApiKey,
      keyStorageScope: descriptor.keyStorageScope,
      supportsImages: descriptor.supportsImages,
      storesKeyServerSide: false,
      ...(descriptor.docsUrl ? { docsUrl: descriptor.docsUrl } : {}),
    };
  }
}

export function createCopilotAiRouter(
  defaultProvider: CopilotAiProviderKind,
  options: CopilotAiRouterOptions = {},
): CopilotAiRouter {
  return new CopilotAiRouter(defaultProvider, options);
}

function buildProfiles(
  registrations: CopilotAiProviderRegistration[],
  preferredDefaultProvider: CopilotAiProviderKind,
): Map<CopilotModelId, CopilotModelProfile> {
  const profiles = new Map<CopilotModelId, CopilotModelProfile>();
  for (const registration of registrations) {
    const descriptor = registration.descriptor;
    const existing = profiles.get(descriptor.modelId);
    if (!existing) {
      profiles.set(descriptor.modelId, {
        model: descriptor.modelId,
        providers: [descriptor.providerId],
        defaultProvider: descriptor.providerId,
      });
      continue;
    }
    existing.providers.push(descriptor.providerId);
    if (descriptor.defaultForModel) existing.defaultProvider = descriptor.providerId;
  }

  const preferred = registrations.find((entry) => entry.descriptor.providerId === preferredDefaultProvider)?.descriptor;
  if (preferred) {
    const profile = profiles.get(preferred.modelId);
    if (profile) profile.defaultProvider = preferred.providerId;
  }
  return profiles;
}

function firstUserProvider(registrations: CopilotAiProviderRegistration[]): CopilotAiProviderKind | null {
  return registrations.find((entry) => entry.descriptor.visibility === 'user')?.descriptor.providerId ?? null;
}
