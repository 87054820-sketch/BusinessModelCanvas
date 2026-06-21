import type {
  CanvasDef,
  CanvasI18n,
  CanvasMeta,
  CreateCanvasInput,
  Lang,
  UpdateCanvasInput,
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

export interface CanvasDefSummary {
  id: string;
  name: Record<Lang, string>;
  plugin?: string;
  /** Other def ids this canvas conceptually pairs with. Curated per-bundle. */
  related?: string[];
}

/**
 * Knowledge content bundled with each canvas package. All fields are
 * independently optional per language:
 *   - `intro`  — short usage paragraph (when/why to use this canvas)
 *   - `body`   — longer methodology / theory write-up
 *   - `blocks` — per-zone guidance markdown, keyed by zone id; only
 *                contains zones whose MD file exists in the bundle
 *
 * Authors edit the underlying `.md` files in
 * `packages/canvases/<id>/knowledge/` and the server reads them on each
 * `GET /canvas-defs/:id` request — changes appear without a server
 * restart.
 */
export interface CanvasKnowledge {
  intro?: string;
  body?: string;
  blocks: Record<string, string>;
}

export interface CanvasDefDetail {
  def: CanvasDef;
  i18n: Record<Lang, CanvasI18n>;
  knowledge: Record<Lang, CanvasKnowledge>;
}

const defDetailCache = new Map<string, Promise<CanvasDefDetail>>();

export const api = {
  // canvas defs
  listDefs(): Promise<CanvasDefSummary[]> {
    return fetchJson<CanvasDefSummary[]>(`${BASE}/canvas-defs`);
  },
  getDef(id: string): Promise<CanvasDefDetail> {
    const cached = defDetailCache.get(id);
    if (cached) return cached;
    const promise = fetchJson<CanvasDefDetail>(`${BASE}/canvas-defs/${id}`);
    defDetailCache.set(id, promise);
    return promise;
  },
  bgUrl(defId: string, lang: Lang): string {
    return `${BASE}/canvas-defs/${defId}/bg/${lang}`;
  },

  // canvases
  listCanvases(displayName: string, opts?: { projectId?: string }): Promise<CanvasMeta[]> {
    const qs = opts?.projectId ? `?projectId=${encodeURIComponent(opts.projectId)}` : '';
    return fetchJson<CanvasMeta[]>(`${BASE}/canvases${qs}`, {
      headers: authHeaders(displayName),
    });
  },
  getCanvas(id: string, displayName: string): Promise<CanvasMeta> {
    return fetchJson<CanvasMeta>(`${BASE}/canvases/${id}`, {
      headers: authHeaders(displayName),
    });
  },
  createCanvas(input: CreateCanvasInput, displayName: string): Promise<CanvasMeta> {
    return fetchJson<CanvasMeta>(`${BASE}/canvases`, {
      method: 'POST',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(input),
    });
  },
  updateCanvas(
    id: string,
    patch: UpdateCanvasInput,
    displayName: string,
  ): Promise<CanvasMeta> {
    return fetchJson<CanvasMeta>(`${BASE}/canvases/${id}`, {
      method: 'PATCH',
      headers: authHeadersJson(displayName),
      body: JSON.stringify(patch),
    });
  },
  deleteCanvas(id: string, displayName: string): Promise<void> {
    return fetchVoid(`${BASE}/canvases/${id}`, {
      method: 'DELETE',
      headers: authHeaders(displayName),
    });
  },
  /**
   * Replace-mode bulk sticky import. Used by seed flows (e.g. the
   * library's "Use this experiment" CTA pre-fills the six-zone Experiment
   * Canvas scaffold). Mirrors the server endpoint contract documented in
   * `apps/server/src/http/stickyImport.ts`.
   */
  bulkStickies(
    canvasId: string,
    stickies: Array<{
      zoneId: string;
      text: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      authorName?: string;
    }>,
    displayName: string,
  ): Promise<{ replaced: number; ids: string[] }> {
    return fetchJson<{ replaced: number; ids: string[] }>(
      `${BASE}/canvases/${canvasId}/stickies/bulk`,
      {
        method: 'POST',
        headers: authHeadersJson(displayName),
        body: JSON.stringify({ stickies }),
      },
    );
  },
};
