import { readFileSync } from 'node:fs';

/**
 * Read JSON from `--file <path>`, stdin (if piped), or fail with a
 * helpful CliError. We deliberately do NOT support passing JSON as an
 * argv string — large payloads break shells, and `--file -` already
 * gives us a stdin escape hatch.
 */
export async function readJsonInput(filePath?: string): Promise<unknown> {
  if (filePath && filePath !== '-') {
    const raw = readFileSync(filePath, 'utf8');
    return safeParseJson(raw, `--file ${filePath}`);
  }
  if (process.stdin.isTTY && (filePath === undefined || filePath === '-')) {
    const { CliError } = await import('./errors.js');
    throw new CliError(
      'BAD_INPUT',
      'No input provided.',
      'Pipe JSON via stdin or pass --file <path>.',
    );
  }
  const raw = await readStream(process.stdin);
  return safeParseJson(raw, 'stdin');
}

export async function readTextInput(filePath?: string): Promise<string> {
  if (filePath && filePath !== '-') {
    return readFileSync(filePath, 'utf8');
  }
  if (process.stdin.isTTY && (filePath === undefined || filePath === '-')) {
    const { CliError } = await import('./errors.js');
    throw new CliError(
      'BAD_INPUT',
      'No input provided.',
      'Pipe content via stdin or pass --file <path>.',
    );
  }
  return readStream(process.stdin);
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function safeParseJson(raw: string, source: string): Promise<unknown> {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const { CliError } = await import('./errors.js');
    throw new CliError(
      'BAD_INPUT',
      `Could not parse JSON from ${source}: ${(err as Error).message}`,
    );
  }
}
