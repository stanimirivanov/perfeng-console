import { Effect } from 'effect';
import { run_RunId } from '#perfeng/validators';
import { loadUpstreamConfig } from './config.ts';
import type { UpstreamConfig } from './config.ts';
import { createRunReader } from './run-reader.ts';
import type { RunResult, ArtifactResult } from './transport-result.ts';

/** Compose protected config and the qualified adapter; expose safe public results. */
export function createRunTransport(config: UpstreamConfig) {
  const read = createRunReader(loadUpstreamConfig(config));
  async function execute<Result, Error>(runId: string, operation: (id: string) => Effect.Effect<Result, Error>, signal?: AbortSignal): Promise<Result | { ok: false; reason: 'invalid_input' | 'aborted' | 'unavailable' }> {
    if (!run_RunId(runId)) return { ok: false, reason: 'invalid_input' };
    if (signal?.aborted) return { ok: false, reason: 'aborted' };
    try { return await Effect.runPromise(operation(runId), { signal }); }
    catch {
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      console.error('[transport-defect] Unexpected upstream operation failure');
      return { ok: false, reason: 'unavailable' };
    }
  }
  return {
    getRun: (id: string, signal?: AbortSignal): Promise<RunResult> => execute(id, read.getRun, signal),
    listArtifacts: (id: string, signal?: AbortSignal): Promise<ArtifactResult> => execute(id, read.listArtifacts, signal),
  };
}
