import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  CopilotLayeredMemory,
  CopilotMemoryItem,
  CopilotMemoryLayer,
  CopilotMemoryState,
  CopilotMemorySuggestion,
  CopilotPlaybookDescriptor,
  CopilotUserPreference,
  CopilotUserProfile,
} from '@pingarden/shared';
import { COPILOT_MEMORY_LAYERS } from '@pingarden/shared';
import { BUNDLED_PLAYBOOKS } from './bundledPlaybooks.js';
import {
  applyMemoryPatch,
  archiveMemoryItem,
  buildMemoryPatch,
  createEmptyLayeredMemory,
  deleteMemoryItem,
  normaliseLayeredMemory,
  revertLatestMemoryChange,
  type MemoryConsolidationInput,
} from './memoryConsolidator.js';

const SCHEMA_VERSION = 2;

interface StoredMemoryState extends Partial<CopilotMemoryState> {
  schemaVersion?: number;
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
    const state = normaliseState(displayName, stored);
    if (stored.schemaVersion !== SCHEMA_VERSION || !stored.layeredMemory) {
      await this.saveState(displayName, state);
    }
    return state;
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
    const layeredMemory = applyMemoryPatch(state.layeredMemory, {
      summary: 'Accepted a legacy memory suggestion into layered memory.',
      upsert: [{
        layer: 'collaboration',
        semanticKey: `legacy-preference/${normaliseKey(preference.label)}`,
        title: preference.label,
        value: preference.value,
        status: 'active',
        confidence: preference.confidence ?? 0.75,
        evidenceSummary: preference.evidenceSummary ?? suggestion.summary,
        source: 'manual',
      }],
    }, now);
    const next: CopilotMemoryState = {
      ...state,
      profile: {
        ...state.profile,
        preferences: upsertById(state.profile.preferences, preference),
        updatedAt: now,
      },
      layeredMemory,
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

  async consolidateMemory(displayName: string, input: MemoryConsolidationInput): Promise<CopilotMemoryState> {
    const state = await this.getState(displayName);
    const now = new Date().toISOString();
    const patch = buildMemoryPatch(input);
    if ((patch.upsert?.length ?? 0) === 0 && (patch.signals?.length ?? 0) === 0) return state;
    const next: CopilotMemoryState = {
      ...state,
      layeredMemory: applyMemoryPatch(state.layeredMemory, patch, now),
      profile: { ...state.profile, updatedAt: now },
    };
    await this.saveState(displayName, next);
    return next;
  }

  async archiveLayeredMemoryItem(displayName: string, id: string): Promise<CopilotMemoryState> {
    const state = await this.getState(displayName);
    const next = { ...state, layeredMemory: archiveMemoryItem(state.layeredMemory, id) };
    await this.saveState(displayName, next);
    return next;
  }

  async deleteLayeredMemoryItem(displayName: string, id: string): Promise<CopilotMemoryState> {
    const state = await this.getState(displayName);
    const next = { ...state, layeredMemory: deleteMemoryItem(state.layeredMemory, id) };
    await this.saveState(displayName, next);
    return next;
  }

  async revertLatestMemoryChange(displayName: string): Promise<CopilotMemoryState> {
    const state = await this.getState(displayName);
    const next = { ...state, layeredMemory: revertLatestMemoryChange(state.layeredMemory) };
    await this.saveState(displayName, next);
    return next;
  }

  async buildPromptContext(displayName: string): Promise<string> {
    const state = await this.getState(displayName);
    const lines: string[] = [
      '## User Memory for PinGarden',
      'Use this as collaboration guidance. Do not reveal memory internals unless the user asks.',
    ];
    let count = 0;
    for (const layer of COPILOT_MEMORY_LAYERS) {
      const items = state.layeredMemory.layers[layer]
        .filter((item) => item.status === 'active' && item.confidence >= 0.7)
        .slice(0, 5);
      if (items.length === 0) continue;
      lines.push('', `### ${layerTitle(layer)}`);
      for (const item of items) {
        lines.push(`- ${item.title}: ${item.value}`);
        count += 1;
      }
    }
    if (count > 0) return lines.join('\n');

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
      layeredMemory: createEmptyLayeredMemory(now),
      bundledPlaybooks: BUNDLED_PLAYBOOKS,
      userPlaybooks: [],
    };
  }
}

function normaliseState(displayName: string, stored: StoredMemoryState): CopilotMemoryState {
  const now = new Date().toISOString();
  const profile: CopilotUserProfile = {
    displayName: stored.profile?.displayName || displayName.trim() || 'Anonymous',
    preferences: stored.profile?.preferences ?? [],
    reasoningHabits: stored.profile?.reasoningHabits ?? [],
    preferredCanvasIds: stored.profile?.preferredCanvasIds ?? [],
    updatedAt: stored.profile?.updatedAt ?? now,
  };
  const layeredMemory = migrateLegacyMemory(normaliseLayeredMemory(stored.layeredMemory, now), profile, now);
  return {
    profile,
    suggestions: stored.suggestions ?? [],
    layeredMemory,
    bundledPlaybooks: BUNDLED_PLAYBOOKS,
    userPlaybooks: (stored.userPlaybooks ?? []).filter((item: CopilotPlaybookDescriptor) => item.scope === 'user-local'),
  };
}

function migrateLegacyMemory(layeredMemory: CopilotLayeredMemory, profile: CopilotUserProfile, now: string): CopilotLayeredMemory {
  if (COPILOT_MEMORY_LAYERS.some((layer) => layeredMemory.layers[layer].length > 0)) return layeredMemory;
  const migrated: CopilotMemoryItem[] = profile.preferences.map((pref) => ({
    id: pref.id.startsWith('mem_') ? pref.id : `mem_${pref.id}`,
    layer: 'collaboration',
    semanticKey: `legacy-preference/${normaliseKey(pref.label)}`,
    title: pref.label,
    value: pref.value,
    status: 'active',
    confidence: pref.confidence ?? 0.75,
    evidenceCount: 1,
    evidenceSummary: pref.evidenceSummary ?? 'Migrated from legacy confirmed preference.',
    source: 'migration',
    firstSeenAt: pref.confirmedAt,
    lastSeenAt: pref.updatedAt,
    updatedAt: pref.updatedAt,
  }));
  return {
    ...layeredMemory,
    updatedAt: migrated.length > 0 ? now : layeredMemory.updatedAt,
    layers: { ...layeredMemory.layers, collaboration: migrated },
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

function normaliseKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'preference';
}

function layerTitle(layer: CopilotMemoryLayer): string {
  switch (layer) {
    case 'collaboration':
      return 'Collaboration';
    case 'productThinking':
      return 'Product Thinking';
    case 'projectWorkflow':
      return 'Project Workflow';
    case 'contentAndEvidence':
      return 'Evidence / Resources';
    case 'visualAndUX':
      return 'Visual / UX';
    case 'domainContext':
      return 'Domain Context';
  }
}
