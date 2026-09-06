#!/usr/bin/env bash
# A9.1 rule 3 derives the legal routes from a pack's own checks. That is right
# for a course whose text and checks run the same thing, and wrong for one whose
# text deliberately runs something narrower: the JavaScript track tells a student
# to run `node --test test/<step-id>.test.js` while its check runs the whole
# suite with a TAP reporter. The three obvious ways out all break something -
# put the reporter flag into the sentence the student types, build a button that
# does something other than what the text says, or invent tasks the course does
# not need.
#
# So a pack declares its student-facing routes in course.json, and rule 3 accepts
# those too. packRoutes is a course that does it properly; packBadRoutes tries
# every way of turning the declaration into a blank cheque.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/operating-routes"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

good=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" --only packRoutes 2>&1)
check "a pack that declares its routes passes"  "$(echo "$good" | grep -c 'RESULT: PASS')" "1"
check "and its blocks are recognised"           "$(echo "$good" | grep -c 'do-blocks: 2')" "1"
hasnt "the <step-id> placeholder is expanded"   "$good" "is run by no check"
hasnt "a course that needs no tasks says so"    "$good" "no .vscode/tasks.json"

bad=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" --only packBadRoutes 2>&1)
check "a blank cheque fails"                    "$(echo "$bad" | grep -c 'RESULT: FAIL')" "1"
has "an unknown key is named"                   "$bad" "unknown key 'invented'"
has "a palette entry still needs its '>'"       "$bad" 'must carry the leading ">"'
has "a declared file has to exist"              "$bad" "files -> missing path 'nowhere.txt'"
has "a declared command has to say why"         "$bad" 'needs a "why"'
has "a one-word why is not a why"               "$bad" 'has a "why" of 3 word(s)'
has "a path in a declared command has to exist" "$bad" "names a path that does not exist in the workspace: 'test/absent.test.js'"
has "an unresolvable binary is reported"        "$bad" "toolchain binary 'definitely-not-a-real-binary' is not installed"
has "a route nobody declared is still an error" "$bad" 'command "node --test test/nowhere.test.js" is run by no check'
has "and the message names where to declare it" "$bad" "is in no operatingRoutes of course.json"
has "the missing tasks.json says how to settle it" "$bad" 'Declare "needsNoTasks": true'

exit $fail
