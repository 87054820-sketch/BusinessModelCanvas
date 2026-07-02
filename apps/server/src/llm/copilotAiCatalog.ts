import type {
  CopilotAiKeyStorageScope,
  CopilotAiProvider,
  CopilotAiProviderKind,
  CopilotAiProviderVisibility,
  CopilotModelId,
} from './aiProvider.js';
import { AgentBridgeProvider } from './agentBridgeProvider.js';
import { DeepSeekHttpProvider } from './deepSeekHttpProvider.js';
import { FixtureAiProvider } from './fixtureAiProvider.js';
import { KimiCliProvider } from './kimiCliProvider.js';
import { KimiHttpProvider, resolveKimiHttpDefaults } from './kimiHttpProvider.js';
import { MiniMaxHttpProvider, resolveMiniMaxHttpDefaults } from './minimaxHttpProvider.js';

export interface CopilotAiProviderDescriptor {
  providerId: CopilotAiProviderKind;
  modelId: CopilotModelId;
  label: string;
  statusLabel: string;
  visibility: CopilotAiProviderVisibility;
  requiresApiKey: boolean;
  keyStorageScope: CopilotAiKeyStorageScope;
  supportsImages: boolean;
  docsUrl?: string;
  defaultModelName: string;
  defaultForModel?: boolean;
}

export interface CopilotAiProviderRegistration {
  descriptor: CopilotAiProviderDescriptor;
  provider: CopilotAiProvider;
}

export interface BuildCopilotAiCatalogOptions {
  includeInternalProviders?: boolean;
  enableAgentBridge?: boolean;
}

export function buildCopilotAiCatalog(
  options: BuildCopilotAiCatalogOptions = {},
): CopilotAiProviderRegistration[] {
  const kimiHttpDefaults = resolveKimiHttpDefaults();
  const miniMaxHttpDefaults = resolveMiniMaxHttpDefaults();
  const registrations: CopilotAiProviderRegistration[] = [
    {
      descriptor: {
        providerId: 'kimi-cli',
        modelId: 'kimi',
        label: 'Kimi',
        statusLabel: 'Kimi Code',
        visibility: 'user',
        requiresApiKey: true,
        keyStorageScope: 'model',
        supportsImages: true,
        docsUrl: 'https://www.kimi.com/code/console',
        defaultModelName: 'kimi-for-coding',
      },
      provider: new KimiCliProvider(),
    },
    {
      descriptor: {
        providerId: 'kimi-http',
        modelId: 'kimi',
        label: 'Kimi',
        statusLabel: 'Kimi API',
        visibility: 'user',
        requiresApiKey: true,
        keyStorageScope: 'model',
        supportsImages: true,
        docsUrl: 'https://platform.moonshot.cn/console/api-keys',
        defaultModelName: kimiHttpDefaults.model,
        defaultForModel: true,
      },
      provider: new KimiHttpProvider(),
    },
    {
      descriptor: {
        providerId: 'deepseek-http',
        modelId: 'deepseek',
        label: 'DeepSeek',
        statusLabel: 'DeepSeek API',
        visibility: 'user',
        requiresApiKey: true,
        keyStorageScope: 'model',
        supportsImages: true,
        docsUrl: 'https://platform.deepseek.com/api_keys',
        defaultModelName: process.env.PINGARDEN_DEEPSEEK_MODEL ?? 'deepseek-chat',
        defaultForModel: true,
      },
      provider: new DeepSeekHttpProvider(),
    },
    {
      descriptor: {
        providerId: 'minimax-http',
        modelId: 'minimax',
        label: 'MiniMax',
        statusLabel: 'MiniMax API',
        visibility: 'user',
        requiresApiKey: true,
        keyStorageScope: 'model',
        supportsImages: true,
        docsUrl: 'https://platform.minimax.io/docs/guides/quickstart-preparation',
        defaultModelName: miniMaxHttpDefaults.model,
        defaultForModel: true,
      },
      provider: new MiniMaxHttpProvider(),
    },
  ];

  if (options.includeInternalProviders) {
    registrations.push({
      descriptor: {
        providerId: 'fixture-ai',
        modelId: 'test-fixture',
        label: 'Fixture AI',
        statusLabel: 'Fixture AI',
        visibility: 'internal-test',
        requiresApiKey: false,
        keyStorageScope: 'none',
        supportsImages: true,
        defaultModelName: 'fixture-response-v1',
        defaultForModel: true,
      },
      provider: new FixtureAiProvider(),
    });
  }

  if (options.includeInternalProviders && options.enableAgentBridge) {
    registrations.push({
      descriptor: {
        providerId: 'agent-bridge-ai',
        modelId: 'test-agent',
        label: 'Agent Bridge',
        statusLabel: 'Agent Bridge',
        visibility: 'internal-test',
        requiresApiKey: false,
        keyStorageScope: 'none',
        supportsImages: true,
        defaultModelName: 'local-agent-bridge',
        defaultForModel: true,
      },
      provider: new AgentBridgeProvider(),
    });
  }

  return registrations;
}
