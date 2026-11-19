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
