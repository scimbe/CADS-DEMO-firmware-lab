#!/usr/bin/env bash
# `rubric` is a plain string, not a Localized map, so no structural check could
# notice that all 30 Rust and all 40 JavaScript rubrics in the .de.md files were
# English. Without a language model - the normal mode today - the tutor shows the
# rubric to the student as a self-check, so German students read an English
# marking guide.
#
# The probe has one job: find "written entirely in the wrong language". It must
# stay silent on short or jargon-heavy text, because a false accusation trains
# authors to ignore the validator. Both halves are tested here.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)

fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: expected $3, got $2"; fail=1; fi; }

out=$(python3 - "$REPO" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("v", f"{sys.argv[1]}/scripts/validate-courses.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

DE_RUBRIC = (
    "Nennt die Datei und den Befehl, mit dem der Test läuft, und sagt in einem Satz, "
    "woran die Studierende erkennt, dass er bestanden ist. Besteht nicht: eine Antwort, "
    "die nur den Namen des Tests wiederholt."
)
EN_RUBRIC = (
    "Names the file and the command that runs the test, and says in one sentence how the "
    "student recognises that it passed. Does not pass: an answer that only repeats the "
    "name of the test."
)
# Real cases the probe must not touch.
SHORT_DE = "Lies die Zahl aus der Ausgabe"
SHORT_EN = "Read the number from the output"
JARGON = "cargo test --test m1-01-scope-and-move --quiet -- --nocapture 2>&1 | tee out.log"
MIXED_DE = (
    "Die Antwort nennt `cargo test --test m1-01-scope-and-move` als Befehl und die Datei "
    "`tests/m1-01-scope-and-move.rs`, und sie erklärt, warum der Borrow-Checker den Move "
    "an dieser Stelle meldet."
)

cases = [
    ("an English rubric in a .de file is caught",  v.language_mismatch(EN_RUBRIC, "de"), "en"),
    ("a German rubric in an .en file is caught",   v.language_mismatch(DE_RUBRIC, "en"), "de"),
    ("a German rubric in a .de file is fine",      v.language_mismatch(DE_RUBRIC, "de"), None),
    ("an English rubric in an .en file is fine",   v.language_mismatch(EN_RUBRIC, "en"), None),
    ("a short German title stays unjudged",        v.language_mismatch(SHORT_DE, "en"), None),
    ("a short English title stays unjudged",       v.language_mismatch(SHORT_EN, "de"), None),
    ("a line of tooling stays unjudged",           v.language_mismatch(JARGON, "de"), None),
    ("German prose full of English jargon is fine", v.language_mismatch(MIXED_DE, "de"), None),
]
bad = [f"FAIL  {n}: expected {exp!r}, got {got!r}" for n, got, exp in cases if got != exp]
print("\n".join(bad) if bad else f"PASS  language_mismatch: {len(cases)} cases")

# Every plain-string free-text field is probed, not only the rubric.
fm = {
    "title": "T",
    "tasks": [{"id": "t", "title": "Title", "description": "D", "check": {"type": "question", "rubric": "R"}}],
}
names = [name for name, _ in v.free_text_fields(fm)]
expected = ["title", "tasks[t].title", "tasks[t].description", "tasks[t].rubric"]
print("PASS  every plain-string field is probed" if names == expected else f"FAIL  fields: {names}")
sys.exit(1 if bad or names != expected else 0)
PY
) || fail=1
echo "$out"

# The real packs are the calibration: the two firmware packs are clean in both
# languages, and the probe must not invent a single finding there.
fw=$(python3 "$REPO/scripts/validate-courses.py" "${CADS_ZERO:-$HOME/Documents/git/cads-zero}" \
      --courses-dir "$REPO/courses" --only cads-zero-foundations 2>&1)
check "no false finding in a clean pack" "$(echo "$fw" | grep -c 'is written in')" "0"

exit $fail
