# Fixed login protocol admission — M05-PR52b

## Status and trust boundary

[Issue #71](https://github.com/stanimirivanov/perfeng-console/issues/71) adds a
consumer of the [pending transaction owner](login-transactions.md) under accepted
[control-plane ADR 0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/adr/0046-select-issuer-and-bff-delegation-trust.md).
It is a synchronous BFF protocol adapter, not an incoming HTTP handler, token
client, authenticated session or shared-user activation. Existing pairing and
serving remain unchanged. No issuer deployment or credentials are configured.

The threat is request-selected issuer/redirect authority, callback replay or
mix-up, ambiguous cookies/parameters, credential leakage and unbounded input.
Configuration is trusted server input; callback targets and cookies are untrusted.
The returned successful handoff is private server input, never a response DTO.

## Fixed profile and initiation

`createLoginProtocol` copies canonical HTTPS configuration: an exact Keycloak
issuer with `/realms/<ASCII realm>` (1–128 letters/digits/underscore/hyphen), and
an exact Console origin without path, query, fragment or credentials. Issuer
length is bounded to 1024 characters. Invalid configuration throws one fixed safe
message; no supplied value or URL-parser error escapes.

The authorization endpoint is derived from that issuer. The interactive client
is always `perfeng-console-login`, the response type is `code`, and the only scope
is `openid`. The callback URI is the configured origin plus
`/console/auth/callback`. Caller input can supply only the closed home/Run intent;
it cannot override issuer, callback, client, scope or audience. The issuer must
configure the initial delegate audience; this request does not request API access.

`begin` returns an issuer authorization URL and a **separate server-only**
Set-Cookie instruction. Only the URL may become a Location header. The host-only
`__Host-perfeng_login` binding uses `Path=/; Secure; HttpOnly; SameSite=Lax` and
`Max-Age=300`. The verifier and binding do not enter the authorization URL.
S256 uses the existing transaction owner following
[RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html#section-4).

## Callback admission

Pass the raw, unnormalized origin-form request target and **all** Cookie header
values. The adapter permits only the exact callback path with a query, at most
8192 printable ASCII characters, no fragment and valid percent escapes. It rejects
absolute/dot-segment paths before URL parsing can normalize them. Cookie input
has at most eight header values and 4096 printable ASCII characters combined;
there must be exactly one matching cookie, including across headers. It is not
URL-decoded. Duplicate state cannot select a transaction.

A unique state and matching independent browser binding consume the transaction
before further protocol checks. Parameter names are decoded before duplicate
checking. Only state, iss, code, session_state, error, error_description and
error_uri are admitted. Require the exact configured issuer as described in
[RFC 9207 §2.4](https://www.rfc-editor.org/rfc/rfc9207.html#section-2.4).

A success requires one nonempty printable ASCII code of at most 4096 characters.
The optional session_state has at most 256; it grants no authority. A provider
error cannot coexist with code; its bounded error fields are discarded. Bound
failures return only `invalid_callback` or `provider_denied` and cookie deletion.
Unbound/malformed raw envelopes return no cookie instruction, so another browser's
copied link cannot clear a legitimate pending login. Every bound outcome burns
the transaction; retry needs a new login. The success handoff contains code,
expected nonce, verifier and return intent, plus the same protected-cookie deletion.
It does not establish identity or grant a session. Stop delegates to the one
transaction owner; there is no second store or async runtime.

## Remaining admission gates and judgment calls

The reserved callback path is not mounted. Future incoming adapters must enforce
trusted Host, exact method, initiation Origin/CSRF and body/header limits before
using this helper. Raw targets must not be normalized by a proxy/router first.
Apply no-store/referrer/callback-response protections and keep successful handoffs
out of logs, errors and browser responses. A shared deployment must not start
until these controls have real-browser evidence.

The single binding cookie makes a newer login supersede the previous browser
attempt; old pending entries remain bounded until expiry. Multiple parallel tabs
are not claimed. The strict realm/ASCII/parameter profile is deliberate: qualify
it against actual pinned Keycloak responses before mounting, rather than loosening
it when a response surprises us. Callback issuer checks alone do not validate an
ID token, nonce, authorization code or the network presenter.

The next exchange slice must use admitted fixed-origin TLS transport and client
authentication, validate signed token/nonce/audience/subject profiles, retain OAuth
credentials server-side and rotate the actual authenticated session only after
all checks pass. Deadlines, cancellation, logout and late-result refusal remain
required under [OAuth security BCP](https://www.rfc-editor.org/rfc/rfc9700.html).
Real Keycloak/BFF/browser, canonical Run navigation and shared-pilot receipts are
still pending. No existing control-plane admission receipt is promoted here.

## Verification and rollback

Five node:test groups cover exact request fields, independent cookie/verifier
custody, safe configuration rejection, duplicate/malformed/oversized callback and
cookie inputs, cross-browser binding, exact issuer, error redaction, replay,
expiry and stop. Tests exercise the actual transaction owner. Compiler, public
import and ownership maps include this adapter; no dependency or contract changes.

Rollback removes this unmounted adapter, its alias and tests. The transaction
owner, local pairing, existing routes and all provider state remain intact.

[PR52c client assertions](client-assertions.md) now supply a separate bounded
confidential-client signing capability for later code/exchange operations. This
is synthetic signing conformance only; no token POST, provider admission or
browser session is added.
