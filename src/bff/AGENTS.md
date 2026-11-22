# BFF

Own the local session, server-side credential loading, fixed-origin provider transport and safe error projection. Enforce Host/Origin, CSRF, freshness and route allowlists before dispatch. Keep simulator execution, evaluator logic and Kubernetes clients outside this process.

Check dependencies against the [layer matrix](../../HARNESS.md#ownership-and-allowed-edges)
and run `make architecture` after changing them.

Read [runtime ownership](../../docs/development/runtime-ownership.md) and the
[harness specification](../../docs/development/harness-rules.md). Effect owns scoped
BFF operations; composition owns runtime execution and process resources. Keep
per-request lifetimes separate. Expected internal failures are tagged and projected
to safe public outcomes; retain generated types and Ajv. Native HTTP/abort interop
belongs only in qualified platform adapters. [run-reader.ts](run-reader.ts) is the
qualified lazy Effect reader; [transport.ts](transport.ts) owns execution and public
failure projection. Keep Node adapter imports local to the reader, the qualified signing-key GET below,
and the separately [qualified token POST adapter](../../docs/development/token-post-transport.md). No native HTTP
dispatch or transport legacy allowance remains. Preserve the real TLS, raw-header,
byte/deadline, identity and lifecycle tests in tests/integration/transport.test.ts.

Pending shared-user login transactions live in `login/transactions.ts`; see
[their contract and remaining gates](../../docs/development/login-transactions.md).
Keep them separate from local pairing and authenticated sessions. The begin
result's browser binding is server/cookie-only; never JSON-serialize the whole
result. Consume once before exchange I/O. A handoff is not authentication success.
No login/callback route or shared-user activation is admitted by this helper.

`login/protocol.ts` owns the fixed authorization profile and strict raw callback
admission; see [the protocol boundary](../../docs/development/login-protocol.md).
Future incoming adapters must pass raw targets and every Cookie header, enforce
Host/method/initiation CSRF, and keep successful handoffs server-only. Its cookie
instructions do not mount routes or qualify a browser flow. Do not infer login
success from callback admission; exchange and signed nonce/token validation follow.

`login/client-assertion.ts` owns the fixed server-only private_key_jwt signer;
read [its custody and qualification limits](../../docs/development/client-assertions.md).
Use separate configured owners/keys for login and delegation. Form fields are
credentials, not response DTOs. Fresh jti values do not authorize retries of an
uncertain code exchange. No token endpoint transport is admitted by this signer.

`login/token-endpoint/token-post.ts` is a private scoped wire primitive, not validated OAuth
tokens or login success. Keep its response text and submitted form server-only.
Its native HTTP permission is solely the named effective header-size constant;
no request/get, namespace or copied adapter authority is admitted. Repeat TLS,
raw-header, deadline and peer-closure tests before extending transport use.
When changing shared token admission or its dependencies, read the
[token-endpoint layout](../../docs/development/token-endpoint-module.md).
OWN-14 keeps its three exact modules independent of flow adapters and context ports.


`transport/bounded-body.ts` shares only bounded UTF-8 stream consumption between
that POST and the qualified signing-key GET. It takes an existing byte stream,
not a client/response/URL. Keep status/header/TLS policy, scope and deadlines in
the adapters; the helper has no native/platform HTTP, filesystem or ambient
dispatch/abort/timer authority. See [the focused decision](../../docs/development/bounded-response-body.md).


`login/token-endpoint/token-response.ts` admits only private unverified credential envelopes;
see [the phase and authority limits](../../docs/development/token-response-admission.md).
Never treat its success as signed identity or serialize candidates to the browser.
JWT type/signature/issuer/audience/nonce/time checks and current policy are later
obligations. `token-endpoint/token-envelope.ts` owns common native JSON/decoded-name duplicate
checks; keep its flat, syntax-validated scan precondition and standalone tests.
Public decoder results/candidates use named readonly types; readonly does not
replace server-side custody or JWT verification.

`login/code-exchange.ts` wires the private single-use code operation; see
[its sequence and lifetime limits](../../docs/development/code-exchange.md).
The operation depends on feature-owned contracts/capabilities, not adapters.
Execute its Effect only at composition; interruption owns network cancellation.
Owner retirement fences late results but does not itself interrupt request fibers.
A returned expected nonce/candidate is not verified identity or a session.

`login/identity/snapshot-verifier.ts` is the scoped private verifier over caller-trusted
public snapshots; read [its custody, Effect and remaining gates](../../docs/development/snapshot-verifier.md).
Only token-profile.ts may import the reviewed jose members, and strict-json.ts the
reviewed parser members. Qualification delegates through its exact entry; production
never imports fixtures. A verified observation is not a session, enrollment or grant.

`login/identity/signing-key-get.ts` alone owns the newly admitted fixed-origin key
network transport; source/cache/resolver and strict admission remain separate modules.
Read [their ports, lifetime, freshness and qualification guide](../../docs/development/signing-key-source.md).
Use named feature contracts, not factory-derived types. Exact named platform imports
and the read-only maxHeaderSize guard grant no native dispatch, proxy or discovery.
Keep keys/observations private; fresh cached authority is bounded, never stale-on-error.

`login/verified-code-exchange.ts` owns the unmounted consumed-exchange verification
lifetime; [read its sequence and limits](../../docs/development/verified-code-exchange.md).
Operations consume named ports and never import concrete HTTP/crypto adapters. Its
result is a minimal verified observation, not a session or service grant. Preserve
once-only consumption, response/return-intent custody, caller interruption and late
retirement/expiry fences. begin's cookie instructions remain server-only.

`login/delegated-exchange.operation.ts` constructs one private, lazy delegate attempt.
Use only server-owned initial-token custody and its verified expiry. It fixes the
delegate caller and API audience, consumes before POST and never retries uncertain
work. Its output remains an unverified credential candidate: no session, enrolled
identity, service grant or browser DTO may be created from it. Transport/signature
composition and signed delegated-profile admission remain separate gates.

The private token adapter's delegated profile fixes API audience and delegate azp.
`verifyDelegatedToken` additionally binds the independently verified original human
and response-relative lifetime. It takes trusted snapshot/context, does no network
and returns no credentials or grants. A future scoped owner must fence cancellation,
retirement and wall time after its crypto await before publishing authority.

`login/delegated-exchange.ts` is the private scoped wire composition. It owns only
the separate delegate signer, qualified token POST and unverified response decoder.
Never treat its candidate as identity, session or CP permission. Incoming composition
owns request interruption; stop/closed scope fence publication and retire the signer
but do not promise to abort dispatched HTTP. Preserve the fixed issuer/CA/client,
32 caller bound and one-dispatch attempt; no automatic retry after uncertainty.

`identity/delegated-snapshot-verifier.ts` owns scoped delegated crypto admission over
caller-trusted snapshots/context. Clone input before lazy work, retain native crypto
charges through cancellation until settlement, and fence scope/clock/freshness/expiry
after crypto. No caller may infer key provenance, enrollment, session or service grants
from this minimal observation. Key resolution/custody composition remains separate.

`identity/resolved-delegated-verifier.ts` composes configured key resolution and
scoped delegated crypto. Its operation consumes named ports, validates context before
key I/O and fences late issuer/subject/expiry/freshness. Never accept a token-selected
origin or a browser-provided snapshot. The minimal observation is not custody,
session, enrollment or service permission; preserve the whole three-second budget.

`login/verified-delegation.ts` joins private delegate exchange and signed resolved
verification. Only trusted initial-login custody may provide its context; bind the
original issuer/human, retain credentials inside the operation, clamp validity by
both lifetimes and fence late results. Its minimal observation creates neither a
session nor current CP authority. Source proof/custody and route activation remain
separate; never serialize the input or raw candidate into browser DTOs.

`login/login-delegation.ts` owns consumed-login response custody through verified
delegation, using separate login/delegate key configuration. Only signed original
pair proof may supply the original human; retain exact initial access primitives
before awaits. Keep callback navigation/cookie deletion independent of claims and
return only minimal observation. Missing at_hash keeps its accepted custody limits;
no session, stored credential or service permission is activated by this owner.
