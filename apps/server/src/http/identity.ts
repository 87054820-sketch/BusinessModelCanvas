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

export function getIdentity(req: FastifyRequest): RequestIdentity {
  const raw = req.headers[HEADER];
  const name = Array.isArray(raw) ? raw[0] : raw;
  const displayName = (name ?? '').toString().trim() || 'Anonymous';
  return { displayName: displayName.slice(0, 64) };
}

/** Optional decorator if any plugin wants `req.identity`. */
export async function identityPlugin(app: FastifyInstance) {
  app.decorateRequest('identity', null as unknown as RequestIdentity);
  app.addHook('onRequest', async (req) => {
    (req as FastifyRequest & { identity: RequestIdentity }).identity = getIdentity(req);
  });
}
