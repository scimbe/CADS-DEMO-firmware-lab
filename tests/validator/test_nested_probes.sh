#!/usr/bin/env bash
# A8.1's negative probe only ever looked at the top level of a check, so a check
# living in `predict.then`, `all` or `any` was never run against seed and
# solution - 45 checks across the four packs. Descending is not simply "probe
# every leaf", though: `all` passes only when every child passes, `any` when one
# does, and the seed side is the mirror of that. Probing each leaf on its own
# would report failures that are not failures.
#
# packNested holds the three shapes that must pass; packSeedPass holds the one
# that must fail, next to a sibling that must NOT, because only one of its two
# children needs the solution.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
FIX="$HERE/nested-probes"

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }
has()   { if echo "$2" | grep -qF -- "$3"; then echo "PASS  $1"; else echo "FAIL  $1: output does not contain '$3'"; fail=1; fi; }
hasnt() { if echo "$2" | grep -qF -- "$3"; then echo "FAIL  $1: output contains '$3'"; fail=1; else echo "PASS  $1"; fi; }

out=$(python3 "$REPO/scripts/validate-courses.py" "$FIX/proj" --courses-dir "$FIX/courses" --solutions "$FIX/solutions" 2>&1)

check "five tasks probed over nine checks" "$(echo "$out" | grep -c 'solutions: 5 probe(s) over 9 check(s)')" "1"

# The paths say which check actually ran, so the log names the thing that passed.
has "a check inside predict.then is probed" "$out" "predicted/then: solution passes"
has "both children of an all are probed"    "$out" "both/all[0], both/all[1]"
has "both children of an any are probed"    "$out" "either/any[0], either/any[1]"

# `any` is satisfied by one child. Probing each on its own would call the other
# a failure with the reference solution, which it is not.
hasnt "a failing any-child is not a failure" "$out" "task 'either' FAILS"

# `all` fails on the seed as soon as ONE child fails, so a sibling that also
# passes on the seed is fine.
hasnt "an all needing the solution once is fine" "$out" "task 'mixed'"

# A composite every child of which passes on the untouched seed is worthless,
# and the message has to name which check that was.
has "a check that never needed the student fails" "$out" "task 'worthless' PASSES on the seed workspace"
has "and names the offending path"                "$out" "worthless/all[0]"
check "exactly one probe failure"                 "$(echo "$out" | grep -c 'PASSES on the seed workspace')" "1"

# The fold itself, without running anything: the three composite rules.
unit=$(python3 - "$REPO" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("v", f"{sys.argv[1]}/scripts/validate-courses.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

cmd = {"type": "command", "command": "x"}
all2 = {"type": "all", "checks": [cmd, cmd]}
any2 = {"type": "any", "checks": [cmd, cmd]}
mixed = {"type": "all", "checks": [cmd, {"type": "fileMatches", "file": "f", "pattern": "p"}]}

cases = [
    ("all true+false is false", v.fold_probe(all2, {"all[0]": True, "all[1]": False}), False),
    ("all true+true is true", v.fold_probe(all2, {"all[0]": True, "all[1]": True}), True),
    ("all false+unknown is still false", v.fold_probe(all2, {"all[0]": False, "all[1]": None}), False),
    ("all true+unknown is unknown", v.fold_probe(all2, {"all[0]": True, "all[1]": None}), None),
    ("any false+true is true", v.fold_probe(any2, {"any[0]": False, "any[1]": True}), True),
    ("any false+false is false", v.fold_probe(any2, {"any[0]": False, "any[1]": False}), False),
    ("any false+unknown is unknown", v.fold_probe(any2, {"any[0]": False, "any[1]": None}), None),
    ("an unrunnable sibling stays unknown", v.fold_probe(mixed, {"all[0]": True}), None),
    ("predict folds through then", v.fold_probe({"type": "predict", "then": cmd}, {"then": True}), True),
    ("leaves carry their path", [p for p, _ in v.probe_leaves({"type": "predict", "then": all2})], ["then/all[0]", "then/all[1]"]),
]
bad = [f"FAIL  {n}: expected {exp!r}, got {got!r}" for n, got, exp in cases if got != exp]
print("\n".join(bad) if bad else f"PASS  fold_probe: {len(cases)} composite rules")
sys.exit(1 if bad else 0)
PY
) || fail=1
echo "$unit"

exit $fail
