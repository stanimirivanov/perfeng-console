import { Effect } from 'effect';
import type { LookupResult } from './operator-ports';

export type RunRead = (id: string) => Effect.Effect<LookupResult>;
type RunEvent = { kind: 'received'; result: Exclude<LookupResult, { message: string }> } |
  { kind: 'failed'; message: string } | { kind: 'expired' };

export function observeRun(id: string, read: RunRead, started: number, now: () => number,
  emit: (event: RunEvent) => boolean) {
  return Effect.gen(function* () {
    const result = yield* read(id.trim());
    if ('message' in result) { emit({ kind: 'failed', message: result.message }); return; }
    // Charge transit and processing against the lifetime, including time before fiber execution.
    const remaining = result.observation.validForMs - (now() - started);
    if (remaining > 0) {
      if (!emit({ kind: 'received', result })) return;
      yield* Effect.sleep(remaining);
    }
    emit({ kind: 'expired' });
  });
}
