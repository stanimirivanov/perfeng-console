import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Effect } from 'effect';
import { delegateOnce } from '#perfeng/bff-delegated-exchange';

function fixture() {
  let posts = 0;
  let active = true;
  let now = 1000;
  let form = '';
  const deps = {
    active: () => active,
    now: () => now,
    issue: () => ({ client_id: 'perfeng-console-delegate', client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: 'private-assertion' }),
    post: (body: string) => Effect.sync(() => { posts++; form = body; return { ok: true as const, body: 'private-response' }; }),
    decode: () => ({ ok: true as const, candidates: { stage: 'unverified-delegated' as const, accessToken: 'candidate', expiresIn: 120 } }),
  };
  return { deps, posts: () => posts, form: () => new URLSearchParams(form), stop: () => { active = false; }, advance: (value: number) => { now = value; } };
}

test('delegation is lazy, fixed-profile and one-shot under concurrent execution', async () => {
  const f = fixture();
  const attempt = delegateOnce(f.deps, 'initial.access.token', 10000);
  assert.equal(f.posts(), 0);
  const results = await Promise.all([Effect.runPromise(attempt), Effect.runPromise(attempt)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(f.posts(), 1);
  assert.equal(f.form().get('audience'), 'perfeng-control-plane');
  assert.equal(f.form().get('subject_token'), 'initial.access.token');
  assert.equal(f.form().get('client_id'), 'perfeng-console-delegate');
  assert.equal(f.form().get('scope'), null);
});

test('invalid, expired, retired and wrong-client attempts never post', async () => {
  for (const mode of ['invalid', 'expired', 'retired', 'client', 'clock']) {
    const f = fixture();
    if (mode === 'retired') f.stop();
    if (mode === 'client') f.deps.issue = () => ({ client_id: 'perfeng-console-login', client_assertion_type: 'wrong', client_assertion: 'secret' });
    if (mode === 'clock') f.advance(NaN);
    const result = await Effect.runPromise(delegateOnce(f.deps, mode === 'invalid' ? '' : 'initial.access.token', mode === 'expired' ? 1000 : 10000));
    assert.equal(result.ok, false);
    assert.equal(f.posts(), 0);
  }
});

test('retirement or source expiry during POST cannot publish late candidates', async () => {
  for (const retire of [true, false]) {
    const f = fixture();
    f.deps.post = () => Effect.sync(() => {
      if (retire) f.stop(); else f.advance(10000);
      return { ok: true, body: 'private-response' };
    });
    assert.equal((await Effect.runPromise(delegateOnce(f.deps, 'initial.access.token', 10000))).ok, false);
  }
});

test('uncertain POST failure stays a failure and never retries', async () => {
  const f = fixture();
  let posts = 0;
  const deps = { ...f.deps, post: () => Effect.suspend(() => { posts++; return Effect.fail(new Error('private-canary')); }) };
  const attempt = delegateOnce(deps, 'initial.access.token', 10000);
  assert.equal((await Effect.runPromiseExit(attempt))._tag, 'Failure');
  assert.equal((await Effect.runPromise(attempt)).ok, false);
  assert.equal(posts, 1);
});

test('interruption remains failure and cannot reopen a consumed attempt', async () => {
  const f = fixture();
  const controller = new AbortController();
  const deps = { ...f.deps, post: () => Effect.sync(() => controller.abort()).pipe(Effect.andThen(Effect.never)) };
  const attempt = delegateOnce(deps, 'initial.access.token', 10000);
  assert.equal((await Effect.runPromiseExit(attempt, { signal: controller.signal }))._tag, 'Failure');
  assert.equal((await Effect.runPromise(attempt)).ok, false);
});

test('wire denials and invalid envelopes return only fixed private refusal fields', async () => {
  const f = fixture();
  const denied = { ...f.deps, post: () => Effect.succeed({ ok: false as const, reason: 'denied' as const }) };
  assert.deepEqual(await Effect.runPromise(delegateOnce(denied, 'initial.access.token', 10000)), { ok: false, reason: 'denied' });
  const invalid = { ...f.deps, decode: () => ({ ok: false as const, reason: 'invalid_response' as const }) };
  assert.deepEqual(await Effect.runPromise(delegateOnce(invalid, 'initial.access.token', 10000)), { ok: false, reason: 'invalid_response' });
});

test('source expiry while signing refuses before dispatch', async () => {
  const f = fixture();
  const issue = f.deps.issue;
  f.deps.issue = () => { f.advance(10000); return issue(); };
  assert.equal((await Effect.runPromise(delegateOnce(f.deps, 'initial.access.token', 10000))).ok, false);
  assert.equal(f.posts(), 0);
});

test('completion rollback after dispatch refuses before decoding and cannot replay', async () => {
  const f = fixture();
  const times = [1000, 1100, 1050];
  let decodes = 0;
  const deps = { ...f.deps, now: () => times.shift()!, decode: () => { decodes++; return f.deps.decode(); } };
  const attempt = delegateOnce(deps, 'initial.access.token', 10000);
  assert.deepEqual(await Effect.runPromise(attempt), { ok: false, reason: 'unavailable' });
  assert.equal(decodes, 0);
  assert.deepEqual(await Effect.runPromise(attempt), { ok: false, reason: 'unavailable' });
  assert.equal(f.posts(), 1);
});

test('equal or increasing completion retains the original response lifetime anchor', async () => {
  for (const finished of [1100, 1150]) {
    const f = fixture();
    const times = [1000, 1100, finished];
    const result = await Effect.runPromise(delegateOnce({ ...f.deps, now: () => times.shift()! }, 'initial.access.token', 10000));
    assert.deepEqual(result, { ok: true, candidates: { stage: 'unverified-delegated', accessToken: 'candidate', expiresIn: 120 }, requestStartedAtMs: 1000 });
    assert.equal(f.posts(), 1);
  }
});

test('invalid or throwing clocks refuse at every observation', async () => {
  for (const failedRead of [0, 1, 2]) {
    for (const badTime of [NaN, Infinity, -1, 1000.5, 'throw'] as const) {
      const f = fixture();
      let reads = 0;
      let decodes = 0;
      const deps = {
        ...f.deps,
        now: () => {
          if (reads++ !== failedRead) return 1000;
          if (badTime === 'throw') throw new Error('private-clock-failure');
          return badTime;
        },
        decode: () => { decodes++; return f.deps.decode(); },
      };
      assert.deepEqual(await Effect.runPromise(delegateOnce(deps, 'initial.access.token', 10000)), { ok: false, reason: 'unavailable' });
      assert.equal(decodes, 0);
      assert.equal(f.posts(), failedRead === 2 ? 1 : 0);
    }
  }
});
