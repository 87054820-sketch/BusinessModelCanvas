import { streamKimiChat } from './kimiCliAdapter.js';
import { resolveKimiBinary, readKimiVersion, KimiBinaryNotFoundError } from './kimiBinaryResolver.js';
import { writeConfig as writeKimiConfig, clearConfig as clearKimiConfig } from './kimiConfig.js';
import type { CopilotAiProvider, CopilotAiProviderHealth, CopilotAiStreamInput } from './aiProvider.js';

const MODEL = 'kimi-for-coding';

export class KimiCliProvider implements CopilotAiProvider {
  async health(): Promise<CopilotAiProviderHealth> {
    try {
      const bin = resolveKimiBinary();
      const version = readKimiVersion(bin);
      return {
        provider: 'kimi-cli',
        available: true,
        ...(version ? { version } : {}),
        model: MODEL,
        requiresApiKey: true,
        storesKeyServerSide: false,
      };
    } catch {
      return {
        provider: 'kimi-cli',
        available: false,
        model: MODEL,
        requiresApiKey: true,
        storesKeyServerSide: false,
        message: 'Kimi CLI binary not found.',
      };
    }
  }

  async testKey(apiKey: string): Promise<{ ok: boolean; message?: string }> {
    try {
      await writeKimiConfig(apiKey);
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to write Kimi config',
      };
    }

    const probe = streamKimiChat({
      systemPromptText: 'Reply with exactly the word "pong".',
      conversation: [],
      latestUserMsg: 'ping',
    });
    const timeout = new Promise<{ ok: false; message: string }>((resolve) => {
      setTimeout(() => resolve({ ok: false, message: 'Timed out after 20s' }), 20_000);
    });
    const probeResult = (async () => {
      for await (const chunk of probe) {
        if ('error' in chunk) return { ok: false as const, message: chunk.error };
        if ('delta' in chunk && chunk.delta) return { ok: true as const };
      }
      return { ok: false as const, message: 'Empty response from kimi' };
    })();
    return Promise.race([probeResult, timeout]);
  }

  async clearKey(): Promise<{ ok: boolean }> {
    await clearKimiConfig();
    return { ok: true };
  }

  async *streamChat(input: CopilotAiStreamInput) {
    try {
      await writeKimiConfig(input.apiKey);
    } catch (err) {
      yield { error: err instanceof Error ? err.message : 'Failed to write Kimi config' };
      return;
    }

    try {
      resolveKimiBinary();
    } catch (err) {
      if (err instanceof KimiBinaryNotFoundError) {
        yield { error: err.message };
        return;
      }
      throw err;
    }

    yield* streamKimiChat({
      systemPromptText: input.systemPromptText,
      conversation: input.conversation,
      latestUserMsg: input.latestUserMsg,
      signal: input.signal,
    });
  }
}
