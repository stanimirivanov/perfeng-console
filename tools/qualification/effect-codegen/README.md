# Effect code-generation qualification fixture

This is a test-only, independently locked tool fixture for the **blocked** C5b admission receipt. Its dependencies do not belong to the root workspace or product. It is excluded from the root workspace package patterns. Do not run its install inside a working checkout: copy it into a fresh disposable directory first.

The recorded candidate versions are Effect 4.1.2, @effect/openapi-generator 4.1.2, @effect/platform-node 4.1.2 and TypeScript 6.0.3. The generator receives the original pinned OpenAPI documents with no constraint or reference transformations. `inputs.json` refuses another source pin.

## Reproduce

From the Console checkout, choose a fresh disposable directory and preserve the checkout's absolute path:

```sh
console_root=$(pwd)
qualification_dir=$(mktemp -d)
cp -a tools/qualification/effect-codegen/. "$qualification_dir/"
cd "$qualification_dir"
pnpm install --frozen-lockfile --ignore-scripts
node oracle.mjs "$console_root"
node generate.mjs "$console_root/vendor/perfeng-contracts"
```

The oracle exits zero after matching eight frozen cases against the existing standalone validators without mutating input. The candidate generator is expected to **exit 1**, retaining nine failed attempts in `generation.json`. That failure blocks admission. It is not wired into CI as a passing product check.

To reproduce with network access absent during generation on a host supporting Linux user/network namespaces:

```sh
unshare -Urn node generate.mjs "$console_root/vendor/perfeng-contracts"
```

Generation writes only this disposable fixture's outputs. Existing checked-in raw artifacts describe the dated attempt; never rewrite them or the frozen expectations merely to obtain passing candidate output. Changed input/tool versions require a separately reviewed receipt. The mini package and lock remain isolated from the root install and from the production browser graph.

## Artifacts

- `expected.json` contains the first frozen conditional/closed-object cases. `oracle-expectations.json` expands these with the source-derived uniqueness and tuple-position cases before validation.
- `oracle-results.json` retains all eight reference outcomes.
- `generation.json` retains all nine errors and the HttpApi warnings, with exact input hashes.
- `inputs.json` fixes the three API byte digests. `keyword-inventory.json` records relevant constraints by JSON pointer.
- `receipt.json` binds versions, tarball integrity, lock and artifact hashes and explicitly marks unexecuted gates.
- `metadata.json` is the exact official npm metadata inspected for the selected generator.

The authoritative status and limitations are in [the C5b receipt](../../../../docs/development/effect-codegen-qualification.md).
