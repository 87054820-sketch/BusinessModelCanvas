import { Command, Option } from 'clipanion';
import { CliError, exitCodeFor } from './errors.js';
import { createContext, type Context, type ContextOptions } from './context.js';
import { createOutput } from './output.js';

/**
 * Base class every command extends. Centralises the three flags
 * AI agents need on every invocation:
 *
 *   --server <url>   override server discovery
 *   --as     <name>  X-Display-Name (audit trail)
 *   --json           machine-readable output envelope
 *
 * Subclasses override `execute()` and use `this.makeContext()`.
 * They should NOT catch errors themselves — the wrapper here turns
 * `CliError` into the right exit code and renders via Output.
 */
export abstract class BaseCommand extends Command {
  server = Option.String('--server', { description: 'PinGarden server URL (overrides discovery)' });
  as = Option.String('--as', { description: 'Display name sent as X-Display-Name' });
  json = Option.Boolean('--json', false, { description: 'Output machine-readable JSON envelope' });

  /**
   * Build a context for this invocation. Subclasses pass `skipServer:
   * true` only when they want to render diagnostics about a missing
   * server (i.e. `doctor`).
   */
  protected makeContext(opts: Partial<ContextOptions> = {}): Context {
    return createContext({
      serverUrl: this.server,
      displayName: this.as,
      json: this.json,
      ...opts,
    });
  }

  /**
   * Wrapper around clipanion's run loop that turns thrown CliErrors
   * into structured output + correct exit codes. Subclasses implement
   * `run()` instead of `execute()` so this stays the single funnel.
   */
  override async execute(): Promise<number | undefined> {
    try {
      const result = await this.run();
      return typeof result === 'number' ? result : undefined;
    } catch (err) {
      // We need an Output even if context creation itself failed
      // (e.g. server not found). Build a minimal one from the flags.
      const output = createOutput(this.json);
      if (err instanceof CliError) {
        output.error(err);
        return exitCodeFor(err.code);
      }
      const e = err instanceof Error ? err : new Error(String(err));
      output.error(e);
      return 1;
    }
  }

  protected abstract run(): Promise<number | undefined | void>;
}
