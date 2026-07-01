import type { CanvasMeta, SnapshotMeta } from '@pingarden/shared';
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

export const snapshotsApi = {
  list(canvasId: string, displayName?: string): Promise<SnapshotMeta[]> {
    return fetchJson<SnapshotMeta[]>(
      `${BASE}/canvases/${canvasId}/snapshots?kind=milestone`,
      { headers: authHeaders(displayName) },
    );
  },
  createMilestone(
    canvasId: string,
    body: { name: string; description?: string },
    displayName?: string,
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
    displayName?: string,
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
  delete(canvasId: string, snapshotId: string, displayName?: string): Promise<void> {
    return fetchVoid(`${BASE}/canvases/${canvasId}/snapshots/${snapshotId}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },
};
