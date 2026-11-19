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
