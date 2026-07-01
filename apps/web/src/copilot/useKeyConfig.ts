import { useCallback, useEffect, useState } from 'react';
import type { CopilotModelId } from '../api/copilot';

type KeyStorageMode = 'session' | 'local';

const LEGACY_LOCAL_STORAGE_KEY = 'pingarden.copilot.kimi-key';
const LEGACY_SESSION_STORAGE_KEY = 'pingarden.copilot.kimi-key.session';
const STORAGE_PREFIX = 'pingarden.copilot.provider-key';
const CHANGE_EVENT = 'pingarden:copilot-key-change';

interface KeyRecord {
  /** base64 ciphertext (safeStorage) OR plaintext when encryption is unavailable */
  blob: string;
  isPlaintext: boolean;
  savedAt: string;
  storageMode?: KeyStorageMode;
}

interface LoadedKeyRecord extends KeyRecord {
  storageMode: KeyStorageMode;
}

interface ElectronSafeStorageBridge {
  available(): Promise<boolean>;
  encrypt(plaintext: string): Promise<string>;
  decrypt(base64: string): Promise<string>;
}

interface ElectronApiWindow {
  electronAPI?: {
    safeStorage?: ElectronSafeStorageBridge;
  };
}

function bridge(): ElectronSafeStorageBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as ElectronApiWindow).electronAPI?.safeStorage ?? null;
}

function storageKey(model: CopilotModelId, mode: KeyStorageMode): string {
  return `${STORAGE_PREFIX}.${model}.${mode}`;
}

function parseRecord(raw: string | null, fallbackMode: KeyStorageMode): LoadedKeyRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const c = parsed as Partial<KeyRecord>;
    if (typeof c.blob !== 'string' || typeof c.isPlaintext !== 'boolean') return null;
    return {
      blob: c.blob,
      isPlaintext: c.isPlaintext,
      savedAt: typeof c.savedAt === 'string' ? c.savedAt : new Date().toISOString(),
      storageMode: c.storageMode === 'session' || c.storageMode === 'local' ? c.storageMode : fallbackMode,
    };
  } catch {
    return null;
  }
}

function migrateLegacyKimiKey() {
  if (typeof sessionStorage !== 'undefined') {
    const legacy = sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
    const nextKey = storageKey('kimi', 'session');
    if (legacy && !sessionStorage.getItem(nextKey)) sessionStorage.setItem(nextKey, legacy);
  }
  if (typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    const nextKey = storageKey('kimi', 'local');
    if (legacy && !localStorage.getItem(nextKey)) localStorage.setItem(nextKey, legacy);
  }
}

function load(model: CopilotModelId): LoadedKeyRecord | null {
  if (model === 'kimi') migrateLegacyKimiKey();
  if (typeof sessionStorage !== 'undefined') {
    const sessionRecord = parseRecord(sessionStorage.getItem(storageKey(model, 'session')), 'session');
    if (sessionRecord) return sessionRecord;
  }
  if (typeof localStorage !== 'undefined') {
    return parseRecord(localStorage.getItem(storageKey(model, 'local')), 'local');
  }
  return null;
}

function persist(model: CopilotModelId, rec: KeyRecord | null, mode: KeyStorageMode) {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(storageKey(model, 'session'));
  if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey(model, 'local'));

  if (rec !== null) {
    const payload = JSON.stringify({ ...rec, storageMode: mode });
    if (mode === 'session' && typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey(model, 'session'), payload);
    if (mode === 'local' && typeof localStorage !== 'undefined') localStorage.setItem(storageKey(model, 'local'), payload);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export interface CopilotKeyConfig {
  hasKey: boolean;
  savedAt: string | null;
  storageMode: KeyStorageMode | null;
  rememberInBrowser: boolean;
  encryptionAvailable: boolean;
  encryptedAtRest: boolean;
  save(plaintextKey: string, opts?: { rememberInBrowser?: boolean }): Promise<void>;
  remove(): void;
  resolveKey(): Promise<string | null>;
}

export function useKeyConfig(model: CopilotModelId = 'kimi'): CopilotKeyConfig {
  const [record, setRecord] = useState<LoadedKeyRecord | null>(() => load(model));
  const [encryptionAvailable, setEncryptionAvailable] = useState<boolean>(false);

  useEffect(() => {
    setRecord(load(model));
  }, [model]);

  useEffect(() => {
    let cancelled = false;
    const b = bridge();
    if (!b) {
      setEncryptionAvailable(false);
      return;
    }
    void b
      .available()
      .then((ok) => {
        if (!cancelled) setEncryptionAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setEncryptionAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function refresh() {
      setRecord(load(model));
    }
    function onStorage(e: StorageEvent) {
      if (
        e.key?.startsWith(STORAGE_PREFIX) ||
        e.key === LEGACY_LOCAL_STORAGE_KEY ||
        e.key === LEGACY_SESSION_STORAGE_KEY
      ) {
        refresh();
      }
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [model]);

  const save = useCallback(async (plaintextKey: string, opts?: { rememberInBrowser?: boolean }) => {
    const mode: KeyStorageMode = opts?.rememberInBrowser ? 'local' : 'session';
    const b = bridge();
    let blob = plaintextKey;
    let isPlaintext = true;
    if (mode === 'local' && b && (await b.available().catch(() => false))) {
      try {
        blob = await b.encrypt(plaintextKey);
        isPlaintext = false;
      } catch {
        blob = plaintextKey;
        isPlaintext = true;
      }
    }
    const next: LoadedKeyRecord = {
      blob,
      isPlaintext,
      savedAt: new Date().toISOString(),
      storageMode: mode,
    };
    persist(model, next, mode);
    setRecord(next);
  }, [model]);

  const remove = useCallback(() => {
    persist(model, null, 'session');
    setRecord(null);
  }, [model]);

  /**
   * Resolve the plaintext key for the next chat turn. In cloud web mode
   * the key is session-scoped by default; if the user chooses to remember
   * this browser it is read from localStorage. The server receives it only
   * in the request body for the current test/chat request.
   */
  const resolveKey = useCallback(async (): Promise<string | null> => {
    const rec = load(model);
    if (!rec) return null;
    if (rec.isPlaintext) return rec.blob;
    const b = bridge();
    if (!b) return null;
    try {
      return await b.decrypt(rec.blob);
    } catch {
      return null;
    }
  }, [model]);

  return {
    hasKey: record !== null,
    savedAt: record?.savedAt ?? null,
    storageMode: record?.storageMode ?? null,
    rememberInBrowser: record?.storageMode === 'local',
    encryptionAvailable,
    encryptedAtRest: record !== null && !record.isPlaintext,
    save,
    remove,
    resolveKey,
  };
}
