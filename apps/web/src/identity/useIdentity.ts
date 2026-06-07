import { useEffect, useState } from 'react';
import type { CanvasMeta, Identity, Project } from '@pingarden/shared';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const STORAGE_KEY = 'pingarden.identity';
const CHANGE_EVENT = 'pingarden:identity-change';
const ANONYMOUS = 'Anonymous';

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

let bootstrapPromise: Promise<Identity | null> | null = null;

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function candidateName(name: string | undefined, at: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === ANONYMOUS) return null;
  return { name: trimmed, at: at ?? '' };
}

function inferIdentity(projects: Project[], canvases: CanvasMeta[]): Identity | null {
  const candidates = [
    ...projects.flatMap((p) => [
      candidateName(p.updatedBy, p.updatedAt),
      candidateName(p.createdBy, p.createdAt),
    ]),
    ...canvases.flatMap((c) => [
      candidateName(c.updatedBy, c.updatedAt),
      candidateName(c.createdBy, c.createdAt),
    ]),
  ].filter((x): x is { name: string; at: string } => x !== null);

  candidates.sort((a, b) => b.at.localeCompare(a.at));
  return candidates[0] ? makeIdentity(candidates[0].name) : null;
}

async function bootstrapFromExistingData(): Promise<Identity | null> {
  const existing = load();
  if (existing) return existing;
  bootstrapPromise ??= Promise.all([
    fetchJson<Project[]>(`${BASE}/projects`),
    fetchJson<CanvasMeta[]>(`${BASE}/canvases`),
  ])
    .then(([projects, canvases]) => {
      const inferred = inferIdentity(projects, canvases);
      if (inferred) persist(inferred);
      return inferred;
    })
    .catch(() => null);
  return bootstrapPromise;
}

/**
 * Lightweight identity for v1: a self-declared display name persisted in
 * localStorage. If localStorage is empty but existing projects/canvases carry
 * author metadata, restore the most recent non-anonymous display name so a
 * server restart or fresh embedded preview does not ask again.
 *
 * Uses a custom DOM event so every useIdentity() instance in the same
 * window stays in sync (the native `storage` event only fires across tabs).
 */
export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(load);
  const [initializing, setInitializing] = useState(() => load() === null);

  useEffect(() => {
    let cancelled = false;

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setIdentity(load());
    }
    function onCustom() {
      setIdentity(load());
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom);

    bootstrapFromExistingData()
      .then((next) => {
        if (cancelled) return;
        if (next) {
          setIdentity(next);
          window.dispatchEvent(new Event(CHANGE_EVENT));
        }
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
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
    setInitializing(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setIdentity(null);
    setInitializing(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { identity, initializing, save, clear };
}
