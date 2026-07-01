export type CopilotModelId = 'kimi' | 'deepseek';
export type CopilotAiProviderKind = 'kimi-cli' | 'kimi-http' | 'deepseek-http';

export interface CopilotAiProviderHealth {
  provider: CopilotAiProviderKind;
  modelId: CopilotModelId;
  available: boolean;
  version?: string;
  model?: string;
  requiresApiKey: boolean;
  storesKeyServerSide: false;
  message?: string;
}

export interface CopilotAiModelHealth {
  model: CopilotModelId;
  provider: CopilotAiProviderHealth;
  providers: CopilotAiProviderHealth[];
  defaultProvider: CopilotAiProviderKind;
  available: boolean;
  requiresApiKey: boolean;
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
