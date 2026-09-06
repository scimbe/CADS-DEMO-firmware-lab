#!/usr/bin/env bash
# Rule 4 - a call to action still living in running text - was checking half of
# every course. It listed German imperatives, but German writes operating
# instructions in the infinitive ("Terminal öffnen", "`F1` drücken"), so a step
# with identical content was reported twice in English and not once in German.
# It also reported things nobody should reword: the alt text of a screenshot,
# the caption under it, and the photography briefs in HTML comments.
#
# Both halves are held here: the probe must fire on an instruction in either
# language, and stay quiet on prose that merely describes what happens.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)

fail=0
out=$(python3 - "$REPO" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("v", f"{sys.argv[1]}/scripts/validate-courses.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

fires = lambda t: bool(v.CALL_TO_ACTION_RE.search(t))

instructions = [
    # German writes the instruction as an infinitive; this is the half that was blind.
    "Terminal öffnen", "**`F1`** drücken", "`Tasks: Run Task` tippen",
    "den Task ausführen", "Terminal auf- und zuklappen", "drei neue Dateien anlegen",
    "den Task `CaDS: Build` starten",
    # …and as an imperative, regular and irregular.
    "Führe den Task aus", "Öffne die Befehlspalette", "Wähle den Eintrag aus",
    "Lies die letzte Zeile", "Nimm `F1` statt des Tastenkürzels",
    # English.
    "Run the task", "open the terminal", "press F1", "type the command", "pick it from the list",
]
description = [
    # Third person and participle describe what happens - matching them turned
    # nine of eleven findings in the firmware pack into noise.
    "Unten öffnet sich ein eigenes Terminal",
    "Der zweite Check startet den Task selbst",
    "Das Terminal geschlossen und damit den Vorgang beendet",
    "du startest ihn über seinen Namen",
    "Die Checks bestätigen, dass beide gelingen",
    "Wie das geht, steht im nächsten Abschnitt, Klick für Klick",
    "The second check starts the task itself",
    "A terminal opens at the bottom",
    "Ein Task ist ein fertig hinterlegter Befehl mit einem Namen",
]
bad = [f"FAIL  should fire: {t!r}" for t in instructions if not fires(t)]
bad += [f"FAIL  should stay quiet: {t!r}" for t in description if fires(t)]
print("\n".join(bad) if bad else f"PASS  call to action: {len(instructions)} instructions fire, {len(description)} descriptions do not")

# What rule 4 is allowed to look at. Alt text, the caption under a picture and
# HTML comments are not instructions to a student, and the course streams were
# right to refuse to reword them for a linter.
body = """Vorher.

![Die geöffnete Befehlspalette mit eingetipptem Tasks: Run Task](palette.png)
*Die Palette, mit `Tasks: Run Task` eingetippt*

<!-- SHOT: Befehlspalette öffnen und Tasks: Run Task eintippen -->

<!--
    SHOT: den Task CaDS: Build starten
-->

```bash
# Task CaDS: Build starten
```

Den Task `CaDS: Build` starten.
Ein Bild ![alt Tasks: Run Task](x.png) mitten im Satz, danach `CaDS: Build` starten.
"""
_, outside = v.parse_do_blocks(body)
visible = [t for _, t in outside if t.strip()]
joined = "\n".join(visible)
checks = [
    ("alt text is not prose", "eingetipptem" not in joined),
    ("the caption under a picture is not prose", "Die Palette, mit" not in joined),
    ("a one-line HTML comment is not prose", "SHOT: Befehlspalette" not in joined),
    ("a multi-line HTML comment is not prose", "SHOT: den Task" not in joined),
    ("fenced code is not prose", "# Task CaDS" not in joined),
    ("the real instruction survives", "Den Task `CaDS: Build` starten." in joined),
    ("prose around an inline image survives", "mitten im Satz" in joined),
]
bad2 = [f"FAIL  {n}" for n, ok in checks if not ok]
print("\n".join(bad2) if bad2 else f"PASS  outside_lines: {len(checks)} exclusions hold")
sys.exit(1 if bad or bad2 else 0)
PY
) || fail=1
echo "$out"

# The halves are held against each other on the real packs: a step whose two
# language files disagree in their finding count is reported as such.
fw=$(python3 "$REPO/scripts/validate-courses.py" "${CADS_ZERO:-$HOME/Documents/git/cads-zero}" \
      --courses-dir "$REPO/courses" --only cads-zero-foundations 2>&1)
if echo "$fw" | grep -q 'rule 4 finds'; then
  echo "PASS  a lopsided step is reported (the German half of m5-01/m5-03 still names the task)"
else
  echo "PASS  every step's two halves agree"
fi
if echo "$fw" | grep -q 'Bildschirmfoto\|SHOT:'; then
  echo "FAIL  rule 4 reported a screenshot brief"; fail=1
else
  echo "PASS  no screenshot brief reported"
fi

exit $fail
