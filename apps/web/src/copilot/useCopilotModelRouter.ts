import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  copilotApi,
  type CopilotHealth,
  type CopilotModelHealth,
  type CopilotModelId,
  type CopilotProviderHealth,
  type CopilotProviderId,
} from '../api/copilot';
import { useKeyConfig, type CopilotKeyConfig } from './useKeyConfig';

const SELECTED_MODEL_STORAGE_KEY = 'pingarden.copilot.selectedModel';
const LEGACY_SELECTED_PROVIDER_STORAGE_KEY = 'pingarden.copilot.selectedProvider';

export interface CopilotChatSelection {
  apiKey: string;
  model: CopilotModelId;
  provider: CopilotProviderId;
  providerHealth: CopilotProviderHealth | null;
  modelHealth: CopilotModelHealth | null;
}

export interface CopilotModelRouter {
  selectedModel: CopilotModelId;
  selectedProvider: CopilotProviderId;
  selectedModelHealth: CopilotModelHealth | null;
  providerHealth: CopilotProviderHealth | null;
  models: CopilotModelHealth[];
  providers: CopilotProviderHealth[];
  keyConfig: CopilotKeyConfig;
  setSelectedModel(model: CopilotModelId): void;
  testKey(apiKey: string): Promise<{ ok: boolean; message?: string }>;
  clearKey(): Promise<void>;
  resolveChatSelection(): Promise<CopilotChatSelection | null>;
}

export function useCopilotModelRouter(enabled: boolean, unavailableMessage: string): CopilotModelRouter {
  const [selectedModel, setSelectedModelState] = useState<CopilotModelId>(() => readSelectedModel() ?? 'kimi');
  const [health, setHealth] = useState<CopilotHealth | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const keyConfig = useKeyConfig(selectedModel);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    copilotApi
      .getHealth()
      .then((nextHealth) => {
        if (cancelled) return;
        const models = normalizeHealthModels(nextHealth);
        const preferred = readSelectedModel();
        const nextModel = preferred && models.some((item) => item.model === preferred)
          ? preferred
          : nextHealth.defaultModel ?? modelFromProvider(nextHealth.provider.provider);
        setHealth(nextHealth);
        setHealthFailed(false);
        setSelectedModelState(nextModel);
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null);
          setHealthFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const models = useMemo(() => health ? normalizeHealthModels(health) : [], [health]);
  const providers = useMemo(() => health?.providers ?? [], [health]);
  const selectedModelHealth = useMemo(
    () => models.find((item) => item.model === selectedModel) ?? null,
    [models, selectedModel],
  );
  const selectedProvider = selectedModelHealth?.provider.provider ?? defaultProviderForModel(selectedModel, health);
  const providerHealth = selectedModelHealth?.provider
    ?? (healthFailed ? fallbackProviderHealth(selectedModel, unavailableMessage) : null);

  const setSelectedModel = useCallback((model: CopilotModelId) => {
    saveSelectedModel(model);
    setSelectedModelState(model);
  }, []);

  const selection = useMemo(
    () => ({ model: selectedModel, provider: selectedProvider }),
    [selectedModel, selectedProvider],
  );

  const testKey = useCallback(
    (apiKey: string) => copilotApi.testKey(apiKey, selection),
    [selection],
  );

  const clearKey = useCallback(async () => {
    keyConfig.remove();
    await copilotApi.clearKey(selection).catch(() => { /* best-effort */ });
  }, [keyConfig, selection]);

  const resolveChatSelection = useCallback(async (): Promise<CopilotChatSelection | null> => {
    const apiKey = await keyConfig.resolveKey();
    if (!apiKey) return null;
    return {
      apiKey,
      model: selectedModel,
      provider: selectedProvider,
      providerHealth,
      modelHealth: selectedModelHealth,
    };
  }, [keyConfig, providerHealth, selectedModel, selectedModelHealth, selectedProvider]);

  return {
    selectedModel,
    selectedProvider,
    selectedModelHealth,
    providerHealth,
    models,
    providers,
    keyConfig,
    setSelectedModel,
    testKey,
    clearKey,
    resolveChatSelection,
  };
}

export function providerLabel(provider: Pick<CopilotProviderHealth, 'provider'> | null): string {
  if (provider?.provider === 'deepseek-http') return 'DeepSeek API';
  if (provider?.provider === 'kimi-http') return 'Kimi API';
  return 'Kimi Code';
}

export function providerDefaultModel(provider: CopilotProviderId): string {
  if (provider === 'deepseek-http') return 'deepseek-chat';
  return 'kimi-for-coding';
}

export function titleKeyForModelProvider(model: CopilotModelId, provider: CopilotProviderId): string {
  if (model === 'deepseek') return 'library.copilot.providers.deepseek.title';
  if (provider === 'kimi-http') return 'library.copilot.providers.kimi.httpTitle';
  return 'library.copilot.providers.kimi.cliTitle';
}

export function introKeyForModelProvider(model: CopilotModelId, provider: CopilotProviderId): string {
  if (model === 'deepseek') return 'library.copilot.providers.deepseek.intro';
  if (provider === 'kimi-http') return 'library.copilot.providers.kimi.httpIntro';
  return 'library.copilot.providers.kimi.cliIntro';
}

export function getKeyLinkForModel(model: CopilotModelId): { href: string; labelKey: string } {
  if (model === 'deepseek') {
    return {
      href: 'https://platform.deepseek.com/api_keys',
      labelKey: 'library.copilot.providers.deepseek.getKey',
    };
  }
  return {
    href: 'https://www.kimi.com/code/console',
    labelKey: 'library.copilot.providers.kimi.getKey',
  };
}

function normalizeHealthModels(health: CopilotHealth): CopilotModelHealth[] {
  if (health.models?.length) return health.models;
  const provider = withProviderModelId(health.provider);
  return [{
    model: provider.modelId,
    provider,
    providers: health.providers?.length ? health.providers.map(withProviderModelId) : [provider],
    defaultProvider: provider.provider,
    available: provider.available,
    requiresApiKey: provider.requiresApiKey,
    ...(provider.message ? { message: provider.message } : {}),
  }];
}

function withProviderModelId(provider: CopilotProviderHealth): CopilotProviderHealth {
  return {
    ...provider,
    modelId: provider.modelId ?? modelFromProvider(provider.provider),
  };
}

function defaultProviderForModel(model: CopilotModelId, health: CopilotHealth | null): CopilotProviderId {
  const modelHealth = health ? normalizeHealthModels(health).find((item) => item.model === model) : null;
  if (modelHealth) return modelHealth.provider.provider;
  if (model === 'deepseek') return 'deepseek-http';
  return health?.defaultProvider === 'kimi-http' ? 'kimi-http' : 'kimi-cli';
}

function fallbackProviderHealth(model: CopilotModelId, message: string): CopilotProviderHealth {
  const provider = model === 'deepseek' ? 'deepseek-http' : 'kimi-cli';
  return {
    provider,
    modelId: model,
    available: false,
    requiresApiKey: true,
    storesKeyServerSide: false,
    message,
  };
}

function readSelectedModel(): CopilotModelId | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  if (isCopilotModel(raw)) return raw;
  const legacyProvider = sessionStorage.getItem(LEGACY_SELECTED_PROVIDER_STORAGE_KEY);
  return isCopilotProvider(legacyProvider) ? modelFromProvider(legacyProvider) : null;
}

function saveSelectedModel(model: CopilotModelId) {
  try {
    sessionStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
  } catch {
    /* best-effort */
  }
}

function modelFromProvider(provider: CopilotProviderId): CopilotModelId {
  return provider === 'deepseek-http' ? 'deepseek' : 'kimi';
}

function isCopilotModel(input: string | null): input is CopilotModelId {
  return input === 'kimi' || input === 'deepseek';
}

function isCopilotProvider(input: string | null): input is CopilotProviderId {
  return input === 'kimi-cli' || input === 'kimi-http' || input === 'deepseek-http';
}
