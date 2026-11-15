# BFF

Own the local session, server-side credential loading, fixed-origin provider transport and safe error projection. Enforce Host/Origin, CSRF, freshness and route allowlists before dispatch. Keep simulator execution, evaluator logic and Kubernetes clients outside this process.

Read the [layer matrix](../../HARNESS.md) and run `make architecture` after changing dependencies.

Read [runtime ownership](../../docs/development/runtime-ownership.md) and the
[harness specification](../../docs/development/harness-rules.md). Effect owns scoped
BFF operations; composition owns runtime execution and process resources. Keep
per-request lifetimes separate. Expected internal failures are tagged and projected
to safe public outcomes; retain generated types and Ajv. Native HTTP/abort interop
belongs only in qualified platform adapters. [run-reader.ts](run-reader.ts) is the
qualified lazy Effect reader; [transport.ts](transport.ts) owns execution and public
failure projection. Keep Node adapter imports local to the reader and the separately
[qualified token POST adapter](../../docs/development/token-post-transport.md). No native HTTP
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

`login/token-post.ts` is a private scoped wire primitive, not validated OAuth
tokens or login success. Keep its response text and submitted form server-only.
Its native HTTP permission is solely the named effective header-size constant;
no request/get, namespace or copied adapter authority is admitted. Repeat TLS,
raw-header, deadline and peer-closure tests before extending transport use.

`login/token-response.ts` admits only private unverified credential envelopes;
see [the phase and authority limits](../../docs/development/token-response-admission.md).
Never treat its success as signed identity or serialize candidates to the browser.
JWT type/signature/issuer/audience/nonce/time checks and current policy are later
obligations. `token-envelope.ts` owns common native JSON/decoded-name duplicate
checks; keep its flat, syntax-validated scan precondition and standalone tests.
Public decoder results/candidates use named readonly types; readonly does not
replace server-side custody or JWT verification.
