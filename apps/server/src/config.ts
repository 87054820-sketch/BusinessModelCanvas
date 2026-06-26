import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export type CopilotAiProviderMode = 'kimi-cli' | 'kimi-http';

function parseAiProvider(raw: string | undefined): CopilotAiProviderMode {
  return raw === 'kimi-http' ? 'kimi-http' : 'kimi-cli';
}

/**
 * Centralised runtime configuration. Reads from process.env with sane defaults.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  /** Optional desktop instance marker used by Electron to avoid connecting to another local service. */
  desktopInstanceId: process.env.PINGARDEN_DESKTOP_INSTANCE_ID,
  /** Copilot provider: local/desktop defaults to Kimi CLI; CloudRun sets kimi-http. */
  aiProvider: parseAiProvider(process.env.PINGARDEN_AI_PROVIDER),
  /** Where canvas instance data + Yjs docs + snapshots live. */
  dataDir: resolve(process.env.DATA_DIR ?? resolve(here, '../data')),
  /** Where canvas-def asset bundles live. */
  canvasDefsDir: resolve(process.env.CANVAS_DEFS_DIR ?? resolve(here, '../../../packages/canvases')),
  /**
   * Where the read-only case-library bundle lives. Contains a top-level
   * `manifest.json` plus a `cases/<slug>/...` tree per shipped case.
   * In dev this points at the source `packages/case-library/`; in the
   * packaged Mac app the desktop main passes the bundled
   * `<.app>/Contents/Resources/case-library/` location via the env var.
   * BundleStorage tolerates this path being missing (zero cases).
   */
  caseLibraryDir: resolve(process.env.CASE_LIBRARY_DIR ?? resolve(here, '../../../packages/case-library')),
} as const;
