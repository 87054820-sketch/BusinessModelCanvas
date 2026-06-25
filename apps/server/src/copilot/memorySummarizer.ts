import type { CopilotMemorySuggestion } from '@pingarden/shared';

export function createPreferenceSuggestion(input: {
  title: string;
  summary: string;
  suggestedValue: string;
  confidence?: number;
  evidenceSummary: string;
}): Omit<CopilotMemorySuggestion, 'id' | 'status' | 'createdAt'> {
  return {
    type: 'preference',
    title: input.title,
    summary: input.summary,
    suggestedValue: input.suggestedValue,
    confidence: input.confidence ?? 0.7,
    evidenceSummary: input.evidenceSummary,
  };
}

export function buildMemorySuggestionPrompt(): string {
  return [
    '## Local memory suggestion rules',
    'You may suggest user preferences or collaboration habits, but do not claim they were saved.',
    'Long-term memory requires explicit user confirmation in the PinGarden UI.',
    'Never suggest storing API keys, raw chat transcripts, raw image data, sensitive personal attributes, or psychological labels.',
    'Frame inferred patterns as working preferences or business reasoning habits with concise evidence summaries.',
  ].join('\n');
}
