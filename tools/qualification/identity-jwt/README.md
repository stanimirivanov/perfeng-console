# ID/initial-access JWT qualification — PR52g and PR52h

Issue: https://github.com/stanimirivanov/perfeng-console/issues/81
Qualification date: 2026-11-15. Base production main: 52d3df1.

**Isolated qualification PASS; production admission NOT_ADMITTED.** Root dependencies,
contracts/Ajv, login operation, session and route behavior are unchanged. This fixture
qualifies a candidate wrapper, not raw library defaults or a real identity deployment.

## Pins, sources and supply chain

- jose 6.2.17, MIT, published 2026-11-09T18:41:21.700Z. Official
  [JWT verification](https://github.com/panva/jose/blob/v6.2.17/docs/jwt/verify/functions/jwtVerify.md)
  and [source](https://github.com/panva/jose/tree/v6.2.17).
- jsonc-parser 3.3.1, MIT, published 2024-06-24T21:12:45.445Z. Microsoft's
  [parser API](https://github.com/microsoft/node-jsonc-parser/tree/v3.3.1) retains
  property nodes/decoded names so duplicate detection does not depend on JSON.parse.
- Official npm manifests declare no engines, runtime dependencies or peer dependencies
  for either selected version. This is not an assertion of all-runtime compatibility;
  imports, WebCrypto and types are exercised on pinned Node 26.13.0 / TS 6.0.3.
  admission.json records exact metadata, including development/build scripts.
- The isolated manifest and integrity-locked graph contain only these two runtime
  packages. pnpm's pinned tool distribution has its own generated lock document.
  Installs disable scripts, enforce the existing 1440-minute release age (both pins
  exceed it), refuse missing release times and verify store integrity. No exemptions.
  Candidate audit reports no known vulnerabilities. Root audit remains separate.

## Exact candidate contract

The only key source is an explicit **trusted public JWK snapshot** supplied by the
fixture. There is no remote JWK resolver, discovery, token-selected fetch, introspection,
cache, background scheduler or authority from token roles. The snapshot is cloned
before asynchronous work. Both config and token contain only synthetic fixture data.

1. Bound compact JWS to 16384 characters; require canonical unpadded base64url in
   all three segments and strict UTF-8 in JSON. Header is exactly alg/typ/kid;
   require RS256/JWT and a bounded key ID. Unknown/critical/remote-key headers refuse.
2. Parse JSON into a syntax tree with comments/trailing commas/empty content disabled.
   Reject decoded-name duplicates at **every depth**, malformed strings, more than
   64 members per object, 512 nodes or depth 16. Native JSON parsing and jose still
   perform their own JSON parsing; no custom JSON grammar or RSA primitive is built.
3. Require one matching public RSA signing key, exponent 65537 and 2048–8192-bit
   canonical modulus, no private/secret parameters and verification-only key_ops
   if supplied. Duplicate key IDs and invalid trusted key material refuse. Missing
   kid is invalid_token; stale/future/invalid snapshot dates are unavailable.
4. Require exact configured canonical HTTPS realm issuer. ID tokens have scalar
   audience perfeng-console-login, typ ID and exact expected nonce; initial access
   tokens have scalar audience perfeng-console-delegate and typ Bearer. Both require
   azp perfeng-console-login, nonempty subject of at most 256 UTF-16 units without
   ASCII space/control characters, and integral iat/exp/optional nbf.
5. jose verifies the actual RS256 signature, required issuer/subject/audience/iat/exp,
   algorithm, token age and not-before/expiry with maximum 30-second tolerance.
   Wrapper limits positive exp-iat to 300 seconds and key freshness to 300000 ms.
   Exact snapshot freshness equality passes; expiry at exp+30 is refused (strict
   expiry), and future iat/nbf beyond 30 seconds refuse. Bounds are never increased.
6. Return only issuer/subject/profile after success; never return claims, roles,
   tokens, backend errors or an enrolled HUMAN/CI label on failure or success.

Header/body preflight happens before signature verification but confers no trust.
The only successful projection follows library signature/claim verification. Outcomes
are generic invalid_token or unavailable with no partial subject. This API remains a per-token proof: two independent successes alone do not
qualify code-pair subject equality or live callback/operation binding. The isolated
PR52h extension below qualifies explicit pair checks at a captured instant.

## Refutations and remaining admission gates

Raw jose accepts duplicate member names; a regression demonstrates that default and
requires wrapper refusal. A second RED demonstrated a noncanonical signature encoding
alias could verify; explicit canonical checks now refuse it. These are stricter Perfeng
profile requirements, not claims that the library violates its own RFC behavior.

Eight tests use independently Node-signed RSA fixtures, wrong keys and attacker inputs.
They cover both token profiles, nested/escaped duplicates and malformed syntax, algorithm/
issuer/audience/client/type/nonce substitution, lifetime/age/skew/freshness, unsafe keys,
canonical encodings and defensive snapshot/config ownership. They perform no network I/O
and generate keys only in test memory. No real Keycloak receipt is claimed.

Before production adoption: review the wrapper/API/runtime ownership and dependency ADR;
qualify fixed-origin key fetching, a bounded shared fresh-key cache and actual rotation/
outage; integrate the isolated pair checks with the actual consumed code flow;
validate current enrollment/caller/service policy at its owning provider; preserve
server credential custody, session fixation/CSRF/logout, cancellation/late-result fencing;
obtain actual Keycloak/BFF/browser and shared-pilot receipts. No session is granted here.
The isolated async verifier is not permission to add an unscoped Promise runtime to BFF.

## Reproduction and rollback

Initial bootstrap (network required only for uncached packages):

```sh
pnpm --dir tools/qualification/identity-jwt install --ignore-workspace --frozen-lockfile --ignore-scripts
make identity-jwt-qualification
pnpm --dir tools/qualification/identity-jwt audit --audit-level high
```

The make target repeats frozen script-disabled **offline** installation, strict fixture
compilation and all tests. A goal-specific CI workflow runs these gates and the candidate
audit. Root make verify/supply-chain continue independently. No generic JSON parser or
JWT verification package becomes a production dependency by passing this target.

Rollback removes this isolated fixture, explicit target and qualification workflow.
Production behavior/lockfiles, identity provider, credentials and persisted state stay intact.

The boundary/maintenance decision is recorded in
[proposed ADR 0004](../../../docs/decisions/0004-qualify-jwt-verification-before-runtime-adoption.md).

## PR52h code-response pair qualification — issue #95

[Console issue #95](https://github.com/stanimirivanov/perfeng-console/issues/95)
adds an isolated pair candidate on merged production baseline `ce138b9`.
This extends the original PR52g qualification; it does not change that historical
baseline/receipt or admit jose/jsonc-parser into the root production graph.

`pair-candidate.ts` owns a readonly structural input matching the relevant private
code-exchange observation: `issuer`, `nonce`, `requestStartedAtMs`, `nowMs`, explicit
trusted key `snapshot`, and unverified-code `idToken`, `accessToken`, `expiresIn`.
It has no production imports. Its caller must supply the nonce/context from the
trusted consumed handoff; the fixture neither consumes that handoff nor proves
live callback integrity. `requestStartedAtMs` is the token POST start, **not** the
browser authorization start. No auth_time claim or refresh-token trust is invented.

The entire input is cloned before the first await. Both credentials use the same
reviewed per-token verifier; a fixture-internal verified projection retains only
signed issuance/expiry/not-before timestamps alongside issuer/subject/profile.
It performs no independent cryptography or unverified second decoding. The public
`verifyCandidate` projection remains unchanged and still omits times and raw claims.
The pair candidate does not accept two unrelated per-token successes as sufficient:

1. Check finite, nonnegative safe-integer millisecond observations with a valid Date
   and `requestStartedAtMs <= nowMs`; require an unverified-code stage and integral
   `expiresIn` from 1 through 300. Refuse malformed runtime objects, not just TS types.
2. Verify both signatures and the exact existing profiles using the captured
   issuer/key snapshot. ID nonce matches the captured expected nonce; both verified
   subjects and issuers must match. Per-token refusal becomes generic invalid_pair
   or unavailable, without either subject, credential, signed time or backend error.
3. Apply a **conservative proposed code-response profile**, not a universal OIDC
   requirement: each signed `iat * 1000 >= requestStartedAtMs - 30000`. The accepted
   ADR permits at most 30 seconds of clock tolerance. NumericDate seconds are compared
   as exact milliseconds; fractional request starts can tighten that window, never
   expand it. This helps reject older same-subject credentials without pretending
   POST time is authentication time. The original upper issuance-age/skew checks
   remain in the shared verifier.
4. A signed nbf, if present, must be at or before nowMs. The pair refuses future nbf
   even if per-token clock tolerance alone would allow it. All converted times and
   computed duration endpoints must be safe integers.
5. The usable observation horizon is exactly
   `min(ID exp * 1000, access exp * 1000, requestStartedAtMs + expiresIn * 1000)`.
   Require it strictly after nowMs. Equality is expired; signature-verifier grace
   never extends credential usability. Measuring expires_in from POST start is
   conservative relative to receipt time and charges dispatch/response delay.
6. Return only `{ok: true, issuer, subject, validUntilMs}` or a generic refusal.
   This is an observation at the captured instant: it creates no session, HUMAN/CI
   enrollment, service grant, approved caller or entitlement to ignore later trust
   freshness/revocation. It is not a wall-clock monitor or cancellation boundary.

Seventeen tests across the combined fixture gate include the original eight profile
checks and nine pair checks: mismatched independently valid subjects, signed issuer/
nonce/client/audience/type substitution, invalid signature, conservative expiration/
response duration, exact/fractional issuance windows and nbf, unsafe clocks/context,
stale trust, no partial projection and caller mutation during crypto awaits. Test
keys and credentials are synthetic and stay in memory; no real Keycloak run occurs.

**Strongest limitation:** equal issuer/subject and bounded issuance are not proof
that two tokens were signed in the exact same response. A recently issued access
token for the same person can pass; a test explicitly records that limitation.
Optional at_hash/common-response binding is not qualified here. Actual OIDC/provider
conformance must settle any such requirements before runtime admission rather than
claiming this candidate alone is a complete OIDC relying party.

**Production remains NOT_ADMITTED.** Remaining gates include dependency/API/runtime
ownership review, fixed-origin key fetching and bounded shared freshness/rotation/
outage behavior, integration with the actual single-use code operation, live clock
and cancellation/late-result fencing, server token/session lifecycle and real
Keycloak/BFF/browser/shared-pilot receipts. The captured nowMs is not re-read after
crypto; a production adapter must decide and qualify when to re-evaluate time/trust
before releasing authority. Signing-key freshness is verified at this observation,
not promised throughout validUntilMs. Control-plane issue #356 remains open.

Reproduce with the existing `make identity-jwt-qualification` gate, which now
explicitly runs both test files and compiles both candidates. Roll back the pair
candidate, its tests and gate additions together; preserve the original per-token
projection and do not activate production as a fallback for an unqualified fixture.

## PR52j strict signing-key snapshot admission — issue #99

[Console issue #99](https://github.com/stanimirivanov/perfeng-console/issues/99)
qualifies `jwks-candidate.ts` on production baseline `d55f89e`. It consumes the
structural unverified-jwks text observation from the prior wire slice, without
importing that separate Effect fixture or adding dependencies. It is not a live
transport/decoder/cache composition and does not enable production JWT verification.

`admitSigningKeys` receives trusted `issuer`, `retrievalStartedAtMs`, `nowMs` and
`wire: {ok: true, stage: "unverified-jwks", body}`. Validate nonnegative safe-integer
Date-compatible times, retrieval start <= now and age <= 300000 ms, with equality
accepted. Snapshot fetchedAtMs is conservatively the supplied retrieval start,
never a JSON value or a new timestamp chosen after parsing. The configured issuer
must be the canonical HTTPS realm profile with no credentials/query/fragment or
trailing alias. The resulting issuer association expresses the **caller's trusted
provenance premise**, not proof that this text actually traversed the fixed-origin
HTTPS adapter. Future composition must capture and preserve that association.

### Conservative document and selection profile

- Body is a well-formed JavaScript string whose UTF-8 encoding is at most 65536 bytes.
  The existing wire adapter supplies fatal-decoded UTF-8; this standalone runtime
  boundary also rejects malformed input shapes/surrogates rather than trusting TS.
- Share the existing jsonc-parser strict JSON preflight. JWT limits remain exactly
  512 nodes, depth 16 and 64 members per object. JWKS uses 4096 nodes with the same
  depth/member caps, so 32 keys can be admitted without loosening JWT preflight.
  Escaped-name duplicates are rejected at every depth; comments/trailing commas,
  malformed syntax/strings and structural overflow refuse before projection.
- Require root exactly `{keys: [...]}` and 1–32 object entries. All entries, including
  ignored siblings, need nonempty string kty/alg/use and a globally unique nonempty
  kid of at most 128 UTF-16 units; selector strings are bounded to 128 units. Missing
  selectors never default to signature authority. Root extensions/metadata and
  unsupported ambiguous entries refuse. These are selected profile constraints,
  not claims that RFC 7517 universally requires alg/use/kid or forbids extensions.
- Reject private/secret JWK field names `d,p,q,dp,dq,qi,oth,k` **at any depth**, even
  in ignored sibling metadata and under escaped spellings. This consciously strict
  profile can refuse otherwise irrelevant extension names; it prevents hidden
  private material from slipping through a nonselected entry.
- Explicitly select alg RS256 + use sig. Public encryption/EC siblings with other
  declared selectors are counted but ignored, reflecting the environment fixture's
  selection from mixed Keycloak documents. Their cryptographic material is not
  qualified or used. Require at least one selected signing key; a set containing
  only ignored keys cannot become an empty trusted snapshot.
- Validate **every** selected entry before releasing a snapshot: RSA, canonical
  unsigned nonzero 2048–8192-bit modulus, exponent AQAB, and key_ops absent or a
  real array containing only verify. Array-like objects are malformed and refuse.
  The shared `signing-key.ts` predicate replaces the token fixture's inline public
  key check; all original token/pair cases remain in the same qualification gate.
- Retain only kid/kty/use/alg/n/e. Certificate chains, remote URLs, key_ops and all
  other extensions do not acquire authority or trigger fetching. Every key, the
  key array, snapshot and successful result wrapper are frozen. Returned data is
  newly projected from parsed bytes and independent of caller mutation.

Refusal is only `{ok: false, reason: "invalid_jwks"}`, with no partial IDs, keys,
private values or parser/backend error detail. This is isolated **candidate
admission at one captured instant**, not a signing-key-cache freshness promise or
authorization to trust token roles, subjects or services.

The gate runs 23 tests: original 17 token/pair checks plus six JWKS cases. They cover
old/new rotation keys working through real signed-token verification, mixed public
siblings, ignored metadata/private fields, duplicate JSON and key IDs, selected-key
failure without partial results, 32/33 key bounds, exact 64 KiB and oversized multibyte
inputs, deep/member overflow, malformed shapes and trusted-context freshness bounds.
The private-key fixtures use distinct IDs so their refusal cannot be explained by
an unrelated duplicate-ID check. A leading-zero modulus fixture is constructed
from bytes, rather than assuming an arbitrary base64 prefix is noncanonical.

**Still NOT_ADMITTED for production:** actual provider compatibility/Keycloak mixed
metadata, Effect wire-to-decoder provenance binding, a bounded fresh-key cache with
rotation/missing-key refresh/concurrency/outage behavior, live clock/lifetime fencing,
root dependency/API admission and real BFF/browser/shared-pilot receipts. No network,
cache, refresh scheduler or credential deployment occurs in this decoder. ADR 0004
remains proposed; no status was silently accepted. Control-plane issue #356 stays open.

Run `make identity-jwt-qualification` and the isolated audit, then root verification.
Rollback the JWKS candidate/tests, shared-helper extraction and explicit gate roots
together. Preserve the original per-token API/projections and do not relabel old
receipts or activate an unqualified production fallback.

## Qualification-only public entry — issue #101

`public-api.ts` exposes only strict snapshot admission and its snapshot type to the
reviewed Effect Node composition. It does not export JWT verification, parser
internals, key predicates or credentials. The exact one-way public-entry bridge is
recorded in docs/IMPORTS.md and independently guarded by syntax and resolved graph
fixtures. The caller now obtains the candidate through an actual fixed-origin TLS
operation with captured issuer/start/end context; this is still isolated and adds
no production key cache or runtime admission. Original token/pair/decoder gates
remain mandatory; both existing pinned graphs are explicitly installed/audited.
