# Orval Fetch qualification fixture

This workspace is isolated from the Console install. Use a fresh copy of this
directory for the standalone test, or a disposable Console checkout for the
three-family matrix. The matrix reads the adjacent Console vendor snapshots.
Generated files are disposable.

Use Node 26.13.0 and pnpm 12.16.1.

```sh
pnpm install --frozen-lockfile --ignore-scripts
unshare -Urn pnpm control
unshare -Urn pnpm repro
unshare -Urn pnpm matrix
```

The control must compile. The minimal regression currently fails with TS2304
after successful generation. The matrix currently fails on Integration after
checking all three bundles. A fixed candidate must compile both the repro and
all three bundles. These commands propagate failures to the caller.

See the [qualification receipt](../../../docs/development/orval-fetch-qualification.md)
for the tested snapshots and remaining gates.

## Merged upstream candidate

Use a disposable Console checkout so the runner can start without any generated
files. Separately check out Orval commit
`4832f60d598cf0569404898718167ea20dacd6ff` and build with its frozen toolchain
(`bun install --frozen-lockfile`, then `vp run -w build:release`).
After the fixture's frozen install, run:

```sh
unshare -Urn sh merged.sh /absolute/path/to/built-orval-checkout
```

This checks the source revision and runs the built CLI against the control, the
nested-reference repro, and the three checked-in Console bundles. The same run
then exercises the generated Fetch clients with in-memory responses and the
checked-in standalone Ajv validators. The earlier commands still exercise the
released baseline pinned in this fixture's lockfile.
