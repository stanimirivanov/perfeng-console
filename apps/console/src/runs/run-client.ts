import { Effect } from 'effect';
import type { ArtifactObservation, ArtifactClaim } from '#perfeng/contracts';

import type { LookupResult } from './run-reader.port';

export function lookupRun(id: string) {
  return Effect.tryPromise(async (signal): Promise<LookupResult> => {
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
    if (!('createdAt' in value) || typeof value.createdAt !== 'string' ||
      !('finishedAt' in value) || !(value.finishedAt === null || typeof value.finishedAt === 'string') ||
      !('failureCode' in value) || !(value.failureCode === null || typeof value.failureCode === 'string') ||
      !('transitions' in value) || !value.transitions || typeof value.transitions !== 'object' || Array.isArray(value.transitions))
      throw new Error('Invalid Run detail');
    const transitions = value.transitions as Record<string, unknown>;
    if (!Object.hasOwn(transitions, value.state) || Object.values(transitions).some(edges =>
      !Array.isArray(edges) || edges.some(edge => typeof edge !== 'string' || !Object.hasOwn(transitions, edge))))
      throw new Error('Invalid transition graph');
    const artifacts = await artifactClaims(id, signal);
    if (artifacts.denied) throw new Error('Observation scope lost');
    return { observation: { value: { id, state: value.state, revision: value.revision, updatedAt: value.updatedAt,
      createdAt: value.createdAt, finishedAt: value.finishedAt, failureCode: value.failureCode,
      transitions: transitions as Record<string, string[]> }, validForMs: Math.min(body.validForMs, artifacts.validForMs) }, artifacts: artifacts.value };
  }).pipe(Effect.timeout(3000), Effect.catch(() => Effect.succeed({ message: 'Run lookup unavailable. Try again when connected.' })));
}

async function artifactClaims(id: string, signal: AbortSignal): Promise<{ value: ArtifactObservation; validForMs: number; denied?: boolean }> {
  let denied = false;
  try {
    const response = await fetch('/console/api/runs/' + encodeURIComponent(id) + '/artifacts', {
      signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'X-Perfeng-CSRF': 'read' },
    });
    denied = response.status === 401 || response.status === 403 || response.status === 404;
    if (!response.ok) throw new Error('Artifacts unavailable');
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('validForMs' in body) || typeof body.validForMs !== 'number' ||
      !Number.isFinite(body.validForMs) || body.validForMs <= 0 || body.validForMs > 10_000 ||
      !('value' in body) || !body.value || typeof body.value !== 'object' || !('artifacts' in body.value) || !Array.isArray(body.value.artifacts))
      throw new Error('Invalid artifact observation');
    const artifacts: ArtifactClaim[] = body.value.artifacts.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid artifact');
      const v = entry as Record<string, unknown>;
      if (v.runId !== id || !['id', 'kind', 'sha256', 'mediaType', 'format'].every(key => typeof v[key] === 'string') ||
          !/^[a-f0-9]{64}$/.test(String(v.sha256)) || !Number.isSafeInteger(v.sizeBytes) || Number(v.sizeBytes) < 0)
        throw new Error('Invalid artifact binding');
      return { id: String(v.id), runId: id, kind: String(v.kind), sha256: String(v.sha256),
        sizeBytes: Number(v.sizeBytes), mediaType: String(v.mediaType), format: String(v.format) };
    });
    return { value: { status: 'available', artifacts }, validForMs: body.validForMs };
  } catch { return { value: { status: 'unavailable' }, validForMs: 10_000, denied }; }
}
