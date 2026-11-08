import { Effect } from 'effect';
import { run_RunId } from '#perfeng/validators';
import { loadUpstreamConfig } from './config.ts';
import type { UpstreamConfig } from './config.ts';
import { createRunReader } from './run-reader.ts';
import type { RunResult } from './transport-result.ts';

/** Compose protected config and the qualified adapter; expose safe public results. */
export function createRunTransport(config: UpstreamConfig) {
  const read = createRunReader(loadUpstreamConfig(config));
  return {
    async getRun(runId: string, signal?: AbortSignal): Promise<RunResult> {
      if (!run_RunId(runId)) return { ok: false, reason: 'invalid_input' };
      if (signal?.aborted) return { ok: false, reason: 'aborted' };
      try { return await Effect.runPromise(read(runId), { signal }); }
      catch {
        // Interruption rejects at the runtime boundary; never serialize its cause.
        if (signal?.aborted) return { ok: false, reason: 'aborted' };
        // Defects remain observable without logging credentials or upstream bytes.
        console.error('[transport-defect] Unexpected upstream operation failure');
        return { ok: false, reason: 'unavailable' };
      }
    },
  };
}
