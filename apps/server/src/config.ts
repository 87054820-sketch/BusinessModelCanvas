import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Centralised runtime configuration. Reads from process.env with sane defaults.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  /** Optional desktop instance marker used by Electron to avoid connecting to another local service. */
  desktopInstanceId: process.env.PINGARDEN_DESKTOP_INSTANCE_ID,
  /** Where canvas instance data + Yjs docs + snapshots live. */
  dataDir: resolve(process.env.DATA_DIR ?? resolve(here, '../data')),
  /** Where canvas-def asset bundles live. */
  canvasDefsDir: resolve(process.env.CANVAS_DEFS_DIR ?? resolve(here, '../../../packages/canvases')),
} as const;
