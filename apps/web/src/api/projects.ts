import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
  CanvasMeta,
} from '@pingarden/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** Bodyless requests (GET, DELETE) — must NOT set Content-Type, otherwise
 *  Fastify's JSON parser rejects the empty body with FST_ERR_CTP_EMPTY_JSON_BODY. */
function authHeaders(displayName: string): HeadersInit {
  return { 'X-Display-Name': displayName };
}

function authHeadersJson(displayName: string): HeadersInit {
  return { 'X-Display-Name': displayName, 'Content-Type': 'application/json' };
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

async function fetchVoid(input: RequestInfo, init?: RequestInit): Promise<void> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
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
