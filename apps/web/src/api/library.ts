import type {
  BusinessModelPattern,
  BusinessModelPatternDetail,
  CaseForkResult,
  CaseLibraryDetail,
  CaseLibraryEntry,
  Lang,
} from '@pingarden/shared';
import { ensureOk } from './errors';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

function authHeaders(displayName: string): HeadersInit {
  return { 'X-Display-Name': displayName };
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return (await res.json()) as T;
}

export const libraryApi = {
  list(displayName: string): Promise<CaseLibraryEntry[]> {
    return fetchJson<CaseLibraryEntry[]>(`${BASE}/library/cases`, {
      headers: authHeaders(displayName),
    });
  },
  get(slug: string, displayName: string): Promise<CaseLibraryDetail> {
    return fetchJson<CaseLibraryDetail>(
      `${BASE}/library/cases/${encodeURIComponent(slug)}`,
      { headers: authHeaders(displayName) },
    );
  },
  /**
   * Deep-copy a library case into the user's writable storage.
   *
   * `lang` (optional) tells the server to fork only canvases whose
   * `language` matches; the user clicks Fork while in a specific UI
   * language and we honour that — the resulting project is
   * single-language. The server falls back to forking everything when
   * the requested language isn't shipped (single-language cases
   * always produce a fork).
   */
  fork(slug: string, displayName: string, lang?: Lang): Promise<CaseForkResult> {
    const url = lang
      ? `${BASE}/library/cases/${encodeURIComponent(slug)}/fork?lang=${lang}`
      : `${BASE}/library/cases/${encodeURIComponent(slug)}/fork`;
    return fetchJson<CaseForkResult>(
      url,
      { method: 'POST', headers: authHeaders(displayName) },
    );
  },
  /**
   * List all business-model patterns shipped in the library. Patterns
   * are NOT cases — they have no project, no canvas, no fork. Each is
   * an abstract reusable model (Long Tail, Unbundling, …) with a
   * curated `examples[]` list pointing to concrete cases.
   *
   * Public route — no auth header required.
   */
  listPatterns(): Promise<BusinessModelPattern[]> {
    return fetchJson<BusinessModelPattern[]>(`${BASE}/library/patterns`);
  },
  /**
   * Resolve a pattern by slug — returns the pattern metadata, the
   * bilingual long-form markdown description, and the hydrated case
   * metadata for the slugs in `examples[]` (so the UI can render the
   * examples strip without an N+1 round trip).
   */
  getPattern(slug: string): Promise<BusinessModelPatternDetail> {
    return fetchJson<BusinessModelPatternDetail>(
      `${BASE}/library/patterns/${encodeURIComponent(slug)}`,
    );
  },
};
