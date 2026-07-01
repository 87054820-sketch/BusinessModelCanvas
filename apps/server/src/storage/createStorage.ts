import type { StorageMode } from '../config.js';
import type { CanvasStorage } from './CanvasStorage.js';
import { AccountScopedStorage } from './AccountScopedStorage.js';

export function createWritableStorage(mode: StorageMode, dataDir: string): CanvasStorage {
  if (mode === 'cloudbase-sql') return new AccountScopedStorage(`${dataDir}/cloudbase-sql`);
  return new AccountScopedStorage(dataDir);
}
