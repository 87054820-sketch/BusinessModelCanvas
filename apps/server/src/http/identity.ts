import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Identity helper — single seam for future auth.
 *
 * v1: clients send their self-declared display name as `X-Display-Name`.
 * Server trusts the header (internal-team use only).
 *
 * To swap in real auth later, change ONLY this file: parse a JWT/session
 * cookie, validate, and return the resolved identity. No call sites need
 * to change.
 */
export interface RequestIdentity {
  displayName: string;
}

const HEADER = 'x-display-name';

/**
 * Decode the wire form back to UTF-8. Web/CLI clients now wrap the
 * display name with `encodeURIComponent` because HTTP header values
 * must be ISO-8859-1; Chromium throws TypeError on raw non-Latin-1
 * bytes. Wrapping is idempotent for ASCII names — `decodeURIComponent('Sibo')`
 * returns `'Sibo'` — so older clients that did not encode keep working.
 *
 * `decodeURIComponent` throws on malformed `%`-sequences; in that case
 * we fall back to the raw value rather than 500 the request.
 */
function tryDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function getIdentity(req: FastifyRequest): RequestIdentity {
  const raw = req.headers[HEADER];
  const name = Array.isArray(raw) ? raw[0] : raw;
  const decoded = tryDecode((name ?? '').toString());
  const displayName = decoded.trim() || 'Anonymous';
  return { displayName: displayName.slice(0, 64) };
}

/** Optional decorator if any plugin wants `req.identity`. */
export async function identityPlugin(app: FastifyInstance) {
  app.decorateRequest('identity', null as unknown as RequestIdentity);
  app.addHook('onRequest', async (req) => {
    (req as FastifyRequest & { identity: RequestIdentity }).identity = getIdentity(req);
  });
}
