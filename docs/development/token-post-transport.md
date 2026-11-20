# Fixed token POST transport — M05-PR52d

## Admission scope

[Issue #75](https://github.com/stanimirivanov/perfeng-console/issues/75) extends the
pinned Effect 4.1.2 / platform-node 4.1.2 admission to the single concrete BFF
`login/token-post.ts` adapter. It is shared by the later code and delegated
exchange operations under accepted control-plane ADR 0046. No OAuth grant,
client authentication, token parsing, session or browser flow is admitted here.
The existing Run reader and its qualification remain unchanged.

## Destination, trust and request ownership

Trusted construction accepts a canonical HTTPS Keycloak issuer with the same
closed realm profile as the login protocol. It derives one endpoint ending in
`/protocol/openid-connect/token`; request input cannot select a destination,
headers, CA, method or proxy. One explicit CA certificate PEM (at most 16384
characters, CA flag required) is copied into the scoped Node agent options.
TLS verification and hostname checks remain on, with TLS 1.2 minimum and no
keep-alive. No discovery, redirect decorator, environment proxy agent or retry
combinator is installed.

`post` takes a trusted server-owned, pre-encoded form string of at most 16384
printable ASCII bytes. It sends one POST with form media type and JSON accept
header. It is not an arbitrary browser form passthrough or a public proxy. Later
grant operations must build closed forms using the fixed client signer and
admitted callback, and must not infer that a fresh assertion makes an uncertain
POST safe to replay. The adapter neither logs nor puts credentials in URLs.

The operation is a lazy scoped Effect: construction and creating its description
perform no I/O. The composition root owns execution and cancellation. Each call
owns its agent, request and response lifetime; cancellation, refusal and timeout
close the scope. A full-operation deadline includes headers, streaming and
finalizers: default 3000 ms, permitted 50–3000 ms. This is independent of token
expiry and is not a license to retry an interrupted exchange.

## Parser and response boundaries

The pinned Node backend does not expose per-request `maxHeaderSize` through its
agent options. Supplying that unsupported option is not an admitted workaround.
The adapter instead reads the **effective** `node:http` maxHeaderSize constant
and refuses construction if it is outside 1–16384 bytes. A child-process test
starts Node with `--max-http-header-size=32768` and proves refusal. The pinned
backend uses Node's default request parser, so this bounds received headers.
Repeat this source/API/behavior qualification on Node/backend upgrades.

Only a named import of that constant is admitted from native HTTP, at this exact
module path. Default/namespace imports, native request/get, mixed imports,
re-exports and copies of the permission to other modules remain forbidden by
ownership tests. Exact SDK package admission does not grant native dispatch.

For status 200, require one JSON Content-Type, one Cache-Control containing
no-store, one Pragma no-cache, and no Content-Encoding. These token-response cache
requirements follow [RFC 6749 §5.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.1).
Refuse more than 128 raw header fields before relying on duplicate cardinality
from the pinned Node source; excessive counts cannot hide later duplicate fields.
Content-Length, when present, must be a single numeric value within the byte cap.
The [shared bounded-body reader](bounded-response-body.md) owns byte accumulation,
nonempty admission and fatal UTF-8 decoding inside this adapter's existing scope
and total timeout. It receives no HTTP/header/configuration authority.

Retained streamed bytes are independently bounded (default/max 65536, configurable
256–65536); require nonempty strict UTF-8. No body is read on refused status or
invalid response metadata.

Expected failures expose only invalid_input, invalid_response, denied, unavailable
or deadline. 400/401/403 become denied; 429/server errors become unavailable;
redirects and other statuses violate this operation. Error bodies and framework
causes are not public results. Caller interruption remains Effect interruption,
not a fabricated successful outcome. Unexpected defects remain failed Effects;
future composition must project them safely without exposing credentials.

**Success contains server-only raw text and may contain tokens.** It is not a
browser DTO, valid JSON proof or authenticated identity. The next parser must
reject malformed/ambiguous JSON, validate token response semantics and signed
issuer/audience/nonce/subject/time profiles before any session is granted. This
adapter must never be wired directly to a browser response.

## Verification and remaining gates

Disposable loopback TLS tests cover exact path/form, lazy dispatch, wrong CA and
trusted-CA/wrong-hostname rejection, environment proxy refusal, no redirect or
retry, duplicate/wrong/cache/encoding headers, invalid UTF-8, declared and chunked
byte overflow, oversized response headers, no credential/error-body echo, and
invalid configuration/input. Deadline and caller abort run both before headers
and during response-body stalls, with actual peer-side response closure observed.
Pre-aborted work performs no HTTP dispatch. Temporary keys/certificates and
servers are owned and cleaned by the test. No real credentials or issuer are used.

These are synthetic wire/security receipts, not actual Keycloak/OAuth/browser
admission. Tests exercise proxy variables in the current process; they do not
claim a general OS egress policy or arbitrary global runtime modifications.
Per-process capacity, a single root CA, byte/deadline bounds and strict cache
metadata are deliberate conservative profile choices; qualify interoperability
before changing them. Code/delegated grants, actual client authentication,
JSON/token verification, callback/session integration and shared-pilot receipts
remain pending. Named serving stays gated and local pairing is unchanged.

Rollback removes this unmounted adapter and its exact SDK/constant permissions,
alias and tests. No dependency, generated schema, provider state, existing route
or persistence migration changes.

The [PR52e envelope decoders](token-response-admission.md) now reject ambiguous
response JSON and separate unverified code/delegated token candidates. They do
not compose a grant or verify a JWT; token/session/provider/browser admission
remains pending.
