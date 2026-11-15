# Test-derived guide provenance

`make guide` builds the browser, captures only tagged operator journeys, and
publishes a disposable `dist/user-guide` artifact. Failed or empty capture removes
publication; ordinary regression tests are not guide chapters.

`sourceDigest` includes authored `src`, `apps`, and `tools`, workspace/build/alias
configuration, the package manifest and lock. Qualification sources, manifests,
locks and recorded receipts remain included: installing a fixture does not turn
its authored inputs into ignored content.

Issue #87 excludes only real directories at these owned output locations:

- `tools/qualification/{effect-codegen,effect-node,effect-runtime,identity-jwt,orval-fetch}/node_modules`
- `tools/qualification/orval-fetch/generated`

These are the exact installed fixtures and Orval output tree admitted today. New
output roots require explicit review and a regression; a handwritten nested
`generated` or `node_modules` elsewhere is not implicitly excluded. Symlinked
output roots and source links are rejected. Links inside excluded installations
are never traversed. Included filesystem entries must be regular files or real
directories. Generated root build output lies outside the authored roots.

`browserDigest` separately includes every file in the browser distribution,
including lazy chunks, with the same source-link refusal. Before/after checks
reject changes during capture. `tests/harness/guide.test.ts` exercises installed
pnpm links, authored changes and link denial; run it before `make guide` with
qualification dependencies installed.

## Framed digest format v1 — issue #88

New publications include `digestFormat: "perfeng-guide-sha256-framed-v1"` beside
`sourceSha256`, `browserSha256` and `node`. The producer imports the same format
constant used by both digest headers. The existing digest functions still return
hexadecimal SHA-256 strings; they do not fetch schemas or read old receipts.

The SHA-256 input is a binary stream. Define `field(bytes)` as an unsigned 64-bit
big-endian byte length followed by exactly those bytes. The stream is:

1. `field(UTF8("perfeng-guide-sha256-framed-v1"))`.
2. `field(UTF8("source"))` or `field(UTF8("browser"))` for domain separation.
3. For each regular file: byte `0x01`, `field(UTF8(path))`, `field(raw file bytes)`.

Paths are checkout-relative with native separators normalized to `/`; no Unicode
or content normalization is performed. Lengths measure encoded bytes, not UTF-16
characters. The declared root order remains fixed; each directory's names use
JavaScript's locale-independent default string sort. The same inventory and
exclusions described above apply. Directories themselves do not emit records;
adding an empty directory does not change evidence. Symlinks and unsupported entry
kinds still fail before hashing. An encoded body can no longer consume part of the
next path, and a filename suffix cannot become body bytes.

`tests/harness/guide.test.ts` covers both prior ambiguities for both domains,
creation-order stability, Unicode paths/raw binary bytes, independent fixed vectors,
real producer metadata and cleanup on source/browser changes during capture. The
producer tests use disposable build/capture stand-ins; `make guide` additionally
runs the real tagged browser journeys and writes the actual artifact.

## Compatibility and migration

Unversioned historical guide receipts are **legacy unframed** evidence. Never
compare their hashes as v1, add the new label to old receipts, or silently rewrite
historical artifacts. Regenerate through `make guide` to obtain current evidence.
A consumer must require the exact supported `digestFormat` before interpreting
these hashes; absent/unknown formats are unsupported for v1 comparison.

Repository search found only the guide producer's same-run before/after comparisons,
the digest API and its tests, not a persisted-guide receipt verifier or external
consumer. Those comparisons now both use v1 atomically. No speculative runtime
verifier or legacy fallback was added. External consumers remain unverified and
must adopt the explicit version check before comparing new artifacts. Contract
snapshot/distribution provenance is a separate format and is unchanged.
