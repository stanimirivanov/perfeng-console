import { transitions } from '#perfeng/run-transitions';
import type { ArtifactResult, RunResult } from './transport-result.ts';
import type { Observation, RunDetail, ArtifactClaim } from '#perfeng/contracts';

/** Scope provider failures and project only fields needed by the lookup screen. */
export function runObservation(result: RunResult): {
  status: number;
  body: Observation<RunDetail> | { reason: string; };
} {
  if (!result.ok) {
    switch (result.reason) {
      case 'invalid_input': return { status: 400, body: { reason: 'invalid_id' } };
      case 'forbidden':
      case 'not_found': return { status: 404, body: { reason: 'not_found' } };
      case 'deadline': return { status: 504, body: { reason: 'unavailable' } };
      case 'unavailable':
      case 'invalid_response':
      case 'aborted': return { status: 503, body: { reason: 'unavailable' } };
      default: {
        // New Failure members require an explicit safe projection.
        result.reason satisfies never;
        throw new Error('Unexpected Run failure');
      }
    }
  }
  const { id, state, revision, updatedAt, createdAt, finishedAt, failure } = result.run;
  return { status: 200, body: { value: { id, state, revision, updatedAt, createdAt, finishedAt: finishedAt ?? null, failureCode: failure?.code ?? null, transitions }, validForMs: 10_000 } };
}

/** Exclude provider storage locations; digests remain claims until bytes are verified. */
export function artifactObservation(result: ArtifactResult): {
  status: number;
  body: Observation<{ artifacts: ArtifactClaim[]; }> | { reason: string; };
} {
  if (!result.ok) {
    const { status } = runObservation(result);
    return { status, body: { reason: status === 404 ? 'not_found' : 'unavailable' } };
  }
  const artifacts = result.artifacts.map(({ id, runId, kind, sha256, sizeBytes, mediaType, format }) =>
    ({ id, runId, kind, sha256, sizeBytes, mediaType, format }));
  return { status: 200, body: { value: { artifacts }, validForMs: 10_000 } };
}

export type { RunResult, ArtifactResult } from './transport-result.ts';
