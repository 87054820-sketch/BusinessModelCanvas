import { spawn } from 'child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  promises as fsp,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';

/**
 * First-launch CLI onboarding for the packaged Mac app.
 *
 * What it does (silent, best-effort):
 *
 *   1. Generate a wrapper shell script at `<userData>/bin/pingarden`
 *      that invokes the bundled CLI via Electron-as-Node. The wrapper
 *      pins the absolute paths of THIS install at write-time so the
 *      user's shell can find it without reflection.
 *
 *   2. Run `pingarden skill install` against the user's
 *      `~/.claude/skills/pingarden/`. The skill generator is
 *      idempotent — it short-circuits on subsequent launches when
 *      the canvas content hash hasn't changed.
 *
 *   3. Write a one-time onboarding readme to
 *      `<userData>/cli-readme.txt` with PATH instructions so users
 *      can wire `pingarden` into their shell.
 *
 * All output goes to `<userData>/logs/cli-onboarding.log`. Failures
 * never block app startup — this runs after the main window is
 * shown and is purely additive.
 */
export interface CliOnboardingPaths {
  userData: string;
  resourcesPath: string;
  electronExec: string;
  appVersion: string;
}

export function setupCliOnboarding(paths: CliOnboardingPaths): void {
  const cliJs = join(paths.resourcesPath, 'cli', 'dist', 'index.js');
  const cliAssets = join(paths.resourcesPath, 'cli', 'assets', 'canvases');
  if (!existsSync(cliJs)) {
    // Packaging hiccup or dev mode — nothing to do, server log already shows the issue.
    return;
  }

  const logsDir = join(paths.userData, 'logs');
  const logPath = join(logsDir, 'cli-onboarding.log');
  const binDir = join(paths.userData, 'bin');
  const wrapperPath = join(binDir, 'pingarden');
  const readmePath = join(paths.userData, 'cli-readme.txt');

  mkdirSync(logsDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });

  void runOnboarding({
    paths,
    cliJs,
    cliAssets,
    wrapperPath,
    readmePath,
    logPath,
  }).catch(() => {
    // Best-effort. Errors are already logged by the helper itself.
  });
}

async function runOnboarding(opts: {
  paths: CliOnboardingPaths;
  cliJs: string;
  cliAssets: string;
  wrapperPath: string;
  readmePath: string;
  logPath: string;
}): Promise<void> {
  const log = (line: string) => {
    const stamped = `[${new Date().toISOString()}] ${line}\n`;
    try {
      mkdirSync(dirname(opts.logPath), { recursive: true });
      // append synchronously — small writes, simpler than streams
      writeFileSync(opts.logPath, stamped, { flag: 'a' });
    } catch {
      // ignore
    }
  };

  log(`onboarding start (app v${opts.paths.appVersion})`);

  // 1. Wrapper script. Always rewrite so version bumps refresh the path.
  const wrapper = wrapperScript({
    electronExec: opts.paths.electronExec,
    cliJs: opts.cliJs,
  });
  try {
    writeFileSync(opts.wrapperPath, wrapper, 'utf8');
    chmodSync(opts.wrapperPath, 0o755);
    log(`wrote wrapper → ${opts.wrapperPath}`);
  } catch (err) {
    log(`wrapper write failed: ${(err as Error).message}`);
  }

  // 2. Onboarding readme — refresh on every launch so versioned paths stay current.
  try {
    await fsp.writeFile(opts.readmePath, readmeBody(opts.wrapperPath), 'utf8');
  } catch {
    /* ignore */
  }

  // 3. Skill install. The generator is idempotent (compares content
  // hash and no-ops on match), but each call still spawns a short
  // Electron-as-Node process. Skip the spawn entirely when our
  // recorded sentinel says we already installed for THIS app version.
  const sentinelPath = join(opts.paths.userData, '.cli-installed-app-version');
  let lastInstalled: string | null = null;
  try {
    if (existsSync(sentinelPath)) {
      lastInstalled = readFileSync(sentinelPath, 'utf8').trim();
    }
  } catch {
    /* fresh install */
  }
  if (lastInstalled === opts.paths.appVersion) {
    log(`skill install skipped — sentinel matches app v${opts.paths.appVersion}`);
    log('onboarding complete');
    return;
  }

  await new Promise<void>((resolve) => {
    const proc = spawn(
      opts.paths.electronExec,
      [opts.cliJs, 'skill', 'install', '--bundles', opts.cliAssets],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    proc.stdout.on('data', (d: Buffer) => log(`skill stdout: ${d.toString().trim()}`));
    proc.stderr.on('data', (d: Buffer) => log(`skill stderr: ${d.toString().trim()}`));
    proc.on('close', (code) => {
      log(`skill install exit ${code ?? 'null'}`);
      if (code === 0) {
        try {
          writeFileSync(sentinelPath, opts.paths.appVersion, 'utf8');
        } catch (err) {
          log(`sentinel write failed: ${(err as Error).message}`);
        }
      }
      resolve();
    });
    proc.on('error', (err) => {
      log(`skill install spawn error: ${err.message}`);
      resolve();
    });
  });

  log('onboarding complete');
}

function wrapperScript(opts: { electronExec: string; cliJs: string }): string {
  // POSIX shell wrapper. The Electron binary acts as Node.js when we
  // set ELECTRON_RUN_AS_NODE=1, so we don't need a separate Node install.
  // Quoting style: single-quote literals, escape any embedded single
  // quotes (paths are app-controlled but be safe).
  const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  return `#!/usr/bin/env bash
# PinGarden CLI wrapper — generated on first launch by the Mac app.
# This invokes the bundled CLI via Electron-as-Node, so you do not
# need a separate Node.js install. To uninstall, just delete this file.
ELECTRON_RUN_AS_NODE=1 exec ${q(opts.electronExec)} ${q(opts.cliJs)} "$@"
`;
}

function readmeBody(wrapperPath: string): string {
  return `PinGarden CLI — onboarding readme
====================================

The Mac app has installed a wrapper script at:

    ${wrapperPath}

That script makes the \`pingarden\` command-line tool available without
needing a separate Node.js install — it runs the bundled CLI through
the app's Electron binary in Node mode.

To use \`pingarden\` from any terminal, expose the wrapper on your PATH.
Pick the option that fits your setup:

  Option A — symlink into a directory already on PATH (easiest):
    ln -s "${wrapperPath}" /usr/local/bin/pingarden
    # If /usr/local/bin is not writable, try ~/.local/bin instead:
    mkdir -p ~/.local/bin && ln -s "${wrapperPath}" ~/.local/bin/pingarden

  Option B — add the bin directory to PATH (zsh):
    echo 'export PATH="${dirname(wrapperPath)}:$PATH"' >> ~/.zshrc
    source ~/.zshrc

  Option C — bash:
    echo 'export PATH="${dirname(wrapperPath)}:$PATH"' >> ~/.bashrc
    source ~/.bashrc

Verify:
    pingarden doctor

The skill (Claude Code methodology) is auto-installed at:
    ~/.claude/skills/pingarden

It is regenerated on every Mac app launch — idempotent, so unchanged
canvas content is a no-op.

Logs from onboarding:
    ${join(dirname(dirname(wrapperPath)), 'logs', 'cli-onboarding.log')}
`;
}
