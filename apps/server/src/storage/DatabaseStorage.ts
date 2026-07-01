import { join } from 'node:path';
import { FileSystemStorage } from './FileSystemStorage.js';

/**
 * Cloud database storage seam.
 *
 * The production CloudBase SQL adapter will implement `CanvasStorage`
 * here. For this repository build we keep a deterministic JSON-backed
 * implementation under `<DATA_DIR>/cloudbase-sql/` so `PINGARDEN_STORAGE`
 * can be switched and exercised without introducing cloud credentials or
 * network-only dependencies into local development.
 */
export class DatabaseStorage extends FileSystemStorage {
  constructor(root: string) {
    super(join(root, 'cloudbase-sql'));
  }
}
