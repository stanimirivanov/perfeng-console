/** Admit nonnegative integral epoch milliseconds representable by JavaScript Date. */
export function isEpochInstant(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && !Number.isNaN(new Date(value).getTime());
}

/** Create one owner's lazy nondecreasing epoch reader.
 * Invalid/throwing reads return undefined without lowering the last accepted time.
 * Rejection does not retire the owner; callers retain their own failure policy.
 */
export function makeEpochReader(now: () => number): () => number | undefined {
  let highWater = -1;
  return () => {
    try {
      const value = now();
      if (!isEpochInstant(value) || value < highWater) return;
      highWater = value;
      return value;
    } catch { return; }
  };
}
