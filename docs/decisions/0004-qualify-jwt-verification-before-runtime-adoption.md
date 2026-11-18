# ADR 0004 — Qualify JWT verification before runtime adoption

Status: **Proposed — scoped runtime-admission decision pending owner review.**
Original date: 2026-11-15, issue #81 (M05-PR52g).
Proposal updated: 2026-11-18, issue #117 (M05-PR52s).

## Context

Accepted control-plane [ADR 0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/decisions/0046-select-issuer-and-bff-delegation-trust.md)
fixes issuer/client/nonce/time and delegation boundaries. The Console's production
[code exchange](../../src/bff/login/code-exchange.operation.ts) still returns private
unverified candidates, expected nonce and request-start context. It creates neither
verified identity nor a shared-user session.

The original proposal isolated jose 6.2.17 and jsonc-parser 3.3.1 before giving them
runtime authority. Qualification has now reached actual provider and persistent-cache
evidence. Those receipts justify proposing a private production implementation;
they do not make a fixture a BFF adapter or approve identity activation.

## Proposed decision

Recommend exactly **jose 6.2.17** for maintained JWT signature/standard-claim checks
and **jsonc-parser 3.3.1** for bounded syntax-tree/decoded-duplicate preflight.
The [recorded official package metadata](../../tools/qualification/identity-jwt/admission.json)
identifies both as MIT with no declared runtime dependencies, peers or engines.
That is dated isolated evidence; a subsequent root-admission PR must recheck current
license/engine/peer, release-age, frozen-lock and vulnerability requirements before
adding either package for an immediately implemented consumer.

**This PR changes no package, import permission or application code.** Keep this ADR
Proposed until the owner accepts the decision. Review/merge of this proposal does
not activate shared-user mode or waive later implementation/admission gates. The
recommended first code slice is a private non-authorizing verifier over explicit
trusted snapshots. Browser/session gates block activation, not all staged private
implementation forever; they must remain identified and unwaived throughout it.

## Evidence and its limits

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| [Identity fixture](../../tools/qualification/identity-jwt/README.md), [pair wrapper](../../tools/qualification/identity-jwt/pair-candidate.ts) | Strict compact/duplicate/encoding/RSA/profile rules and subject/validity binding | A consumed production callback or exact common-response proof |
| [Wire/source/cache/resolver](../../tools/qualification/effect-node/README.md) | Fixed-origin CA/TLS/header/body/deadline guarantees, fresh snapshots, bounded refresh/miss policy | Production module ownership or imports |
| [PR #112](https://github.com/stanimirivanov/perfeng-console/pull/112) | Actual pinned Keycloak human code-pair compatibility through private IPC | BFF session, browser sign-in or production verifier use |
| [PR #116](https://github.com/stanimirivanov/perfeng-console/pull/116) | One actual Console resolver/cache across initial/overlap/retired provider phases | Human JWT verification after rotation, immediate cache revocation or five real minutes elapsed |

PR #116's actual execution used Console commit
1736e9696ef7cc12429b5c6257afea0d4b8a6ced and environment commit
58ab60ee6ac470037627bd1cf73a15d2cadce91f. Its versioned qualification digest was
ca8e01488b2335e473b4d536b01c99f138e14ace07ff616425157d136f9e1298.
The private resolver clock advanced by fixed 1001 ms and 300001 ms; host/provider
clocks were unchanged. Generated receipts stay outside Git; linked PRs record the
redacted evidence. All these receipts remain **NOT_ADMITTED for production**.

## Proposed private API and ownership

The future contract belongs to the login feature, not generated/public browser DTOs:

- **Pair input:** readonly unverified ID/access candidates and expiresIn, expected
  nonce and requestStartedAtMs from one consumed code-exchange operation. Capture
  the owned primitive values before awaits. Optional refresh credentials remain
  private/unverified and are not part of identity output.
- **Trusted snapshot input:** exact configured issuer, original retrieval-start
  fetchedAtMs and minimal admitted public RSA keys. Readonly/types alone confer no
  trust: only the reviewed fixed-origin source/strict admission path may construct
  this capability. Never cast caller JSON or token-selected URLs into it.
- **Trusted owner capabilities:** configured issuer/profile, clock and active-owner
  fence. These are server composition dependencies, never fields supplied by a token.
- **Result:** minimal readonly issuer/subject/validUntilMs or safe invalid_pair,
  unavailable or deadline refusal. No tokens, key sets, arbitrary claims, cookies,
  role-derived HUMAN/CI enrollment, service grants or baseline permissions escape.

Pure syntax/decoded-duplicate/RSA/header checks stay plain TypeScript. One private
crypto adapter owns the exact jose members and bridges their foreign promises into
lazy Effect work. It does no discovery, filesystem, HTTP, retries or runtime execution.
A separate reviewed key-source/cache composition owns fixed endpoint/CA, freshness,
single-flight, rate, negative-state and scope lifetimes; operations consume its port,
not platform internals. Composition alone executes Effects and owns process shutdown.

Expected refusals are projected safely. Interruption remains interruption. Foreign
crypto promises need not be physically abortable, but retirement/interruption must
prevent late identity publication. Check owner activity and valid clock before work,
after asynchronous boundaries and immediately before returning. Unexpected defects
fail through the existing safe terminal boundary; do not claim infallibility or
serialize library diagnostics/causes. Repeat cancellation/late-result tests against
the actual adopted implementation, not a copied fixture.

## Profile and time invariants to preserve

- Fixed trusted issuer; explicit RS256/JWT header and bounded kid; no jku/x5u or
  token-driven origin. Preserve canonical segments, strict bounded JSON and decoded
  duplicate-member refusal before key I/O.
- ID audience perfeng-console-login, initial-access audience perfeng-console-delegate,
  azp perfeng-console-login, respective ID/Bearer claim profiles and equal verified
  subjects. The ID nonce must equal the consumed context's expected nonce; this is
  not a new access-token nonce requirement.
- Retain the qualified RSA public-key constraints, freshness <=300000 ms from
  retrieval start, existing 300 s token/response lifetime bounds and 30 s verifier
  skew profile. Skew never extends usable identity lifetime.
- Retain the conservative request-relative issuance and not-before checks already
  declared in the pair fixture. Do not invent auth_time semantics. validUntilMs is
  the minimum of both signed expirations and request-start plus expiresIn; reject
  at/after that instant and recheck real current time after crypto.
- Provider key retirement permits bounded old-key lag while an admitted snapshot
  is fresh. After expiry, a failed fetch must never authorize an old key. Preserve
  the qualified resolver's concurrency/rate/negative limits; do not reset them per
  request or silently treat unavailable as unknown_key.

## Access-token hash and response provenance decision

[OIDC Core 1.0 errata set 2, section 3.1.3.6](https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken)
makes at_hash optional in authorization-code ID tokens; [section 3.1.3.8](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowTokenValidation)
permits using it for access-token validation. ADR 0046 does not establish mandatory
presence. The current qualified pair wrapper does **not** validate it, and the
existing redacted provider receipt does not establish whether Keycloak emitted it.

Propose a stricter local rule: when present, validate the signed at_hash against
the exact accompanying access-token bytes and refuse malformed/mismatched values.
This is a new proposed check requiring implementation and independent tests, not
an OIDC requirement being claimed as already met. Before session activation, obtain
non-secret provider-profile evidence for presence/absence and qualify both paths.

For absence, recommend preserving one immutable pair directly from the authenticated,
fixed-origin token POST for one consumed state/nonce/PKCE transaction. Review that
custody/substitution threat model explicitly with the real code-exchange integration.
It establishes response provenance under those assumptions, **not cryptographic proof
that arbitrary individually valid same-subject tokens share one response**. Same-subject
substitution is not solved by the present fixture. Requiring at_hash universally or
changing provider policy would be a separate explicit decision; it is not silently
introduced by this proposal.

## Subsequent implementation slices and gates

These are bounded follow-ups after owner decision, not new changes to the agreed
M05 architecture or evidence that these modules exist today:

1. **Private snapshot verifier admission.** Add exact immediately used root packages,
   named feature contracts and private syntax/crypto adapters [new]. Register only
   exact file/member/role permissions with negative fixtures. Move/adapt the qualified
   implementation into its BFF owner; fixture consumers must delegate to that same
   implementation through a narrow reviewed entry, retiring duplicate crypto/parsers.
   Add real-crypto adversarial, immutability, time and cancellation tests with the code.
2. **Production key-source/cache composition.** Adopt the qualified fixed-origin
   source/resolver into reviewed private BFF modules [new], preserve all transport and
   cache budgets, and make the provider harness exercise that actual implementation.
   No fixture imports in production and no blanket package/role allowances.
3. **Consumed exchange to verified observation.** Compose existing single-use code
   exchange with the private verifier through feature-owned ports [new], immutable
   response custody and the reviewed at_hash decision. Verify failed/replayed/cancelled/
   retired transactions cannot produce identity. No session creation in this slice.
4. **Separate authority/session activation work.** Verify delegated API token profile,
   current enrollment/caller/service policy, credential custody and session binding,
   fixation/CSRF/logout/revocation/expiry and cross-user isolation. Mount routes only
   in an explicitly authorized disposable qualification configuration to obtain the
   real browser/session evidence. Ordinary/shared-pilot enablement stays fail-closed
   until successful qualification and separate owner approval; no persistent deployment
   or credential approval is inferred. Preserve local pairing and Run return intent.

Each code slice requires make verify and make supply-chain plus its focused tests.
Preserve make identity-jwt-qualification and make signing-key-wire-qualification.
Repeat actual provider/persistent-cache execution on committed adopted code, and
extend its framed source provenance to include the production modules/root lock:
fixture-only digests cannot certify a moved implementation. Repeat product isolation/
packaging when dependency or product closure changes. Preserve openapi-typescript,
Ajv, release-age protections and the separately scoped existing audit risk decision;
no new vulnerability inherits its exception.

## Tradeoffs, approval and rollback

Maintained crypto and a real syntax tree avoid hand-built JWT/RSA/JSON grammars.
The cost is two new root dependencies, exact adapter/harness maintenance and repeat
qualification on upgrades. A full OIDC client could reduce glue, but its transport,
credential custody and semantics remain unqualified; reselecting the platform or
Angular/Effect architecture is outside this decision.

The owner is asked to approve the scoped private implementation boundary, conditional
hash rule and response-custody default above. This ADR remains Proposed until that
review; no approval signature is inferred from passing tests. Even acceptance authorizes
only separately reviewed implementation slices, never immediate serving activation.
Rollback of this documentation proposal restores the earlier isolated-only proposal.
Later code PRs must be independently revertible without opening routes, accepting
unverified candidates or weakening validators/security gates.
