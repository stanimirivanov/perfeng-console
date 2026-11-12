import type { Effect } from 'effect';
import type { Observation, RunDetail, ArtifactObservation } from '#perfeng/contracts';

export type LookupResult = { observation: Observation<RunDetail>; artifacts: ArtifactObservation } | { message: string; sessionDenied?: true };
export type RunRead = (id: string) => Effect.Effect<LookupResult>;
