import pc from 'picocolors';
import { CliError } from './errors.js';

/**
 * Output formatter. Two modes:
 * - human (default): pretty text via `humanRender` callback if provided,
 *   else JSON pretty-printed for inspection.
 * - json (`--json`): `{ok, data}` or `{ok, error}` envelope. Stable
 *   shape so AI agents can parse without sniffing.
 */
export interface Output {
  print<T>(data: T, humanRender?: (data: T) => string): void;
  error(err: CliError | Error): void;
}

export function createOutput(json: boolean): Output {
  return {
    print<T>(data: T, humanRender?: (data: T) => string) {
      if (json) {
        process.stdout.write(JSON.stringify({ ok: true, data }) + '\n');
        return;
      }
      if (humanRender) {
        const out = humanRender(data);
        if (out.length > 0) process.stdout.write(out + '\n');
      } else {
        process.stdout.write(JSON.stringify(data, null, 2) + '\n');
      }
    },
    error(err: CliError | Error) {
      const isCli = err instanceof CliError;
      if (json) {
        const body = isCli
          ? { ok: false, error: { code: err.code, message: err.message, hint: err.hint, details: err.details } }
          : { ok: false, error: { code: 'UNKNOWN', message: err.message } };
        process.stderr.write(JSON.stringify(body) + '\n');
        return;
      }
      process.stderr.write(pc.red(`✗ ${err.message}\n`));
      if (isCli && err.hint) {
        process.stderr.write(pc.dim(`  ${err.hint}\n`));
      }
    },
  };
}

// Common human-render helpers
export function bullet(label: string, value: string | number | undefined): string {
  if (value === undefined || value === '') return '';
  return `  ${pc.dim(label.padEnd(14))} ${value}`;
}

export function table(rows: Array<Record<string, string | number | undefined>>): string {
  if (rows.length === 0) return pc.dim('(empty)');
  const cols = Object.keys(rows[0]!);
  const widths: Record<string, number> = {};
  for (const c of cols) {
    widths[c] = Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length));
  }
  const header = cols.map((c) => pc.bold(c.padEnd(widths[c]!))).join('  ');
  const sep = cols.map((c) => '─'.repeat(widths[c]!)).join('  ');
  const body = rows
    .map((r) =>
      cols.map((c) => String(r[c] ?? '').padEnd(widths[c]!)).join('  '),
    )
    .join('\n');
  return [header, pc.dim(sep), body].join('\n');
}
