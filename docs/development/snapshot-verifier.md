# Private snapshot verifier — M05-PR52t, issue #119

The owner accepted [ADR 0004](../decisions/0004-qualify-jwt-verification-before-runtime-adoption.md)
on 2026-11-18. This slice admits a private implementation, not shared-user login.
No listener route, local pairing, key-network source, cache, session or policy changes.

## Ownership and API

src/bff/login/identity owns the named readonly context/snapshot/result contracts,
strict JSON/RSA/compact/profile/pair primitives and lazy Effect adapter. Its
makeSnapshotVerifier({issuer, now?}) requires an Effect scope. The returned verify
accepts nonce, requestStartedAtMs, unverified ID/access candidates/expiresIn and a
caller-trusted snapshot (original fetchedAtMs and public keys). The configured issuer
comes from composition, never from a credential. Types do not establish key provenance;
production key composition uses the [reviewed source/admission path](signing-key-source.md).

The factory acquires one lifetime, 32 active-operation permits, a monotonic high-water
observation and a closed-owner fence. Each call captures caller input before returning
lazy work, uses a 3000 ms Effect deadline and refuses excess callers without queuing.
Plain TypeScript owns bounded parsing/projections; token-profile.ts owns importJWK and
jwtVerify. Effect wraps the foreign crypto promise; only callers/composition execute
Effects. Native crypto keeps its admission slot until settlement even after Effect interruption;
cancelled callers cannot bypass the cap. Crypto may finish after interruption, but cannot publish an observation from
an interrupted or retired owner. Expiration and 300000 ms retrieval-start freshness
are rechecked after crypto; rollback/unsafe clock values refuse. Results expose only
issuer, subject and conservative validUntilMs, or invalid_pair/unavailable/deadline.
Interruption remains interruption. No token, diagnostic, role or permission escapes.

## Preserved profile and changed check

The moved code retains strict decoded-name duplicates/UTF-8/base64url, RS256 JWT
headers, minimal public RSA key checks, fixed issuer/audience/azp/type, signed nonce,
subject matching and conservative issuance/nbf/expiry checks. A present signed at_hash
now must equal the base64url left half of SHA-256 over exact accompanying access-token
ASCII bytes; malformed/mismatch refuses. Absence is allowed in this code-flow profile.
Matching subject/times without at_hash does not prove a common response; immutable
custody from one consumed authenticated POST remains a later integration obligation.

## Qualification and dependency boundary

The old fixture primitive files are named re-export shims, not duplicate implementations.
The resolved-key fixture invokes this actual scoped adapter after its qualified key
lookup. Issue #121 also adopts its [source/cache/resolver](signing-key-source.md); actual
consumed exchange/session integration remains gated.
Only the exact qualification-api entry/member bridges are admitted; production has no
fixture imports. Runtime helper inputs/outputs remain private to the login feature.

Root jose 6.2.17/jsonc-parser 3.3.1 are exact, immediately used dependencies. Rechecked
[official jose metadata](https://registry.npmjs.org/jose/6.2.17) and
[parser metadata](https://registry.npmjs.org/jsonc-parser/3.3.1): MIT, no declared
engine/peer/runtime dependency requirements. Releases are respectively
2026-11-09T18:41:21.700Z and 2024-06-24T21:12:45.445Z, beyond the unchanged age floor.
No scripts or extra package authority are enabled. Existing product closure stays
explicit; this unmounted code is not added to the shipped listener bundle.

## Verification and retirement

Tests start with real independently signed credentials and cover hash present/absent/
malformed/mismatch, substitution, immutable lazy input, stale/expired evidence,
clock rollback, negative retrieval timestamps, cancellation, owner close and 32-call saturation. Existing isolated
adversarial profile/pair/JWKS tests now exercise the moved primitives.

Run make verify, make identity-jwt-qualification, make signing-key-wire-qualification,
make supply-chain, and make console-isolation-check. The last gate proves the existing
product still builds/installs/starts independently; it is not browser-login admission.
Issue #121 retires the dormant picomatch waiver after advisory withdrawal; this is
not proof of a package fix. The fail-closed audit policy and #111 tracking remain.

The opt-in provider runner now refuses uncommitted adopted identity sources/root
manifest/lock as well as fixtures. Its length-framed-v2 digest includes those actual
inputs; v1 receipts remain historical and must not be relabeled. A passing disposable
provider receipt is still NOT_ADMITTED for shared-user activation. Repeat provider
qualification on committed sources before relying on this admission; record its
redacted result in the PR, not credentials or generated receipts in Git.

Remaining: actual consumed exchange custody,
delegated token/session/current policy, browser and shared-pilot gates. No service
permission or HUMAN/CI enrollment is derived from token role claims. Revert this
coherent dependency/implementation/fixture bridge change to retire the slice; preserve
local pairing and original validators/security gates.
