import type { CanvasMeta, SnapshotMeta } from '@pingarden/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** Bodyless requests — see api/client.ts header for the Fastify rationale. */
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

export const snapshotsApi = {
  list(canvasId: string, displayName: string): Promise<SnapshotMeta[]> {
    return fetchJson<SnapshotMeta[]>(
      `${BASE}/canvases/${canvasId}/snapshots?kind=milestone`,
      { headers: authHeaders(displayName) },
    );
  },
  createMilestone(
    canvasId: string,
    body: { name: string; description?: string },
    displayName: string,
  ): Promise<SnapshotMeta> {
    return fetchJson<SnapshotMeta>(`${BASE}/canvases/${canvasId}/snapshots`, {
      method: 'POST',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(body),
    });
  },
  restore(
    canvasId: string,
    snapshotId: string,
    mode: 'replace' | 'fork',
    displayName: string,
  ): Promise<{ canvas: CanvasMeta }> {
    return fetchJson<{ canvas: CanvasMeta }>(
      `${BASE}/canvases/${canvasId}/snapshots/${snapshotId}/restore`,
      {
        method: 'POST',
        headers: authHeadersJson(displayName),
        body: JSON.stringify({ mode }),
      },
    );
  },
  delete(canvasId: string, snapshotId: string, displayName: string): Promise<void> {
    return fetchVoid(`${BASE}/canvases/${canvasId}/snapshots/${snapshotId}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },
};
