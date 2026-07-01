/**
 * Shared header builders for the WeChat session seam.
 *
 * Bodyless GET/DELETE must NOT set Content-Type — Fastify's JSON
 * parser rejects empty bodies with FST_ERR_CTP_EMPTY_JSON_BODY when
 * the header is present.
 */
import { getStoredAuthSession } from '../identity/useIdentity';

export function authHeaders(_displayName?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const session = getStoredAuthSession();
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return headers;
}

export function authHeadersJson(displayName?: string): Record<string, string> {
  return {
    ...authHeaders(displayName),
    'Content-Type': 'application/json',
  };
}
