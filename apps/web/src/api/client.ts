import type {
  CanvasDef,
  CanvasI18n,
  CanvasMeta,
  CreateCanvasInput,
  Lang,
  UpdateCanvasInput,
} from '@canvas-collab/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** Bodyless requests (GET, DELETE) — must NOT set Content-Type, otherwise
 *  Fastify's JSON parser rejects the empty body with FST_ERR_CTP_EMPTY_JSON_BODY. */
function authHeaders(displayName: string): HeadersInit {
  return { 'X-Display-Name': displayName };
}

/** Body-bearing requests (POST, PATCH, PUT) — JSON body. */
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

export const api = {
  // canvas defs
  listDefs(): Promise<CanvasDefSummary[]> {
    return fetchJson<CanvasDefSummary[]>(`${BASE}/canvas-defs`);
  },
  getDef(id: string): Promise<CanvasDefDetail> {
    return fetchJson<CanvasDefDetail>(`${BASE}/canvas-defs/${id}`);
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
};
