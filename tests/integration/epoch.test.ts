import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isEpochInstant, makeEpochReader } from '#perfeng/bff-epoch';

test('epoch instants are nonnegative integral milliseconds within the Date range', () => {
  for (const value of [0, 1, 1800000000000, 8640000000000000]) assert.equal(isEpochInstant(value), true);
  for (const value of [NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, 8640000000000001]) {
    assert.equal(isEpochInstant(value), false);
  }
});

test('epoch reader is lazy, accepts equality and retains high water after every refusal', () => {
  let value = 100;
  let throws = false;
  let reads = 0;
  const read = makeEpochReader(() => { reads++; if (throws) throw new Error('clock'); return value; });
  assert.equal(reads, 0);
  assert.equal(read(), 100);
  assert.equal(read(), 100);
  for (const invalid of [99, NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, 8640000000000001]) {
    value = invalid;
    assert.equal(read(), undefined);
    value = 99;
    assert.equal(read(), undefined);
    value = 100;
    assert.equal(read(), 100);
  }
  throws = true;
  assert.equal(read(), undefined);
  throws = false;
  value = 99;
  assert.equal(read(), undefined);
  value = 101;
  assert.equal(read(), 101);
  value = 100;
  assert.equal(read(), undefined);
});

test('epoch readers have independent high water and accept the epoch origin', () => {
  let value = 100;
  const first = makeEpochReader(() => value);
  const second = makeEpochReader(() => value);
  assert.equal(first(), 100);
  value = 0;
  assert.equal(first(), undefined);
  assert.equal(second(), 0);
});
