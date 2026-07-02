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
const COPILOT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

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
  const [selectedModel, setSelectedModelState] = useState<CopilotModelId>(() => readSelectedModel() ?? '');
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
        const nextModels = normalizeHealthModels(nextHealth);
        const nextModel = chooseSelectedModel(nextModels, nextHealth.defaultModel, readSelectedModel());
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
  const providers = useMemo(
    () => health?.providers?.filter(isUserVisibleProvider).map(withProviderModelId) ?? [],
    [health],
  );
  const selectedModelHealth = useMemo(
    () => models.find((item) => item.model === selectedModel) ?? null,
    [models, selectedModel],
  );
  const selectedProvider = selectedModelHealth?.provider.provider ?? '';
  const providerHealth = selectedModelHealth?.provider
    ?? (healthFailed ? fallbackProviderHealth(selectedModel || 'unavailable', unavailableMessage) : null);

  const setSelectedModel = useCallback((model: CopilotModelId) => {
    saveSelectedModel(model);
    setSelectedModelState(model);
  }, []);

  const selection = useMemo(
    () => selectedModel && selectedProvider ? { model: selectedModel, provider: selectedProvider } : {},
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
    if (!selectedModel || !selectedProvider) return null;
    const requiresApiKey = selectedModelHealth?.requiresApiKey !== false && providerHealth?.requiresApiKey !== false;
    const apiKey = await keyConfig.resolveKey();
    if (requiresApiKey && !apiKey) return null;
    return {
      apiKey: apiKey ?? '',
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

export function providerLabel(provider: Pick<CopilotProviderHealth, 'provider' | 'statusLabel' | 'label'> | null): string {
  return provider?.statusLabel || provider?.label || humanizeId(provider?.provider ?? 'AI');
}

export function providerDefaultModel(provider: CopilotProviderHealth | CopilotProviderId | null): string {
  if (!provider) return 'ai-model';
  if (typeof provider === 'string') return humanizeId(provider);
  return provider.model || provider.defaultModelName || provider.statusLabel || provider.label || humanizeId(provider.provider);
}

export function providerDocsUrl(provider: CopilotProviderHealth | null, model: CopilotModelHealth | null): string | null {
  return provider?.docsUrl ?? model?.providers.find((item) => item.docsUrl)?.docsUrl ?? null;
}

function normalizeHealthModels(health: CopilotHealth): CopilotModelHealth[] {
  const rawModels = health.models?.length
    ? health.models
    : [legacyModelFromProvider(withProviderModelId(health.provider), health.providers ?? [])];
  return rawModels
    .map<CopilotModelHealth | null>((model) => {
      const providers = (model.providers?.length ? model.providers : [model.provider])
        .filter(isUserVisibleProvider)
        .map(withProviderModelId);
      const provider = providers.find((item) => item.provider === model.defaultProvider) ?? providers[0];
      if (!provider) return null;
      return {
        ...model,
        ...((model.label ?? provider.label) ? { label: model.label ?? provider.label } : {}),
        provider,
        providers,
        defaultProvider: provider.provider,
        available: provider.available,
        requiresApiKey: provider.requiresApiKey,
        ...(provider.visibility ? { visibility: provider.visibility } : {}),
        ...(provider.message ? { message: provider.message } : {}),
      };
    })
    .filter((model): model is CopilotModelHealth => Boolean(model));
}

function legacyModelFromProvider(provider: CopilotProviderHealth, providers: CopilotProviderHealth[]): CopilotModelHealth {
  const modelProviders = providers.length ? providers.map(withProviderModelId).filter((item) => item.modelId === provider.modelId) : [provider];
  return {
    model: provider.modelId,
    ...(provider.label ? { label: provider.label } : {}),
    provider,
    providers: modelProviders,
    defaultProvider: provider.provider,
    available: provider.available,
    requiresApiKey: provider.requiresApiKey,
    ...(provider.visibility ? { visibility: provider.visibility } : {}),
    ...(provider.message ? { message: provider.message } : {}),
  };
}

function withProviderModelId(provider: CopilotProviderHealth): CopilotProviderHealth {
  return {
    ...provider,
    modelId: provider.modelId || modelFromLegacyProvider(provider.provider) || provider.provider,
  };
}

function isUserVisibleProvider(provider: CopilotProviderHealth): boolean {
  return provider.visibility !== 'internal-test';
}

function chooseSelectedModel(
  models: CopilotModelHealth[],
  defaultModel: CopilotModelId | undefined,
  preferred: CopilotModelId | null,
): CopilotModelId {
  if (preferred && models.some((item) => item.model === preferred)) return preferred;
  if (defaultModel && models.some((item) => item.model === defaultModel)) return defaultModel;
  return models[0]?.model ?? '';
}

function fallbackProviderHealth(model: CopilotModelId, message: string): CopilotProviderHealth {
  return {
    provider: model ? `${model}-unavailable` : 'unavailable',
    modelId: model,
    label: humanizeId(model || 'AI'),
    statusLabel: humanizeId(model || 'AI'),
    available: false,
    requiresApiKey: true,
    storesKeyServerSide: false,
    message,
  };
}

function readSelectedModel(): CopilotModelId | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
  if (isCopilotId(raw)) return raw;
  const legacyProvider = sessionStorage.getItem(LEGACY_SELECTED_PROVIDER_STORAGE_KEY);
  return legacyProvider ? modelFromLegacyProvider(legacyProvider) : null;
}

function saveSelectedModel(model: CopilotModelId) {
  try {
    if (model) sessionStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
  } catch {
    /* best-effort */
  }
}

function modelFromLegacyProvider(provider: CopilotProviderId): CopilotModelId | null {
  if (provider === 'deepseek-http') return 'deepseek';
  if (provider === 'minimax-http') return 'minimax';
  if (provider === 'kimi-cli' || provider === 'kimi-http') return 'kimi';
  return null;
}

function isCopilotId(input: string | null): input is CopilotModelId {
  return Boolean(input && COPILOT_ID_PATTERN.test(input));
}

function humanizeId(id: string): string {
  return id
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'AI';
}

export const __modelRouterTest = {
  chooseSelectedModel,
  normalizeHealthModels,
  providerDefaultModel,
  providerLabel,
};
