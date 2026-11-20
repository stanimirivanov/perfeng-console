import { Data, Effect, Stream } from 'effect';

export class InvalidResponseBody extends Data.TaggedError('InvalidResponseBody') {}

/** Consume private response bytes without HTTP or JSON authority.
 * @param stream - Caller-owned byte stream; its errors and service requirements are preserved.
 * @param maxBytes - Positive adapter-admitted byte cap, currently at most 65536.
 * @returns Lazy text admission inside the caller's scope/deadline; refusals contain no response bytes.
 */
export function readBoundedUtf8<E, R>(stream: Stream.Stream<Uint8Array, E, R>, maxBytes: number): Effect.Effect<string, E | InvalidResponseBody, R> {
  return Effect.gen(function* () {
    let size = 0;
    const chunks: Uint8Array[] = [];
    yield* Stream.runForEach(stream, chunk => {
      size += chunk.byteLength;
      if (size > maxBytes) return Effect.fail(new InvalidResponseBody());
      chunks.push(chunk);
      return Effect.void;
    });
    if (size === 0) return yield* Effect.fail(new InvalidResponseBody());
    return yield* Effect.try({
      try: () => new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)),
      catch: () => new InvalidResponseBody(),
    });
  });
}
