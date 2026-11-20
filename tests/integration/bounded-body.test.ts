import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Effect, Stream } from 'effect';
import { readBoundedUtf8 } from '#perfeng/bff-bounded-body';

const decode = (stream: Stream.Stream<Uint8Array>, limit: number) => Effect.runPromise(
  readBoundedUtf8(stream, limit).pipe(Effect.catchTag('InvalidResponseBody', () => Effect.succeed('invalid_response'))),
);

test('bounded UTF-8 reads accept exact bytes and characters split across chunks', async () => {
  const bytes = new TextEncoder().encode('a€');
  const body = Stream.make(bytes.subarray(0, 2), bytes.subarray(2));
  assert.equal(await decode(body, 4), 'a€');
  assert.equal(await decode(body, 3), 'invalid_response');
  assert.equal(await decode(Stream.make(new Uint8Array(4).fill(120)), 4), 'xxxx');
});

test('empty and malformed UTF-8 bodies refuse without returning input bytes', async () => {
  for (const stream of [Stream.empty, Stream.make(new Uint8Array()), Stream.make(new Uint8Array([0xff])), Stream.make(new Uint8Array([0xe2, 0x82]))]) {
    assert.equal(await decode(stream, 8), 'invalid_response');
  }
});

test('overflow terminates consumption before subsequent chunks are requested', async () => {
  let reached = false;
  const stream = Stream.concat(Stream.make(new Uint8Array(5)), Stream.fromEffect(Effect.sync(() => {
    reached = true;
    return new Uint8Array(1);
  })));
  assert.equal(await decode(stream, 4), 'invalid_response');
  assert.equal(reached, false);
});

test('stream errors retain their identity instead of becoming body admission failures', async () => {
  const failure = new Error('stream-failure');
  const stream = Stream.concat(Stream.make(new Uint8Array([120])), Stream.fail(failure));
  const result = await Effect.runPromise(readBoundedUtf8(stream, 4).pipe(Effect.catch(error => Effect.succeed(error))));
  assert.strictEqual(result, failure);
});

test('body reads are lazy and each execution owns its byte accumulation', async () => {
  let reads = 0;
  const stream = Stream.fromEffect(Effect.sync(() => { reads++; return new Uint8Array([120, 121]); }));
  const pending = readBoundedUtf8(stream, 2);
  assert.equal(reads, 0);
  assert.equal(await Effect.runPromise(pending), 'xy');
  assert.equal(await Effect.runPromise(pending), 'xy');
  assert.equal(reads, 2);
});
