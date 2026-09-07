#!/usr/bin/env bash
# R11a.7d: naming the file or the command is fine and often necessary; quoting
# the literal text a reveal (expectStdout/expectStderr) will show is a second,
# independent way to hand out a prediction's answer. `answerLeak` prints the
# exact word its `then` check expects; `answerKeeps` withholds it.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/predict-answer-literal"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)

has   "a step that prints the literal answer is reported (en)" "$out" "answerLeak.en: task 'guess' asks for a prediction and the step body already contains"
has   "a step that prints the literal answer is reported (de)" "$out" "answerLeak.de: task 'guess' asks for a prediction and the step body already contains"
check "in both languages"                                       "$(echo "$out" | grep -c 'R11a.7d')" "2"
hasnt "withholding the answer is not a leak (en)"                "$out" "answerKeeps.en: task 'guess' asks for a prediction and the step body already contains"
hasnt "withholding the answer is not a leak (de)"                "$out" "answerKeeps.de: task 'guess' asks for a prediction and the step body already contains"
check "it is a warning, not a failure"                           "$(echo "$out" | grep -c 'RESULT: PASS')" "1"

exit $fail
