# Private delegated exchange operation — PR52x

Under accepted ADRs 0004 and 0046, this operation fixes the real fixture's standard
access-token exchange profile: delegate client, access subject/requested token types
and perfeng-control-plane audience. The initial token and verified expiry must come
from future server-owned custody, never browser input or decoded unverified claims.

The Effect is lazy and each constructed attempt executes at most once. It consumes
before dispatch and never retries after denial, invalid envelope, uncertain error
or interruption. The caller owns interruption; retirement/source expiry/clock
regression fences late candidate publication. Existing qualified assertion, wire
and decoder interfaces are ports; no new HTTP/crypto implementation is introduced.

The named result returns only private unverified delegated candidates and original
POST-start context. It is not a signed delegated identity, session, actor enrollment
or grant. Unexpected failures/interruption remain Effect failures for the existing
safe terminal boundary; never serialize causes or credentials. No listener, login
activation, local-session change or dependency is added.

Tests use deterministic ports to prove fixed form, one dispatch, safe refusal and
late-result fences. They do not qualify delegated signatures, actual-provider
production composition or browser/session behavior. The real BFF-owned login gate
passed separately in Environment PR #400 against Console PR #124; this operation
does not extend that receipt. Later work must compose server-only credential custody,
repeat real-provider delegation and verify same-subject/client/audience/time before
any authenticated session or CP dispatch. Revert operation/contracts/alias/tests
together; no persistent state or public contract migration is required.


## Signed delegated binding — PR52y, issue #127

The existing private JWT adapter now admits a separate delegated profile: exact
configured issuer, single perfeng-control-plane audience, perfeng-console-delegate
azp and Bearer claim type. ID and initial-access profiles retain their original
audience/caller rules. The same strict compact/duplicate/header/RSA/snapshot and
jose signature checks apply; no new crypto implementation or dependency is added.

verifyDelegatedToken binds the signed subject to the original verified human supplied
by a trusted custody owner, not a claim-derived expectation. It captures subject,
issuer, observation time and POST-start/expiry primitives before awaits. Issuance
cannot precede that request by more than the accepted 30-second skew. Usable expiry
is the minimum of signed exp and POST-start plus expires_in (1..300 seconds);
expiry equality refuses, and skew never extends that usable expiry.

This helper verifies one observation at its supplied instant and snapshot. It has no
network, session, grant or token-storage authority. The later scoped owner must
recheck activity/current time after async verification, bound crypto work and keep
credentials server-only. Original-login lifetime/session policy remains that owner's
obligation. It must not use role claims as HUMAN enrollment or service permission.

The isolated identity-jwt-qualification target includes independently signed positive
and substitution/expiry/stale-key/forgery tests. This is synthetic profile evidence,
not actual-Keycloak delegated composition, lifecycle or browser/session admission.
The existing real-provider receipt remains tied to its prior source revisions.
Rollback reverts the new delegated profile/helper and its qualification exports/tests
together; no public API, local-pairing or stored-state migration is involved.


## Scoped wire composition — PR52z, issue #129

makeDelegatedExchange owns a separate configured delegate-client signer and reuses
createTokenPost and decodeDelegatedTokens through delegateOnce. Its config is trusted
server composition, not browser/claim input. The private exact public alias permits
server integration/testing; it is not a browser-facing API. There is no new network
adapter or permission to override issuer, audience, client or destination per attempt.

Effects remain lazy. Each constructed attempt dispatches at most once, with at most
32 active caller Effects; excess callers receive unavailable without queuing. The
qualified POST retains explicit CA, TLS, raw-header/cache/content checks, byte bounds,
no redirects/proxies/retries and its maximum three-second wire deadline. No token or
assertion is serialized to public responses. A successful result remains explicitly
unverified-delegated and private; signature/subject verification is not skipped merely
because the candidate decoded successfully.

Scope acquisition owns signer cleanup even if wire configuration fails. stop retires
signing and result publication; the scope's closed state also fences late results
before asynchronous finalizers finish. Retirement does not physically abort an
already-dispatched caller-owned POST. Incoming composition must interrupt request
fibers on disconnect/shutdown; the wire deadline remains enforced independently.

Real loopback TLS tests verify delegate assertion signature/endpoint/client binding,
fixed audience/source form, private result/invalid envelope, one-attempt replay,
closed/retired owners, cancellation/late response and deadline refusal. These use a
synthetic HTTPS token endpoint, not a fresh real-Keycloak delegation receipt. Trusted
initial credential custody, original-human binding through the signed verifier,
scoped delegated verification, current CP policy and session/browser/shared-pilot
activation remain separate gates. Local pairing and public API contracts are unchanged.
Rollback removes this private factory, contracts/entry/admissions and tests together;
no persisted credential or deployment migration is introduced.


## Scoped snapshot verification — PR52aa, issue #131

makeDelegatedSnapshotVerifier wraps the admitted delegated profile in a private
Effect lifetime. It accepts only explicit trusted snapshots and original-human/
response context; it does no key resolution, HTTP, token storage or session work.
Inputs are cloned when verify is called, before the lazy operation is returned.
The original code-pair snapshot owner is unchanged. Lifecycle guards are local to
this separately admitted delegated owner; a shared lifecycle refactor is deliberately
not mixed into this behavior change.

The caller cap and outstanding-native-crypto cap are both 32, with no wait queue.
Foreign WebCrypto is not assumed abortable: interruption may release the Effect
permit, but native work stays charged until its promise settles. A three-second
budget returns a safe deadline refusal. Crypto errors are projected to unavailable,
not diagnostic-bearing response bodies. Scope closure interrupts observation even
if cleanup finalizers have not finished; neither late crypto nor cancellation can
publish identity after retirement.

The owner checks a non-regressing wall clock before and after crypto, key freshness
at completion and strict usable expiration. Caller/context mutation cannot replace
the captured subject, key or response-time bounds. Results contain only minimal
issuer/subject/validUntilMs or safe refusal, never raw credentials or grants.

Tests exercise real signed delegated JWTs, mutation, clock regression, expiry/trust
ageing after crypto, closed/closing scope, native cancellation accounting, overload
and a stalled-crypto deadline. This is synthetic scoped verification evidence only.
Key-resolved delegated verification, original credential custody, actual-provider
composition and session/browser/current-policy admission remain pending. Future
composition must retain those boundaries; a trusted snapshot type alone is no
proof of provenance. Roll back this owner/contracts/alias/admissions/tests together;
there is no public or persisted-state migration.


## Resolved delegated verification — PR52ab, issue #133

makeDelegatedVerifier composes the existing fixed-origin signing-key resolver/cache
and scoped delegated snapshot verifier under one configured issuer and non-regressing
clock. The operation owns named selector/resolver/crypto ports. It clones the original
human/response context before returning lazy work and validates its bounded subject,
request time, expires_in and strict response expiry before key I/O. Only a bounded
untrusted kid may select a key; no token field can choose an issuer, URL or CA.

Resolved issuer and key ID must match the configured owner/request. Verification
uses the admitted key plus its original retrieval-start timestamp, never a caller
snapshot. The full resolution-plus-crypto path has a three-second budget and at
most 32 caller Effects without queueing. Completion rechecks owner lifetime, clock,
key freshness and minimal signed issuer/subject/usable expiry. Closed/cancelled
owners cannot publish late identity. Unknown keys, unavailable trust and deadline
fail safely without credentials or diagnostic-bearing partial results.

Existing CA/TLS/raw-header/response-size controls, cache freshness, single-flight,
refresh-rate/miss limits, negative-state bounds and native crypto accounting remain
owned by their existing modules. This adds no HTTP, crypto or dependency permission.
The separately admitted code-pair resolver is unchanged; a shared lifecycle refactor
is deliberately outside this behavior slice.

Real loopback TLS tests exercise configured JWKS retrieval and fresh-cache reuse,
actual delegated signatures and original-human/client binding, preflight refusals,
wrong CA, cancellation/scope retirement during retrieval and whole-operation timeout.
These are synthetic issuer tests, not actual-Keycloak delegated composition, original
credential custody, CP enrollment/grants or session/browser/shared-pilot admission.
Rollback removes new operation/composition/contracts/alias/admissions/tests together;
no persistent resource, public API or local-pairing migration exists.


## Private verified delegation — PR52ac, issue #135

makeVerifiedDelegation joins the existing scoped delegate wire owner and resolved
verifier through named operation ports. The caller must already own a verified
initial login for this configured issuer. InitialDelegationContext is a private
server contract, never a browser DTO or proof supplied by arbitrary claims. Its
issuer is checked against configuration before dispatch; subject, initial access
bytes and usable expiry are captured before lazy work and retained privately through
one consumed attempt. No refresh token or persistent credential store is added.

The actual separately configured delegate key signs the fixed-origin POST; decoded
API candidates then undergo the existing signed issuer/audience/caller/original-human
and response-time checks through admitted key resolution. The combined owner bounds
active caller Effects at 32 without queueing. The existing three-second POST and
three-second resolved-verification budgets are separate sequential bounds, not a
new claim of a three-second whole-login budget. Source validity and a non-regressing
clock are checked before dispatch and after asynchronous stages. Owner/scope closure
or caller interruption prevents late publication; stop retires signing and fences
results but does not claim physical abortion of foreign crypto or dispatched I/O.

Success releases only stage=verified-delegated-observation, configured issuer,
original human subject and min(original-login expiry, delegated usable expiry).
Neither initial nor delegated bearer, assertions, keys, raw claims or decoded
candidates escape. No session, HUMAN enrollment, current service grant or baseline
permission is inferred. Failure cannot restore a consumed attempt or retry uncertain
exchange. Incoming adapters still own request interruption and safe terminal errors.

Real synthetic TLS tests exercise the actual signer/wire/decoder/resolver/crypto
composition, context mutation, replay, issuer/subject substitution, original-expiry
clamping, cancellation/retirement/expiry during exchange and closed scope. Existing
lower-level gates retain detailed wire, cache and native-work policies. This is not
an actual-Keycloak full-flow, consumed-code custody or browser/session receipt.
Those integrations and current CP policy remain gated. Roll back new factory,
operation/contracts/alias/admissions/tests together; no public or stored-state
migration, local pairing change or serving activation is introduced.
