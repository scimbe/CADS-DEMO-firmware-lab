#!/usr/bin/env bash
# Each course pack must be validated against the project named in its own
# course.json, so ONE run without --only can check a repo that holds several
# tracks. Before this, every pack was resolved against a single directory and a
# run without --only produced hundreds of spurious "missing path" errors.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/two-projects"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }

# packA's project is projA (the given root); packB's is workspaces/projB.
# Each names a file that exists ONLY in its own project, so a pack resolved
# against the wrong one fails loudly.
out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/projA" --courses-dir "$FIX/courses" 2>&1) || true
check "one run validates both packs" "$(echo "$out" | grep -c 'RESULT: PASS')" "1"
check "packA resolved to its own project" "$(echo "$out" | grep -c "packA.*projA")" "1"
check "packB resolved to its own project" "$(echo "$out" | grep -c "packB.*workspaces/projB")" "1"
check "no spurious path errors" "$(echo "$out" | grep -c '^ERROR')" "0"

# --only still works and still uses the given root for a single pack.
only=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/projA" --courses-dir "$FIX/courses" --only packA 2>&1) || true
check "--only validates one pack" "$(echo "$only" | grep -c 'courses: 1')" "1"
check "--only passes" "$(echo "$only" | grep -c 'RESULT: PASS')" "1"

exit $fail
