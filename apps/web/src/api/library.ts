import type {
  BusinessModelExperimentDetail,
  BusinessModelPattern,
  BusinessModelPatternDetail,
  CaseForkResult,
  CaseLibraryDetail,
  CaseLibraryEntry,
  Experiment,
  Lang,
  StrategyFramework,
  StrategyFrameworkDetail,
} from '@pingarden/shared';
import { ensureOk } from './errors';
import { authHeaders } from './authHeaders';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

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
  /**
   * List all curated experiments shipped in the library. Like patterns,
   * experiments are pure read-only content (no project, no canvas, no
   * fork). The 12 V1 experiments come from the Bland & Osterwalder
   * "Testing Business Ideas" library — surfacing them in the App is the
   * non-AI counterpart to the Claude skill's experiment recipes.
   *
   * Public route — no auth header required.
   */
  listExperiments(): Promise<Experiment[]> {
    return fetchJson<Experiment[]>(`${BASE}/library/experiments`);
  },
  /**
   * Resolve an experiment by slug — returns the experiment metadata and
   * its bilingual long-form markdown description. No `exampleCases[]`
   * surface (experiments are abstract methods, not bound to concrete
   * cases).
   */
  getExperiment(slug: string): Promise<BusinessModelExperimentDetail> {
    return fetchJson<BusinessModelExperimentDetail>(
      `${BASE}/library/experiments/${encodeURIComponent(slug)}`,
    );
  },
  /**
   * List all strategic analysis methods shipped in the library. Frameworks
   * are abstract methods (Blue Ocean Strategy, Five Forces, …), not cases.
   */
  listStrategyFrameworks(): Promise<StrategyFramework[]> {
    return fetchJson<StrategyFramework[]>(`${BASE}/library/strategy-frameworks`);
  },
  /** Resolve one strategy framework with bilingual markdown and hydrated examples. */
  getStrategyFramework(slug: string): Promise<StrategyFrameworkDetail> {
    return fetchJson<StrategyFrameworkDetail>(
      `${BASE}/library/strategy-frameworks/${encodeURIComponent(slug)}`,
    );
  },
};
