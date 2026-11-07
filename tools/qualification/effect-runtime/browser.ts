import { Effect, Fiber, Stream } from 'effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';

// Qualification only: this is a bounded byte reader, not a replacement contract client.
function operation(path: string, deadlineMs = 2000) {
  return Effect.scoped(Effect.gen(function* () {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin || !path.startsWith('/') || path.includes('\\')) {
      return yield* Effect.fail('destination');
    }
    const client = HttpClient.withScope(yield* HttpClient.HttpClient);
    const response = yield* client.get(url.href);
    // Strict equality rejects Fetch's comma-joined duplicate media values.
    if (response.status !== 200 || response.headers['content-type'] !== 'application/json' ||
      response.headers['content-encoding'] !== undefined) return yield* Effect.fail('response');
    let size = 0;
    const chunks: Uint8Array[] = [];
    yield* Stream.runForEach(response.stream, chunk => {
      size += chunk.byteLength;
      if (size > 4096) return Effect.fail('size');
      chunks.push(chunk);
      return Effect.void;
    });
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  })).pipe(
    Effect.timeout(deadlineMs),
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.RequestInit, {
      redirect: 'error', credentials: 'same-origin', cache: 'no-store',
    }),
  );
}
const read = (path: string, deadlineMs?: number) => Effect.runPromise(operation(path, deadlineMs).pipe(
  Effect.match({ onFailure: () => ({ ok: false as const }), onSuccess: text => ({ ok: true as const, text }) }),
));
let active: Fiber.Fiber<string, unknown> | undefined;
const probe = {
  read,
  start(path: string) { active = Effect.runFork(operation(path, 10000)); },
  async stop() { if (active) await Effect.runPromise(Fiber.interrupt(active)); },
};
declare global { interface Window { probe: typeof probe } }
window.probe = probe;
