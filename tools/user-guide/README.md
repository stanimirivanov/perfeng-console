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

Digest record framing/versioning remains the independently tracked issue #88;
this fix changes input selection only and does not claim to resolve that defect.
