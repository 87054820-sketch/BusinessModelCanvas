import { KimiHttpProvider } from './kimiHttpProvider.js';

const DEFAULT_BASE_URL = 'https://api.minimax.io/v1';
const DEFAULT_MODEL = 'MiniMax-M3';
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

interface MiniMaxHttpProviderOptions {
  baseUrl?: string;
  model?: string;
}

export function resolveMiniMaxHttpDefaults(env: NodeJS.ProcessEnv = process.env) {
  return {
    baseUrl: env.PINGARDEN_MINIMAX_BASE_URL ?? DEFAULT_BASE_URL,
    model: env.PINGARDEN_MINIMAX_MODEL ?? DEFAULT_MODEL,
    requestTimeoutMs: parsePositiveInt(env.PINGARDEN_MINIMAX_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
  };
}

export class MiniMaxHttpProvider extends KimiHttpProvider {
  constructor(options: MiniMaxHttpProviderOptions = {}) {
    const defaults = resolveMiniMaxHttpDefaults();
    super({
      provider: 'minimax-http',
      modelId: 'minimax',
      apiLabel: 'MiniMax API',
      baseUrl: options.baseUrl ?? defaults.baseUrl,
      model: options.model ?? defaults.model,
      requestTimeoutMs: defaults.requestTimeoutMs,
    });
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
