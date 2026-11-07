#!/bin/sh
set -eu

checkout=${1:?Pass the absolute path to the built Orval checkout}
commit=4832f60d598cf0569404898718167ea20dacd6ff
if [ "$(git -C "$checkout" rev-parse HEAD)" != "$commit" ] ||
    ! git -C "$checkout" diff --quiet HEAD; then
    echo "Use a clean checkout of Orval $commit" >&2
    exit 1
fi
ORVAL_CLI="$checkout/packages/orval/dist/bin/orval.mjs"
export ORVAL_CLI

# A fresh disposable Console checkout prevents old outputs masking missing types.
test ! -e generated
node "$ORVAL_CLI" --config control.config.ts
pnpm exec tsc --ignoreConfig --strict --noEmit --module esnext --moduleResolution bundler generated/control/client.ts
node "$ORVAL_CLI" --config orval.config.ts
pnpm exec tsc --project tsconfig.json
sh qualify.sh
node wire.test.mjs
