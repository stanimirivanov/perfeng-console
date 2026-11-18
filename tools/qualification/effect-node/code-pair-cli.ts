import { readFileSync } from 'node:fs';
import { Effect } from 'effect';
import { makeCodePairVerifier } from './code-pair-verifier.ts';
import { strictJsonObject } from '../identity-jwt/public-api.ts';

const profile = 'perfeng-keycloak-code-pair-v1';
const refused = { profile, status: 'FAIL', admission: 'NOT_ADMITTED' };

/** Own stdin until EOF/refusal; cap bytes and time before decoding or constructing I/O. */
function input(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0;
    const timer = setTimeout(() => finish(), 2000);
    function finish(text?: string) {
      clearTimeout(timer); process.stdin.removeAllListeners(); process.stdin.destroy();
      if (text === undefined) reject(new Error('refused')); else resolve(text);
    }
    process.stdin.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 65536) finish(); else chunks.push(chunk); });
    process.stdin.once('error', () => finish());
    process.stdin.once('end', () => { try { finish(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { finish(); } });
  });
}
const exact = (value: Record<string, unknown>, keys: string) => Object.keys(value).sort().join(',') === keys;

/** The qualification entry has no switches, credential environment or diagnostic output. */
async function main() {
  try {
    if (process.argv.length !== 2) throw new Error('refused');
    const value = strictJsonObject(await input(), { maxNodes: 128 });
    const candidates = value.candidates;
    if (!exact(value, 'ca,candidates,issuer,nonce,requestStartedAtMs') || typeof value.issuer !== 'string' || typeof value.ca !== 'string' ||
        typeof value.nonce !== 'string' || typeof value.requestStartedAtMs !== 'number' || !candidates || typeof candidates !== 'object' || Array.isArray(candidates)) throw new Error('refused');
    const body = candidates as Record<string, unknown>;
    if (!exact(body, 'accessToken,expiresIn,idToken,stage') || body.stage !== 'unverified-code' || typeof body.idToken !== 'string' || typeof body.accessToken !== 'string' || typeof body.expiresIn !== 'number') throw new Error('refused');
    const issuer = new URL(value.issuer);
    if (issuer.href !== value.issuer || issuer.protocol !== 'https:' || issuer.hostname !== '127.0.0.1' || !issuer.port || issuer.pathname !== '/realms/perfeng-fixture' || issuer.username || issuer.password || issuer.search || issuer.hash) throw new Error('refused');
    const expected: unknown = JSON.parse(readFileSync(new URL('./keycloak-fixture.json', import.meta.url), 'utf8'));
    if (!expected || typeof expected !== 'object' || !('subject' in expected) || typeof expected.subject !== 'string') throw new Error('refused');
    const request = { nonce: value.nonce, requestStartedAtMs: value.requestStartedAtMs, candidates: { stage: 'unverified-code' as const, idToken: body.idToken, accessToken: body.accessToken, expiresIn: body.expiresIn } };
    const result = await Effect.runPromise(Effect.scoped(Effect.flatMap(makeCodePairVerifier({ issuer: value.issuer, ca: value.ca }), verifier => verifier.verify(request))));
    if (!result.ok || result.subject !== expected.subject) throw new Error('refused');
    process.stdout.write(JSON.stringify({ profile, status: 'PASS', admission: 'NOT_ADMITTED', checks: ['fixed-origin-keys', 'signed-human-code-pair', 'expected-fixture-subject'] }) + '\n');
  } catch {
    process.stdout.write(JSON.stringify(refused) + '\n'); process.exitCode = 1;
  }
}
await main();
