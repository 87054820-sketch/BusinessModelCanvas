import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export type CopilotAiProviderMode = 'kimi-cli' | 'kimi-http' | 'deepseek-http' | 'minimax-http';
export type AuthMode = 'wechat';
export type StorageMode = 'filesystem' | 'cloudbase-sql';

function parseAiProvider(raw: string | undefined): CopilotAiProviderMode {
  if (raw === 'kimi-cli' || raw === 'deepseek-http' || raw === 'minimax-http') return raw;
  return 'kimi-http';
}

function parseAuthMode(raw: string | undefined): AuthMode {
  // Product auth is WeChat-only. The env var is retained so older
  // deployment configs do not crash, but every value resolves here.
  return raw === 'wechat' ? 'wechat' : 'wechat';
}

function parseStorageMode(raw: string | undefined): StorageMode {
  return raw === 'cloudbase-sql' ? 'cloudbase-sql' : 'filesystem';
}

/**
 * Centralised runtime configuration. Reads from process.env with sane defaults.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  /** Optional desktop instance marker used by Electron to avoid connecting to another local service. */
  desktopInstanceId: process.env.PINGARDEN_DESKTOP_INSTANCE_ID,
  /** Copilot provider: defaults to Kimi HTTP highspeed; set kimi-cli explicitly for local CLI debugging. */
  aiProvider: parseAiProvider(process.env.PINGARDEN_AI_PROVIDER),
  /** Internal deterministic/test-only providers. Hidden unless explicitly enabled or under test. */
  aiInternalProvidersEnabled:
    process.env.NODE_ENV === 'test' || process.env.PINGARDEN_EXPOSE_TEST_AI === '1',
  /** Optional local agent bridge. Requires aiInternalProvidersEnabled as well. */
  aiAgentBridgeEnabled: process.env.PINGARDEN_AI_AGENT_BRIDGE === '1',
  /** Product auth mode. Login is WeChat-only; display-name headers are not accepted. */
  authMode: parseAuthMode(process.env.PINGARDEN_AUTH),
  /** HMAC secret for PinGarden's short-lived server-issued sessions. Required in production. */
  sessionSecret: process.env.PINGARDEN_SESSION_SECRET,
  /** WeChat Open Platform OAuth credentials. */
  wechatAppId: process.env.WECHAT_APP_ID,
  wechatAppSecret: process.env.WECHAT_APP_SECRET,
  /** Public callback URL registered in WeChat Open Platform. */
  wechatRedirectUri: process.env.WECHAT_REDIRECT_URI,
  /** Frontend origin that receives the finished session token after OAuth callback. */
  webOrigin: process.env.PINGARDEN_WEB_ORIGIN,
  /** Hidden automation-only login. Never exposed in the product UI. */
  testAuthEnabled:
    process.env.NODE_ENV === 'test' || process.env.PINGARDEN_TEST_AUTH === '1',
  /** Storage mode: cloudbase-sql selects the database storage adapter seam. */
  storageMode: parseStorageMode(process.env.PINGARDEN_STORAGE),
  cloudbaseEnvId: process.env.CLOUDBASE_ENV_ID,
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
