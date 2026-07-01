import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthUser } from '@pingarden/shared';
import { config } from '../config.js';
import {
  createLocalSession,
  createOAuthState,
  createWeChatSession,
  getOptionalIdentity,
  sanitizeReturnTo,
  verifyOAuthState,
} from './identity.js';

const LocalLoginInput = z.object({
  deviceId: z.string().min(16).max(256),
});

const TestLoginInput = z.object({
  userId: z.string().min(1).max(120).optional(),
  openId: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().optional(),
}).optional();

interface WeChatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatUserInfoResponse {
  openid?: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export function registerAuthRoutes(app: FastifyInstance) {
  app.get('/me', async (req): Promise<AuthUser> => {
    const identity = getOptionalIdentity(req);
    if (!identity) return { authenticated: false };
    return {
      authenticated: true,
      userId: identity.userId,
      displayName: identity.displayName,
      ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
      provider: identity.provider,
      ...(identity.openId ? { openId: identity.openId } : {}),
      isLocalOnly: identity.isLocalOnly,
      canSyncToCloud: identity.canSyncToCloud,
      canUseTeams: identity.canUseTeams,
    };
  });

  app.get('/auth/wechat/status', async () => ({
    provider: 'wechat' as const,
    configured: !!(config.wechatAppId && config.wechatAppSecret && config.wechatRedirectUri),
    label: config.wechatAppId && config.wechatAppSecret && config.wechatRedirectUri
      ? 'ready' as const
      : 'pending' as const,
  }));

  app.post('/auth/local/start', async (req, reply) => {
    const input = LocalLoginInput.parse(req.body);
    const session = createLocalSession(input.deviceId);
    return reply.code(201).send(session);
  });

  app.get<{ Querystring: { returnTo?: string } }>('/auth/wechat/start', async (req, reply) => {
    if (!config.wechatAppId || !config.wechatAppSecret || !config.wechatRedirectUri) {
      return reply.redirect(buildLoginRedirectUrl(req.query.returnTo ?? '/'));
    }

    const state = createOAuthState(req.query.returnTo ?? '/');
    const params = new URLSearchParams({
      appid: config.wechatAppId,
      redirect_uri: config.wechatRedirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });
    return reply.redirect(`https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`);
  });

  app.get<{ Querystring: { code?: string; state?: string } }>('/auth/wechat/callback', async (req, reply) => {
    const state = verifyOAuthState(req.query.state);
    if (!state) {
      return reply.code(400).send({
        error: 'Invalid OAuth state',
        code: 'INVALID_OAUTH_STATE',
        message: 'WeChat login state is invalid or expired.',
      });
    }
    if (!req.query.code) {
      return reply.code(400).send({
        error: 'Missing WeChat code',
        code: 'WECHAT_CODE_REQUIRED',
        message: 'WeChat did not return an authorization code.',
      });
    }

    try {
      const wechatUser = await exchangeWeChatCode(req.query.code);
      const session = createWeChatSession(wechatUser);
      const target = buildAuthRedirectUrl(state.returnTo, session.accessToken);
      return reply.redirect(target);
    } catch (err) {
      req.log.warn({ err }, 'WeChat OAuth callback failed');
      return reply.code(502).send({
        error: 'WeChat login failed',
        code: 'WECHAT_AUTH_FAILED',
        message: err instanceof Error ? err.message : 'WeChat login failed.',
      });
    }
  });

  app.post('/auth/test-login', async (req, reply) => {
    if (!config.testAuthEnabled) return reply.callNotFound();
    const input = TestLoginInput.parse(req.body) ?? {};
    const openId = input.openId ?? input.userId ?? 'test-openid-1';
    const userId = input.userId ?? `wechat:test:${openId}`;
    const session = createWeChatSession({
      userId,
      openId,
      displayName: input.displayName ?? 'WeChat Test User',
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    });
    return session;
  });

  app.post('/auth/logout', async () => ({ ok: true as const }));
}

async function exchangeWeChatCode(code: string): Promise<{
  userId: string;
  openId: string;
  displayName?: string;
  avatarUrl?: string;
}> {
  if (!config.wechatAppId || !config.wechatAppSecret) {
    throw new Error('WeChat login is not configured for this environment.');
  }

  const tokenParams = new URLSearchParams({
    appid: config.wechatAppId,
    secret: config.wechatAppSecret,
    code,
    grant_type: 'authorization_code',
  });
  const token = await fetchJson<WeChatAccessTokenResponse>(
    `https://api.weixin.qq.com/sns/oauth2/access_token?${tokenParams.toString()}`,
  );
  if (token.errcode || !token.access_token || !token.openid) {
    throw new Error(token.errmsg || 'WeChat access token exchange failed.');
  }

  const userParams = new URLSearchParams({
    access_token: token.access_token,
    openid: token.openid,
    lang: 'zh_CN',
  });
  const user = await fetchJson<WeChatUserInfoResponse>(
    `https://api.weixin.qq.com/sns/userinfo?${userParams.toString()}`,
  );
  if (user.errcode) throw new Error(user.errmsg || 'WeChat profile fetch failed.');

  const openId = user.openid || token.openid;
  const unionId = user.unionid || token.unionid;
  return {
    userId: unionId ? `wechat:union:${unionId}` : `wechat:openid:${openId}`,
    openId,
    ...(user.nickname ? { displayName: user.nickname } : {}),
    ...(user.headimgurl ? { avatarUrl: user.headimgurl } : {}),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = (await res.json()) as T;
  if (!res.ok) throw new Error(`WeChat API returned HTTP ${res.status}.`);
  return body;
}

function buildAuthRedirectUrl(returnTo: string, accessToken: string): string {
  const target = new URL(sanitizeReturnTo(returnTo), config.webOrigin);
  target.hash = `pingarden_token=${encodeURIComponent(accessToken)}`;
  return target.toString();
}

function buildLoginRedirectUrl(returnTo: string): string {
  const target = new URL('/login', config.webOrigin);
  target.searchParams.set('returnTo', sanitizeReturnTo(returnTo));
  return target.toString();
}
