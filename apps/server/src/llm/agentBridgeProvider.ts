import { spawn } from 'node:child_process';
import type {
  CopilotAiProvider,
  CopilotAiProviderHealth,
  CopilotAiStreamChunk,
  CopilotAiStreamInput,
} from './aiProvider.js';

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDOUT_CHARS = 200_000;

export class AgentBridgeProvider implements CopilotAiProvider {
  private readonly command = process.env.PINGARDEN_AI_AGENT_BRIDGE_COMMAND;
  private readonly args = parseArgs(process.env.PINGARDEN_AI_AGENT_BRIDGE_ARGS);
  private readonly timeoutMs = parsePositiveInt(process.env.PINGARDEN_AI_AGENT_BRIDGE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  async health(): Promise<CopilotAiProviderHealth> {
    const available = Boolean(this.command);
    return {
      provider: 'agent-bridge-ai',
      modelId: 'test-agent',
      available,
      model: 'local-agent-bridge',
      requiresApiKey: false,
      storesKeyServerSide: false,
      ...(available ? {} : { message: 'Set PINGARDEN_AI_AGENT_BRIDGE_COMMAND to enable the local agent bridge.' }),
    };
  }

  async testKey(): Promise<{ ok: boolean; message?: string }> {
    return this.command
      ? { ok: true }
      : { ok: false, message: 'Agent bridge command is not configured.' };
  }

  async clearKey(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async *streamChat(input: CopilotAiStreamInput): AsyncGenerator<CopilotAiStreamChunk, void, void> {
    if (!this.command) {
      yield { error: 'Agent bridge command is not configured.' };
      return;
    }

    input.metrics?.({
      name: 'upstreamRequestStart',
      atMs: Date.now(),
      details: {
        provider: 'agent-bridge-ai',
        model: 'local-agent-bridge',
        messageCount: input.conversation.length + 2,
        systemPromptChars: input.systemPromptText.length,
        latestUserChars: input.latestUserMsg.length,
      },
    });

    const result = await runBridgeCommand(this.command, this.args, input, this.timeoutMs);
    if ('error' in result) {
      yield { error: result.error };
      return;
    }
    input.metrics?.({ name: 'upstreamFirstFrame', atMs: Date.now(), details: { provider: 'agent-bridge-ai' } });
    let deltaChunks = 0;
    let deltaChars = 0;
    for (const delta of chunkText(result.text, 180)) {
      if (input.signal?.aborted) return;
      deltaChunks += 1;
      deltaChars += delta.length;
      if (deltaChunks === 1) {
        input.metrics?.({ name: 'upstreamFirstDelta', atMs: Date.now(), details: { provider: 'agent-bridge-ai' } });
      }
      yield { delta };
    }
    input.metrics?.({
      name: 'upstreamDone',
      atMs: Date.now(),
      details: { deltaChunks, deltaChars, provider: 'agent-bridge-ai' },
    });
  }
}

async function runBridgeCommand(
  command: string,
  args: string[],
  input: CopilotAiStreamInput,
  timeoutMs: number,
): Promise<{ text: string } | { error: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PINGARDEN_AI_AGENT_BRIDGE_PROTOCOL: 'pingarden.agent-bridge.v1',
      },
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ error: `Agent bridge timed out after ${timeoutMs}ms.` });
    }, timeoutMs);
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (stdout.length > MAX_STDOUT_CHARS) child.kill('SIGTERM');
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ error: err.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const text = stdout.trim();
      if (code !== 0) {
        resolve({ error: stderr.trim() || `Agent bridge exited with code ${code ?? 'unknown'}.` });
        return;
      }
      resolve({ text: text || stderr.trim() || 'Agent bridge returned an empty response.' });
    });
    child.stdin.end(JSON.stringify({
      protocol: 'pingarden.agent-bridge.v1',
      systemPromptText: input.systemPromptText,
      conversation: input.conversation,
      latestUserMsg: input.latestUserMsg,
    }));
  });
}

function parseArgs(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [''];
}
