import { randomBytes, timingSafeEqual } from 'node:crypto';

const secret = () => randomBytes(32).toString('base64url');

function matches(actual: string | undefined, expected: string): boolean {
  return actual?.length === expected.length &&
    Buffer.byteLength(actual) === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

/** One in-memory operator grant per server startup. */
export function createSession(now = () => performance.now()) {
  const code = secret();
  const pairingEnd = now() + 300_000;
  let attempts = 0;
  let grant: { id: string; csrf: string; idleEnd: number; absoluteEnd: number } | undefined;
  function valid(id: string | undefined) {
    if (!grant) return;
    if (now() >= Math.min(grant.idleEnd, grant.absoluteEnd)) {
      grant = undefined;
      return;
    }
    if (matches(id, grant.id)) return grant;
  }
  return {
    code,
    pair(candidate: string) {
      if (attempts >= 5 || now() >= pairingEnd) return;
      attempts++;
      if (!matches(candidate, code)) return;
      attempts = 5;
      const start = now();
      grant = { id: secret(), csrf: secret(), idleEnd: start + 900_000, absoluteEnd: start + 28_800_000 };
      return { id: grant.id, csrf: grant.csrf };
    },
    read(id: string | undefined) {
      const active = valid(id);
      if (!active) return;
      active.idleEnd = now() + 900_000;
      return { csrf: active.csrf };
    },
    logout(id: string | undefined, csrf: string | undefined) {
      const active = valid(id);
      if (!active || !matches(csrf, active.csrf)) return false;
      grant = undefined;
      return true;
    },
  };
}
