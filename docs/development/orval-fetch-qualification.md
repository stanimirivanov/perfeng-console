# Orval Fetch qualification receipt

Date 2026-11-07. **Blocked at strict TypeScript compilation.** Option C is a
candidate generator for BFF transport and types. The current
`openapi-typescript` and Ajv path remains authoritative. This receipt does not
change the accepted Console stack or grant a dependency exception.

## Evidence

The [isolated fixture](../../tools/qualification/orval-fetch/README.md) locks
Orval 8.46.0 and TypeScript 6.0.3. It ran on Node 26.13.0 and pnpm 12.16.1.
The reduced input contains one operation, one response and one component alias
into its own `$defs`. Generation exits zero, but the compiler reports
`TS2304: Cannot find name 'ErrorDetail'`. Inlining the target schema in the
synthetic control compiles. No workaround is applied to a Perfeng contract.
The standalone reproduction is filed as [Orval #4465](https://github.com/orval-labs/orval/issues/4465).

The matrix reads the unchanged Console snapshots from
`d0b148c2d85a9dc79a25c5c7d8c7e919b705f719`. All three generated with
Fetch factory injection, request headers enabled and status-aware response
envelopes.

| Family | Input SHA-256 | Strict compile |
| --- | --- | --- |
| Run | `78019af05eabbe942310396586875db06afb6ae7fa666871a7b23df0ac7310c7` | Pass |
| Native | `a7fd9c27b145f118d0b1058b6e10b3581609b4dce8916f31a6e030fb08d56c45` | Pass |
| Integration | `0bdafe32dec51a51b42a512d5a3947356aa26a5c958768ec8cab68327d466556` | Fail. Generated analysis-response types refer to a missing `IntegrationError` module. |

## Remaining gates

Re-run the standalone regression and all three families on the final
checksummed inputs with a fixed, pinned Orval release. Full wire and runtime
qualification remains outstanding. Verify request serialization, declared
status and header handling, idempotency and conflicts, response bounds,
absent and malformed bodies, cancellation during body reads, and parity with
Ajv on retained fixtures. Run deterministic regeneration, dependency admission,
and the existing size and latency gates before proposing activation.

No production package, generator, validator, or provider snapshot is part
of this change. Reverting the fixture and receipt removes the qualification
evidence without a runtime rollback.

## Merged candidate wire and Ajv results

Console issue [#31](https://github.com/stanimirivanov/perfeng-console/issues/31)
tested Orval [#4466](https://github.com/orval-labs/orval/pull/4466) at its exact
merged source revision `4832f60d598cf0569404898718167ea20dacd6ff`. The control,
minimal repro and all three unchanged Console bundles generated and compiled
offline. This source build clears the compile blocker recorded above.

All 20 wire and parity tests passed. Nine compared the original payload and
the generated client result using the same authoritative Ajv validators.
The generated client preserved payloads and their accept/reject decisions,
including conditional Native cancellation metadata, a closed Run object,
and Integration analysis and error payloads.

The unguarded candidate returned an empty object for a bodyless Native 204
and accepted absent JSON as an empty object. It also returned wrong media
types and undeclared statuses to callers and did not check required headers
or bound body reads. The isolated adapter guards those cases, bounds the
stream read, preserves headers, and cancels a pending read on abort.
The tests also check Run idempotency-key serialization and conflict delivery
without retry, Native lease capability and revision serialization, and
Integration issuer query encoding and throttling metadata.

This is sampled wire evidence with injected Fetch, using the original Ajv
validators on both sides of the parity comparison. It does not qualify live
HTTP/TLS or credentials, upstream idempotency persistence, the full status and
header matrix, header value validation, or production BFF transport. Re-run
this suite on the exact published release and complete the remaining admission
and performance checks before activation.
