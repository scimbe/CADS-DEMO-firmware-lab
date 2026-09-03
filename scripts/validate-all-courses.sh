#!/usr/bin/env bash
# Validates every course pack against its own project root. Four packs with three
# different project roots cannot share one run, so this is the canonical form.
set -uo pipefail
cd "$(dirname "$0")/.."
FW="${CADS_ZERO:-$HOME/Documents/git/cads-zero}"
fail=0
run() { # <pack> <project-root> [extra args...]
  local pack="$1" root="$2"; shift 2
  printf '%-24s ' "$pack"
  if out=$(python3 scripts/validate-courses.py "$root" --courses-dir courses --only "$pack" "$@" 2>&1); then
    echo "$out" | tail -1
  else
    echo "$out" | tail -3; fail=1
  fi
}
run cads-zero-foundations  "$FW"
run cads-zero-projects     "$FW"
run rust-foundations       workspaces/rust-foundations       --solutions workspaces/rust-foundations/solutions
run javascript-foundations workspaces/javascript-foundations --solutions workspaces/javascript-foundations/solutions
exit $fail
