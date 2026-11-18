import { Effect } from 'effect';
import { makeSigningKeyResolver } from './signing-key-resolver.ts';
import { strictJsonObject } from '../identity-jwt/public-api.ts';

const profile = 'perfeng-key-cache-rotation-v1';
const checks = {
  initial: ['initial-old-key'],
  overlap: ['missing-key-refresh', 'overlap-old-and-new'],
  retired: ['fresh-old-key-retention', 'expired-old-key-refusal', 'new-key-survival'],
};
const exact = (value: Record<string, unknown>, fields: string) => Object.keys(value).sort().join(',') === fields;
const kid = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128;

/** One bounded byte stream; no text replacement, extra frames or incomplete EOF. */
function frames() {
  const iterator = process.stdin[Symbol.asyncIterator]();
  let buffered = Buffer.alloc(0);
  let total = 0;
  return async function next(): Promise<string | undefined> {
    while (true) {
      const newline = buffered.indexOf(10);
      if (newline >= 0) {
        const line = buffered.subarray(0, newline);
        buffered = buffered.subarray(newline + 1);
        return new TextDecoder('utf-8', { fatal: true }).decode(line);
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        if (buffered.length) timer = setTimeout(() => reject(new Error('partial frame')), 8000);
      });
      try {
        const value = await Promise.race([iterator.next(), deadline]);
        if (value.done) {
          if (buffered.length) throw new Error('incomplete');
          return undefined;
        }
        const chunk = Buffer.isBuffer(value.value) ? value.value : Buffer.from(value.value);
        total += chunk.length;
        if (total > 65536) throw new Error('input limit');
        buffered = Buffer.concat([buffered, chunk]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };
}

async function main() {
  try {
    if (process.argv.length !== 2) throw new Error('arguments');
    const next = frames();
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      yield* Effect.addFinalizer(() => Effect.sync(() => { process.stdin.destroy(); }));
      const first = strictJsonObject((yield* Effect.promise(next)) ?? '', { maxNodes: 128 });
      if (
        !exact(first, 'ca,issuer,newKeyId,oldKeyId,phase') || first.phase !== 'initial' ||
        !kid(first.oldKeyId) || first.newKeyId !== null ||
        typeof first.issuer !== 'string' || typeof first.ca !== 'string'
      ) throw new Error('initial');
      const origin = new URL(first.issuer);
      if (
        origin.href !== first.issuer || origin.protocol !== 'https:' || origin.hostname !== '127.0.0.1' ||
        !origin.port || origin.pathname !== '/realms/perfeng-fixture' ||
        origin.username || origin.password || origin.search || origin.hash
      ) throw new Error('origin');
      const issuer = first.issuer;
      const old = first.oldKeyId;
      let offset = 0;
      const resolver = yield* makeSigningKeyResolver({ issuer, ca: first.ca, now: () => Date.now() + offset });
      const requireKey = (id: string, present: boolean) => Effect.gen(function* () {
        const result = yield* resolver.resolveKey(id);
        if (present ? !result.ok || result.issuer !== issuer || result.key.kid !== id : result.ok || result.reason !== 'unknown_key') {
          throw new Error('key expectation');
        }
      });
      const acknowledge = (phase: keyof typeof checks) => Effect.sync(() => process.stdout.write(JSON.stringify({
        profile,
        phase,
        status: 'PASS',
        admission: 'NOT_ADMITTED',
        checks: checks[phase],
        ...(phase === 'retired' ? { clockAdvancesMs: [1001, 300001] } : {}),
      }) + '\n'));
      yield* requireKey(old, true);
      yield* acknowledge('initial');
      const overlap = strictJsonObject((yield* Effect.promise(next)) ?? '', { maxNodes: 128 });
      if (
        !exact(overlap, 'newKeyId,oldKeyId,phase') || overlap.phase !== 'overlap' ||
        overlap.oldKeyId !== old || !kid(overlap.newKeyId) || overlap.newKeyId === old
      ) throw new Error('overlap');
      const active = overlap.newKeyId;
      // Qualification-only offset: neither the host nor provider clock is changed.
      offset += 1001;
      yield* requireKey(active, true);
      yield* requireKey(old, true);
      yield* acknowledge('overlap');
      const retired = strictJsonObject((yield* Effect.promise(next)) ?? '', { maxNodes: 128 });
      if (
        !exact(retired, 'newKeyId,oldKeyId,phase') || retired.phase !== 'retired' ||
        retired.oldKeyId !== old || retired.newKeyId !== active
      ) throw new Error('retired');
      yield* requireKey(old, true);
      yield* requireKey(active, true);
      offset += 300001;
      yield* requireKey(old, false);
      yield* requireKey(active, true);
      yield* acknowledge('retired');
      if ((yield* Effect.promise(next)) !== undefined) throw new Error('extra frame');
    })).pipe(Effect.timeout(60000)));
  } catch {
    process.stdin.destroy();
    process.stdout.write(JSON.stringify({ profile, status: 'FAIL', admission: 'NOT_ADMITTED' }) + '\n');
    process.exitCode = 1;
  }
}
await main();
