import { KimiHttpProvider } from './kimiHttpProvider.js';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

interface DeepSeekHttpProviderOptions {
  baseUrl?: string;
  model?: string;
}

export class DeepSeekHttpProvider extends KimiHttpProvider {
  constructor(options: DeepSeekHttpProviderOptions = {}) {
    super({
      provider: 'deepseek-http',
      modelId: 'deepseek',
      apiLabel: 'DeepSeek API',
      baseUrl: options.baseUrl ?? process.env.PINGARDEN_DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL,
      model: options.model ?? process.env.PINGARDEN_DEEPSEEK_MODEL ?? DEFAULT_MODEL,
      requestTimeoutMs: parsePositiveInt(process.env.PINGARDEN_DEEPSEEK_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
    });
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
