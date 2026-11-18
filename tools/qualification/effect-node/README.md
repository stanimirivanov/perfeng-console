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
feed body directly into a verifier as trusted material. The [isolated PR52j decoder](../identity-jwt/README.md#pr52j-strict-signing-key-snapshot-admission--issue-99)
qualifies strict JSON and a bounded public-key selection separately. Actual
wire-to-decoder provenance composition, runtime/cache and real Keycloak/BFF/browser
gates remain NOT_ADMITTED. No token-selected jku,
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

## PR52k — real signing-key snapshot composition (issue #101)

`signing-key-source.ts` combines the qualified GET and strict decoder in one lazy
Effect operation. It captures issuer/CA/limits and the trusted clock function at
construction, creates the private fixed-origin wire adapter itself, and exposes
only `load()` without caller-supplied URLs, raw-reader callbacks or decoder choices.
The configured issuer passed to the wire and decoder comes from the same captured
primitive; response JSON cannot replace that association.

At execution the operation observes start time, performs the actual bounded GET,
then observes completion time. Clock exceptions, unsafe/non-Date-compatible values,
negative instants, rollback or elapsed time beyond 300000 ms return invalid_clock.
The decoder receives the original start as fetchedAtMs, conservatively charging
retrieval latency rather than granting a new freshness interval after decoding.
Wire failures remain safe wire failures; malformed/private/duplicate key documents
return invalid_jwks. Raw unverified text is never a successful source result.
Unexpected wire defects remain in the Effect unknown channel, not an infallibility
claim. Scoped interruption/deadline still closes upstream work; an explicit yield
before publication fences pending interruption after decoder admission.

This is an **isolated composition receipt**, not production admission, a key cache,
refresh scheduler or live-clock monitor after return. Repeated loads perform separate
reads. A later cache must enforce freshness at use, bounded single-flight/missing-key
refresh, rate/concurrency limits and outage behavior. Real Keycloak compatibility,
rotation, root dependency/runtime adoption and browser/shared-pilot gates remain
NOT_ADMITTED; control-plane issue #356 stays open.

The joint gate now installs **both existing isolated graphs** offline/frozen/scripts
disabled, compiles the operation and its decoder entry, and runs the real TLS joint
test alongside old parity/wire tests. Existing identity CI already bootstraps/audits
both graphs and runs the target. There is no new package or lockfile change. The
[exact reviewed public-entry link](../../../docs/IMPORTS.md#isolated-signing-key-composition-bridge--issue-101)
is needed because nested fixture package scopes cannot use root Node aliases.
It grants no production access or general cross-fixture import permission.

The joint test uses actual TLS+strict admission: mixed-public-key success, private/
duplicate/malformed documents and body-supplied time refusal, captured configuration,
start-versus-completion timestamp, unsafe/regressing/stale/throwing clocks and
mid-body timeout/abort cleanup. Certificates/keys are temporary and synthetic; this
is not a real Keycloak deployment receipt. Roll back operation/tests, public entry,
exact syntax/graph bridge and gate changes together without loosening production
boundaries or replacing strict decoder failure with raw wire success.

## PR52l — scoped fresh snapshot cache (issue #104)

`makeSigningKeyCache(config)` captures configuration synchronously and returns an
Effect requiring an owner Scope. Each acquisition creates independent clock history,
source, entry and reader permits. Its sole operation is `readSnapshot()`; it accepts
no issuer, URL or key ID at read time. Root production dependencies remain unchanged.

Pinned Effect 4.1.2 `ScopedCache.makeWith` owns one entry, shares pending retrievals
and interrupts the lookup after the last reader leaves. `Semaphore` admits at most
32 active readers without a waiting queue; overload returns unavailable. The 32-reader
cap is a conservative qualification choice, not an OIDC requirement or a refresh-rate
limit. Source refusals have zero retention; a later read may try again. Pending reads
share their original result, including a refusal, without a hidden retry. No background
refresh or timer is introduced; expired entries are cleaned lazily on access/closure.

Successful entries have a second, completion-relative TTL of 300000 ms. This never
replaces the authority check against the snapshot's **original retrieval start**:
each read observes trusted wall time before and after awaiting, accepts age 300000 ms
inclusively (the existing decoder policy), and refuses/refreshes older observations.
Reads do not renew the timestamp. A pre-read stale entry is conditionally removed by
identity, then one fresh load is awaited. An observation that becomes stale while
waiting is refused rather than returned. An unavailable source never authorizes use
of an expired snapshot. Consumers still need freshness checks at their actual use;
this is an observation-time promise, not a live-clock monitor after return.

Clock values must be safe, nonnegative, Date-compatible integer milliseconds. The
per-acquisition high-water mark covers cache and source observations; a clock exception
or rollback invalidates cached authority and returns invalid_clock. Recovery requires
a valid observation at or beyond that high-water mark; rollback cannot extend freshness.
The clock and issuer remain trusted configuration, not provider response fields.

The entry lookup explicitly forks the real source into the **entry Scope** and joins
that fiber. Installed ScopedCache closes entry scopes on owner shutdown but detaches
its lookup fiber; simply invoking source.load there left readers pending until the
transport deadline. The regression caught that behavior. Scoped child ownership now
closes the actual TLS operation promptly on owner shutdown. A second regression caught
awaiting pending entries during preflight, which caused a hidden second retrieval after
a shared refusal; non-awaiting completed-value inspection preserves single-flight.
Closed handles interrupt without fetching, and closing/cancelling cannot publish a late
snapshot. One caller's cancellation does not cancel another caller's shared retrieval.
Unexpected source defects retain the existing unknown Effect error channel.

Seven real-TLS tests cover exact freshness boundaries, expiry rotation, outage and
refusal retry, invalid/rollback clocks, post-await clock jumps, 32-reader sharing and
overload, individual/last-reader cancellation, owner shutdown and escaped handles,
independent acquisitions and captured configuration. The joint target and existing
identity CI execute them alongside all previous wire/parity/composition cases. No
real Keycloak or browser/session admission is claimed.

**NOT_ADMITTED for production:** missing-key lookup, bounded unknown-key refresh,
refresh-rate and negative-cache policy, real Keycloak rotation, application runtime
adoption, token verification/cache composition and shared-pilot/browser gates remain
required. There is deliberately no key-ID resolver or unimplemented policy stub here.
Roll back this cache/test, compiler roots and gate command together; retain the qualified
uncached source, strict decoder and existing production boundaries.

Builtin API evidence (pinned installed source inspected):
[ScopedCache](https://github.com/Effect-TS/effect/blob/effect%404.1.2/packages/effect/src/ScopedCache.ts),
[Semaphore](https://github.com/Effect-TS/effect/blob/effect%404.1.2/packages/effect/src/Semaphore.ts),
and [Effect scoped fibers](https://github.com/Effect-TS/effect/blob/effect%404.1.2/packages/effect/src/Effect.ts).

## PR52m — bounded unknown-key resolution (issue #106)

`makeSigningKeyResolver(config)` acquires a scoped `resolveKey(kid: unknown)` operation
for exactly one captured issuer/CA/clock/limits set. It returns an admitted immutable
RSA key with issuer and original fetchedAtMs, or a fixed safe refusal. IDs must be
strings of length 1..128, matching the admitted key profile; they never become URLs.
No token, claim, principal, enrollment or grant is created by this operation.

The original `makeSigningKeyCache` read-only interface and immediate independent
failure-retry behavior are preserved. Its implementation moves to an owner-local
snapshot store, shared by both factories. The new resolver owns the stronger load
gate and miss policy; the store privately constructs the real fixed-origin source.
There is no mode flag or caller-supplied network adapter in either public factory.

Resolver budgets are fixed conservative qualification choices, not universal OIDC
requirements: 32 active callers with no waiting queue; one actual source operation
per issuer with no wire-permit queue; at least 1000 ms between reserved wire starts,
including failed/interrupted attempts; and one miss-specific refresh per call within
a total 3000 ms deadline covering initial retrieval, refresh and body consumption.
Normal initial/stale loads share their primary entry; different missing IDs share a
single scoped refresh entry. A cold read immediately followed by a miss is denied
without an immediate second wire request. Rate-limited initial reads return unavailable;
rate-limited warm misses return unknown_key. Neither creates a negative entry.

Refresh loads independently and updates the primary store only after successful strict
admission, owner/interruption checks and a new clock/freshness check. An unavailable or
malformed refresh cannot evict a still-fresh known key. The store retains the original
retrieval-start timestamp; no refresh failure, read, rate refusal or negative hit can
renew its 300000 ms freshness bound. Expired known keys fail closed during outages.
Known keys are checked before miss state, so a successfully published rotation overrides
an older negative result immediately. The result is valid at its observation instant;
consumers must preserve freshness when using it later.

Only absence in a successfully refreshed, fresh admitted snapshot enters negative state.
The insertion-ordered map is bounded to 32 IDs, evicts its oldest insertion before a
33rd, expires entries after 30000 ms (inclusive equality allowed), clears on clock faults
or owner closure, and contains no key material. Its capacity/expiry tests use observable
wire counts rather than a state-inspection API. Rate/source/deadline refusals never
become evidence that the provider lacks a key. Negative entries intentionally suppress
repeat refresh attempts; a rotation may therefore remain unknown until expiry unless
another successful refresh publishes it earlier.

The gate shares the store's clock high-water mark. Invalid/rollback clocks refuse
without authority; a forward jump is rechecked after awaits and before publication.
The existing scoped-child ownership pattern shares concurrent refreshes, preserves
other readers when one cancels, interrupts remaining readers on owner closure and
prevents escaped handles from starting or publishing work. Unexpected defects remain
in the Effect unknown error channel; this is not an infallibility claim.

Six real-TLS resolver cases cover malformed IDs, cold/warm rotation, shared failed
refresh with known-key availability, rate reservations, 32-entry negative eviction/
expiry and generation precedence, 32-reader overload and scope cleanup, whole-request
deadline, expired-source outages, overlapping stale/miss wire refusal and clock rollback.
All seven original cache tests remain unchanged; the joint gate compiles and executes
both groups alongside historical transport/wire/composition cases. No new dependency,
production runtime or credential configuration is introduced.

**Still NOT_ADMITTED for production:** composing resolution with actual signed-token
verification, real Keycloak rotation/mixed-key compatibility, live BFF session integration,
root runtime/dependency admission and shared-pilot/browser qualification remain pending.
The resolver is not an authorization decision or proof of identity. Roll back the resolver,
store extraction, compiler roots and gate updates together, restoring the prior isolated
snapshot factory; preserve the production adapter and trust boundaries.

## PR52n — resolved-key code-token pair verification (issue #108)

`makeCodePairVerifier(config)` acquires a scoped `verify(request)` operation for one
captured issuer/CA/clock/limit set. Each request owns a deep copy of its nonce,
code-POST start and unverified token candidates before awaiting anything. A new
identity-fixture `codePairKeyIds` preflight shares the existing strict compact-token
parser and context bounds; it returns **only two untrusted bounded selectors**.
Malformed, duplicate-aware JSON/header/signature-shape or context failures cannot
start a key request. No unverified claim or token URL selects the configured issuer.

Each distinct ID is resolved once through the qualified resolver. The operation
requires exact issuer and key-ID correspondence, combines the minimal admitted keys
with the oldest retrieval start, then invokes the existing `verifyCodePair` profile,
signature, nonce, subject and time semantics at a fresh post-resolution observation.
Different IDs may legitimately resolve across rotation generations; the oldest timestamp
is conservative. Identical IDs are resolved once, so conflicting keys cannot be silently
merged. This is not a claim that both keys came from one HTTP response.

The complete pipeline has a fixed 3000 ms deadline and a nonblocking 32-operation
semaphore, including cryptographic work after resolver permits are released. There
are at most two cryptographic profile checks and no retries beyond the resolver's
existing bounded miss policy. Trusted wall time has its own per-owner high-water mark
shared into the resolver. After crypto, a new observation must preserve key age
<=300000 ms and strictly precede validUntilMs. Clock faults/rollback, owner closure,
caller interruption or timeout cannot publish late identity. JavaScript cryptographic
promises may finish internally after interruption; their results are discarded, not
published or claimed to be computationally preempted.

Success exposes only issuer, subject and conservative validUntilMs. Safe refusals are
invalid_pair, unavailable or deadline; no credential, claim set, key document or error
text escapes. Source defects retain the existing unknown Effect channel. The exact
[public-entry bridge](../../../docs/IMPORTS.md#isolated-signing-key-composition-bridge--issue-101)
admits only this importer and named value/type members; production/private/dynamic
access remains forbidden by syntax and resolved-graph tests. Both isolated package
pins remain unchanged; identity uses its own jose/parser graph, Effect its own runtime.

Six actual TLS/signed-token cases cover captured mutable inputs, mixed-key rotation,
malformed preflight with zero network, signed subject/issuer/audience/nonce/signature
substitution, bad clock, duration expiry while fetching, malformed JWKS, caller and
owner teardown, 32-operation overload and total-deadline cleanup. The complete existing
identity, wire/cache/resolver and root verification suites remain required.

**Still NOT_ADMITTED:** this does not consume a real single-use login transaction or
create a BFF session. The trusted consumed nonce/POST handoff is still an input premise.
Matching subjects and freshness still do not cryptographically prove an exact common
code response without at_hash; that earlier qualification limitation remains. Real
Keycloak token/rotation compatibility, root dependency/runtime admission, actual code
exchange/session composition and browser/shared-pilot gates remain separate work.
Roll back operation/tests, narrow public-entry exports/permissions, compiler roots and
joint gate together; preserve production authentication boundaries and pinned validators.

## PR52p — real-provider private IPC qualification (issue #110)

`keycloak-fixture.json` pins the reviewed environment repository/merge and independent
fixture human subject. Preview verifies origin, exact HEAD, clean tracked source and
absence of untracked scripts; it imports no fixture and creates no credentials:

```sh
python3 -B tools/qualification/effect-node/keycloak_runner.py
```

After explicit authorization for the same disposable fixture, execute using its
locked Python 3.12 environment. Both isolated Node graphs must already be installed:

```sh
uv run --project ../perfeng-environment --locked --offline python -I -B \
  tools/qualification/effect-node/keycloak_runner.py --execute
```

Execution exports only the exact pinned fixture Python/lock closure from Git into
a temporary regular package, preventing ignored bytecode/untracked module shadowing.
It checks the selected venv, Node 26.13.0 and the fixture's declared HUMAN expectation,
then reuses `execute(observe_code_pair=...)`; bootstrap, human login/exchange, key
rotation and owned cleanup remain environment responsibilities. Nothing is monkeypatched.
The callback runs before replay and sends only CA, issuer, nonce, accepted-POST start
and bounded unverified ID/access candidates to the Node process's private stdin.
No password, refresh token, assertion or private key is forwarded. Credentials never
enter argv, files, logs or receipts; the child receives only PATH, excluding Node
injection/credential/proxy environment variables.

`code-pair-cli.ts` has no options or credential environment. It accepts at most 64 KiB
of UTF-8 input within 2 s, uses the shared duplicate-aware strict parser, rejects extra
root/candidate fields, and restricts configuration to canonical HTTPS 127.0.0.1 with
an explicit port and `/realms/perfeng-fixture`. Token content cannot choose an origin.
The existing scoped verifier then applies its 3 s total operation bound. Success must
match the independently pinned fixture subject; output is a constant check-list/profile
receipt, never identity/claims/tokens or provider diagnostics. Failures have one constant
FAIL receipt. The Python consumer multiplexes bounded pipes, caps combined output to
4096 bytes, requires exact success/empty stderr and kills/reaps the child within its 8 s
budget. Failures are scrubbed before reaching the fixture's safe observer boundary.

`make signing-key-wire-qualification` now runs real-TLS process tests and stdlib-only
Python process/source tests as well as all prior candidates. Identity CI pins Python 3.12
for those offline tests. They need no sibling checkout or Docker; actual execution is
never part of pull-request CI. Use `-B` throughout so bytecode cannot pollute guide
provenance. No new package/root dependency or general production import permission
is introduced; the CLI has one exact named strict-parser public-entry bridge.

An executed receipt still says NOT_ADMITTED. The selected environment commit and
`consoleQualificationSha256` identify its tested inputs. The latter uses domain
`perfeng-keycloak-qualification-v1\0`, then sorted files in Effect Node and identity
roots with `.ts`, `.py`, `.json` or `.yaml` suffixes, each framed as 8-byte big-endian
UTF-8 relative-path length/path and 8-byte content length/content. The format is
`sha256-length-framed-v1`; this hashes public code/config/locks, never credentials.
Actual execution requires committed, unchanged qualification sources and records
consoleCommit as well. Retain generated receipts outside Git. A synthetic process PASS alone is no real
Keycloak receipt: the pinned runner and environment observation establish that provenance.

The actual observation proves initial code-pair/provider compatibility, not a
shared Console cache surviving real provider rotation. That real cache-rotation
receipt is addressed separately by the PR52r persistent consumer below. This gate does not create a Console session, consume the actual BFF single-use
transaction, prove common-response binding without at_hash, enable identity serving,
or qualify shared-pilot/browser behavior. Runtime/root dependency and actual exchange/
session integration still need review. Roll back the runner/CLI/pin, exact parser
bridge and offline gate additions together; preserve production trust boundaries.

## PR52r — persistent cache across real provider rotation (issue #115)

The pinned environment observer now drives `cache-rotation-cli.ts` through one
persistent Node process and one scoped resolver/cache. The exact sequence is
initial→overlap→retired, followed by clean EOF and exit 0. Initial supplies the fixed
loopback issuer/CA and old ID; subsequent frames bind the same old/new IDs and cannot
change trust. Input is fatal UTF-8, duplicate-aware NDJSON, at most 64 KiB across the
entire session. The worker has a 60 s scoped lifetime; stalled partial input reads are
bounded at 8 s per read. The parent independently enforces 8 s for each write/ACK and a 60 s
whole-process budget, with at most 4096 bytes of combined output. Incomplete, repeated,
out-of-order, mismatched, malformed or extra commands fail, including extra data after
the final ACK. A final ACK without clean terminal EOF/exit is never a receipt.

Expectations are declared in code before execution:

1. Initial old ID resolves, seeding the persistent cache.
2. Advance only the private resolver clock offset by 1001 ms, allowing the existing
   minimum refresh interval. The distinct new ID must trigger missing-key refresh;
   old and new both resolve from overlapping published keys.
3. After provider retirement, old and new must still resolve while the already-cached
   overlapping snapshot is fresh. Advance that offset by 300001 ms; the old ID must
   return exactly unknown_key and the new ID must resolve after refreshing current
   JWKS. Unavailability or a blank cache is not accepted as old-key retirement proof.

These offsets neither change the host/provider clock nor claim five real minutes
elapsed or any latency/performance result. One process/cache survives all phases:
retained-old success after the server removes it detects accidental per-phase reset.
The real-TLS regression observes exactly three retrievals: initial, overlap refresh,
then post-expiry refresh. This proves public-key cache continuity/freshness behavior,
not human JWT verification after rotation or immediate IdP-retirement revocation.

`private_session.py` owns bounded pipe writes, replies, EOF, process exit and cleanup.
The existing one-shot code-pair consumer reuses it with explicit input closure;
rotation retains the same pipes until completion. No feature-mode switch recreates
the cache. Acquisition failures kill/reap partially acquired children, and invalid
or unbounded timeouts are rejected before spawning. Additional buffered replies are
rejected; the owner also checks the expected ACK phase/schema and terminal exit.
Node receives PATH only. Rotation IPC contains public IDs/trust, never JWTs, raw keys
or administrative credentials; existing pair credentials still cross private stdin
only. Errors stay generic and all generated receipts stay outside Git.

The runner pins environment 58ab60ee6ac470037627bd1cf73a15d2cadce91f and reuses its
normal lifecycle through observe_key_phase. Every phase must preserve issuer/CA; no
observer result changes provider expectations. Source export, subject expectation,
committed-input checks, bytecode prevention, digest framing and preview/--execute
rules from PR52p remain unchanged. The literal-owned helper import works under -I.
The final receipt separately records code-pair PASS and cacheRotation PASS with the
three phases and explicit clock offsets, only after both child processes finish.

The existing offline gate now includes persistent TLS/protocol cases and Python
session/lifecycle/source tests. Actual provider qualification remains opt-in using
the already authorized disposable fixture. Even a passing receipt remains
NOT_ADMITTED: production dependency/runtime/BFF exchange-session integration,
consumed transaction binding and browser/shared-pilot gates are separate. Revert
persistent worker/consumer, fixture pin and gate/bridge/docs updates together;
preserve production trust boundaries and the original provider owner.
