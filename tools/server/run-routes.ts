import type { IncomingMessage, ServerResponse } from 'node:http';
import { readAllowed } from './request-policy.ts';
import { artifactObservation, runObservation } from '#perfeng/bff-runs';
import type { RunResult, ArtifactResult } from '#perfeng/bff-runs';
import type { createSession } from '#perfeng/bff-session';

/** Consumer capability: safe provider results, caller cancellation, no transport construction. */
export interface RunReader {
  readonly getRun: (id: string, signal?: AbortSignal) => Promise<RunResult>;
  readonly listArtifacts: (id: string, signal?: AbortSignal) => Promise<ArtifactResult>;
}

// Bound encoded path work; semantic Run ID validation stays in the BFF transport.
const RUN_PATH = /^\/console\/api\/runs\/([^/?#]{1,300})(\/artifacts)?$/;
export function matchesRun(req: IncomingMessage): boolean { return req.method === 'GET' && RUN_PATH.test(req.url ?? ''); }

/** Own the pending HTTP read lifetime and recheck authority before releasing evidence. */
export async function handleRun(req: IncomingMessage, res: ServerResponse, session: ReturnType<typeof createSession>, id: string | undefined, runs: RunReader | undefined): Promise<void> {
  const path = req.url;
  const end = (status: number): void => { res.writeHead(status).end(); };
  const exactRun = RUN_PATH.exec(path ?? '');
  if (req.method === 'GET' && exactRun) {
    if (!readAllowed(req)) return end(403);
    if (!session.read(id)) return end(401);
    if (!runs) return end(503);
    let runId: string;
    try { runId = decodeURIComponent(exactRun[1]!); }
    catch { return end(400); }
    const cancel = new AbortController();
    res.once('close', () => cancel.abort());
    const result = exactRun[2]
      ? artifactObservation(await runs.listArtifacts(runId, cancel.signal))
      : runObservation(await runs.getRun(runId, cancel.signal));
    if (res.destroyed) return;
    if (!session.read(id)) return end(401);
    const { status, body } = result;
    return void res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  }
}
