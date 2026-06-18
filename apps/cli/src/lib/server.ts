import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { CliError } from './errors.js';

export interface PortFileContents {
  port: number;
  pid?: number;
  desktopInstanceId?: string;
  startedAt?: string;
}

export interface ServerInfo {
  url: string;
  port: number;
  pid?: number;
  desktopInstanceId?: string;
  source: 'flag' | 'env' | 'prod-port-file' | 'dev-port-file';
  portFilePath?: string;
}

/**
 * Where the macOS Mac app drops its port file (mirrors Electron's
 * `app.getPath('userData')` + `data/server.port`).
 */
const PROD_PORT_FILE = join(
  homedir(),
  'Library',
  'Application Support',
  'PinGarden',
  'data',
  'server.port',
);

const DEV_PORT_FILE_REL = join('.dev', 'server.port');

/**
 * Discover the running PinGarden server. Resolution order:
 *
 *   1. `--server <url>` flag
 *   2. `PINGARDEN_SERVER` env var
 *   3. macOS prod port file (`~/Library/Application Support/PinGarden/data/server.port`)
 *   4. dev port file (`<repo>/.dev/server.port`, walking up from cwd)
 *
 * Throws `CliError(NO_SERVER_FOUND)` with a helpful hint when nothing
 * resolves.
 */
export function discoverServer(opts: { flag?: string; env?: string }): ServerInfo {
  if (opts.flag && opts.flag.length > 0) {
    return { url: stripTrailingSlash(opts.flag), port: parsePort(opts.flag), source: 'flag' };
  }
  if (opts.env && opts.env.length > 0) {
    return { url: stripTrailingSlash(opts.env), port: parsePort(opts.env), source: 'env' };
  }

  const prod = readPortFile(PROD_PORT_FILE);
  if (prod) {
    return {
      url: `http://127.0.0.1:${prod.port}`,
      port: prod.port,
      pid: prod.pid,
      desktopInstanceId: prod.desktopInstanceId,
      source: 'prod-port-file',
      portFilePath: PROD_PORT_FILE,
    };
  }

  const dev = findDevPortFile();
  if (dev) {
    return {
      url: `http://127.0.0.1:${dev.contents.port}`,
      port: dev.contents.port,
      pid: dev.contents.pid,
      desktopInstanceId: dev.contents.desktopInstanceId,
      source: 'dev-port-file',
      portFilePath: dev.path,
    };
  }

  throw new CliError(
    'NO_SERVER_FOUND',
    'PinGarden server not found.',
    'Open the PinGarden Mac app, or run `./start.sh` from the repo, or set PINGARDEN_SERVER=http://host:port.',
  );
}

function readPortFile(path: string): PortFileContents | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as PortFileContents;
    if (typeof parsed.port !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function findDevPortFile(): { path: string; contents: PortFileContents } | null {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, DEV_PORT_FILE_REL);
    const found = readPortFile(candidate);
    if (found) return { path: candidate, contents: found };
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parsePort(url: string): number {
  try {
    const u = new URL(url);
    if (u.port) return Number(u.port);
    return u.protocol === 'https:' ? 443 : 80;
  } catch {
    return 0;
  }
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

/**
 * Thin HTTP client. Adds X-Display-Name on every request, parses
 * JSON, surfaces server errors as `CliError`. Avoids hard deps so
 * the CLI stays bundle-friendly — Node 20+ ships `fetch` natively.
 */
export class HttpClient {
  constructor(
    public readonly baseUrl: string,
    public readonly displayName: string,
  ) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'X-Display-Name': encodeURIComponent(this.displayName),
      Accept: 'application/json',
    };
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetch(this.baseUrl + path, { method, headers, body: payload });
    } catch (err) {
      throw new CliError(
        'CONNECTION_REFUSED',
        `Could not reach ${this.baseUrl}`,
        'Is the PinGarden server running? Check `pingarden doctor`.',
        { cause: (err as Error).message },
      );
    }

    if (res.status === 204) return undefined as T;

    const text = await res.text().catch(() => '');
    let parsed: unknown = undefined;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const message =
        (parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>)
          ? String((parsed as { error: unknown }).error)
          : undefined) ?? `${res.status} ${res.statusText}`;
      const code = res.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
      throw new CliError(code, message, undefined, { status: res.status, body: parsed });
    }

    return parsed as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
