import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
  CanvasMeta,
} from '@pingarden/shared';
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

export const projectsApi = {
  list(displayName: string): Promise<Project[]> {
    return fetchJson<Project[]>(`${BASE}/projects`, { headers: authHeaders(displayName) });
  },
  get(id: string, displayName: string): Promise<Project> {
    return fetchJson<Project>(`${BASE}/projects/${id}`, {
      headers: authHeaders(displayName),
    });
  },
  listCanvases(id: string, displayName: string): Promise<CanvasMeta[]> {
    return fetchJson<CanvasMeta[]>(`${BASE}/projects/${id}/canvases`, {
      headers: authHeaders(displayName),
    });
  },
  create(input: CreateProjectInput, displayName: string): Promise<Project> {
    return fetchJson<Project>(`${BASE}/projects`, {
      method: 'POST',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(input),
    });
  },
  update(id: string, patch: UpdateProjectInput, displayName: string): Promise<Project> {
    return fetchJson<Project>(`${BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(patch),
    });
  },
  delete(id: string, displayName: string): Promise<void> {
    return fetchVoid(`${BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },
};
