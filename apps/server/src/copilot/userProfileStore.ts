import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  CopilotMemoryState,
  CopilotMemorySuggestion,
  CopilotPlaybookDescriptor,
  CopilotUserPreference,
  CopilotUserProfile,
} from '@pingarden/shared';
import { BUNDLED_PLAYBOOKS } from './bundledPlaybooks.js';

const SCHEMA_VERSION = 1;

interface StoredMemoryState extends CopilotMemoryState {
  schemaVersion: number;
}

export class CopilotUserProfileStore {
  constructor(private readonly dataDir: string) {}

  async getState(displayName: string): Promise<CopilotMemoryState> {
    const path = this.statePath(displayName);
    const stored = await readJson<StoredMemoryState>(path);
    if (!stored) {
      const state = this.emptyState(displayName);
      await writeJson(path, { schemaVersion: SCHEMA_VERSION, ...state });
      return state;
    }
    return normaliseState(displayName, stored);
  }

  async acceptSuggestion(displayName: string, suggestionId: string): Promise<CopilotUserProfile> {
    const state = await this.getState(displayName);
    const now = new Date().toISOString();
    const suggestion = state.suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return state.profile;
    const preference: CopilotUserPreference = {
      id: suggestion.id.startsWith('pref_') ? suggestion.id : `pref_${suggestion.id}`,
      label: suggestion.title,
      value: suggestion.suggestedValue,
      scope: 'user',
      confidence: suggestion.confidence,
      evidenceSummary: suggestion.evidenceSummary,
      confirmedAt: now,
      updatedAt: now,
    };
    const next: CopilotMemoryState = {
      ...state,
      profile: {
        ...state.profile,
        preferences: upsertById(state.profile.preferences, preference),
        updatedAt: now,
      },
      suggestions: state.suggestions.map((item) => item.id === suggestionId ? { ...item, status: 'accepted' } : item),
    };
    await this.saveState(displayName, next);
    return next.profile;
  }

  async ignoreSuggestion(displayName: string, suggestionId: string): Promise<CopilotMemorySuggestion | null> {
    const state = await this.getState(displayName);
    const suggestion = state.suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return null;
    const ignored = { ...suggestion, status: 'ignored' as const };
    await this.saveState(displayName, {
      ...state,
      suggestions: state.suggestions.map((item) => item.id === suggestionId ? ignored : item),
    });
    return ignored;
  }

  async deletePreference(displayName: string, preferenceId: string): Promise<void> {
    const state = await this.getState(displayName);
    await this.saveState(displayName, {
      ...state,
      profile: {
        ...state.profile,
        preferences: state.profile.preferences.filter((item) => item.id !== preferenceId),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async addSuggestion(displayName: string, input: Omit<CopilotMemorySuggestion, 'id' | 'status' | 'createdAt'>): Promise<CopilotMemorySuggestion> {
    const state = await this.getState(displayName);
    const suggestion: CopilotMemorySuggestion = {
      id: `sug_${randomUUID()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...input,
    };
    await this.saveState(displayName, { ...state, suggestions: [suggestion, ...state.suggestions].slice(0, 50) });
    return suggestion;
  }

  async buildPromptContext(displayName: string): Promise<string> {
    const state = await this.getState(displayName);
    const prefs = state.profile.preferences.slice(0, 12);
    const habits = state.profile.reasoningHabits.filter((habit) => habit.confirmedAt).slice(0, 8);
    if (prefs.length === 0 && habits.length === 0) return '';
    return [
      '## User-confirmed local Copilot profile',
      'Use these local preferences only as collaboration guidance. Do not reveal profile internals unless the user asks.',
      ...prefs.map((pref) => `- Preference: ${pref.label} = ${pref.value}`),
      ...habits.map((habit) => `- Reasoning habit: ${habit.label} — ${habit.summary}`),
    ].join('\n');
  }

  async saveState(displayName: string, state: CopilotMemoryState): Promise<void> {
    await writeJson(this.statePath(displayName), { schemaVersion: SCHEMA_VERSION, ...state });
  }

  userKey(displayName: string): string {
    const normalized = displayName.trim() || 'Anonymous';
    return `u_${createHash('sha256').update(`pingarden-copilot-user:v1:${normalized}`).digest('base64url').slice(0, 24)}`;
  }

  private statePath(displayName: string): string {
    return join(this.dataDir, 'copilot', 'users', this.userKey(displayName), 'memory.json');
  }

  private emptyState(displayName: string): CopilotMemoryState {
    const now = new Date().toISOString();
    return {
      profile: {
        displayName: displayName.trim() || 'Anonymous',
        preferences: [],
        reasoningHabits: [],
        preferredCanvasIds: [],
        updatedAt: now,
      },
      suggestions: [],
      bundledPlaybooks: BUNDLED_PLAYBOOKS,
      userPlaybooks: [],
    };
  }
}

function normaliseState(displayName: string, stored: StoredMemoryState): CopilotMemoryState {
  const now = new Date().toISOString();
  return {
    profile: {
      displayName: stored.profile?.displayName || displayName.trim() || 'Anonymous',
      preferences: stored.profile?.preferences ?? [],
      reasoningHabits: stored.profile?.reasoningHabits ?? [],
      preferredCanvasIds: stored.profile?.preferredCanvasIds ?? [],
      updatedAt: stored.profile?.updatedAt ?? now,
    },
    suggestions: stored.suggestions ?? [],
    bundledPlaybooks: BUNDLED_PLAYBOOKS,
    userPlaybooks: (stored.userPlaybooks ?? []).filter((item: CopilotPlaybookDescriptor) => item.scope === 'user-local'),
  };
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const exists = items.some((item) => item.id === next.id);
  if (!exists) return [next, ...items];
  return items.map((item) => item.id === next.id ? next : item);
}
