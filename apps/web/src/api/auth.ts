import type { AuthUser } from '@pingarden/shared';
import { authHeaders } from './authHeaders';
import { ensureOk } from './errors';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export interface AuthSessionResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  await ensureOk(res);
  return (await res.json()) as T;
}

export const authApi = {
  wechatStatus(): Promise<{ provider: 'wechat'; configured: boolean; label: 'ready' | 'pending' }> {
    return fetchJson<{ provider: 'wechat'; configured: boolean; label: 'ready' | 'pending' }>(
      `${BASE}/auth/wechat/status`,
    );
  },
  localStart(deviceId: string): Promise<AuthSessionResponse> {
    return fetchJson<AuthSessionResponse>(`${BASE}/auth/local/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  },
  me(): Promise<AuthUser> {
    return fetchJson<AuthUser>(`${BASE}/me`, { headers: authHeaders() });
  },
  async logout(): Promise<void> {
    const res = await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
    await ensureOk(res);
  },
};
