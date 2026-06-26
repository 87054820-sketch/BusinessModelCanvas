import { useCallback, useEffect, useState } from 'react';

type KeyStorageMode = 'session' | 'local';

const LOCAL_STORAGE_KEY = 'pingarden.copilot.kimi-key';
const SESSION_STORAGE_KEY = 'pingarden.copilot.kimi-key.session';
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

function load(): LoadedKeyRecord | null {
  if (typeof sessionStorage !== 'undefined') {
    const sessionRecord = parseRecord(sessionStorage.getItem(SESSION_STORAGE_KEY), 'session');
    if (sessionRecord) return sessionRecord;
  }
  if (typeof localStorage !== 'undefined') {
    return parseRecord(localStorage.getItem(LOCAL_STORAGE_KEY), 'local');
  }
  return null;
}

function persist(rec: KeyRecord | null, mode: KeyStorageMode) {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_KEY);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_KEY);

  if (rec !== null) {
    const payload = JSON.stringify({ ...rec, storageMode: mode });
    if (mode === 'session') sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
    else localStorage.setItem(LOCAL_STORAGE_KEY, payload);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useKeyConfig() {
  const [record, setRecord] = useState<LoadedKeyRecord | null>(load);
  const [encryptionAvailable, setEncryptionAvailable] = useState<boolean>(false);

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
      setRecord(load());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === LOCAL_STORAGE_KEY || e.key === SESSION_STORAGE_KEY) refresh();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

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
    persist(next, mode);
    setRecord(next);
  }, []);

  const remove = useCallback(() => {
    persist(null, 'session');
    setRecord(null);
  }, []);

  /**
   * Resolve the plaintext key for the next chat turn. In cloud web mode
   * the key is session-scoped by default; if the user chooses to remember
   * this browser it is read from localStorage. The server receives it only
   * in the request body for the current test/chat request.
   */
  const resolveKey = useCallback(async (): Promise<string | null> => {
    const rec = load();
    if (!rec) return null;
    if (rec.isPlaintext) return rec.blob;
    const b = bridge();
    if (!b) return null;
    try {
      return await b.decrypt(rec.blob);
    } catch {
      return null;
    }
  }, []);

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
