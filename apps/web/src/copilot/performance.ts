export type CopilotStreamPhase =
  | 'idle'
  | 'preparing'
  | 'context'
  | 'baseline'
  | 'connecting'
  | 'waitingModel'
  | 'generating'
  | 'revealing'
  | 'done'
  | 'error';

export interface CopilotStreamStatus {
  phase: CopilotStreamPhase;
  startedAt: number;
  phaseStartedAt: number;
  requestId?: string;
  details?: Record<string, string | number | boolean | null>;
}

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

const PHASE_STEP_INDEX: Partial<Record<CopilotStreamPhase, number>> = {
  preparing: 0,
  context: 0,
  baseline: 0,
  connecting: 1,
  waitingModel: 2,
  generating: 3,
  revealing: 4,
  done: 4,
};

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function roundMs(value: number): number {
  return Math.round(value);
}

export function elapsedSeconds(startedAt: number, now = nowMs()): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function phaseStepIndex(phase: CopilotStreamPhase): number {
  return PHASE_STEP_INDEX[phase] ?? 0;
}

export function slowWaitLevel(phase: CopilotStreamPhase, phaseElapsedSeconds: number): 0 | 1 | 2 {
  if (phase === 'waitingModel') {
    if (phaseElapsedSeconds >= 15) return 2;
    if (phaseElapsedSeconds >= 5) return 1;
  }
  if ((phase === 'context' || phase === 'baseline') && phaseElapsedSeconds >= 2) return 1;
  if (phase === 'connecting' && phaseElapsedSeconds >= 4) return 1;
  if (phase === 'revealing' && phaseElapsedSeconds >= 2) return 1;
  return 0;
}

export function safeTimingDetails(details: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') output[key] = value.slice(0, 120);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
  }
  return output;
}
