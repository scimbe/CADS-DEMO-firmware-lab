#!/usr/bin/env bash
# R11a.7e: a predict's `then` check must expect something specific
# (expectStdout/expectStderr, or a named non-default exit code) - otherwise
# nobody can tell whether the reveal actually showed what was predicted.
# `vagueGuess` only checks that the command exited 0; `specificGuess` names
# what the output must be.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/predict-determinacy"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)

has   "a predict with no specific reveal is reported (en)" "$out" "vagueGuess.en: task 'guess': predict.then does not expect anything specific"
has   "a predict with no specific reveal is reported (de)" "$out" "vagueGuess.de: task 'guess': predict.then does not expect anything specific"
check "in both languages"                                   "$(echo "$out" | grep -c 'R11a.7e')" "2"
hasnt "a specific reveal is not reported (en)"               "$out" "specificGuess.en: task 'guess': predict.then does not expect anything specific"
hasnt "a specific reveal is not reported (de)"               "$out" "specificGuess.de: task 'guess': predict.then does not expect anything specific"
check "an indeterminate reveal fails validation"             "$(echo "$out" | grep -c 'RESULT: FAIL')" "1"

exit $fail
