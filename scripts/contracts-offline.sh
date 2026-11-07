#!/bin/sh
set -eu
# Hosted Ubuntu restricts unprivileged uid_map writes. Create only a fresh network
# namespace with privilege, then drop it before running any generator code.
if [ "${GITHUB_ACTIONS:-}" = true ] && [ "${RUNNER_OS:-}" = Linux ]; then
    exec sudo unshare -n -- setpriv --reuid="$(id -u)" --regid="$(id -g)" --clear-groups "$(command -v node)" "$@"
fi
exec unshare -Urn node "$@"
