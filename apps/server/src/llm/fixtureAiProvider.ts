import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CopilotAiProvider,
  CopilotAiProviderHealth,
  CopilotAiStreamChunk,
  CopilotAiStreamInput,
} from './aiProvider.js';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = [
  '```json',
  '{',
  '  "kind": "pingarden.response.v1",',
  '  "answerMarkdown": "Fixture AI 已响应。可以继续验证 Copilot 结构化解析、引用卡片和 SSE 流。",',
  '  "cards": [',
  '    {',
  '      "type": "referenceBoard",',
  '      "title": "Fixture references",',
  '      "references": [',
  '        { "kind": "canvasTemplate", "label": "商业模式画布", "slug": "business-model-canvas", "intent": "preview" }',
  '      ]',
  '    }',
  '  ],',
  '  "references": [',
  '    { "kind": "resource", "label": "Business Model Generation", "slug": "business-model-generation", "intent": "preview" }',
  '  ],',
  '  "diagnostics": [',
  '    { "code": "fixture-ai", "severity": "info", "message": "Deterministic offline provider." }',
  '  ]',
  '}',
  '```',
].join('\n');

export class FixtureAiProvider implements CopilotAiProvider {
  async health(): Promise<CopilotAiProviderHealth> {
    return {
      provider: 'fixture-ai',
      modelId: 'test-fixture',
      available: true,
      model: 'fixture-response-v1',
      requiresApiKey: false,
      storesKeyServerSide: false,
    };
  }

  async testKey(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true };
  }

  async clearKey(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async *streamChat(input: CopilotAiStreamInput): AsyncGenerator<CopilotAiStreamChunk, void, void> {
    input.metrics?.({
      name: 'upstreamRequestStart',
      atMs: Date.now(),
      details: {
        provider: 'fixture-ai',
        model: 'fixture-response-v1',
        messageCount: input.conversation.length + 2,
        systemPromptChars: input.systemPromptText.length,
        latestUserChars: input.latestUserMsg.length,
      },
    });
    const fixture = await loadFixtureText();
    input.metrics?.({ name: 'upstreamFirstFrame', atMs: Date.now(), details: { provider: 'fixture-ai' } });
    let deltaChunks = 0;
    let deltaChars = 0;
    for (const delta of chunkText(fixture, 140)) {
      if (input.signal?.aborted) return;
      deltaChunks += 1;
      deltaChars += delta.length;
      if (deltaChunks === 1) {
        input.metrics?.({ name: 'upstreamFirstDelta', atMs: Date.now(), details: { provider: 'fixture-ai' } });
      }
      yield { delta };
    }
    input.metrics?.({
      name: 'upstreamDone',
      atMs: Date.now(),
      details: { deltaChunks, deltaChars, provider: 'fixture-ai' },
    });
  }
}

async function loadFixtureText(): Promise<string> {
  const explicit = process.env.PINGARDEN_AI_FIXTURE_FILE;
  const candidates = [
    explicit,
    resolve(process.cwd(), 'fixtures/copilot/answers/structured-response.zh.md'),
    resolve(process.cwd(), '../../fixtures/copilot/answers/structured-response.zh.md'),
    resolve(here, '../../../../fixtures/copilot/answers/structured-response.zh.md'),
  ].filter((item): item is string => Boolean(item));
  for (const candidate of candidates) {
    try {
      const text = await readFile(candidate, 'utf8');
      if (text.trim()) return text.trim();
    } catch {
      /* try the next candidate */
    }
  }
  return DEFAULT_FIXTURE;
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [''];
}
