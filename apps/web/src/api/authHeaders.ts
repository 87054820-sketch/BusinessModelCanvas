/**
 * Shared header builders for the X-Display-Name audit trail seam.
 *
 * Why encodeURIComponent? HTTP header values must be ISO-8859-1
 * (Latin-1). Chromium's fetch throws TypeError when a value contains
 * bytes outside that range, which silently broke every API call
 * once a user typed a non-ASCII display name (e.g. "张三").
 *
 * Encoding here + matching decode in the server's identity helper
 * (apps/server/src/http/identity.ts) keeps the wire format
 * Latin-1-safe while preserving the original Unicode string.
 *
 * Bodyless GET/DELETE must NOT set Content-Type — Fastify's JSON
 * parser rejects empty bodies with FST_ERR_CTP_EMPTY_JSON_BODY when
 * the header is present.
 */
export function authHeaders(displayName: string): HeadersInit {
  return { 'X-Display-Name': encodeURIComponent(displayName) };
}

export function authHeadersJson(displayName: string): HeadersInit {
  return {
    'X-Display-Name': encodeURIComponent(displayName),
    'Content-Type': 'application/json',
  };
}
