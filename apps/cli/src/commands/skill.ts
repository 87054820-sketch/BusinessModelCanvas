import { Option } from 'clipanion';
import { rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import { BaseCommand } from '../lib/baseCommand.js';
import {
  discoverBundlesDir,
  discoverExperimentsDir,
  discoverPatternsDir,
} from '../skill/discover.js';
import { generateSkill, readInstalledHash } from '../skill/generate.js';

const GLOBAL_INSTALL_DIR = join(homedir(), '.claude', 'skills', 'pingarden');
const LOCAL_INSTALL_DIR = join('.claude', 'skills', 'pingarden');

// ─── Pure handlers ───────────────────────────────────────────────────────────

export function skillBuildHandler(args: {
  bundlesDir?: string;
  patternsDir?: string;
  experimentsDir?: string;
  outDir: string;
  langs?: Array<'en' | 'zh'>;
}) {
  const bundlesDir = discoverBundlesDir({ override: args.bundlesDir });
  // Patterns are optional — discoverPatternsDir returns null when no
  // patterns/ directory is found, and the generator gracefully omits
  // the patterns/ tree from the output when so.
  const patternsDir = discoverPatternsDir({
    ...(args.patternsDir !== undefined ? { override: args.patternsDir } : {}),
  });
  const experimentsDir = discoverExperimentsDir({
    ...(args.experimentsDir !== undefined ? { override: args.experimentsDir } : {}),
  });
  return generateSkill({
    bundlesDir,
    patternsDir,
    experimentsDir,
    outDir: args.outDir,
    ...(args.langs !== undefined ? { langs: args.langs } : {}),
  });
}

export function skillInstallHandler(args: {
  bundlesDir?: string;
  patternsDir?: string;
  experimentsDir?: string;
  local: boolean;
  dryRun: boolean;
  langs?: Array<'en' | 'zh'>;
}) {
  const targetDir = args.local
    ? resolve(LOCAL_INSTALL_DIR)
    : GLOBAL_INSTALL_DIR;
  const patternsDir = discoverPatternsDir({
    ...(args.patternsDir !== undefined ? { override: args.patternsDir } : {}),
  });
  const experimentsDir = discoverExperimentsDir({
    ...(args.experimentsDir !== undefined ? { override: args.experimentsDir } : {}),
  });

  if (args.dryRun) {
    // Run a build into a temp dir, then compare hash with installed.
    const tmp = `${targetDir}.preview`;
    const result = generateSkill({
      bundlesDir: discoverBundlesDir({ override: args.bundlesDir }),
      patternsDir,
      experimentsDir,
      outDir: tmp,
      ...(args.langs !== undefined ? { langs: args.langs } : {}),
    });
    const installedHash = readInstalledHash(targetDir);
    const wouldChange = installedHash !== result.contentHash;
    // Clean up the preview — it served its purpose.
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      // best-effort
    }
    return {
      targetDir,
      wouldChange,
      version: result.version,
      contentHash: result.contentHash,
      previousHash: installedHash,
      canvasIds: result.canvasIds,
      patternSlugs: result.patternSlugs,
      experimentSlugs: result.experimentSlugs,
    };
  }

  // Real install — short-circuit when hash matches.
  const installedHash = readInstalledHash(targetDir);
  // We need to compute the hash to know whether to skip. Run generate.
  const result = generateSkill({
    bundlesDir: discoverBundlesDir({ override: args.bundlesDir }),
    patternsDir,
    experimentsDir,
    outDir: targetDir,
    ...(args.langs !== undefined ? { langs: args.langs } : {}),
  });
  return {
    targetDir,
    version: result.version,
    contentHash: result.contentHash,
    previousHash: installedHash,
    upToDate: installedHash === result.contentHash,
    canvasIds: result.canvasIds,
    patternSlugs: result.patternSlugs,
    experimentSlugs: result.experimentSlugs,
  };
}

// ─── clipanion command classes ───────────────────────────────────────────────

export class SkillBuildCommand extends BaseCommand {
  static override paths = [['skill', 'build']];
  static override usage = BaseCommand.Usage({
    description: 'Generate the Claude skill markdown tree from canvas bundles',
    details: `
      Reads packages/canvases/* and emits a deterministic skill tree
      to --out. Re-running with the same inputs produces byte-identical
      output (verifiable with: pingarden skill build --out /tmp/a && pingarden skill build --out /tmp/b && diff -r /tmp/a /tmp/b).
    `,
    examples: [
      ['Build to a temp dir', '$0 skill build --out /tmp/skill-preview'],
    ],
  });

  out = Option.String('--out', { required: true, description: 'Output directory' });
  bundlesDir = Option.String('--bundles', { description: 'Override canvases dir (defaults to discovered)' });
  langOpt = Option.String('--lang', { description: 'en | zh | both (default both)' });

  protected async run() {
    const ctx = this.makeContext({ skipServer: true });
    const langs = parseLangsOption(this.langOpt);

    const bundleArgs: Parameters<typeof skillBuildHandler>[0] = { outDir: this.out };
    if (this.bundlesDir !== undefined) bundleArgs.bundlesDir = this.bundlesDir;
    if (langs !== undefined) bundleArgs.langs = langs;

    const result = skillBuildHandler(bundleArgs);
    ctx.output.print(result, (r) =>
      [
        pc.green(`✓ skill written to ${this.out}`),
        `  version       ${r.version}`,
        `  content hash  ${r.contentHash.slice(0, 12)}…`,
        `  files         ${r.files.length}`,
        `  canvases      ${r.canvasIds.length} (${r.canvasIds.join(', ')})`,
        `  patterns      ${r.patternSlugs.length}${r.patternSlugs.length > 0 ? ` (${r.patternSlugs.join(', ')})` : ''}`,
        `  experiments   ${r.experimentSlugs.length}${r.experimentSlugs.length > 0 ? ` (${r.experimentSlugs.join(', ')})` : ''}`,
      ].join('\n'),
    );
  }
}

export class SkillInstallCommand extends BaseCommand {
  static override paths = [['skill', 'install']];
  static override usage = BaseCommand.Usage({
    description: 'Install the skill into ~/.claude/skills/pingarden (or ./.claude/skills/pingarden with --local)',
    examples: [
      ['Global install (default)', '$0 skill install'],
      ['Project-local install', '$0 skill install --local'],
      ['Preview only', '$0 skill install --dry-run'],
    ],
  });

  local = Option.Boolean('--local', false, {
    description: 'Install to ./.claude/skills/pingarden (relative to cwd) instead of ~/.claude/skills/pingarden',
  });
  dryRun = Option.Boolean('--dry-run', false, {
    description: 'Build to a sibling preview dir and report whether install would change anything',
  });
  bundlesDir = Option.String('--bundles', { description: 'Override canvases dir' });
  langOpt = Option.String('--lang', { description: 'en | zh | both (default both)' });

  protected async run() {
    const ctx = this.makeContext({ skipServer: true });
    const langs = parseLangsOption(this.langOpt);

    const handlerArgs: Parameters<typeof skillInstallHandler>[0] = {
      local: this.local,
      dryRun: this.dryRun,
    };
    if (this.bundlesDir !== undefined) handlerArgs.bundlesDir = this.bundlesDir;
    if (langs !== undefined) handlerArgs.langs = langs;

    const result = skillInstallHandler(handlerArgs);

    ctx.output.print(result, (r) => {
      if (this.dryRun) {
        const r2 = r as { targetDir: string; wouldChange: boolean; version: string; previousHash: string | null };
        return [
          pc.bold('Skill install — DRY RUN'),
          `  target        ${r2.targetDir}`,
          `  version       ${r2.version}`,
          `  previous hash ${r2.previousHash ?? '(none — fresh install)'}`,
          r2.wouldChange
            ? pc.yellow('  status        would change')
            : pc.green('  status        up to date'),
        ].join('\n');
      }
      const r2 = r as { targetDir: string; upToDate: boolean; version: string; canvasIds: string[]; patternSlugs: string[]; experimentSlugs: string[] };
      return [
        pc.green(r2.upToDate ? '✓ skill up to date' : '✓ skill installed'),
        `  target        ${r2.targetDir}`,
        `  version       ${r2.version}`,
        `  canvases      ${r2.canvasIds.length}`,
        `  patterns      ${r2.patternSlugs.length}${r2.patternSlugs.length > 0 ? ` (${r2.patternSlugs.join(', ')})` : ''}`,
        `  experiments   ${r2.experimentSlugs.length}${r2.experimentSlugs.length > 0 ? ` (${r2.experimentSlugs.join(', ')})` : ''}`,
      ].join('\n');
    });
  }
}

function parseLangsOption(raw: string | undefined): Array<'en' | 'zh'> | undefined {
  if (raw === undefined || raw === 'both') return undefined;
  if (raw === 'en') return ['en'];
  if (raw === 'zh') return ['zh'];
  // Defer to clipanion's error for unknown values when used elsewhere.
  return undefined;
}
