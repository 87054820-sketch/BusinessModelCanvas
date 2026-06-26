import { promises as fs } from 'node:fs';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';

/**
 * Mode B routes — distribute the PinGarden skill pack zip in-app instead
 * of as a separate file the user has to hand around.
 *
 *   GET  /copilot/skill-pack/info  → metadata + supported-agent list
 *   GET  /copilot/skill-pack       → streams the zip with Content-Disposition
 *
 * The zip is produced by `pnpm build:skill-pack` at
 * `apps/cli/build/skill/pingarden-skill-<version>.zip`. The version is
 * content-hash-derived so identical canvas/library bundles always produce
 * the same filename.
 *
 * UX model: the skill can be used in two modes. Without the PinGarden app
 * or CLI it still acts as an AI strategy-learning/advisor pack. With the
 * Mac app + `pingarden` CLI installed it additionally teaches agents how
 * to read and write local projects, canvases, snapshots, and case forks.
 * The install prompt itself lives in the renderer's i18n; this endpoint
 * returns metadata + the supported-agent list for the chip strip.
 *
 * Resolution order for the zip directory:
 *  1. `process.env.SKILL_PACK_DIR` (set by Electron packaged builds and
 *     by CloudRun, both pointing at a bundled `skill-pack`/build folder).
 *  2. Dev fallback: `<repoRoot>/apps/cli/build/skill/`, resolved
 *     relative to this file at import time.
 */

const SUPPORTED_AGENTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'claude', label: 'Claude' },
  { id: 'code-cursor', label: 'Code Cursor' },
  { id: 'codex', label: 'Codex' },
  { id: 'codebuddy', label: 'CodeBuddy' },
  { id: 'workbuddy', label: 'WorkBuddy' },
  { id: 'other', label: '其他' },
];

const here = dirname(fileURLToPath(import.meta.url));
const DEV_FALLBACK_DIR = resolvePath(here, '../../../cli/build/skill');

function resolveSkillPackDir(): string | null {
  const env = process.env.SKILL_PACK_DIR;
  if (env && existsSync(env)) return env;
  if (existsSync(DEV_FALLBACK_DIR)) return DEV_FALLBACK_DIR;
  return null;
}

interface ResolvedZip {
  dir: string;
  filename: string;
  fullPath: string;
  version: string;
  sizeBytes: number;
}

async function resolveLatestZip(): Promise<ResolvedZip | null> {
  const dir = resolveSkillPackDir();
  if (!dir) return null;
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const zips = entries.filter((f) => /^pingarden-skill-.+\.zip$/.test(f));
  if (zips.length === 0) return null;
  // Descending sort so the newest version wins when multiple zips
  // coexist (e.g. between releases). Filename is content-hash-versioned
  // so the order is stable and unambiguous.
  zips.sort().reverse();
  const filename = zips[0]!;
  const fullPath = join(dir, filename);
  const stat = statSync(fullPath);
  const version = filename.replace(/^pingarden-skill-/, '').replace(/\.zip$/, '');
  return { dir, filename, fullPath, version, sizeBytes: stat.size };
}

export function registerSkillPackRoutes(app: FastifyInstance) {
  app.get('/copilot/skill-pack/info', async (_req, reply) => {
    const zip = await resolveLatestZip();
    if (!zip) {
      return reply.code(503).send({
        error: 'Skill pack is not available in this build.',
        message: 'The PinGarden AI Strategy Skill Pack can be used standalone for strategy learning, or with the Mac app for connected canvas workflows. Run `pnpm build:skill-pack` before packaging or deploying to bundle it.',
        code: 'SKILL_PACK_NOT_BUILT',
      });
    }
    return reply.send({
      version: zip.version,
      filename: zip.filename,
      sizeBytes: zip.sizeBytes,
      supportedAgents: SUPPORTED_AGENTS,
    });
  });

  app.get('/copilot/skill-pack', async (_req, reply) => {
    const zip = await resolveLatestZip();
    if (!zip) {
      return reply.code(503).send({
        error: 'Skill pack is not available in this build.',
        message: 'The PinGarden AI Strategy Skill Pack can be used standalone for strategy learning, or with the Mac app for connected canvas workflows. Run `pnpm build:skill-pack` before packaging or deploying to bundle it.',
        code: 'SKILL_PACK_NOT_BUILT',
      });
    }
    const handle = await fs.open(zip.fullPath, 'r');
    const stream = handle.createReadStream();
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${zip.filename}"`);
    reply.header('Content-Length', String(zip.sizeBytes));
    return reply.send(stream);
  });
}

