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
 * The zip is produced by `scripts/package-mac.sh` at
 * `apps/cli/build/skill/pingarden-skill-<version>.zip`. The version is
 * content-hash-derived so identical canvas bundles always produce the
 * same filename.
 *
 * UX model (per 2026-06-22 user feedback): instead of distributing N
 * per-tool unzip commands the user has to copy + run themselves, we
 * provide ONE universal install prompt the user pastes into whichever
 * AI agent they're using. The AI agent (Claude Code / Cursor / Cline /
 * Code Buddy / Work Buddy / Roo / Kilo / …) detects itself, picks the
 * right install path, and runs `pingarden doctor` to verify the CLI.
 * The prompt itself lives in the renderer's i18n (it's a UI string,
 * not data); this endpoint just returns metadata + the supported-agent
 * list for the chip strip.
 *
 * Resolution order for the zip directory:
 *  1. `process.env.SKILL_PACK_DIR` (set by `electron.main.ts` in
 *     packaged builds, points at `<appResources>/skill-pack/`).
 *  2. Dev fallback: `<repoRoot>/apps/cli/build/skill/`, resolved
 *     relative to this file at import time.
 */

const SUPPORTED_AGENTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'cline', label: 'Cline' },
  { id: 'code-buddy', label: 'Code Buddy' },
  { id: 'work-buddy', label: 'Work Buddy' },
  { id: 'roo-code', label: 'Roo Code' },
  { id: 'kilo-code', label: 'Kilo Code' },
  { id: 'continue', label: 'Continue' },
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
        error: 'Skill pack not built yet. Run `pnpm package:mac` to produce one.',
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
        error: 'Skill pack not built yet. Run `pnpm package:mac` to produce one.',
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

