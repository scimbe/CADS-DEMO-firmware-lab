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

# The R4.2 calibration, checked rather than remembered: fourteen rubrics that
# were read and judged to state their own answer must still be flagged by
# whatever the measurement currently is. If a change to the tokeniser, the stop
# list or the limits stops flagging one of them, the rule has been loosened
# without anyone saying so. See the header of pedagogy-metrics.py.
printf '%-24s ' "R4.2 calibration"
if out=$(python3 scripts/pedagogy-metrics.py --selftest 2>&1); then
  echo "$out" | tail -1
else
  echo "$out" | tail -6; fail=1
fi

# SPEC A9.2 competence measurement (see the header of measure-competence.js for
# what "perfect" and "realistic" mean and what commit they are measured
# against). Informational only, not a gate: a course can validate cleanly and
# still teach less than it could, and that is a finding to act on deliberately,
# not a build failure to work around.
echo
echo "measure-competence (informational, not a gate):"
if out=$(npm --prefix extensions/cads-tutor run --silent compile-tests 2>&1); then
  node scripts/measure-competence.js 2>&1 | sed 's/^/  /'
else
  echo "  skipped: extensions/cads-tutor/out-test could not be built"
  echo "$out" | tail -5 | sed 's/^/  /'
fi

exit $fail
