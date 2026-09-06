#!/usr/bin/env bash
# The validator must refuse exactly what the tutor refuses. It used to bring its
# own front-matter parser, and both cracks between the two cost real time:
#
#   1. `title: CaDS: RAM budget` unquoted is invalid YAML. The runtime dropped
#      the file and with it the whole course; the validator reported PASS.
#   2. `pattern: "…\s*…"` is not a legal double-quoted YAML scalar at all. A
#      hand-rolled parser hands back a literal backslash-s and validates it,
#      while the runtime refuses the file.
#
# packYaml holds both, and must fail with the runtime's own wording. packQuoted
# writes the same title and the same regex the way YAML allows - quoted title,
# single-quoted pattern - and must pass, so the rule rejects broken files rather
# than colons and backslashes.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/one-truth"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)

check "a pack the runtime cannot load fails"      "$(echo "$out" | grep -c 'RESULT: FAIL')" "1"
has   "the colon title is named"                  "$out" "colon.en: invalid YAML front matter"
has   "with the runtime's own wording"            "$out" "Nested mappings are not allowed"
has   "the illegal escape is named"               "$out" "escape.en: invalid YAML front matter"
has   "and quotes the offending sequence"         "$out" "Invalid escape sequence \\s"
check "both languages of both steps are reported" "$(echo "$out" | grep -c 'invalid YAML front matter')" "4"
check "a file the runtime drops is not counted"   "$(echo "$out" | grep -c 'step-files: 2')" "1"

hasnt "a quoted title is accepted"                "$out" "quoted.en: invalid YAML"
hasnt "a single-quoted pattern is accepted"       "$out" "quoted.de: invalid YAML"

# Without the helper the run must stop, not fall back to a parser of its own -
# that fallback is the bug this replaced.
nonode=$(PATH=/usr/bin:/bin python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)
check "no node means no result at all"            "$(echo "$nonode" | grep -c 'RESULT:')" "0"
has   "and says what to install"                  "$nonode" "cannot read front matter the way the tutor does"

exit $fail
