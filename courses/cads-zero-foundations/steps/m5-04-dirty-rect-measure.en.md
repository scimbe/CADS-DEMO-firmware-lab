---
id: m5-04-dirty-rect-measure
title: Measure the two-corner case instead of believing it
bloom: analyze
objectives: [cz.gui.dirty-rects]
requires: [m5-03-own-app]
estimatedMinutes: 8
scaffold: independent
links:
  - { step: m5-05-dirty-rect-judge }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/reference/measurements.md, docs/explanation/dirty-rectangles.md]
tasks:
  - id: measure-the-box
    title: Measure the two-corner case instead of believing it
    check: { type: all, bloom: analyze, checks: [ { type: command, cwd: ".", command: "t=$(mktemp); { git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/'; } | grep -vE '^[+][[:space:]]*([/][/*]|[*])' > $t; grep -qE '^[+].*cads_canvas_flush' $t && [ $(grep -cE '^[+].*cads_canvas_fill_rect' $t) -ge 2 ] && grep -qE '^[+].*CADS_CANVAS_WIDTH[^;]*CADS_CANVAS_HEIGHT' $t; r=$?; rm -f $t; exit $r", expectExitCode: 0 }, { type: task, label: "CaDS: Host tests", expectExitCode: 0 } ] }
  - id: two-corner-cost
    title: Compute the cost of the two-corner case
    check: { type: question, prompt: { en: "Two 40x40 updates in opposite corners in the same tick: how many milliseconds does the flush cost?", de: "Zwei 40x40-Updates in gegenüberliegenden Ecken im selben Tick: wie viele Millisekunden kostet der Flush?" }, recallPrompt: { en: "A 480x320 panel runs at 342 kpixel/s, and a 40x40 rectangle costs 4.7 ms. Two such updates land in the same tick, in opposite corners. How many milliseconds does the flush cost with a single bounding box, and how many with a list of two rectangles?", de: "Ein 480×320-Panel läuft mit 342 kpixel/s, ein 40×40-Rechteck kostet 4,7 ms. Zwei solche Updates liegen im selben Tick in gegenüberliegenden Ecken. Wie viele Millisekunden kostet der Flush mit einer einzigen Bounding-Box, und wie viele mit einer Liste aus zwei Rechtecken?" }, rubric: "With one box the damage encloses both corners, so the whole surface: 153 600 pixels at 342 kpixel/s, about 448 ms. With a list of two rectangles it is 2 x 4.7 ms, about 9.4 ms. The ratio is roughly 48. Passes only with both numbers and the ratio; an answer that only says slower does not pass.", bloom: evaluate }
socratic:
  - { trigger: "task:measure-the-box:failed", question: { en: "The check reads the lines your change ADDS under tests/unit. Does your case reach the suite at all?", de: "Der Check liest die Zeilen, die deine Änderung unter tests/unit HINZUFÜGT. Kommt dein Fall überhaupt in der Suite an?" }, hints: [ { en: "A case that is written but never registered with RUN_TEST is compiled and never executed.", de: "Ein Fall, der geschrieben, aber nie mit RUN_TEST registriert ist, wird übersetzt und nie ausgeführt." }, { en: "Open tests/unit/test_canvas.c, add your case, and add one RUN_TEST line for it at the bottom next to the others.", de: "Öffne tests/unit/test_canvas.c, ergänze deinen Fall und trag ihn unten neben den anderen mit einer RUN_TEST-Zeile ein." }, { en: "The check wants two fill_rect calls in the added lines and an assertion over the whole canvas, not over 1600 pixels.", de: "Der Check verlangt in den hinzugefügten Zeilen zwei fill_rect-Aufrufe und eine Zusicherung über das ganze Canvas, nicht über 1600 Bildpunkte." } ] }
  - { trigger: "question:two-corner-cost:weak", question: { en: "Draw the two rectangles on paper and then draw the smallest single rectangle that contains both. How many pixels is that?", de: "Zeichne die beiden Rechtecke auf Papier und dann das kleinste einzelne Rechteck, das beide enthält. Wie viele Pixel sind das?" }, hints: [ { en: "The measurement table above gives a rate in kpixel/s that is the same for partial and full transfers.", de: "Die Messtabelle oben nennt eine Rate in kpixel/s, die für Teil- und Vollbildtransfers dieselbe ist." }, { en: "Compute both cases separately: the one enclosing box, and a list holding the two rectangles unchanged.", de: "Rechne beide Fälle getrennt: die eine umschließende Box und eine Liste, die die beiden Rechtecke unverändert hält." }, { en: "The answer is two numbers and their ratio - a verdict without the arithmetic does not pass this task.", de: "Die Antwort sind zwei Zahlen und ihr Verhältnis - ein Urteil ohne die Rechnung besteht diese Aufgabe nicht." } ] }
---
## Learning goal

Measure a real cost in this firmware instead of assuming it: the canvas tracks damage as one bounding box, and the two-corner case is where that simplification is most expensive. [The next step](step:m5-05-dirty-rect-judge) judges whether that expense matters; this one establishes the number.

## Measure first, judge afterwards

Add a Unity case to `tests/unit/test_canvas.c` that draws two 40×40 rectangles into opposite corners and then asserts what `cads_canvas_flush()` actually transfers. The buffer runs on the host against the recording HAL, so no board is needed.

Do not forget the `RUN_TEST` line at the bottom of the file — a case without it is compiled and never executed.

## The evidence

All measured on the physical board (`docs/reference/measurements.md`, `docs/explanation/dirty-rectangles.md`):

| Transfer | Pixels | Time | Rate |
|---|---|---|---|
| Full screen | 153 600 | **448 233 µs** | 342 kpixel/s |
| 40×40 rectangle | 1 600 | **4 717 µs** | 339 kpixel/s |

Partial transfers scale linearly — the rate is the same — so damage tracking buys exactly what it looks like it should: a factor of about 95 between a small update and a full redraw. The bus is the limit; the driver is at 97 % of the theoretical 351 kpixel/s, so there is no software headroom to recover.

## Your task

Two steps, each on its own. First write the Unity case that measures the two-corner case rather than trusting a description of it. Then compute the flush cost for two 40×40 updates in opposite corners in the same tick, once with a single bounding box and once with a list of two rectangles, and give the ratio. [M5-05](step:m5-05-dirty-rect-judge) uses this number to judge the design.
