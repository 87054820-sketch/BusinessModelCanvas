import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  createLocalSession,
  createOAuthState,
  createWeChatSession,
  getIdentity,
  getOptionalIdentity,
  identityPlugin,
  sanitizeReturnTo,
  verifyOAuthState,
  type RequestIdentity,
} from './identity';
import { registerAuthRoutes } from './auth';

function reqWithHeaders(headers: Record<string, unknown>): FastifyRequest {
  return { headers } as FastifyRequest;
}

describe('WeChat session identity', () => {
  it('treats requests without a signed bearer session as anonymous', () => {
    expect(getIdentity(reqWithHeaders({}))).toBeNull();
    expect(getOptionalIdentity(reqWithHeaders({ 'x-display-name': 'Ada' }))).toBeNull();
  });

  it('resolves signed WeChat sessions to stable user identity', () => {
    const session = createWeChatSession({
      userId: 'wechat:union:u-1',
      openId: 'openid-1',
      displayName: '李思博',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(
      getIdentity(reqWithHeaders({ authorization: `Bearer ${session.accessToken}` })),
    ).toEqual({
      userId: 'wechat:union:u-1',
      openId: 'openid-1',
      displayName: '李思博',
      avatarUrl: 'https://example.com/avatar.png',
      provider: 'wechat',
      authenticated: true,
      authMode: 'wechat',
      isLocalOnly: false,
      canSyncToCloud: true,
      canUseTeams: true,
    });
  });

  it('resolves signed local sessions to device-scoped user identity', () => {
    const session = createLocalSession('device-id-for-test-0001');
    expect(
      getIdentity(reqWithHeaders({ authorization: `Bearer ${session.accessToken}` })),
    ).toEqual({
      userId: session.user.userId,
      displayName: '本机模式',
      provider: 'local',
      authenticated: true,
      authMode: 'local',
      isLocalOnly: true,
      canSyncToCloud: false,
      canUseTeams: false,
    });
  });

  it('rejects tampered session tokens', () => {
    const session = createWeChatSession({
      userId: 'wechat:union:u-1',
      openId: 'openid-1',
      displayName: 'Ada',
    });
    const tampered = `${session.accessToken.slice(0, -3)}abc`;
    expect(getOptionalIdentity(reqWithHeaders({ authorization: `Bearer ${tampered}` }))).toBeNull();
  });

  it('signs and verifies OAuth state with a sanitized return path', () => {
    const state = createOAuthState('//evil.example/path');
    expect(verifyOAuthState(state)).toMatchObject({
      typ: 'pingarden_oauth_state',
      returnTo: '/',
    });
  });

  it('does not allow auth routes as OAuth return targets', () => {
    expect(sanitizeReturnTo('/auth/wechat/start?returnTo=%2F')).toBe('/');
    expect(sanitizeReturnTo('/login?returnTo=%2Fprojects')).toBe('/');
    expect(sanitizeReturnTo('/library')).toBe('/library');
  });
});

describe('identityPlugin', () => {
  it('decorates requests with the optional WeChat identity seam', async () => {
    const session = createWeChatSession({
      userId: 'wechat:union:u-1',
      openId: 'openid-1',
      displayName: '策略师',
    });
    const app = Fastify({ logger: false });
    await identityPlugin(app);
    app.get('/whoami', async (req) => {
      const identity = (req as FastifyRequest & { identity: RequestIdentity | null }).identity;
      return {
        identity,
        expected: getOptionalIdentity(req),
      };
    });

    const res = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { identity: RequestIdentity | null; expected: RequestIdentity | null };
    expect(body.identity).toEqual(body.expected);
    await app.close();
  });
});

describe('auth routes', () => {
  it('redirects unconfigured WeChat start to local login without preserving auth loops', async () => {
    const app = Fastify({ logger: false });
    registerAuthRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/auth/wechat/start?returnTo=%2Fauth%2Fwechat%2Fstart%3FreturnTo%3D%252F',
      headers: {
        host: 'pingarden.example.com',
        'x-forwarded-proto': 'https',
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?returnTo=%2F');
    await app.close();
  });

  it('starts a local session and exposes it through /me', async () => {
    const app = Fastify({ logger: false });
    registerAuthRoutes(app);

    const login = await app.inject({
      method: 'POST',
      url: '/auth/local/start',
      payload: { deviceId: 'device-id-for-route-test-0001' },
    });

    expect(login.statusCode).toBe(201);
    const session = login.json() as ReturnType<typeof createLocalSession>;
    expect(session.user).toMatchObject({
      authenticated: true,
      provider: 'local',
      displayName: '本机模式',
      isLocalOnly: true,
      canSyncToCloud: false,
      canUseTeams: false,
    });

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject(session.user);
    await app.close();
  });
});
