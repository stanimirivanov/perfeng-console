# Node adapter qualification — Effect 4.1.2

Qualification snapshot: 2026-11-07. Issue: https://github.com/stanimirivanov/perfeng-console/issues/33

Result: **isolated candidate passes tested transport parity**. This is not production
admission. Root dependencies, production transport/config, generated types and Ajv are
unchanged. The older Fetch/import sketch probes remain failed in effect-runtime; this
candidate uses a different, separately pinned package and API.

## Exact candidate and sources

- @effect/platform-node 4.1.2 and effect 4.1.2, exact isolated manifest and lock.
- NodeHttpClient.layerNodeHttpOptions({ ca, minVersion: 'TLSv1.2',
  rejectUnauthorized: true, keepAlive: false }) supplies the Node backend.
- HttpClient.withScope and Effect.scoped own request closure; Effect.timeout encloses
  dispatch and body consumption. No setSignal API is needed.
- The exported NodeHttpIncomingMessage class exposes source: node:http.IncomingMessage.
  Check instanceof before reading source.headersDistinct. rawHeaders also preserves
  both header lines. Normalized response.headers alone is insufficient.

Official API: https://effect.website/docs/v4/api/platform-node/NodeHttpClient
Exact source: https://github.com/Effect-TS/effect/tree/%40effect%2Fplatform-node%404.1.2/packages/platform/node/src
Installed source inspected: NodeHttpClient.ts (agent options, scoped agent destruction,
Node response construction) and NodeHttpIncomingMessage.ts (exported source field).
These APIs are designated unstable; retain pins and repeat qualification on upgrades.

registry-metadata.json records official npm metadata and integrity. dependency-inventory.json
records 14 distinct resolved packages, all declaring MIT, with engines. The adapter requires
Node >=22.19.0 and Effect ^4.1.2; the repository pins Node 26.13.0 and Effect 4.1.2.
Undici and Redis peers are present in the resolved graph even though the selected HTTP
path does not use Redis. Production dependency review must consider that weight. No Redis
connection, credential, service or production authority is introduced. Lifecycle scripts
were disabled, release protections were not overridden, and frozen installation succeeded.
The isolated audit reported no known vulnerabilities; that is a dated scanner result.

## Reproduction

Run from the console repository root (existing pinned compiler/toolchain required):

```sh
pnpm --dir tools/qualification/effect-node install --frozen-lockfile --ignore-scripts
node_modules/.bin/tsc -p tools/qualification/effect-node/tsconfig.json
node --test tools/qualification/effect-node/parity.test.ts
node_modules/.bin/eslint tools/qualification/effect-node --max-warnings 0
pnpm --dir tools/qualification/effect-node audit --audit-level high
```

The tests need loopback sockets, openssl and permission to create disposable protected
credential files under the user's home, matching the existing config acceptance test.
All certificates and credentials are synthetic and cleaned up after the test. No live
control-plane request is made. Restricted execution required elevated process/network
permissions for the local tests.

## Results and preserved guarantees

Eleven subtests plus parent: 12 passed; 0 failed, skipped, cancelled or todo.

| Requirement | Evidence |
|---|---|
| Explicit CA | Local approved certificate succeeds; unrelated CA fails before an application request arrives |
| Hostname verification | localhost against IP-only certificate fails; connection count proves an actual connection attempt |
| Raw header access | Actual duplicate Content-Type response retains two raw lines and two headersDistinct entries |
| Strict header handling | Identical and differing duplicate media values rejected; content encoding rejected |
| Fixed origin and typed path | Existing URL/input rejection cases pass; valid Run goes to configured path |
| Credentials | Existing permission, ancestor, symlink/hardlink tests pass using unchanged protected config loader |
| Redirect refusal | 302 rejected; target receives zero requests; no redirect combinator enabled |
| Safe status mapping | 401/403, 404, 429/500 mapped without provider bodies or logs/canary leakage |
| Contract validation | Existing malformed JSON, extra-field and mismatched Run identity cases pass with unchanged Ajv |
| UTF-8 and bytes | Invalid UTF-8 and oversized streamed response rejected |
| Deadline | Dripping body exceeds whole-operation deadline; server observes response closure |
| Caller cancellation | Before headers and mid-body aborts produce safe outcomes; server observes closure within 2 s |
| Already cancelled | No additional upstream request |

Red-first evidence: copied existing parity assertions failed with candidate.ts absent.
After implementation, strict compilation exposed missing unknown-to-Run narrowing; a
validator-backed type guard fixed it without a cast or suppression. Additional wire
cases extend rather than weaken the original assertions. Test source was copied to keep
production tests unchanged; rebase against changes to the baseline before adoption.

Repository make verify passed, including original production tests and production build.
Fixture strict tsc and ESLint passed. Production transport/config/package/lock diff is empty.

## Limits and next admission gates

- This candidate allocates scoped agents per read (keepAlive false), matching the existing
  transport's non-pooled behavior. A shared process runtime/pool is not qualified here.
- TLSv1.2 floor now has a real TLSv1.1-only fixture: a deliberately permissive control connects, while the candidate rejects it. Permissive options exist only on this test control.
- An isolated BFF bridge now proves incoming-client disconnect closes upstream work. A forked process handles SIGTERM, drains active work and exits cleanly while the parent observes upstream closure. Production composition must retain these tests; the fixture is not a production auth/session server.
- Caller-before-deadline and deadline-before-caller cases have exact expected reasons. Simultaneous expiry permits either aborted or deadline, never success or leaked data; every case proves upstream closure.
- Raw source access couples this adapter to the pinned Node backend. It fails closed if
  another backend is substituted; never silently fall back to normalized headers.
- Final application error/defect diagnostics, shared runtime disposal and ownership
  sensors remain required. The fixture's public result boundary is not a canonical
  production architecture example.

Recommend this Node backend over the Fetch candidate for the BFF because it supplies
explicit TLS configuration and raw response evidence without a custom HTTP implementation.
Before changing production: review dependency admission and exact import paths, implement
ownership sensors, then migrate in the owning issue while preserving these assertions.
Keep openapi-typescript and Ajv; this qualification says nothing about generator adoption.

## Ownership/admission extension

The lifecycle.ts fixture was added after the extended tests failed on its missing import.
It bridges response-close to cancellation and owns shutdown draining. The existing
candidate transport is unchanged. Structural ownership tests independently failed on
missing scanner and on alias/native-dispatch bypasses before corrections. Runtime
qualification remains an explicit isolated command, not silently included in product
CI or used to convert the earlier blocked Fetch candidate into a passing result.

## Production migration follow-up (issue #33)

After owner approval, production src/bff/transport.ts composes src/bff/run-reader.ts
with @effect/platform-node 4.1.2. Root imports are now admitted only for those files;
the native transport legacy allowance is removed. Earlier unchanged-root statements
above describe the qualification snapshot. The isolated candidates remain historical
reproductions; current acceptance runs tests/integration/transport.test.ts through
make verify. openapi-typescript and Ajv remain in production.

## PR52i — fixed-origin signing-key wire candidate (issue #97)

The [isolated GET candidate](signing-key-get.ts) reuses the already pinned Effect
4.1.2 / platform-node 4.1.2 APIs and reviewed Node backend. No package/lock changes,
new production import, runtime route, credential deployment or root dependency
admission is made. This is a Keycloak-profile transport qualification, not a general
OIDC resolver, trusted key decoder or completion of control-plane issue #356.

Trusted construction accepts one canonical HTTPS realm issuer (no userinfo, query,
fragment, alias spelling or trailing slash) and derives only
`issuer + /protocol/openid-connect/certs`. A caller cannot pass a destination to
`get()`. The CA is explicitly supplied, a single bounded PEM CA certificate just
like the qualified token POST profile; this does not admit arbitrary CA bundles or
system/default roots. Endpoint, CA and limits are captured before returning the
lazy operation, so later caller mutation cannot redirect it.

The read uses TLS >=1.2, strict certificate/hostname verification, no keepalive,
proxy middleware, retry or redirect follower. It sends GET with JSON Accept, no
Authorization, form or other caller-controlled credential header. The caller owns
Effect execution/interruption; the operation scopes headers/body/finalizers and a
total deadline (default/maximum 3000 ms, configurable down to 50 ms).

The effective Node parser limit must be positive and <= 16384 bytes; an oversized
process-wide `--max-http-header-size` refuses construction, since this pinned adapter
does not expose an admitted per-request header-parser option. `node:http` supplies
only the readonly maxHeaderSize constant here; native outbound dispatch is not used.
Require a pinned Node response source, at most 128 raw header fields, exactly one
application/json media field, no content-encoding, and a valid bounded Content-Length
if present. Retained response bytes are limited while streaming, default/maximum
65536 bytes, configurable down to 256 bytes. Empty or malformed UTF-8 bodies refuse.
Media parameters may be present; actual decoding is always fatal UTF-8. Other media,
including application/jwk-set+json, require separate profile admission.

Only status 200 can succeed. 401/403/429/5xx map to unavailable; other statuses,
including redirects, map to invalid_response. Parser/TLS/network failures map to
unavailable and the total timeout maps to deadline. Refusal bodies are neither read
nor echoed. Interruption is propagated rather than swallowed into a fabricated
successful observation; unexpected defects remain in the Effect unknown error
channel for its owning composition boundary. This candidate is not an infallible API.

**Wire-only result:** `{ok: true, stage: "unverified-jwks", body}` contains bounded
text, not admitted keys or a signing-key snapshot. Tests intentionally accept an
empty keys array and an exact-limit non-JSON UTF-8 body to make that distinction
observable. JSON grammar/duplicate members, private or unsafe keys, duplicate kids,
key count/algorithm/material constraints, snapshot timestamp/freshness, cache and
rotation/refresh concurrency are **not qualified** by this wire success. Do not
feed body directly into a verifier as trusted material. The next decoder slice
must admit strict JSON and a bounded reviewed public-key set; later runtime/cache
and real Keycloak/BFF/browser gates remain NOT_ADMITTED. No token-selected jku,
x5u, issuer discovery or remote verification-key resolver is installed.

### Reproduction and CI

```sh
pnpm --dir tools/qualification/effect-node install --ignore-workspace --frozen-lockfile --ignore-scripts
make signing-key-wire-qualification
pnpm --dir tools/qualification/effect-node audit --audit-level high
```

The target repeats an offline frozen script-disabled fixture install, compiles the
explicit tsconfig roots, and runs existing parity/lifecycle tests plus the new real
TLS wire test. The existing identity-qualification workflow now bootstraps this
fixture, runs the target and audits its graph; it does not enable production.

The wire test covers exact endpoint/GET/no bearer, construction capture/laziness,
CA and hostname refusal, redirect/no retry, raw duplicate media/length headers,
parser/header count bounds, declared and streamed body bounds (including equality),
UTF-8/compression/media/empty-body refusal, proxy-environment isolation, raised native
parser refusal, config bounds, pre-abort and before-header/mid-body timeout/abort
cleanup. Keys/certificates are test-only and temporary. No real Keycloak receipt is
claimed. Roll back this candidate/test, explicit gate roots and CI steps together;
retain the historical Effect Node parity receipts and existing production adapter.
