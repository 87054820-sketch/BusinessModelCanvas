import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolve the absolute path to the `kimi` binary at runtime.
 *
 * Resolution order:
 *  1. `process.env.KIMI_BIN` if set — explicit override for CI / tests.
 *  2. `process.env.KIMI_BUNDLED_DIR/bin/kimi` if set and exists — set
 *     by `apps/desktop/electron.main.ts` when the bundled tarball ships
 *     inside `<appResources>/kimi-cli/`.
 *  3. `~/.kimi-code/bin/kimi` (the post-install download location) if
 *     it exists.
 *  4. `which kimi` — fall back to whatever's on PATH (covers dev mode
 *     where the user installed via `npm i -g @moonshot-ai/kimi-code`
 *     or the shell installer).
 *
 * Throws KimiBinaryNotFoundError if none of the above succeed; callers
 * can catch this and surface a user-friendly "Kimi CLI not installed"
 * message rather than a generic ENOENT later when spawn fails.
 */

export class KimiBinaryNotFoundError extends Error {
  constructor() {
    super(
      'Kimi CLI binary not found. Install with `npm install -g @moonshot-ai/kimi-code` or run the bundled-app first-launch downloader.',
    );
    this.name = 'KimiBinaryNotFoundError';
  }
}

let cached: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

export function resolveKimiBinary(): string {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const override = process.env.KIMI_BIN;
  if (override && existsSync(override)) {
    cached = override;
    cachedAt = Date.now();
    return override;
  }

  const bundledDir = process.env.KIMI_BUNDLED_DIR;
  if (bundledDir) {
    const candidate = join(bundledDir, 'bin', 'kimi');
    if (existsSync(candidate)) {
      cached = candidate;
      cachedAt = Date.now();
      return candidate;
    }
  }

  const homePath = join(process.env.HOME ?? '', '.kimi-code', 'bin', 'kimi');
  if (homePath && existsSync(homePath)) {
    cached = homePath;
    cachedAt = Date.now();
    return homePath;
  }

  try {
    const out = execSync('command -v kimi', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const path = out.trim();
    if (path && existsSync(path)) {
      cached = path;
      cachedAt = Date.now();
      return path;
    }
  } catch {
    // command -v exits non-zero when nothing's on PATH.
  }

  throw new KimiBinaryNotFoundError();
}

/**
 * `kimi --version` returns e.g. "0.11.0". Caller can pass the resolved
 * binary path to avoid double-resolution. Returns undefined on failure.
 */
export function readKimiVersion(binPath?: string): string | undefined {
  try {
    const bin = binPath ?? resolveKimiBinary();
    const out = execFileSync(bin, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.trim() || undefined;
  } catch {
    return undefined;
  }
}
