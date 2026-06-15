import type { TFunction } from 'i18next';

/**
 * Structured error thrown by every `apps/web/src/api/*` module. Wraps
 * the response body that Fastify returns on 4xx/5xx so callers can
 * branch on the server's `code` field instead of pattern-matching the
 * stringified message — and so UI surfaces (ConfirmDialog,
 * NewProjectPage, etc.) can render a translated friendly message
 * rather than dumping `HTTP 403: {"error":"Forbidden", ...}` straight
 * into a native `alert()`.
 *
 * Backwards compatibility: `ApiError extends Error`, and `.message`
 * still carries the human-readable string (preferring the server's
 * `message` field, falling back to the raw body). Existing
 * `err instanceof Error` checks keep working.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  /** HTTP status code (e.g. 403, 404). */
  readonly status: number;

  /** Server's structured `code`, if present (e.g. `'CASE_LIBRARY_READ_ONLY'`). */
  readonly code?: string;

  /** Server's `operation` field — the storage method that refused the write. */
  readonly operation?: string;

  /** Server's `targetId` — the resource id that triggered the refusal. */
  readonly targetId?: string;

  /** Original parsed body (or raw text if body wasn't JSON). */
  readonly body: unknown;

  constructor(
    status: number,
    body: unknown,
    /** Fallback message when body has no `message`. */
    fallbackMessage: string,
  ) {
    const parsed = isApiErrorBody(body) ? body : null;
    super(parsed?.message ?? fallbackMessage);
    this.status = status;
    this.body = body;
    this.code = parsed?.code;
    this.operation = parsed?.operation;
    this.targetId = parsed?.targetId;
  }
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
  operation?: string;
  targetId?: string;
}

function isApiErrorBody(b: unknown): b is ApiErrorBody {
  return typeof b === 'object' && b !== null;
}

/**
 * Wrap a `fetch` response: on a non-2xx, parse the body once (preferring
 * JSON) and throw an `ApiError`. On 2xx, return the response unchanged
 * so the caller can read `.json()` / treat as void.
 */
export async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  const raw = await res.text().catch(() => '');
  let body: unknown = raw;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      // Body wasn't JSON — keep the raw string so the fallback message
      // still has SOMETHING for the user to see.
    }
  }
  const fallback = `HTTP ${res.status}${raw ? `: ${raw}` : ''}`;
  throw new ApiError(res.status, body, fallback);
}

/**
 * Translate a thrown error into a user-facing string. Known server
 * `code`s get a curated translation; everything else falls back to the
 * generic message (already populated from the server's `message` field
 * by `ApiError`). Handles non-ApiError throwables gracefully so callers
 * can use this as their universal error formatter.
 *
 * Example mappings:
 *   - `CASE_LIBRARY_READ_ONLY` → "Library cases are read-only. Use Fork
 *     to make an editable copy."
 *   - any other ApiError → `error.message` (the server's plain message)
 *   - non-Error throwable → `error.generic`
 */
export function getApiErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    if (err.code === 'CASE_LIBRARY_READ_ONLY') {
      return t('error.caseLibraryReadOnly');
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return t('error.generic');
}
