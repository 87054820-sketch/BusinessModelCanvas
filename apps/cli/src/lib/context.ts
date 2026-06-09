import { resolveDisplayName } from './identity.js';
import { createOutput, type Output } from './output.js';
import { discoverServer, HttpClient, type ServerInfo } from './server.js';

/**
 * Per-invocation context. Built once in BaseCommand.execute and
 * passed to handlers as the second arg, so the pure handler doesn't
 * need to know about clipanion or process.env.
 */
export interface Context {
  client: HttpClient;
  server: ServerInfo;
  output: Output;
  json: boolean;
  displayName: string;
}

export interface ContextOptions {
  serverUrl?: string;
  displayName?: string;
  json?: boolean;
  /**
   * Skip server discovery — used by `doctor` so it can report a missing
   * server without throwing before printing diagnostics.
   */
  skipServer?: boolean;
}

export function createContext(opts: ContextOptions): Context {
  const json = Boolean(opts.json);
  const displayName = resolveDisplayName(opts.displayName);
  const output = createOutput(json);

  if (opts.skipServer) {
    // Stub HttpClient — should not be used. doctor command builds
    // its own ad-hoc info and never calls .request.
    return {
      server: { url: '', port: 0, source: 'flag' },
      client: new HttpClient('', displayName),
      output,
      json,
      displayName,
    };
  }

  const server = discoverServer({
    flag: opts.serverUrl,
    env: process.env.PINGARDEN_SERVER,
  });
  const client = new HttpClient(server.url, displayName);
  return { client, server, output, json, displayName };
}
