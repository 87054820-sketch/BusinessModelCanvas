/**
 * Typed CLI errors. The `code` field maps to a stable exit code so
 * shell scripts can branch on it; the `hint` is only rendered in
 * human (non-`--json`) mode.
 */

export type CliErrorCode =
  | 'CONNECTION_REFUSED' // 3 — server unreachable
  | 'NO_SERVER_FOUND' //    3 — could not discover port file or env
  | 'SERVER_ERROR' //       2 — non-2xx HTTP response
  | 'BAD_INPUT' //          1 — user-side validation failed
  | 'NOT_FOUND' //          1 — entity does not exist
  | 'UNKNOWN'; //           1

export class CliError extends Error {
  override readonly name = 'CliError';
  constructor(
    readonly code: CliErrorCode,
    message: string,
    readonly hint?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function exitCodeFor(code: CliErrorCode): number {
  switch (code) {
    case 'CONNECTION_REFUSED':
    case 'NO_SERVER_FOUND':
      return 3;
    case 'SERVER_ERROR':
      return 2;
    case 'BAD_INPUT':
    case 'NOT_FOUND':
    case 'UNKNOWN':
      return 1;
  }
}
