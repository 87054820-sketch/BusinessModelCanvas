/**
 * CLI package version. Inlined at build time by tsup `define`. In dev
 * (when running source via tsx), the global is undefined and we fall
 * back to a placeholder — the version doesn't matter in dev. The
 * production bundle gets the real value from `apps/cli/package.json`.
 */
export const CLI_VERSION: string =
  typeof __PINGARDEN_CLI_VERSION__ !== 'undefined' && __PINGARDEN_CLI_VERSION__
    ? __PINGARDEN_CLI_VERSION__
    : '0.0.0-dev';
