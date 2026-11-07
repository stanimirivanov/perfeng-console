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
failure projection. Keep the Node adapter imports local to the reader. No native HTTP
dispatch or transport legacy allowance remains. Preserve the real TLS, raw-header,
byte/deadline, identity and lifecycle tests in tests/integration/transport.test.ts.
