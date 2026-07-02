import { describe, expect, it } from 'vitest';
import {
  extractCopilotStructuredResponses,
  stripCopilotStructuredResponseBlocks,
} from './copilotStructured.js';

describe('copilot structured response contract', () => {
  it('parses pingarden.response.v1 envelopes', () => {
    const responses = extractCopilotStructuredResponses(`可读答案

\`\`\`json
{
  "kind": "pingarden.response.v1",
  "answerMarkdown": "## 建议\\n先看画布模板。",
  "references": [
    { "kind": "canvasTemplate", "label": "商业模式画布", "defId": "business-model-canvas" }
  ],
  "cards": [
    {
      "type": "referenceBoard",
      "references": [
        { "kind": "resource", "label": "Business Model Generation", "slug": "business-model-generation" }
      ]
    }
  ],
  "diagnostics": [
    { "code": "taxonomy:ok", "severity": "info", "message": "references are typed" }
  ]
}
\`\`\``);

    expect(responses).toHaveLength(1);
    expect(responses[0]?.references?.[0]?.kind).toBe('canvasTemplate');
    expect(responses[0]?.cards?.[0]?.type).toBe('referenceBoard');
  });

  it('strips hidden structured blocks from visible markdown', () => {
    expect(stripCopilotStructuredResponseBlocks(`Visible
\`\`\`json
{"kind":"pingarden.response.v1","answerMarkdown":"Hidden"}
\`\`\``)).toBe('Visible');
  });

  it('rejects malformed cards without throwing', () => {
    expect(extractCopilotStructuredResponses(`\`\`\`json
{"kind":"pingarden.response.v1","answerMarkdown":"A","cards":[{"type":"referenceBoard"}]}
\`\`\``)).toHaveLength(0);
  });
});
