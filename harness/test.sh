#!/bin/sh
# node:test exits successfully for skipped/todo cases. Enforce the project floor.
set -eu
receipt=$(mktemp)
trap 'rm -f "$receipt"' EXIT
if ! node --test --test-isolation=none --test-reporter=tap 'tests/**/*.test.ts' > "$receipt"; then
    cat "$receipt"
    exit 1
fi
cat "$receipt"
if ! grep -Eq '^# tests [1-9][0-9]*$' "$receipt" ||
   ! grep -qx '# skipped 0' "$receipt" || ! grep -qx '# todo 0' "$receipt"; then
    echo '[test-accounting] Run at least one test and resolve every skipped or todo case.' >&2
    exit 1
fi
