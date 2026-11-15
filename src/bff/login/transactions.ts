import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { run_RunId } from '#perfeng/validators';

import type { LoginReturnIntent } from './login-contracts.ts';
export type { LoginReturnIntent } from './login-contracts.ts';

function returnIntent(input: unknown): LoginReturnIntent | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value).sort().join(',');
  if (keys === 'kind' && value.kind === 'home') return { kind: 'home' };
  if (keys === 'kind,runId' && value.kind === 'run' && typeof value.runId === 'string' && run_RunId(value.runId)) return { kind: 'run', runId: value.runId };
}

const secret = () => randomBytes(32).toString('base64url');
const opaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

/** One process-owned login transaction store, separate from authenticated sessions.
 * Consume synchronously before any exchange I/O; a handoff is not login success.
 * The future HTTP adapter must protect browserBinding in an HttpOnly cookie and
 * send only authorization fields to the fixed issuer. No verifier leaves begin.
 */
export function createLoginTransactions(now = () => performance.now()) {
  const pending = new Map<string, { browserBinding: string; nonce: string; codeVerifier: string; expires: number; returnIntent: LoginReturnIntent }>();
  let stopped = false;
  let lastTime = 0;
  const stop = () => { stopped = true; pending.clear(); };
  const clock = () => {
    if (stopped) return;
    let time: number;
    try { time = now(); } catch { stop(); return; }
    if (!Number.isFinite(time) || time < lastTime) { stop(); return; }
    lastTime = time;
    for (const [state, transaction] of pending) if (time >= transaction.expires) pending.delete(state);
    return time;
  };
  return {
    begin(input: unknown) {
      const time = clock();
      const intent = returnIntent(input);
      // Never evict an active login to admit an attacker's new request.
      if (time === undefined || !intent || pending.size >= 128) return;
      const state = secret();
      if (pending.has(state)) return;
      const nonce = secret();
      const codeVerifier = secret();
      const browserBinding = secret();
      pending.set(state, { nonce, codeVerifier, browserBinding, expires: time + 300_000, returnIntent: intent });
      return {
        authorization: { state, nonce, codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'), codeChallengeMethod: 'S256' as const },
        browserBinding,
      };
    },
    consume(state: unknown, browserBinding: unknown) {
      if (clock() === undefined || !opaque(state) || !opaque(browserBinding)) return;
      const transaction = pending.get(state);
      if (!transaction || !timingSafeEqual(Buffer.from(browserBinding), Buffer.from(transaction.browserBinding))) return;
      // Burn the transaction before returning secrets to the future exchange
      // operation. Failure/cancellation there must require a fresh login.
      pending.delete(state);
      return { nonce: transaction.nonce, codeVerifier: transaction.codeVerifier, returnIntent: { ...transaction.returnIntent } };
    },
    stop,
  };
}
