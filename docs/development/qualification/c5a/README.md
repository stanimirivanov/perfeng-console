# C5a consumer boundary and baseline receipt

Date 2026-11-07. Candidate activation remains blocked at C5b.

The source guard admits effect/Schema only in src/generated/schemas. Negative
fixtures reject BFF imports, barrels, type-only client references, HTTP client
packages, URL resources and stylesheets. Current product modules do not import
candidate generated schemas. The source rule is independent of bundler elimination.

## Reproduce the current baseline

Explicit frozen bootstrap is required first. No benchmark installs tools.
Run node scripts/consumer-baseline.mjs and node scripts/editor-baseline.mjs.
Outputs are build artifacts in dist/qualification; the attached JSON files retain
the observed reference receipt rather than acting as current platform health.

The consumer workload actually bundles and executes run_CreateRun, then three
schemas (CreateRun, AnalysisResult and WorkerPresence) on pinned valid fixtures.
It requires every result to be true. Five fresh Node processes record combined
startup/import/decode time, not a claimed isolated decoder latency.
Uncompressed and gzip bytes describe these retained bundles, not the product UI.

The compiler workload runs the exact tsc project five times with extended diagnostics.
The editor workload opens an in-memory consumer in the pinned tsserver and requires
Run.state to appear in completion results. First completion is measured after open,
so coldMs excludes process startup and open acknowledgement. Four later completions
supply warm samples; the reported p95 is their maximum, not a robust population
quantile. RSS is the Linux process resident memory after those queries.

These small samples provide a reproducible baseline and no latency improvement
claim. Candidate admission needs at least 30 repeated matched observations and
comparable source/tool/input pins on the same host. No candidate code was produced,
so no candidate performance was measured. M05-PR4's server-client workload is also
unavailable until that transport exists. Receipts must keep these absences explicit.

## Declared budgets before candidate performance runs

The initial conservative defaults are a judgment call for review. Compare equal
semantics and fixtures; do not trade away validation to improve these numbers.
For each affected workload:
- Shipped raw and gzip bytes must remain within max(110% of baseline, baseline+1024 bytes).
- p50/p95 compiler, editor and startup/import/decode latency must remain within
  max(110% of the matched baseline, baseline+5 ms).
- Compiler/editor memory must stay within 110% of the matched baseline.
- Any missing measurement or conformance mismatch blocks an admission claim.
- A regression requires an explicit reviewed decision, with the failed receipt
  retained. Never rewrite thresholds after observing the candidate to obtain green.

The original product bundle with no generated-validator import remains a distinct
baseline. It cannot establish the marginal cost of a real consumer. C5b may propose
a separately reviewed benchmark correction if a workload is invalid; preserve its
original observation.

The early feasibility run fails before any candidate performance run. Compilation,
decoder runtime, module shape, client behavior and performance cannot be inferred
from package peer compatibility.
