#!/usr/bin/env bash
# The panel withholds a predict task's observed output until a prediction has
# been written - it is never put in the DOM, so it cannot be read out. The course
# text can undo that in one line, and did: the Rust track said "do not run it
# yet" and named the exact command in the same sentence, the JavaScript track
# printed it in a code block in all eight predict steps. A student runs it, reads
# the number, writes it down as a "prediction", and the one exercise that
# measures what they believed measures nothing.
#
# What makes this decidable is the difference between naming the file and naming
# the command. `leaks` prints the command; `keeps` names only the file, which a
# student needs to know and which reveals nothing on its own.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/predict-reveal"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" 2>&1)

has   "a step that prints its reveal command is reported" "$out" "task 'guess' asks for a prediction and the step body prints the command"
check "in both languages"                                 "$(echo "$out" | grep -c 'reveals it')" "2"
hasnt "naming only the file is not a leak"                "$out" "keeps.en"
hasnt "and not in the other language either"              "$out" "keeps.de"
check "it is a warning, not a failure, for now"           "$(echo "$out" | grep -c 'RESULT: PASS')" "1"

exit $fail
