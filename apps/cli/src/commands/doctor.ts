import pc from 'picocolors';
import { existsSync } from 'node:fs';
import { BaseCommand } from '../lib/baseCommand.js';
import { discoverServer, HttpClient, type ServerInfo } from '../lib/server.js';
import { resolveDisplayName } from '../lib/identity.js';
import { createOutput } from '../lib/output.js';
import { CLI_VERSION } from '../lib/version.js';

interface DoctorReport {
  cliVersion: string;
  displayName: string;
  server:
    | { found: true; url: string; source: ServerInfo['source']; portFilePath?: string; reachable: boolean; health?: unknown }
    | { found: false; reason: string; hint?: string };
  skill: { installed: boolean; path: string };
}

/**
 * `pingarden doctor` — diagnose a fresh CLI install. Never throws;
 * always reports what it sees so the user can act on it. Useful as
 * the first call from a new AI session.
 */
export class DoctorCommand extends BaseCommand {
  static override paths = [['doctor']];

  static override usage = BaseCommand.Usage({
    description: 'Check connection to PinGarden server, identity, and skill install',
    examples: [['Run a basic health check', '$0 doctor']],
  });

  protected async run(): Promise<number> {
    const displayName = resolveDisplayName(this.as);
    const output = createOutput(this.json);

    const skillPath = `${process.env.HOME}/.claude/skills/pingarden`;
    const skillInstalled = existsSync(`${skillPath}/SKILL.md`);

    let report: DoctorReport;
    try {
      const server = discoverServer({ flag: this.server, env: process.env.PINGARDEN_SERVER });
      const reachable = await healthCheck(server.url, displayName);
      report = {
        cliVersion: CLI_VERSION,
        displayName,
        server: {
          found: true,
          url: server.url,
          source: server.source,
          portFilePath: server.portFilePath,
          reachable: reachable.ok,
          health: reachable.body,
        },
        skill: { installed: skillInstalled, path: skillPath },
      };
    } catch (err) {
      const e = err as { message?: string; hint?: string };
      report = {
        cliVersion: CLI_VERSION,
        displayName,
        server: { found: false, reason: e.message ?? 'unknown', hint: e.hint },
        skill: { installed: skillInstalled, path: skillPath },
      };
    }

    output.print(report, renderHuman);

    const ok = report.server.found && report.server.reachable;
    return ok ? 0 : 3;
  }
}

async function healthCheck(url: string, displayName: string): Promise<{ ok: boolean; body?: unknown }> {
  try {
    const client = new HttpClient(url, displayName);
    const body = await client.get<unknown>('/health');
    return { ok: true, body };
  } catch {
    return { ok: false };
  }
}

function renderHuman(r: DoctorReport): string {
  const lines: string[] = [];
  lines.push(pc.bold('PinGarden CLI'));
  lines.push(`  version       ${r.cliVersion}`);
  lines.push(`  identity      ${r.displayName}`);
  lines.push('');
  lines.push(pc.bold('Server'));
  if (r.server.found) {
    const ok = r.server.reachable;
    lines.push(`  status        ${ok ? pc.green('reachable') : pc.red('unreachable')}`);
    lines.push(`  url           ${r.server.url}`);
    lines.push(`  source        ${r.server.source}`);
    if (r.server.portFilePath) lines.push(`  port file     ${r.server.portFilePath}`);
  } else {
    lines.push(`  status        ${pc.red('not found')}`);
    lines.push(`  reason        ${r.server.reason}`);
    if (r.server.hint) lines.push(pc.dim(`  hint          ${r.server.hint}`));
  }
  lines.push('');
  lines.push(pc.bold('Skill'));
  lines.push(`  installed     ${r.skill.installed ? pc.green('yes') : pc.dim('no — run `pingarden skill install`')}`);
  lines.push(`  path          ${r.skill.path}`);
  return lines.join('\n');
}
