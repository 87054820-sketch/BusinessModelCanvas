import { describe, expect, it } from 'vitest';
import { __keyConfigTest } from './useKeyConfig';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('useKeyConfig migration', () => {
  it('moves legacy Kimi keys into the model slot and removes the old slot', () => {
    const store = new MemoryStorage();
    store.setItem('pingarden.copilot.kimi-key', '{"blob":"old-kimi","isPlaintext":true}');

    __keyConfigTest.migrateLegacyStore('kimi', 'local', store);

    expect(store.getItem(__keyConfigTest.storageKey('kimi', 'local'))).toBe('{"blob":"old-kimi","isPlaintext":true}');
    expect(store.getItem('pingarden.copilot.kimi-key')).toBeNull();
  });

  it('removes stale legacy provider keys without overwriting a current model key', () => {
    const store = new MemoryStorage();
    store.setItem(__keyConfigTest.storageKey('kimi', 'local'), '{"blob":"current","isPlaintext":true}');
    store.setItem(__keyConfigTest.legacyProviderStorageKey('kimi-cli', 'local'), '{"blob":"stale","isPlaintext":true}');

    __keyConfigTest.migrateLegacyStore('kimi', 'local', store);

    expect(store.getItem(__keyConfigTest.storageKey('kimi', 'local'))).toBe('{"blob":"current","isPlaintext":true}');
    expect(store.getItem(__keyConfigTest.legacyProviderStorageKey('kimi-cli', 'local'))).toBeNull();
  });

  it('moves legacy model-scoped provider-key slots into the current key namespace', () => {
    const store = new MemoryStorage();
    store.setItem(__keyConfigTest.legacyModelStorageKey('kimi', 'session'), '{"blob":"model-kimi","isPlaintext":true}');

    __keyConfigTest.migrateLegacyStore('kimi', 'session', store);

    expect(store.getItem(__keyConfigTest.storageKey('kimi', 'session'))).toBe('{"blob":"model-kimi","isPlaintext":true}');
    expect(store.getItem(__keyConfigTest.legacyModelStorageKey('kimi', 'session'))).toBeNull();
  });

  it('migrates DeepSeek provider-scoped keys into the DeepSeek model slot', () => {
    const store = new MemoryStorage();
    store.setItem(__keyConfigTest.legacyProviderStorageKey('deepseek-http', 'session'), '{"blob":"deepseek","isPlaintext":true}');

    __keyConfigTest.migrateLegacyStore('deepseek', 'session', store);

    expect(store.getItem(__keyConfigTest.storageKey('deepseek', 'session'))).toBe('{"blob":"deepseek","isPlaintext":true}');
    expect(store.getItem(__keyConfigTest.legacyProviderStorageKey('deepseek-http', 'session'))).toBeNull();
  });

  it('migrates MiniMax provider-scoped keys into the MiniMax model slot', () => {
    const store = new MemoryStorage();
    store.setItem(__keyConfigTest.legacyProviderStorageKey('minimax-http', 'session'), '{"blob":"minimax","isPlaintext":true}');

    __keyConfigTest.migrateLegacyStore('minimax', 'session', store);

    expect(store.getItem(__keyConfigTest.storageKey('minimax', 'session'))).toBe('{"blob":"minimax","isPlaintext":true}');
    expect(store.getItem(__keyConfigTest.legacyProviderStorageKey('minimax-http', 'session'))).toBeNull();
  });
});
