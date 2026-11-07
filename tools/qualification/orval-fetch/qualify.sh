#!/bin/sh
set -eu

result=0
for family in run native integration; do
    printf '\n=== %s ===\n' "$family"
    if pnpm exec orval --config matrix.config.ts --project "$family"; then
        if ! pnpm exec tsc --ignoreConfig --strict --noEmit --module esnext --moduleResolution bundler \
            $(find "generated/$family" -type f -name '*.ts' | LC_ALL=C sort); then
            result=1
        fi
    else
        result=1
    fi
done
exit "$result"
