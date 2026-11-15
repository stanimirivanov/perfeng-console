# Single-use private code exchange — M05-PR52f

## Scope and ownership

[Issue #79](https://github.com/stanimirivanov/perfeng-console/issues/79) composes
the admitted login protocol, client signer, token POST and response decoder under
accepted control-plane ADR 0046. No listener, shared-user session, token validation
or named-mode activation is introduced. The output is private unverified code
candidates, expected nonce, return intent and a request-start time anchor.

`code-exchange.operation.ts` owns the lazy Effect sequence and consumer-owned
capabilities. It imports only Effect and feature data contracts, not HTTP/crypto
adapters. `code-exchange.ts` wires those capabilities and owns pending-login/signer
retirement. It never executes an Effect or creates another runtime. Feature-only
`login-contracts.ts` owns shared credential/intent/result types; existing decoder
and transaction type exports are preserved. Token POST now explicitly exposes a
named result and an unknown Effect failure channel, not an inferred any or a
promise of infallibility. Unexpected failures remain failed Effects.

## Sequence and private result

Creating `complete` snapshots the incoming cookie-header array and returns an
Effect without consuming state or doing I/O. On execution:

1. Refuse a retired owner, then admit and consume the bound callback exactly
   once. Bound provider errors retain their safe reason and cookie deletion.
2. Capture trusted epoch-millisecond request-start time. Invalid/failing time
   refuses the consumed attempt. Issue a fresh fixed **login-client** assertion.
3. Build exactly the authorization_code, code, fixed redirect_uri, PKCE verifier
   and three client-authentication fields. Fields are projected explicitly, never
   spread from HTTP input or a potentially extended assertion object.
4. Execute the one admitted POST. There is no retry. Invalid response, denial,
   deadline or uncertainty never restores the pending transaction.
5. Recheck retirement and clock validity/regression before exposing credentials.
   Decode only the code envelope. Return unverified candidates, original nonce/
   intent, requestStartedAtMs and protected binding-cookie deletion.

Executing the same Effect description twice does not send the code twice: the
second execution cannot consume the transaction. Safe failures contain no partial
candidate, code, verifier, assertion or provider diagnostic. Cookie deletion may
not reach the browser after disconnect/interruption; the server transaction is
already burned and the next attempt must begin a new login.

## Lifetimes and remaining authority checks

The request-start epoch timestamp is a conservative metadata anchor, not a
verified token expiry or a new lease. Later verification must use signed JWT
bounds and conservative elapsed/clock handling, never restart expires_in at
response receipt. Carrying the expected nonce does **not** compare it with a
verified ID-token nonce.

Stop synchronously retires pending login/signing authority, refuses new work and
fences in-flight results. It does not revoke an issued assertion or independently
interrupt caller-owned request fibers. Composition must interrupt active request
scopes on disconnect/shutdown/configuration retirement. Without caller interruption,
the qualified transport's at-most-three-second deadline bounds outstanding I/O;
retired results are refused even if the request completes. No detached work or
background refresh is introduced.

Signature/algorithm and fresh key trust, exact issuer/audience/client/type,
ID-token nonce, stable subject/time and provider policy remain required before
any authenticated session. Delegated exchange/current service authorization,
refresh/logout, browser callback/cookie/CSRF integration and actual Keycloak/shared
pilot qualification remain pending. Local pairing and existing serving are unchanged.

## Verification and rollback

A disposable loopback TLS fixture checks the actual closed form, PKCE challenge,
RS256 client signature/claims, fixed endpoint/redirect and decoder chain. It
proves lazy execution, copied input/configuration, no POST on bad binding, no
replay after denial/invalid response/clock regression/caller interruption,
peer-side cancellation closure, and retirement refusal of an otherwise valid late
response. Constructor/clock errors have fixed safe outcomes. Candidate tokens are
synthetic and deliberately not valid JWTs: this is wire/composition evidence,
not actual Keycloak or authentication success.

Rollback removes the unmounted operation/composition/public alias. Shared data
type location and explicit wire result annotations preserve existing APIs and
can remain. No dependency, generated contract, provider state, cookie, route,
local-session or persistence migration is required.
