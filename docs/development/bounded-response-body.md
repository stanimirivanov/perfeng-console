# Focused bounded-body extraction — issue #154

## Decision and evidence

T8 admits only a private streamed-body reader shared by `login/token-post.ts` and
`login/identity/signing-key-get.ts`. Each adapter repeats the same byte accumulator,
pre-retention overflow refusal, nonempty-body check and fatal UTF-8 decode. The
shared implementation makes that admission sequence auditable in one place. This
is not a configurable HTTP client or a replacement for either qualified adapter.

The helper lives at the neutral `src/bff/transport/bounded-body.ts` location. Its
input is an already-created `Stream<Uint8Array, E, R>` plus the adapter-admitted
positive byte limit (currently at most 65536). It returns `Effect<string,
E | InvalidResponseBody, R>`: stream errors and service requirements are preserved,
body admission has a private tagged refusal without input bytes or diagnostics.
It performs no JSON parsing. Each invocation owns its accumulation state.

The pinned Effect 4.1.2 source (`effect/src/Stream.ts`, Stream and runForEach)
preserves stream error/environment parameters through consumption. The pinned
platform-node NodeHttpIncomingMessage.stream exposes Uint8Array elements. This
extraction reuses the existing qualified runForEach/Effect.try decoding sequence.

## Authority stays with each adapter

The POST/GET adapters retain endpoint/configuration admission, TLS/client creation,
status classification and refusal-body privacy. Their Node incoming-message guard,
raw header count/cardinality, JSON media/encoding and Content-Length checks remain
local. Only POST requires no-store/no-cache. Duplicate/malformed Content-Length
rejected by Node's parser remains a transport error, not a newly invented body
refusal. Public result tags and reason sets do not change.

The helper takes no response handle, URL, headers, client, request, CA, retry policy
or deadline. Its package admission allows only exact named Data/Effect/Stream
imports; ambient dispatch, abort/timer APIs, native/platform HTTP and filesystem
imports are not granted by its adapter role. The original adapters' native
permissions do not expand. Stream consumption remains inside their existing scoped
Effect and total timeout, so interruption/failure closes the response and agent.

## Verification and limits

First pin text/byte boundaries, split UTF-8, malformed/empty text, stream errors,
laziness, independent executions and early termination in focused helper tests.
Real TLS characterization for both adapters pins exact cap/overflow, duplicate and
malformed lengths, headers/encoding, peer disconnect, cancellation and timeouts.
Existing TLS trust/hostname/proxy/refusal-privacy tests remain authoritative.

Run focused tests, signing-key-wire qualification, import/ownership/architecture
and type checks, make verify and supply-chain. The unmounted adapters and helper
remain outside the shipped listener source closure; do not add them to its release
inventory. Existing isolated qualification bridges reach the actual adapters and
need no alternate implementation. The provider runner source guard/digest adds
the exact helper path outside login; edits change provenance and missing/symlinked
helpers refuse. Its v2 framing stays unchanged. Historical receipts do not qualify
this new closure. No new route, session or provider admission.

Rollback helper, both consumers, exact admission/alias registrations and their
regressions together. Header/configuration sharing and the Run reader are outside
this decision; similar code alone does not authorize further transport reuse.
