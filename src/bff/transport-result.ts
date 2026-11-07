import type { operations } from '../generated/run.ts';

export type Run = operations['getRun']['responses'][200]['content']['application/json'];
export type Failure = 'invalid_input' | 'not_found' | 'forbidden' | 'unavailable' | 'invalid_response' | 'deadline' | 'aborted';
export type RunResult = { ok: true; run: Run } | { ok: false; reason: Failure };
