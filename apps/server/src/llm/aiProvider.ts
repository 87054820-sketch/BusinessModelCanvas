export type CopilotModelId = string;
export type CopilotAiProviderKind = string;
export type CopilotAiProviderVisibility = 'user' | 'internal-test';
export type CopilotAiKeyStorageScope = 'model' | 'provider' | 'none';

export interface CopilotAiProviderHealth {
  provider: CopilotAiProviderKind;
  modelId: CopilotModelId;
  label?: string;
  statusLabel?: string;
  visibility?: CopilotAiProviderVisibility;
  available: boolean;
  version?: string;
  model?: string;
  defaultModelName?: string;
  requiresApiKey: boolean;
  keyStorageScope?: CopilotAiKeyStorageScope;
  supportsImages?: boolean;
  docsUrl?: string;
  storesKeyServerSide: false;
  message?: string;
}

export interface CopilotAiModelHealth {
  model: CopilotModelId;
  label?: string;
  provider: CopilotAiProviderHealth;
  providers: CopilotAiProviderHealth[];
  defaultProvider: CopilotAiProviderKind;
  available: boolean;
  requiresApiKey: boolean;
  visibility?: CopilotAiProviderVisibility;
  message?: string;
}

export interface CopilotAiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotAiMetricEvent {
  name: string;
  atMs: number;
  details?: Record<string, string | number | boolean | null>;
}

export type CopilotAiMetricCallback = (event: CopilotAiMetricEvent) => void;

export interface CopilotAiStreamInput {
  apiKey: string;
  systemPromptText: string;
  conversation: CopilotAiChatMessage[];
  latestUserMsg: string;
  signal?: AbortSignal;
  metrics?: CopilotAiMetricCallback;
}

export interface CopilotAiDelta {
  delta: string;
}

export interface CopilotAiError {
  error: string;
}

export type CopilotAiStreamChunk = CopilotAiDelta | CopilotAiError;

export interface CopilotAiProvider {
  health(): Promise<CopilotAiProviderHealth>;
  testKey(apiKey: string): Promise<{ ok: boolean; message?: string }>;
  clearKey(): Promise<{ ok: boolean }>;
  streamChat(input: CopilotAiStreamInput): AsyncGenerator<CopilotAiStreamChunk, void, void>;
}
