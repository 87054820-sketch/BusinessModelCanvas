import type {
  CaseForkResult,
  CaseLibraryDetail,
  CaseLibraryEntry,
  Lang,
} from '@pingarden/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

function authHeaders(displayName: string): HeadersInit {
  return { 'X-Display-Name': displayName };
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
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
};
