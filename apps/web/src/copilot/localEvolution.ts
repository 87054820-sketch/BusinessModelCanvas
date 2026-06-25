import type { CopilotMemorySuggestion, CopilotUserPreference } from '@pingarden/shared';

export function pendingMemorySuggestions(items: CopilotMemorySuggestion[]): CopilotMemorySuggestion[] {
  return items.filter((item) => item.status === 'pending');
}

export function preferenceSummary(preferences: CopilotUserPreference[]): string {
  return preferences.map((item) => `${item.label}: ${item.value}`).join('\n');
}

export function memoryConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
