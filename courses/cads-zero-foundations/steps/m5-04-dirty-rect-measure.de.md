---
id: m5-04-dirty-rect-measure
title: Miss den Zwei-Ecken-Fall, statt ihn nur zu glauben
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
    title: Miss den Zwei-Ecken-Fall, statt ihn nur zu glauben
    check: { type: all, bloom: analyze, checks: [ { type: command, cwd: ".", command: "t=$(mktemp); { git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/'; } | grep -vE '^[+][[:space:]]*([/][/*]|[*])' > $t; grep -qE '^[+].*cads_canvas_flush' $t && [ $(grep -cE '^[+].*cads_canvas_fill_rect' $t) -ge 2 ] && grep -qE '^[+].*CADS_CANVAS_WIDTH[^;]*CADS_CANVAS_HEIGHT' $t; r=$?; rm -f $t; exit $r", expectExitCode: 0 }, { type: task, label: "CaDS: Host tests", expectExitCode: 0 } ] }
  - id: two-corner-cost
    title: Rechne die Kosten des Zwei-Ecken-Falls aus
    check: { type: question, prompt: { en: "Two 40x40 updates in opposite corners in the same tick: how many milliseconds does the flush cost?", de: "Zwei 40x40-Updates in gegenüberliegenden Ecken im selben Tick: wie viele Millisekunden kostet der Flush?" }, recallPrompt: { en: "A 480x320 panel runs at 342 kpixel/s, and a 40x40 rectangle costs 4.7 ms. Two such updates land in the same tick, in opposite corners. How many milliseconds does the flush cost with a single bounding box, and how many with a list of two rectangles?", de: "Ein 480×320-Panel läuft mit 342 kpixel/s, ein 40×40-Rechteck kostet 4,7 ms. Zwei solche Updates liegen im selben Tick in gegenüberliegenden Ecken. Wie viele Millisekunden kostet der Flush mit einer einzigen Bounding-Box, und wie viele mit einer Liste aus zwei Rechtecken?" }, rubric: "Mit einer Box umschließt das Damage beide Ecken, also die volle Fläche: 153 600 Pixel bei 342 kpixel/s, rund 448 ms. Mit einer Liste aus zwei Rechtecken sind es 2 x 4,7 ms, also rund 9,4 ms. Das Verhältnis liegt bei etwa 48. Bestanden nur mit beiden Zahlen und dem Verhältnis; eine Antwort, die bloß von langsamer spricht, besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "task:measure-the-box:failed", question: { en: "The check reads the lines your change ADDS under tests/unit. Does your case reach the suite at all?", de: "Der Check liest die Zeilen, die deine Änderung unter tests/unit HINZUFÜGT. Kommt dein Fall überhaupt in der Suite an?" }, hints: [ { en: "A case that is written but never registered with RUN_TEST is compiled and never executed.", de: "Ein Fall, der geschrieben, aber nie mit RUN_TEST registriert ist, wird übersetzt und nie ausgeführt." }, { en: "Open tests/unit/test_canvas.c, add your case, and add one RUN_TEST line for it at the bottom next to the others.", de: "Öffne tests/unit/test_canvas.c, ergänze deinen Fall und trag ihn unten neben den anderen mit einer RUN_TEST-Zeile ein." }, { en: "The check wants two fill_rect calls in the added lines and an assertion over the whole canvas, not over 1600 pixels.", de: "Der Check verlangt in den hinzugefügten Zeilen zwei fill_rect-Aufrufe und eine Zusicherung über das ganze Canvas, nicht über 1600 Bildpunkte." } ] }
  - { trigger: "question:two-corner-cost:weak", question: { en: "Draw the two rectangles on paper and then draw the smallest single rectangle that contains both. How many pixels is that?", de: "Zeichne die beiden Rechtecke auf Papier und dann das kleinste einzelne Rechteck, das beide enthält. Wie viele Pixel sind das?" }, hints: [ { en: "The measurement table above gives a rate in kpixel/s that is the same for partial and full transfers.", de: "Die Messtabelle oben nennt eine Rate in kpixel/s, die für Teil- und Vollbildtransfers dieselbe ist." }, { en: "Compute both cases separately: the one enclosing box, and a list holding the two rectangles unchanged.", de: "Rechne beide Fälle getrennt: die eine umschließende Box und eine Liste, die die beiden Rechtecke unverändert hält." }, { en: "The answer is two numbers and their ratio - a verdict without the arithmetic does not pass this task.", de: "Die Antwort sind zwei Zahlen und ihr Verhältnis - ein Urteil ohne die Rechnung besteht diese Aufgabe nicht." } ] }
---
## Lernziel

Miss echte Kosten dieser Firmware, statt sie anzunehmen: Das Canvas verfolgt Damage als eine einzige Bounding-Box, und der Zwei-Ecken-Fall ist genau dort am teuersten. [Der nächste Step](step:m5-05-dirty-rect-judge) beurteilt, ob dieser Preis zählt; dieser hier stellt die Zahl fest.

## Zuerst messen, dann urteilen

Ergänze in `tests/unit/test_canvas.c` einen Unity-Fall, der zwei 40×40-Rechtecke in gegenüberliegende Ecken zeichnet und danach zusichert, was `cads_canvas_flush()` tatsächlich überträgt. Der Puffer läuft auf dem Host gegen die aufzeichnende HAL, es braucht also kein Board.

Vergiss die `RUN_TEST`-Zeile unten in der Datei nicht — ein Fall ohne sie wird übersetzt und nie ausgeführt.

## Die Belege

Alles auf dem physischen Board gemessen (`docs/reference/measurements.md`, `docs/explanation/dirty-rectangles.md`):

| Transfer | Pixel | Zeit | Rate |
|---|---|---|---|
| Vollbild | 153 600 | **448 233 µs** | 342 kpixel/s |
| 40×40-Rechteck | 1 600 | **4 717 µs** | 339 kpixel/s |

Teiltransfers skalieren linear — die Rate ist dieselbe —, also bringt Damage-Verfolgung genau das, was sie verspricht: einen Faktor von etwa 95 zwischen einem kleinen Update und einem vollen Neuaufbau. Der Bus ist die Grenze; der Treiber liegt bei 97 % der theoretischen 351 kpixel/s, es gibt also keinen Software-Spielraum mehr.

## Deine Aufgabe

Zwei Schritte, jeder für sich. Erst schreibst du den Unity-Fall, der den Zwei-Ecken-Fall misst, statt einer Beschreibung davon zu vertrauen. Dann rechnest du die Flush-Kosten für zwei 40×40-Updates in gegenüberliegenden Ecken im selben Tick aus, einmal mit einer einzigen Bounding-Box und einmal mit einer Liste aus zwei Rechtecken, und gibst das Verhältnis an. [M5-05](step:m5-05-dirty-rect-judge) nutzt diese Zahl, um die Entscheidung zu beurteilen.
