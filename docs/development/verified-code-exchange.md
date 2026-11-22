# Consumed code exchange to verified observation — PR52v, issue #123

Under accepted ADRs [0004](../adr/0004-qualify-jwt-verification-before-runtime-adoption.md)
and [0046](https://github.com/stanimirivanov/perfeng-control-plane/blob/main/docs/adr/0046-select-issuer-and-bff-delegation-trust.md),
makeVerifiedCodeExchange acquires a private single-use exchange plus the admitted
key resolver and signature verifier. It creates no session, actor enrollment, grant,
listener route or shared-user mode. Local pairing and generated validators are unchanged.

## Ownership and sequence

verified-exchange-contracts.ts owns readonly config, result and operation ports.
verified-code-exchange.ts composes exactly the existing createCodeExchange and
makeCodePairVerifier constructors without another runtime. Operations depend on
consumer-owned ports, never concrete HTTP/crypto adapters. Resolved key selection/
verification moved from the fixture into identity/resolved-pair.operation.ts and its
composition; the fixture is a named re-export bridge to that same implementation.

Factory acquisition captures trusted configuration and owns one lifetime. begin
returns the existing authorization URL and server-only binding-cookie instructions;
it is not a browser JSON response. complete copies Cookie headers and returns lazy
Effect work. Execution:

1. Refuse retirement or excess work before dispatch. Admit/consume the original
   state/browser binding once through the existing strict protocol, including nonce,
   PKCE verifier and allowlisted return intent. Bound failures never restore state.
2. Perform the original fixed-origin, client-authenticated token POST once. Preserve
   explicit CA/TLS, no-store/no-cache/raw-header/body limits and its <=3000 ms deadline.
   No retry after an uncertain POST, invalid envelope or signature failure.
3. Project both decoded token strings, expiresIn, expected consumed nonce and original
   POST-start time into owned verification input before the next await. Capture the
   original cookie deletion and return intent separately; claims cannot supply them.
4. Resolve only bounded key IDs at the configured issuer, then verify the exact pair
   through the admitted snapshot verifier. Preserve subject/nonce/client/type/signature/
   time/freshness rules and validate at_hash when present against the accompanying
   access bytes. Preserve the existing 3000 ms whole-verification budget and limits.
5. Recheck retirement, current clock, configured issuer and strict usable expiration
   before releasing only stage=verified-code-observation, issuer, subject,
   validUntilMs, original returnIntent and cookie deletion. Failures contain safe
   reasons and optional cookie deletion, never partial credentials/identity/diagnostics.

At most 32 completions run per owner. A refusal before consumption leaves that
transaction untouched, but unavailable does not tell a caller whether consumption
occurred: never infer permission for automatic retries. Re-execution after actual
consumption refuses without another POST. The protocol's existing 128-pending cap
and monotonic pending lifetime remain separate from JWT wall-clock observations.

## Lifetimes and trust limits

Callers own request execution and interruption, including disconnect. Scope closure
retires the exchange and closes scoped key/crypto owners. Both composition owners
also check the pinned Effect public Scope.state Closed marker: a delayed unrelated
finalizer cannot keep outward authority alive after scope closing begins. stop synchronously retires
pending exchange/signing authority and fences late results; it does not by itself
interrupt caller-owned POST fibers or revoke provider credentials. Its existing
wire deadline remains a bound; future HTTP composition must interrupt request scopes.
Interruption remains interruption, not a fabricated successful or retryable response.

This result is an observation, not a HUMAN/CI designation, authenticated session or
service/baseline permission. Raw ID/access/refresh candidates, code, nonce, verifier,
assertion, keys and provider bodies are not returned or persisted. Later delegated
exchange/credential custody must stay inside the server owner, not extend a browser
DTO with those values. Without at_hash, subject/time agreement is not cryptographic
common-response proof: custody is from one authenticated fixed-origin POST, and the
accepted relying-party threat assumptions still apply.

## Evidence and remaining gates

The new real-TLS test issuer checks actual state/cookie admission, PKCE and client
assertion signature/endpoint, returns independently signed JWTs, and proves minimal
verified output, preserved native Run return intent, signed nonce/subject/hash refusal,
concurrent replay, cancellation after POST and during key I/O, expiry, retirement,
scope closure (including delayed cleanup) and completion-capacity behavior. Its credentials/keys/data are synthetic
fixtures, not a real-provider BFF login or browser receipt. Tests without automatic
retry preserve the consumed attempt's failure semantics.

Existing provider CLI now exercises the actual adopted resolved operation; existing
TLS/cache/crypto qualifications continue through exact bridges. The previous verifier-
to-identity-fixture permissions are retired in AST and graph checks. The v2 provenance
guard/digest now covers all adopted login modules, root manifest/lock and fixture
inputs, not just identity helpers. Historical receipts remain tied to their sources.

Run make verify, both identity/key qualification gates, supply-chain, relevant harness
fault probes and product isolation. Re-run the authorized disposable Keycloak
verifier/cache fixture on committed inputs. Its current observer starts after a
Python-owned code exchange: PASS proves verifier/cache compatibility, not BFF-owned
state consumption against Keycloak. A provider fixture supporting that transaction,
non-secret at_hash profile evidence, incoming Host/method/Origin/CSRF/browser handling,
delegated/session/current-policy and shared-pilot activation remain separate gates.

Rollback removes the unmounted verified owner/operation and restores the prior
qualified resolved fixture/bridges together. Preserve the admitted key/crypto stack,
original raw exchange, validators and local pairing. No cookie/session/database or
persistent identity deployment migration is introduced.
