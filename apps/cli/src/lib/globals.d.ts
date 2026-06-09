// Build-time replacements injected by tsup `define`. In dev (running
// the source via tsx) these resolve to `undefined`; the consumers
// must check at the call site before reading.
declare const __PINGARDEN_CLI_VERSION__: string | undefined;
