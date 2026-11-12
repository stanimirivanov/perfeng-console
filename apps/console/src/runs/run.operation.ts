import { Effect } from 'effect';
import type { LookupResult, RunRead } from './run-reader.port';

type ReadOutcome = { kind: 'failed'; message: string } |
  ({ kind: 'received'; expiresAt: number } & Exclude<LookupResult, { message: string }>);

export function readRun(id: string, read: RunRead, started: number): Effect.Effect<ReadOutcome> {
  return Effect.map(read(id.trim()), result => 'message' in result
    ? { kind: 'failed', message: result.message }
    : { kind: 'received', ...result, expiresAt: started + result.observation.validForMs });
}
