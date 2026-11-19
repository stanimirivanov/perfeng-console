# Private signing-key source and cache — M05-PR52u, issue #121

Following accepted ADRs [0004](../decisions/0004-qualify-jwt-verification-before-runtime-adoption.md)
and [0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/decisions/0046-select-issuer-and-bff-delegation-trust.md),
the login identity feature now owns its qualified wire, strict JWKS admission,
source, snapshot store/cache and bounded key resolver. This is private implementation
admission: no login route, session, delegated token exchange or shared-user activation.

## Ports, composition and trust

signing-key-contracts.ts owns named readonly configuration, public snapshot, safe
result and source/store/resolver ports. It does not infer types from concrete
factory ReturnType. PublicSigningKey is a structural type in snapshot-contracts.ts.
Read-only declarations do not create trust: only the configured wire plus strict
admission establishes issuer/retrieval provenance. Config is captured before lazy
construction; tokens and key IDs cannot select a URL, CA or issuer.

createSigningKeyGet uses exactly the configured HTTPS realm's
/protocol/openid-connect/certs endpoint, a single explicit CA, TLS >=1.2 and strict
certificate verification. It has no redirect/proxy/retry middleware or native HTTP
dispatch. maxHeaderSize is the sole native HTTP import, a fail-closed effective-size
guard, not permission to request/get. Raw response headers enforce singleton JSON
media type, no content encoding, bounded length and at most 128 fields. Header bytes
are capped at 16 KiB; streaming fatal UTF-8 bodies at 64 KiB; configured deadlines
are 50..3000 ms (default 3000). Error/provider bodies are not echoed.

createSigningKeySource captures retrieval start from its trusted clock and admits
only bounded strict JSON, decoded-unique members, unique key IDs and reviewed minimal
public RSA signing keys. Private key members are refused even in ignored metadata.
Issuer/time fields in JSON cannot establish provenance. Snapshots/keys are frozen;
retrieval start, never cache completion time, controls freshness.

## Cache lifetime and policy

makeSigningKeyResolver requires a caller-owned Effect scope and returns a named
resolver port. Adapters construct lazy Effects; callers/composition alone execute
them. There is one scoped source/cache lifetime per acquisition, not per request.

- A snapshot is usable only through 300000 ms after retrieval start, inclusive;
  the store and resolver share this bound through private `key-policy.ts`
  (issue #148). Completion-relative cache TTL is an additional bound. No stale-while-error fallback.
- Snapshot and refresh work are scoped single-flight. Closing the owner interrupts
  actual pending wire work; escaped handles cannot start new work. One caller's
  cancellation does not retire another admitted waiter's load.
- At most 32 readers and one wire retrieval, with no unbounded permit queue.
  Retrieval starts are at least 1000 ms apart, including errors/interruption.
- An unknown key gets at most one bounded shared refresh per resolution. Only a
  completed authoritative miss enters the 32-entry, 30000 ms negative cache; known
  fresh keys take precedence. Negative TTL equality remains a hit; one millisecond
  beyond expires it. Failed refresh retains an existing fresh snapshot.
- A resolve has a 3000 ms whole-operation deadline. Invalid/rollback clocks clear
  stale authority and negative knowledge; safe refusal stays distinct from
  authoritative unknown_key. Resolver-local `refuseInvalidClock` names the
  clear-and-refuse policy, and `recordNegative` owns pruning and capacity eviction
  only after an authoritative admitted miss. Neither helper owns refresh admission.

Provider retirement is not instantaneous cache revocation. Old keys can remain
usable within their already-admitted freshness interval; after expiry an outage
must refuse, not revive the old key. These are the existing qualified policies.

## Qualification, enforcement and remaining gates

The old wire/source/cache/resolver fixture modules are exact re-export bridges to
key-qualification-api.ts. The unused fixture store is removed; production never
imports a fixture. JWKS candidate delegates to the same adopted strict admission.
Both AST and dependency-graph checks retire the previous source-to-identity-fixture
bridge. Exact named package/member permissions permit platform networking only in
signing-key-get.ts; other identity helpers retain no ambient network/scheduler or
filesystem permission. No new package, version, engine or lifecycle-script admission.

make verify includes the production resolver TLS regression. The existing CI identity
workflow also runs make identity-jwt-qualification and make signing-key-wire-qualification;
their original CA/header/body/UTF-8/deadline/cancellation/shared-cache/rotation/outage/
clock/rate/negative-cache cases now exercise adopted code. Provider qualification
still uses the authorized disposable fixture, committed-source guards and v2 digest
covering all adopted identity modules plus root manifest/lock. Keep receipts outside
Git, record redacted PASS/fail evidence with exact commits in the PR.

Current listener/product closure remains unchanged; no unused authority is added to
the release allowlist. Run supply-chain with unchanged thresholds/unused-exception refusal. The advisory
withdrawal discovered in #121 requires retiring its dormant waiver; withdrawal is
not a package fix, and #111 remains open. Issue #123 now [consumes the single-use exchange through verification](verified-code-exchange.md);
provider-driven BFF consumption, delegated/session/current-policy and browser/shared-pilot admission remain
separate. Revert implementation/bridges/contracts/harness updates together to retire
this slice without activating routes or weakening local pairing/validators.
