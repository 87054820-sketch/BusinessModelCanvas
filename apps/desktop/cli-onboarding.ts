import { spawn } from 'child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  promises as fsp,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { homedir } from 'os';
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
 *   2. Register the wrapper on PATH: prefer
 *      `/usr/local/bin/pingarden`, fall back to `~/.local/bin/pingarden`
 *      plus shell profile PATH entries when the global directory is not
 *      writable.
 *
 *   3. Run `pingarden skill install` against the user's
 *      `~/.claude/skills/pingarden/`. The skill generator is
 *      idempotent — it short-circuits on subsequent launches when
 *      the canvas content hash hasn't changed.
 *
 *   4. Write a refreshed onboarding readme to
 *      `<userData>/cli-readme.txt` with the resolved wrapper path and
 *      manual repair instructions.
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

export interface CliPathInstallResult {
  ok: boolean;
  target?: string;
  detail: string;
}

interface CliOnboardingRuntime {
  paths: CliOnboardingPaths;
  cliJs: string;
  cliAssets: string;
  wrapperPath: string;
  readmePath: string;
  logPath: string;
}

export function setupCliOnboarding(paths: CliOnboardingPaths): void {
  const runtime = resolveRuntime(paths);
  if (!existsSync(runtime.cliJs)) {
    // Packaging hiccup or dev mode — nothing to do, server log already shows the issue.
    return;
  }

  mkdirSync(dirname(runtime.logPath), { recursive: true });
  mkdirSync(dirname(runtime.wrapperPath), { recursive: true });

  void runOnboarding(runtime).catch(() => {
    // Best-effort. Errors are already logged by the helper itself.
  });
}

export async function installCliToPath(
  paths: CliOnboardingPaths,
  opts: { allowAdminPrompt?: boolean } = {},
): Promise<CliPathInstallResult> {
  const runtime = resolveRuntime(paths);
  const log = createLogger(runtime.logPath);
  if (!existsSync(runtime.cliJs)) {
    const detail = `Bundled CLI not found at ${runtime.cliJs}`;
    log(`manual PATH install failed: ${detail}`);
    return { ok: false, detail };
  }

  mkdirSync(dirname(runtime.logPath), { recursive: true });
  mkdirSync(dirname(runtime.wrapperPath), { recursive: true });
  writeWrapper(runtime, log);
  await writeReadme(runtime);
  return ensureCliOnPath(runtime, Boolean(opts.allowAdminPrompt), log);
}

function resolveRuntime(paths: CliOnboardingPaths): CliOnboardingRuntime {
  const logsDir = join(paths.userData, 'logs');
  const binDir = join(paths.userData, 'bin');
  return {
    paths,
    cliJs: join(paths.resourcesPath, 'cli', 'dist', 'index.js'),
    cliAssets: join(paths.resourcesPath, 'cli', 'assets', 'canvases'),
    wrapperPath: join(binDir, 'pingarden'),
    readmePath: join(paths.userData, 'cli-readme.txt'),
    logPath: join(logsDir, 'cli-onboarding.log'),
  };
}

async function runOnboarding(runtime: CliOnboardingRuntime): Promise<void> {
  const log = createLogger(runtime.logPath);

  log(`onboarding start (app v${runtime.paths.appVersion})`);
  writeWrapper(runtime, log);
  await writeReadme(runtime);
  await ensureCliOnPath(runtime, false, log);
  await installSkill(runtime, log);
  log('onboarding complete');
}

function createLogger(logPath: string): (line: string) => void {
  return (line: string) => {
    const stamped = `[${new Date().toISOString()}] ${line}\n`;
    try {
      mkdirSync(dirname(logPath), { recursive: true });
      writeFileSync(logPath, stamped, { flag: 'a' });
    } catch {
      // ignore
    }
  };
}

function writeWrapper(runtime: CliOnboardingRuntime, log: (line: string) => void): void {
  const wrapper = wrapperScript({
    electronExec: runtime.paths.electronExec,
    cliJs: runtime.cliJs,
  });
  try {
    writeFileSync(runtime.wrapperPath, wrapper, 'utf8');
    chmodSync(runtime.wrapperPath, 0o755);
    log(`wrote wrapper → ${runtime.wrapperPath}`);
  } catch (err) {
    log(`wrapper write failed: ${(err as Error).message}`);
  }
}

async function writeReadme(runtime: CliOnboardingRuntime): Promise<void> {
  try {
    await fsp.writeFile(runtime.readmePath, readmeBody(runtime.wrapperPath), 'utf8');
  } catch {
    /* ignore */
  }
}

async function installSkill(
  runtime: CliOnboardingRuntime,
  log: (line: string) => void,
): Promise<void> {
  const sentinelPath = join(runtime.paths.userData, '.cli-installed-app-version');
  let lastInstalled: string | null = null;
  try {
    if (existsSync(sentinelPath)) {
      lastInstalled = readFileSync(sentinelPath, 'utf8').trim();
    }
  } catch {
    /* fresh install */
  }
  if (lastInstalled === runtime.paths.appVersion) {
    log(`skill install skipped — sentinel matches app v${runtime.paths.appVersion}`);
    return;
  }

  await new Promise<void>((resolve) => {
    const proc = spawn(
      runtime.paths.electronExec,
      [runtime.cliJs, 'skill', 'install', '--bundles', runtime.cliAssets],
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
          writeFileSync(sentinelPath, runtime.paths.appVersion, 'utf8');
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
}

async function ensureCliOnPath(
  runtime: CliOnboardingRuntime,
  allowAdminPrompt: boolean,
  log: (line: string) => void,
): Promise<CliPathInstallResult> {
  const globalTarget = '/usr/local/bin/pingarden';
  const userTarget = join(homedir(), '.local', 'bin', 'pingarden');

  try {
    const status = linkWrapper(globalTarget, runtime.wrapperPath);
    const detail = status === 'already'
      ? `CLI already registered at ${globalTarget}`
      : `CLI registered at ${globalTarget}`;
    log(detail);
    return { ok: true, target: globalTarget, detail };
  } catch (err) {
    log(`direct global PATH install failed: ${(err as Error).message}`);
  }

  if (allowAdminPrompt) {
    try {
      await linkWrapperWithAdmin(globalTarget, runtime.wrapperPath);
      const detail = `CLI registered at ${globalTarget} with administrator approval`;
      log(detail);
      return { ok: true, target: globalTarget, detail };
    } catch (err) {
      log(`admin global PATH install failed: ${(err as Error).message}`);
    }
  }

  try {
    const status = linkWrapper(userTarget, runtime.wrapperPath);
    ensureUserLocalBinInShellProfiles(log);
    const detail = status === 'already'
      ? `CLI already registered at ${userTarget}`
      : `CLI registered at ${userTarget}; restart Terminal so shell profiles reload`;
    log(detail);
    return { ok: true, target: userTarget, detail };
  } catch (err) {
    const detail = `Unable to register pingarden on PATH: ${(err as Error).message}`;
    log(detail);
    return { ok: false, detail };
  }
}

function linkWrapper(target: string, wrapperPath: string): 'already' | 'linked' {
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) {
    const stat = lstatSync(target);
    if (!stat.isSymbolicLink()) {
      throw new Error(`${target} exists and is not a symlink`);
    }
    if (readlinkSync(target) === wrapperPath) {
      return 'already';
    }
    unlinkSync(target);
  }
  symlinkSync(wrapperPath, target);
  return 'linked';
}

async function linkWrapperWithAdmin(target: string, wrapperPath: string): Promise<void> {
  const command = [
    `mkdir -p ${shellQuote(dirname(target))}`,
    `if [ -e ${shellQuote(target)} ] && [ ! -L ${shellQuote(target)} ]; then exit 17; fi`,
    `rm -f ${shellQuote(target)}`,
    `ln -s ${shellQuote(wrapperPath)} ${shellQuote(target)}`,
  ].join(' && ');
  const appleScript = `do shell script ${JSON.stringify(command)} with administrator privileges`;
  await runProcess('/usr/bin/osascript', ['-e', appleScript], {
    ...process.env,
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  });
}

function ensureUserLocalBinInShellProfiles(log: (line: string) => void): void {
  const marker = '# PinGarden CLI PATH';
  const line = 'export PATH="$HOME/.local/bin:$PATH"';
  for (const file of [join(homedir(), '.zprofile'), join(homedir(), '.zshrc'), join(homedir(), '.bashrc')]) {
    try {
      const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
      if (current.includes(marker) || current.includes('$HOME/.local/bin')) continue;
      writeFileSync(file, `${current.endsWith('\n') || current.length === 0 ? '' : '\n'}${marker}\n${line}\n`, {
        flag: 'a',
      });
      log(`added ~/.local/bin PATH entry → ${file}`);
    } catch (err) {
      log(`shell profile update failed (${file}): ${(err as Error).message}`);
    }
  }
}

async function runProcess(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited ${code ?? 'null'}`));
    });
    proc.on('error', reject);
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
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

On launch, the Mac app now tries to register \`pingarden\` automatically:

  1. Prefer: /usr/local/bin/pingarden → ${wrapperPath}
  2. Fallback: ~/.local/bin/pingarden → ${wrapperPath}
     and add ~/.local/bin to zsh/bash shell profiles.

If \`pingarden doctor\` still says command not found, open the app menu:

  Help → Install CLI to PATH

That action can request administrator approval and will repair the
/usr/local/bin symlink without requiring Node.js or npm.

Manual repair commands:

  sudo ln -sfn "${wrapperPath}" /usr/local/bin/pingarden
  # or user-local fallback:
  mkdir -p ~/.local/bin && ln -sfn "${wrapperPath}" ~/.local/bin/pingarden

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
