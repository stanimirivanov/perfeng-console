# Confidential-client assertions — M05-PR52c

## Scope and source of truth

[Issue #73](https://github.com/stanimirivanov/perfeng-console/issues/73) implements
a narrow server-side signing capability shared by the later authorization-code
and audience-restricted exchange operations. Accepted
[control-plane ADR 0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/decisions/0046-select-issuer-and-bff-delegation-trust.md)
requires separate login/delegate registrations and private-key client
authentication. The existing environment `keycloak_human.py` fixture uses
RS256 assertions with a token-endpoint audience and a 60-second lifetime.
This adapter does not mint an access token or a human identity.

## Trust boundary and fixed profile

Only trusted BFF composition supplies issuer, registered client ID and private
key. No request may select these values. The factory permits exactly
`perfeng-console-login` or `perfeng-console-delegate`; one owner never changes
client or issuer. As in the login protocol, the issuer must be canonical HTTPS,
without userinfo/query/fragment, with a closed `/realms/<realm>` path. Audience is
always that issuer plus `/protocol/openid-connect/token`; no token data selects
an endpoint. Construction copies identity values and parses the key once.

Keys must be a single unencrypted PKCS8 PEM of at most 16384 characters, ordinary
RSA with 2048–8192-bit modulus and exponent 65537. Public-only, PKCS1, encrypted,
EC, RSA-PSS and weak/non-admitted RSA keys are refused. Key parsing exposes one
fixed configuration error, never the PEM or crypto backend diagnostic. Raw PEM
is not an owner property or a value used by the issuance closure.

`issue` constructs only these client-authentication fields:

- `client_id`: fixed registered client.
- `client_assertion_type`: `urn:ietf:params:oauth:client-assertion-type:jwt-bearer`.
- `client_assertion`: compact JWS with exactly `alg=RS256, typ=JWT`; claims are
  `iss=sub=client`, fixed token-endpoint `aud`, wall-clock second `iat`, `exp=iat+60`,
  and an independent 32-byte cryptographic base64url `jti` on every invocation.

The fixed profile follows
[RFC 7523 §§2.2 and 3](https://www.rfc-editor.org/rfc/rfc7523.html#section-2.2).
The adapter implements no RSA primitives or generic JWT verification: it calls
Node's documented `createPrivateKey`, `randomBytes` and `sign` with SHA-256 and
explicit PKCS1-v1_5 padding. The pinned Node 26.13.0 runtime and TypeScript types
are exercised by the tests; see the [Node crypto reference](https://nodejs.org/api/crypto.html).
No third-party OAuth/JWT library or HTTP authority is added.

## Lifetimes, failure and custody

One configured process owner holds the signing capability. `stop` is terminal
and idempotent. Invalid/out-of-range/non-integer wall time, a backward whole
second, thrown clock or signing failure stops future issuance and returns no
partial assertion or backend details. Calls in the same second are allowed but
must still have different jti values. Wall-clock JWT dates deliberately differ
from the monotonic pending-login expiry clock. Small backward clock corrections
within the same second do not change the issued second; a larger correction
requires owner replacement after the operator restores trustworthy time.

The later Effect exchange operation owns each freshly issued assertion and its
bounded lifetime. Do not cache, retry, log or expose assertion form fields to the
browser. Issue a fresh assertion for each separately authorized request; a fresh
assertion does not make an uncertain authorization-code/token-exchange request
safe to replay. Current store shutdown cannot revoke assertions already issued.
The server must enforce assertion expiry and replay policy; unique jti values
alone do not prove provider replay refusal.

Composition must use independently managed keys for the two clients and stop old
owners on configuration replacement. Independent factories cannot prove that an
operator supplied distinct keys or registered the expected public key at the
issuer. This slice does not load key files, configure secrets/clients, publish
JWKS, select key IDs or qualify rotation. No `kid` header is emitted, matching
the fixture's single registered client-key profile. Rotation needs its own
provider-conformance checks. Dropping references is not a memory-zeroization
promise for JavaScript strings or OpenSSL key storage.

## Verification and remaining admission

Four node:test groups use generated in-memory keys and an independent signature
verification call. They verify exact claims/headers/form fields, same-second jti
uniqueness, tamper/wrong-key refusal, independent client/config ownership, unsafe
key/config rejection, lifetime, stop and invalid/failing clocks. These are
synthetic cryptographic checks, not actual Keycloak client authentication or
capacity/latency measurements.

The [PR52d token POST adapter](token-post-transport.md) separately qualifies
fixed-endpoint TLS/streaming behavior; it does not compose these assertions or
qualify actual OAuth client authentication. Code exchange, signed
ID-token/nonce validation, audience-restricted delegation, authenticated sessions,
real-browser/provider and shared-pilot receipts remain pending. Neither this
signer nor a callback handoff grants a session or service access. Existing local
pairing and production routes remain unchanged; named mode stays gated.

The 60-second assertion lifetime and RSA algorithm/profile match the existing
fixture; the explicit key-size/format bounds are conservative adapter admission
choices. Any wider profile needs tests and review. Rollback removes this unmounted
signer, its alias and tests, with no provider, session, contract or persistence
migration.
