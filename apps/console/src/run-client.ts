import { Effect } from 'effect';
import type { Observation, RunSummary } from '../../../src/presentation/observation';

type Lookup = { observation: Observation<RunSummary> } | { message: string };

export function lookupRun(id: string) {
  return Effect.tryPromise(async (signal): Promise<Lookup> => {
    const response = await fetch('/console/api/runs/' + encodeURIComponent(id), {
      signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'X-Perfeng-CSRF': 'read' },
    });
    if (response.status === 400) return { message: 'Enter a valid exact Run ID.' };
    if (response.status === 404) return { message: 'Run not found in this operator scope.' };
    if (response.status === 401) return { message: 'Session expired. Reload to pair again.' };
    if (!response.ok) throw new Error('Lookup unavailable');
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('value' in body) || !('validForMs' in body) ||
      typeof body.validForMs !== 'number' || !Number.isFinite(body.validForMs) ||
      body.validForMs <= 0 || body.validForMs > 10_000) throw new Error('Invalid freshness envelope');
    const value = body.value;
    if (!value || typeof value !== 'object' || !('id' in value) || value.id !== id ||
      !('state' in value) || typeof value.state !== 'string' ||
      !('revision' in value) || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) ||
      !('updatedAt' in value) || typeof value.updatedAt !== 'string') throw new Error('Invalid Run summary');
    return { observation: { value: { id, state: value.state, revision: value.revision, updatedAt: value.updatedAt }, validForMs: body.validForMs } };
  }).pipe(Effect.timeout(3000), Effect.catch(() => Effect.succeed({ message: 'Run lookup unavailable. Try again when connected.' })));
}
