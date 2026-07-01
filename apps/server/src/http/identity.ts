import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';

export type AuthProvider = 'wechat' | 'local';

export interface RequestIdentity {
  /** Stable identity used for permissions and storage ownership. */
  userId: string;
  /** Display-only audit name. Never used for permissions. */
  displayName: string;
  avatarUrl?: string;
  provider: AuthProvider;
  openId?: string;
  authenticated: true;
  authMode: AuthProvider;
  isLocalOnly: boolean;
  canSyncToCloud: boolean;
  canUseTeams: boolean;
}

export interface WeChatSessionInput {
  userId: string;
  openId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthSessionResult {
  accessToken: string;
  expiresAt: string;
  user: {
    authenticated: true;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    provider: AuthProvider;
    openId?: string;
    isLocalOnly: boolean;
    canSyncToCloud: boolean;
    canUseTeams: boolean;
  };
}

interface SessionPayload {
  typ: 'pingarden_session';
  sub: string;
  openId?: string;
  displayName: string;
  avatarUrl?: string;
  provider: AuthProvider;
  iat: number;
  exp: number;
}

interface OAuthStatePayload {
  typ: 'pingarden_oauth_state';
  returnTo: string;
  nonce: string;
  iat: number;
  exp: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function getIdentity(req: FastifyRequest): RequestIdentity | null {
  return getOptionalIdentity(req);
}

export function getOptionalIdentity(req: FastifyRequest): RequestIdentity | null {
  const token = parseBearer(req.headers.authorization);
  if (!token) return null;
  const payload = verifySignedPayload<SessionPayload>(token, 'pingarden_session');
  if (!payload) return null;
  return {
    userId: payload.sub,
    displayName: payload.displayName,
    ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
    provider: payload.provider,
    ...(payload.openId ? { openId: payload.openId } : {}),
    authenticated: true,
    authMode: payload.provider,
    ...capabilitiesForProvider(payload.provider),
  };
}

export function requireIdentity(
  req: FastifyRequest,
  reply: FastifyReply,
): RequestIdentity | null {
  const identity = getOptionalIdentity(req);
  if (identity) return identity;
  reply.code(401).send({
    error: 'Unauthorized',
    code: 'AUTH_REQUIRED',
    message: 'Please sign in to continue.',
  });
  return null;
}

export function createWeChatSession(input: WeChatSessionInput): AuthSessionResult {
  const displayName = (input.displayName?.trim() || `WeChat ${input.openId.slice(-6)}`).slice(0, 64);
  return createSession({
    userId: input.userId,
    openId: input.openId,
    displayName,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    provider: 'wechat',
  });
}

export function createLocalSession(deviceId: string): AuthSessionResult {
  const hash = createHash('sha256').update(deviceId).digest('hex');
  return createSession({
    userId: `local:${hash}`,
    displayName: '本机模式',
    provider: 'local',
  });
}

function createSession(input: {
  userId: string;
  displayName: string;
  provider: AuthProvider;
  openId?: string;
  avatarUrl?: string;
}): AuthSessionResult {
  const now = Date.now();
  const exp = now + SESSION_TTL_MS;
  const displayName = input.displayName.trim().slice(0, 64) || 'PinGarden User';
  const payload: SessionPayload = {
    typ: 'pingarden_session',
    sub: input.userId,
    displayName,
    ...(input.openId ? { openId: input.openId } : {}),
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    provider: input.provider,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  };
  const capabilities = capabilitiesForProvider(input.provider);
  const accessToken = signPayload(payload);
  return {
    accessToken,
    expiresAt: new Date(exp).toISOString(),
    user: {
      authenticated: true,
      userId: input.userId,
      displayName,
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      provider: input.provider,
      ...(input.openId ? { openId: input.openId } : {}),
      ...capabilities,
    },
  };
}

function capabilitiesForProvider(provider: AuthProvider) {
  const isLocalOnly = provider === 'local';
  return {
    isLocalOnly,
    canSyncToCloud: !isLocalOnly,
    canUseTeams: !isLocalOnly,
  };
}

export function createOAuthState(returnTo: string): string {
  const now = Date.now();
  const payload: OAuthStatePayload = {
    typ: 'pingarden_oauth_state',
    returnTo: sanitizeReturnTo(returnTo),
    nonce: `${now.toString(36)}-${Math.random().toString(36).slice(2)}`,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + OAUTH_STATE_TTL_MS) / 1000),
  };
  return signPayload(payload);
}

export function verifyOAuthState(state: string | undefined): OAuthStatePayload | null {
  if (!state) return null;
  return verifySignedPayload<OAuthStatePayload>(state, 'pingarden_oauth_state');
}

export function sanitizeReturnTo(raw: string | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  const trimmed = raw.slice(0, 500);
  if (trimmed.startsWith('/auth/') || trimmed.startsWith('/login')) return '/';
  return trimmed;
}

function parseBearer(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function signPayload(payload: SessionPayload | OAuthStatePayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(body);
  return `${body}.${signature}`;
}

function verifySignedPayload<T extends { typ: string; exp: number }>(
  token: string,
  expectedType: T['typ'],
): T | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createSignature(body);
  if (!safeEqual(signature, expected)) return null;
  const parsed = parseJson<T>(base64UrlDecode(body));
  if (!parsed || parsed.typ !== expectedType) return null;
  if (parsed.exp * 1000 <= Date.now()) return null;
  return parsed;
}

function createSignature(body: string): string {
  return createHmac('sha256', sessionSecret()).update(body).digest('base64url');
}

function sessionSecret(): string {
  if (config.sessionSecret) return config.sessionSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PINGARDEN_SESSION_SECRET is required in production.');
  }
  return 'pingarden-dev-session-secret';
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Optional decorator if any plugin wants `req.identity`. */
export async function identityPlugin(app: FastifyInstance) {
  app.decorateRequest('identity', null as unknown as RequestIdentity | null);
  app.addHook('onRequest', async (req) => {
    (req as FastifyRequest & { identity: RequestIdentity | null }).identity =
      getOptionalIdentity(req);
  });
}
