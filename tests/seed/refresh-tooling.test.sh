#!/bin/sh
# PB-08: the workspace is seeded once, so a tooling fix has to be able to reach
# an existing workspace - without ever overwriting what the student changed.
#
# Run: sh tests/seed/refresh-tooling.test.sh   (needs git; no docker, no image)
set -u
HERE=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$HERE/image/entrypoint.d/10-seed-workspace.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fails=0

check() { # name expected actual
    if [ "$2" = "$3" ]; then
        echo "ok   - $1"
    else
        echo "FAIL - $1: expected [$2], got [$3]"
        fails=$((fails + 1))
    fi
}

run_seed() {
    CADS_SEED_DIR="$TMP/seed" CADS_WORKSPACE="$TMP/ws" \
    CADS_TEMPLATES_DIR="$TMP/none" sh "$SCRIPT" >"$TMP/log" 2>&1
}

# a seed at version 1, and a workspace already checked out from it
mkdir -p "$TMP/seed/scripts"
printf 'v1 helper\n' > "$TMP/seed/scripts/tool.py"
printf 'v1 other\n'  > "$TMP/seed/scripts/other.py"
cp -a "$TMP/seed" "$TMP/ws"
( cd "$TMP/ws" && git init -q . && git add -A && git -c user.email=t@t -c user.name=t commit -qm seed )

# the student edits one of the two
printf 'v1 other, my notes\n' > "$TMP/ws/scripts/other.py"

# the image ships version 2 of both
printf 'v2 helper\n' > "$TMP/seed/scripts/tool.py"
printf 'v2 other\n'  > "$TMP/seed/scripts/other.py"

run_seed
check "untouched file is refreshed"        "v2 helper"           "$(cat "$TMP/ws/scripts/tool.py")"
check "edited file is kept"                "v1 other, my notes"  "$(cat "$TMP/ws/scripts/other.py")"
grep -q 'keeping your edited scripts/other.py' "$TMP/log"
check "the kept file is reported, not silently skipped" "0" "$?"

# The case a naive "is it modified against git HEAD" check gets wrong: our own
# refresh made tool.py differ from HEAD, so a second update must still land.
printf 'v3 helper\n' > "$TMP/seed/scripts/tool.py"
run_seed
check "a second update still lands"        "v3 helper"           "$(cat "$TMP/ws/scripts/tool.py")"

# A file the student edits AFTER we refreshed it is theirs from then on.
printf 'v3 helper, mine now\n' > "$TMP/ws/scripts/tool.py"
printf 'v4 helper\n' > "$TMP/seed/scripts/tool.py"
run_seed
check "an edit after a refresh is kept"    "v3 helper, mine now" "$(cat "$TMP/ws/scripts/tool.py")"

# A brand new tooling file arrives.
printf 'brand new\n' > "$TMP/seed/scripts/new.py"
run_seed
check "a new tooling file is added"        "brand new"           "$(cat "$TMP/ws/scripts/new.py" 2>/dev/null)"

# Never touches anything outside REFRESH_PATHS.
printf 'my work\n' > "$TMP/ws/main.c"
printf 'seed work\n' > "$TMP/seed/main.c"
run_seed
check "files outside scripts/ are untouched" "my work"           "$(cat "$TMP/ws/main.c")"

[ "$fails" -eq 0 ] && echo "all seed-refresh checks passed" || echo "$fails check(s) failed"
exit "$fails"
