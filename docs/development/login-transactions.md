# Server-side login transactions — M05-PR52a

## Status and source of truth

Issue [#69](https://github.com/stanimirivanov/perfeng-console/issues/69) implements
only the pending transaction owner for the accepted
[ADR 0046 trust profile](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/adr/0046-select-issuer-and-bff-delegation-trust.md).
It is a prerequisite for control-plane #356 and later PR52 callback/exchange
slices. Shared-user mode is not enabled and local pairing is unchanged.

## Threat model and ownership

An attacker can submit callback state, copy an authorization URL, supply arbitrary
return input, replay a callback, or fill the pending-login budget. Assets are the
PKCE verifier, browser binding, nonce and intended Run. A transaction does not
identify a user or confer a service permission.

`src/bff/login/transactions.ts` is the BFF's synchronous platform adapter for
cryptographic randomness and process-local pending state. Each store has exactly
one process/configuration owner; there is no module singleton, timer, transport,
promise, or Effect runtime to tear down. The composition owner must call `stop`
on shutdown or identity-configuration replacement. Later scoped Effect operations
own asynchronous exchange, cancellation, cleanup and refusal of late results;
they must not add a second pending-transaction store. Secrets are dropped from
reachable store state; JavaScript strings cannot promise memory zeroization.

## Contract

- `begin(intent)` returns authorization parameters separately from a secret
  `browserBinding`. Each of state, nonce, verifier and binding uses independent
  32-byte Node cryptographic randomness. The verifier remains in the store.
- The challenge is unpadded base64url SHA-256 and the method is always S256,
  following [RFC 7636 §4](https://www.rfc-editor.org/rfc/rfc7636.html#section-4).
- Only `{ kind: 'home' }` or `{ kind: 'run', runId }` are admitted, with exact
  fields and the pinned Ajv RunId validator. Copies detach caller-owned values.
  No raw URL, arbitrary path, fragment or query parameter is retained.
- `consume(state, browserBinding)` validates bounded ASCII opaque inputs,
  matches the independent binding in constant time and atomically removes the
  pending entry before returning a server-only nonce/verifier/return-intent
  handoff. Wrong binding does not destroy someone else's transaction. A later
  exchange failure cannot restore a consumed transaction.
- An entry expires at five minutes, including equality. At most 128 entries
  remain live; admission refuses at capacity instead of evicting another login.
  Access reclaims expired entries. A failing/regressing/non-finite monotonic clock clears
  the store and stops further admission. `stop` is idempotent and terminal.
- Rejections return no partial handoff. No credential, token or user identity is
  logged, persisted or passed to the browser by this module.

## Required later integration and acceptance gaps

The caller is trusted server code, never Angular. Future HTTP adapters must send
only `authorization` to the configured issuer and protect `browserBinding` in a
Secure, HttpOnly, appropriately SameSite host-only cookie. Never serialize the
whole begin result into a browser response. Cookie scope, multi-tab behavior,
request/callback bounds, login initiation CSRF, fixed issuer/redirect/client
configuration and proxy handling need their own integration tests. A per-store
capacity bound is not endpoint rate limiting or a fleet-wide denial-of-service
control.

Consume the transaction on both success and provider-error callbacks, after
checking its browser binding and before asynchronous exchange. Validate the
provider issuer, code exchange and signed ID-token nonce; rotate the real session
only after all authentication and delegation checks pass. A transaction handoff
is not a validated ID token or a logged-in session. Preserve tokens server-side,
logout destruction, deadline/cancellation fences, safe errors and current provider
policy. These controls follow
[OAuth security BCP](https://www.rfc-editor.org/rfc/rfc9700.html); the helper alone
is not OAuth/OIDC or browser conformance.

The existing UI has only root lookup, so no redirect is constructed here. PR53
owns canonical CI Run navigation; it must map the closed Run intent to its
reviewed route and reauthorize at the public API. Browser callback/exchange,
real Keycloak-to-BFF receipts and the shared pilot remain unimplemented. Provider
and BFF qualification must pass together before named serving is enabled.

## Verification, judgment calls and rollback

Six node:test cases cover PKCE derivation, independent material, verifier custody,
wrong/missing/swapped binding, replay, strict return intents, defensive copies,
expiry/capacity and terminal shutdown/clock failure. The production compiler,
ownership registry, public alias maps and normal test discovery include the module.

Five minutes and 128 pending entries are bounded initial operator defaults, not
measured fleet capacity. Pending logins deliberately do not survive process
restart; users restart sign-in. Return intent is structured because implementing
an unreviewed route here would bypass PR53. Synchronous state/crypto use ordinary
TypeScript and the admitted Node crypto adapter; no asynchronous work justifies
an Effect operation in this slice.

Rollback removes this unused-by-serving owner, its alias and tests. No session,
provider credential, contract, generated output, local pairing behavior or public
route migration is required.

The [PR52b protocol adapter](login-protocol.md) now consumes this owner to build
fixed authorization requests and admit bound callbacks. It supplies cookie
instructions only; incoming HTTP integration, exchange and browser receipts
remain pending.
