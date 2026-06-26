import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Server port discovery file.
 *
 * The CLI (`apps/cli/`) and any external automation read this JSON
 * to find the running PinGarden server without grepping `lsof` or
 * guessing ports. Written once after `app.listen()` resolves and
 * unlinked on graceful shutdown.
 *
 * Path resolution:
 *   1. `PINGARDEN_PORT_FILE` env var (absolute or repo-relative path) — wins.
 *   2. `<dataDir>/server.port` (default; works for both prod Electron and dev).
 *
 * In dev `start.sh` sets `PINGARDEN_PORT_FILE=<repo>/.dev/server.port` so the
 * file co-locates with `server.log` / `server.pid` for symmetry.
 *
 * Atomicity: write to `<path>.<pid>.tmp` then rename to dodge half-written
 * reads from a fast-starting CLI.
 */
export interface PortFileContents {
  port: number;
  pid: number;
  desktopInstanceId?: string;
  startedAt: string;
}

export function getPortFilePath(dataDir: string): string {
  const override = process.env.PINGARDEN_PORT_FILE;
  if (override && override.length > 0) return override;
  return join(dataDir, 'server.port');
}

export function writePortFile(path: string, contents: PortFileContents): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(contents, null, 2), 'utf8');
  renameSync(tmp, path);
}

export function cleanupPortFile(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // Already gone or never created — fine.
  }
}

/**
 * Register process-level handlers that delete the port file on
 * normal exit, SIGINT, and SIGTERM. Idempotent — safe to call once.
 */
export function registerPortFileCleanup(path: string): void {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    cleanupPortFile(path);
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
}
