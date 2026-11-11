import type { operations } from '#perfeng/run-types';

export type Run = operations['getRun']['responses'][200]['content']['application/json'];
export type Failure = 'invalid_input' | 'not_found' | 'forbidden' | 'unavailable' | 'invalid_response' | 'deadline' | 'aborted';
export type RunResult = { ok: true; run: Run } | { ok: false; reason: Failure };

export type Artifacts = operations['listRunArtifacts']['responses'][200]['content']['application/json']['artifacts'];
export type ArtifactResult = { ok: true; artifacts: Artifacts } | { ok: false; reason: Failure };
