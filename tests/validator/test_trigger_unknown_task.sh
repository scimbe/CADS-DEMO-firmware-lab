#!/usr/bin/env bash
# A socratic trigger of the form task:<id>:... or question:<id>:... that names
# a task this step does not have is an error, not a warning: it can never fire,
# and a course author would otherwise never learn the hint ladder is dead.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/trigger-unknown-task"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)

has   "a trigger naming a nonexistent task is reported (en)" "$out" "badTrigger.en: socratic[0] trigger 'task:ghost:failed' references unknown task 'ghost'"
has   "a trigger naming a nonexistent task is reported (de)" "$out" "badTrigger.de: socratic[0] trigger 'task:ghost:failed' references unknown task 'ghost'"
check "in both languages"                                     "$(echo "$out" | grep -c 'references unknown task')" "2"
hasnt "a trigger naming its own task is not reported (en)"    "$out" "goodTrigger.en: socratic"
hasnt "a trigger naming its own task is not reported (de)"    "$out" "goodTrigger.de: socratic"
check "it is now an error, so the pack fails"                 "$(echo "$out" | grep -c 'RESULT: FAIL')" "1"

exit $fail
