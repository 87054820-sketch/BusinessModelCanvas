import { useCallback, useEffect, useState } from 'react';

/**
 * Single-provider hook managing the Kimi Code API key. Replaces the
 * Round 1 `useProviders` hook (which juggled 4 providers).
 *
 * Storage: the encrypted blob lives in localStorage under
 * `pingarden.copilot.kimi-key`. We use Electron's `safeStorage` via the
 * preload bridge (`window.electronAPI.safeStorage`) when available;
 * fall back to plaintext localStorage with a visible warning banner
 * when it's not (typical dev / pure-web case).
 *
 * The plaintext key never crosses HTTP except when the caller
 * explicitly hands it back via `resolveKey()` for a chat turn. The
 * server writes it into `~/.kimi-code/config.toml` just before spawning
 * the bundled kimi subprocess, then leaves it there for kimi to read.
 */

const STORAGE_KEY = 'pingarden.copilot.kimi-key';
const CHANGE_EVENT = 'pingarden:copilot-key-change';

interface KeyRecord {
  /** base64 ciphertext (safeStorage) OR plaintext when encryption is unavailable */
  blob: string;
  isPlaintext: boolean;
  savedAt: string;
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

function load(): KeyRecord | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const c = parsed as Partial<KeyRecord>;
    if (typeof c.blob !== 'string' || typeof c.isPlaintext !== 'boolean') return null;
    return parsed as KeyRecord;
  } catch {
    return null;
  }
}

function persist(rec: KeyRecord | null) {
  if (rec === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useKeyConfig() {
  const [record, setRecord] = useState<KeyRecord | null>(load);
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
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setRecord(load());
    }
    function onCustom() {
      setRecord(load());
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onCustom);
    };
  }, []);

  const save = useCallback(async (plaintextKey: string) => {
    const b = bridge();
    let blob = plaintextKey;
    let isPlaintext = true;
    if (b && (await b.available().catch(() => false))) {
      try {
        blob = await b.encrypt(plaintextKey);
        isPlaintext = false;
      } catch {
        // Best-effort fallback — better to save plaintext than reject
        // the user's pasted key with no path forward.
        blob = plaintextKey;
        isPlaintext = true;
      }
    }
    persist({ blob, isPlaintext, savedAt: new Date().toISOString() });
    setRecord({ blob, isPlaintext, savedAt: new Date().toISOString() });
  }, []);

  const remove = useCallback(() => {
    persist(null);
    setRecord(null);
  }, []);

  /**
   * Resolve the plaintext key for the next chat turn. Returns null when
   * the user hasn't saved one yet, OR when the encrypted blob can't be
   * decrypted (rare — most likely an OS keychain that disappeared
   * between launches; user will need to re-paste).
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
    encryptionAvailable,
    encryptedAtRest: record !== null && !record.isPlaintext,
    save,
    remove,
    resolveKey,
  };
}
