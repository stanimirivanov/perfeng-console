#!/bin/sh
set -eu

generate() {
    if [ -n "${ORVAL_CLI:-}" ]; then
        node "$ORVAL_CLI" "$@"
    else
        pnpm exec orval "$@"
    fi
}

result=0
for family in run native integration; do
    printf '\n=== %s ===\n' "$family"
    if generate --config matrix.config.ts --project "$family"; then
        if ! pnpm exec tsc --ignoreConfig --strict --noEmit --module esnext --moduleResolution bundler \
            $(find "generated/$family" -type f -name '*.ts' | LC_ALL=C sort); then
            result=1
        fi
    else
        result=1
    fi
done
exit "$result"
