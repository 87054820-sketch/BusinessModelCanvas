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
    '## Local layered memory rules',
    'PinGarden may automatically consolidate stable collaboration and project-work preferences after a turn. Do not announce that memory was saved unless the user asks.',
    'Never store API keys, raw chat transcripts, raw image data, sensitive personal attributes, psychological labels, or private third-party data.',
    'When discussing preferences, frame them as collaboration guidance, product-thinking criteria, project workflow preferences, evidence/resource preferences, visual/UX preferences, or domain context.',
    'Memory is compact and iterative: prefer stable patterns over one-off comments, and avoid redundant variants of the same preference.',
  ].join('\n');
}
