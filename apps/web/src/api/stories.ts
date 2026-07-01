import type { CreateStoryInput, Story, StoryMeta, UpdateStoryInput } from '@pingarden/shared';
import { ensureOk } from './errors';
import { authHeaders, authHeadersJson } from './authHeaders';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return (await res.json()) as T;
}

async function fetchVoid(input: RequestInfo, init?: RequestInit): Promise<void> {
  const res = await fetch(input, init);
  await ensureOk(res);
}

export const storiesApi = {
  list(projectId: string, displayName?: string): Promise<StoryMeta[]> {
    return fetchJson<StoryMeta[]>(`${BASE}/projects/${projectId}/stories`, {
      headers: authHeaders(displayName),
    });
  },
  get(id: string, displayName?: string): Promise<Story> {
    return fetchJson<Story>(`${BASE}/stories/${id}`, {
      headers: authHeaders(displayName),
    });
  },
  create(input: CreateStoryInput, displayName?: string): Promise<Story> {
    return fetchJson<Story>(`${BASE}/stories`, {
      method: 'POST',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(input),
    });
  },
  update(id: string, patch: UpdateStoryInput, displayName?: string): Promise<Story> {
    return fetchJson<Story>(`${BASE}/stories/${id}`, {
      method: 'PATCH',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(patch),
    });
  },
  delete(id: string, displayName?: string): Promise<void> {
    return fetchVoid(`${BASE}/stories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },
};
