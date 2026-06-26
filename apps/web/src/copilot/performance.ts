export interface CopilotClientTimingEvent {
  phase: string;
  elapsedMs: number;
  requestId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface CopilotLatencySnapshot {
  requestId?: string;
  client: Record<string, number>;
  server?: Record<string, number>;
  provider?: Record<string, number>;
}

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function roundMs(value: number): number {
  return Math.round(value);
}

export function safeTimingDetails(details: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') output[key] = value.slice(0, 120);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
  }
  return output;
}
