import { useEffect, useState } from 'react';
import type { Identity } from '@canvas-collab/shared';

const STORAGE_KEY = 'canvas-collab.identity';

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

function load(): Identity | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Identity;
  } catch {
    return null;
  }
}

/**
 * Lightweight identity for v1: a self-declared display name persisted in
 * localStorage. Send `displayName` as the `X-Display-Name` header on every
 * REST call, and broadcast it via Yjs awareness for presence.
 */
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(load);

  // keep in sync if another tab updates localStorage
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setIdentity(load());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function save(displayName: string) {
    const trimmed = displayName.trim().slice(0, 64);
    if (!trimmed) return;
    const clientId = identity?.clientId ?? uuid();
    const next: Identity = {
      displayName: trimmed,
      clientId,
      color: pickColor(clientId),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIdentity(next);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setIdentity(null);
  }

  return { identity, save, clear };
}
