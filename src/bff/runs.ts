import type { RunResult } from './transport-result.ts';
import type { Observation, RunSummary } from '#perfeng/contracts';

/** Scope provider failures and project only fields needed by the lookup screen. */
export function runObservation(result: RunResult): { status: number; body: Observation<RunSummary> | { reason: string } } {
  if (!result.ok) {
    switch (result.reason) {
      case 'invalid_input': return { status: 400, body: { reason: 'invalid_id' } };
      case 'forbidden':
      case 'not_found': return { status: 404, body: { reason: 'not_found' } };
      case 'deadline': return { status: 504, body: { reason: 'unavailable' } };
      default: return { status: 503, body: { reason: 'unavailable' } };
    }
  }
  const { id, state, revision, updatedAt } = result.run;
  return { status: 200, body: { value: { id, state, revision, updatedAt }, validForMs: 10_000 } };
}
