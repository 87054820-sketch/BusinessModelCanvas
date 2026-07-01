import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, Identity } from '@pingarden/shared';

const AUTH_STORAGE_KEY = 'pingarden.authSession';
const LOCAL_DEVICE_KEY = 'pingarden.localDeviceId';
const AUTH_CHANGE_EVENT = 'pingarden:auth-change';
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export interface AuthSession {
  accessToken?: string;
  user?: AuthUser;
  provider?: AuthUser['provider'];
  expiresAt?: string;
}

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.accessToken || typeof parsed.accessToken !== 'string') return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistAuthSession(next: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function identityFromUser(user: AuthUser | undefined | null): Identity | null {
  if (!user?.authenticated || !user.userId) return null;
  const clientId = user.userId;
  const provider = user.provider ?? 'wechat';
  return {
    displayName: (user.displayName || (provider === 'local' ? '本机模式' : 'WeChat User')).slice(0, 64),
    clientId,
    color: pickColor(clientId),
    userId: user.userId,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    provider,
  };
}

function apiBaseForBrowserNavigation(): string {
  if (BASE) return BASE;
  if (typeof window === 'undefined') return '';
  if (window.location.port !== '5173') return '';
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

function normalizeReturnTo(returnTo: string | undefined): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';
  if (returnTo.startsWith('/auth/') || returnTo.startsWith('/login')) return '/';
  return returnTo;
}

async function fetchMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Session restore failed (${res.status})`);
  return (await res.json()) as AuthUser;
}

async function startLocalSession(deviceId: string): Promise<{
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}> {
  const res = await fetch(`${BASE}/auth/local/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error(`Local sign-in failed (${res.status})`);
  return (await res.json()) as {
    accessToken: string;
    expiresAt: string;
    user: AuthUser;
  };
}

function consumeWeChatTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const token = params.get('pingarden_token');
  if (!token) return null;
  params.delete('pingarden_token');
  const nextHash = params.toString();
  const nextUrl =
    window.location.pathname +
    window.location.search +
    (nextHash ? `#${nextHash}` : '');
  window.history.replaceState(window.history.state, '', nextUrl);
  return token;
}

function getOrCreateLocalDeviceId(): string {
  const existing = localStorage.getItem(LOCAL_DEVICE_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(LOCAL_DEVICE_KEY, generated);
  return generated;
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(getStoredAuthSession);

  useEffect(() => {
    function sync() {
      setSession(getStoredAuthSession());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AUTH_STORAGE_KEY) sync();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    const token = consumeWeChatTokenFromLocation();
    if (!token) return;
    void signInWithToken(token);
    // Run only once on mount. The callback token is removed from the URL immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithToken(accessToken: string, user?: AuthUser, expiresAt?: string) {
    const resolvedUser = user ?? await fetchMe(accessToken);
    const next: AuthSession = {
      accessToken,
      user: resolvedUser,
      provider: resolvedUser.provider ?? 'wechat',
      ...(expiresAt ? { expiresAt } : {}),
    };
    persistAuthSession(next);
    setSession(next);
    notifyAuthChanged();
  }

  function signInWithWeChat(returnTo?: string) {
    const current = `${window.location.pathname}${window.location.search}`;
    const target = normalizeReturnTo(returnTo ?? current);
    const authBase = apiBaseForBrowserNavigation();
    window.location.assign(`${authBase}/auth/wechat/start?returnTo=${encodeURIComponent(target)}`);
  }

  async function signInLocal() {
    const session = await startLocalSession(getOrCreateLocalDeviceId());
    const next: AuthSession = {
      accessToken: session.accessToken,
      user: session.user,
      provider: 'local',
      expiresAt: session.expiresAt,
    };
    persistAuthSession(next);
    setSession(next);
    notifyAuthChanged();
  }

  async function signOut() {
    const current = getStoredAuthSession();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    notifyAuthChanged();
    if (current?.accessToken) {
      await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${current.accessToken}` },
      }).catch(() => undefined);
    }
  }

  const user: AuthUser | null = session?.user ?? null;
  const identity = useMemo(() => identityFromUser(user), [user]);

  return {
    identity,
    session,
    user,
    authenticated: !!session?.accessToken && !!user?.authenticated,
    signInWithWeChat,
    signInLocal,
    signInWithToken,
    signOut,
  };
}
