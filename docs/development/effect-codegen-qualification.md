# C5b candidate feasibility receipt

Date 2026-11-07. Result **BLOCKED**. Qualification was performed in a disposable directory and is retained as a test-only [fixture](../../tools/qualification/effect-codegen/README.md). No candidate package was admitted to the root console install. This receipt records an admission failure, not completion of the C5b migration gate.

The exact installed candidate was `@effect/openapi-generator` 4.1.2 with Effect and `@effect/platform-node` 4.1.2, and TypeScript 6.0.3, on Node 26.13.0 and pnpm 12.16.1. Official metadata in metadata.json identifies MIT licensing, peer requirements and tarball integrity. package.json and pnpm-lock.yaml provide the frozen install graph.

## Expected and observed

Eight contract-derived expectation cases were frozen before invoking the reference validators. All eight matched the console's existing Ajv standalone behavior, and none mutated input. The cases distinguish conditional requiredness, conditional minimum array length, closed-object additional properties, artifactKinds uniqueness and positional artifactPlan ordering. See oracle-expectations.json and oracle-results.json.

The unmodified generator received each exact pinned OpenAPI object, with every declared component included. No refs, constraints, payloads or expectations were edited to accommodate it.

| API family | httpclient | httpclient-type-only | httpapi |
|---|---|---|---|
| Run | failed | failed | failed, 24 response-header warnings |
| Native | failed | failed | failed, 21 response-header warnings |
| Integration | failed | failed | failed, 13 response-header warnings |

Run failed with `Cannot import JSON Schema keyword "if": Effect has no equivalent constraint.` at `definitions.Run.allOf[0].if`.

Native failed with the same unsupported `if` constraint at `definitions.QualificationDecision.allOf[0].if`.

Integration failed with `Unresolvable $ref "#/$defs/Request/$defs/timestamp". Nothing exists at that location.` at `definitions.Request.properties.time.$ref`.

HttpApi generation emitted `response-headers-ignored` warnings before failing. Full warnings retain operation, path, method and status in generation.json. These warnings independently require investigation before meeting the plan's response-header conformance gate.

All nine attempts failed and produced zero source files. Generation driver exits 1. Candidate TypeScript compilation, parsing/encoding comparison, runtime conformance, modularity, performance and editor latency are **not run because no candidate output exists**. An exploratory tsc run reported TS18003 (no inputs); it is not a successful compile. No full keyword conformance claim is made. keyword-inventory.json records each observed relevant keyword location in the pinned inputs for later expansion.

## Modularity evidence

Published `OpenApiGenerator.ts` defines `generate(spec, options): Effect<string>` and formats `httpclient | httpclient-type-only | httpapi`. Options provide name, format, onEnter, includeSchemas and onWarning. There is no demonstrated built-in per-component/per-operation file emission option. This observation is about API shape, not proof that a bounded adapter cannot be built.

## Reproduction

Follow the [fixture README](../../tools/qualification/effect-codegen/README.md) in a fresh disposable directory. Its exact package/lock are isolated from the root workspace. The oracle exits zero with eight reference matches. The candidate generator exits 1 with nine failed attempts. Network-isolated generation reproduced those same failures. Raw errors, warnings, input and artifact digests are retained beside the driver.

The root make verify still exercises the existing authoritative types/Ajv validators. The new candidate command is deliberately not recast as a passing CI assertion. Root lint checks the reusable drivers; installing candidate packages in the root is outside this receipt.

## Decision boundary

The raw candidate fails admission. Existing types/Ajv remain authoritative. C5c generated-client activation and C7 replacement cannot claim qualification from this receipt. A reviewed adapter or upstream generator fix must produce faithful output and pass the full original corpus, including unknown properties, conditional/tuple/uniqueness constraints, serialization, response headers and final-pin requalification. No dropped constraints or warning suppression is justified by this result.

Official sources are https://registry.npmjs.org/@effect%2fopenapi-generator/4.1.2 and the published package's src/OpenApiGenerator.ts. The original inputs retain the console's immutable provenance.

## Dependencies and ownership

This issue is C5b (#22), pending C1 (perfeng-contracts#79) and C5a (#21). Its baseline is PR #20 until that pinning slice is merged. This feasibility receipt can be reviewed independently, but it does not satisfy their acceptance gates. C5c (#23) and C7 (#24) remain blocked from candidate activation. The existing public contract snapshots, root package graph and application runtime are unchanged by this receipt.

## Receipt verification

The portable fixture was copied into a fresh disposable directory, installed with
its frozen lock and scripts disabled, and reproduced the eight oracle matches
and nine generation failures under network isolation. Its candidate audit reported
no known vulnerabilities. The baseline root make verify passed 28 harness and
contract tests, four Angular tests and the production build with this receipt
present. Candidate compilation and runtime qualification remain blocked as stated
above. No live platform, cluster, credential or deployment operation was performed.
