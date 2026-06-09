import os from 'node:os';

/**
 * Resolve the X-Display-Name header value used for the audit trail
 * on the server side (`createdBy` / `updatedBy`).
 *
 * Precedence: `--as` flag > `PINGARDEN_USER` env > `<os user> (cli)`.
 *
 * The trailing "(cli)" suffix is intentional — it makes server-side
 * audit logs distinguish CLI/agent edits from web client edits at a
 * glance, without stealing a real user identity.
 */
export function resolveDisplayName(flag?: string): string {
  if (flag && flag.length > 0) return flag;
  const env = process.env.PINGARDEN_USER;
  if (env && env.length > 0) return env;
  const user = os.userInfo().username || 'anonymous';
  return `${user} (cli)`;
}
