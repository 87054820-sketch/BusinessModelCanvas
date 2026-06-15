import { useEffect, useState } from 'react';
import type { Identity } from '@pingarden/shared';

const STORAGE_KEY = 'pingarden.identity';
const CHANGE_EVENT = 'pingarden:identity-change';
const ANONYMOUS = 'Anonymous';

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

function makeIdentity(displayName: string, clientId = uuid()): Identity | null {
  const trimmed = displayName.trim().slice(0, 64);
  if (!trimmed || trimmed === ANONYMOUS) return null;
  return {
    displayName: trimmed,
    clientId,
    color: pickColor(clientId),
  };
}

function isIdentity(value: unknown): value is Identity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Identity>;
  return (
    typeof candidate.displayName === 'string' &&
    candidate.displayName.trim().length > 0 &&
    typeof candidate.clientId === 'string' &&
    candidate.clientId.trim().length > 0 &&
    typeof candidate.color === 'string' &&
    candidate.color.trim().length > 0
  );
}

function persist(next: Identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function load(): Identity | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Lightweight identity for v1: a self-declared display name persisted in
 * localStorage. If localStorage is empty, the App shell renders the
 * IdentityModal so the user can fill it in. The badge in the navbar
 * is clickable to re-open the modal in edit mode.
 *
 * Earlier versions silently bootstrapped from the most-recent
 * `createdBy` on `/projects` + `/canvases` to "remember" identity
 * across browser-data clears — that path is gone (Round 5, 2026-06-15)
 * because it leaked the bundled case library's `"PinGarden Library"`
 * audit-trail value into user identity on a fresh Mac install. Source
 * of truth is now strictly localStorage; the user types their name
 * once and can edit it via the badge button.
 *
 * Uses a custom DOM event so every useIdentity() instance in the same
 * window stays in sync (the native `storage` event only fires across tabs).
 */
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(load);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setIdentity(load());
    }
    function onCustom() {
      setIdentity(load());
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onCustom);
    };
  }, []);

  function save(displayName: string) {
    const clientId = identity?.clientId ?? uuid();
    const next = makeIdentity(displayName, clientId);
    if (!next) return;
    persist(next);
    setIdentity(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setIdentity(null);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { identity, save, clear };
}
