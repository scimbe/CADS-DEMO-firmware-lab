---
id: m5-04-dirty-rect-eval
title: One bounding box or a damage list?
bloom: evaluate
objectives: [cz.gui.dirty-rects]
requires: [m5-03-own-app]
estimatedMinutes: 15
scaffold: independent
links:
  - { step: m6-01-littlefs }
  - { doc: "docs/explanation/dirty-rectangles.md" }
  - { doc: "docs/reference/measurements.md" }
  - { file: "gui/canvas.h", line: 145 }
sources: [docs/explanation/dirty-rectangles.md, docs/reference/measurements.md, docs/reference/canvas.md, docs/explanation/pa7-conflict.md]
tasks:
  - id: two-corner-cost
    title: Compute the cost of the two-corner case
    check: { type: question, prompt: { en: "Two 40x40 updates in opposite corners in the same tick: how many milliseconds does the flush cost?", de: "Zwei 40x40-Updates in gegenüberliegenden Ecken im selben Tick: wie viele Millisekunden kostet der Flush?" }, rubric: "With one box the damage encloses both corners, so the whole surface: 153 600 pixels at 342 kpixel/s, about 448 ms. With a list of two rectangles it is 2 x 4.7 ms, about 9.4 ms. The ratio is roughly 48. Passes only with both numbers and the ratio; an answer that only says slower does not pass.", bloom: evaluate }
  - id: judge-today
    title: Judge the box against the layouts that exist today
    check: { type: question, prompt: { en: "Is the single bounding box the right choice for the widget layouts that exist today?", de: "Ist die einzelne Bounding-Box für die heute vorhandenen Widget-Layouts die richtige Wahl?" }, rubric: "Takes a position and argues it from a concrete layout that exists today: the menu moves its selection across adjacent rows, the status-bar clock damages the clock and not the bar, an app redraws one widget - damage stays spatially coherent, so the box costs nothing. Anyone arguing the other side must name a layout that exists today and produces simultaneous damage far apart. An answer without a named screen does not pass.", bloom: evaluate }
  - id: revision-condition
    title: Name the condition for replacing it
    check: { type: question, prompt: { en: "Under what condition would this project replace the box with a damage list?", de: "Unter welcher Bedingung würde dieses Projekt die Box durch eine Damage-Liste ersetzen?" }, rubric: "Two conditions together: first a UI pattern that actually occurs - two small simultaneous updates far apart, such as a clock in one corner and an indicator in another; second a measurement under real load before anything is built, because the list costs complexity on the hot path. Naming only one of the two halves does not pass.", bloom: evaluate }
socratic:
  - { trigger: "question:two-corner-cost:weak", question: { en: "Draw the two rectangles on paper and then draw the smallest single rectangle that contains both. How many pixels is that?", de: "Zeichne die beiden Rechtecke auf Papier und dann das kleinste einzelne Rechteck, das beide enthält. Wie viele Pixel sind das?" }, hints: [ { en: "The measurement table above gives a rate in kpixel/s that is the same for partial and full transfers.", de: "Die Messtabelle oben nennt eine Rate in kpixel/s, die für Teil- und Vollbildtransfers dieselbe ist." }, { en: "Compute both cases separately: the one enclosing box, and a list holding the two rectangles unchanged.", de: "Rechne beide Fälle getrennt: die eine umschließende Box und eine Liste, die die beiden Rechtecke unverändert hält." }, { en: "The answer is two numbers and their ratio - a verdict without the arithmetic does not pass this task.", de: "Die Antwort sind zwei Zahlen und ihr Verhältnis - ein Urteil ohne die Rechnung besteht diese Aufgabe nicht." } ] }
  - { trigger: "question:judge-today:weak", question: { en: "Take the three screens you have already seen - the menu, the status bar, your own app. Where does each of them put its damage?", de: "Nimm die drei Bildschirme, die du schon gesehen hast - das Menü, die Statusleiste, deine eigene App. Wohin legt jeder von ihnen sein Damage?" }, hints: [ { en: "The question is not whether a bounding box is elegant, but whether today's layouts produce far-apart damage at all.", de: "Die Frage ist nicht, ob eine Bounding-Box elegant ist, sondern ob die heutigen Layouts überhaupt weit auseinanderliegendes Damage erzeugen." }, { en: "docs/explanation/dirty-rectangles.md states a design rule that apps follow; a rule is not a guarantee the canvas gives.", de: "docs/explanation/dirty-rectangles.md nennt eine Gestaltungsregel, der Apps folgen; eine Regel ist keine Zusicherung des Canvas." }, { en: "Whichever side you take, your answer has to name a concrete screen - a general argument does not settle this.", de: "Egal welche Seite du wählst, deine Antwort muss einen konkreten Bildschirm nennen - ein allgemeines Argument entscheidet das nicht." } ] }
  - { trigger: "question:revision-condition:weak", question: { en: "The project does not forbid the list. What does it demand first, and why that order?", de: "Das Projekt verbietet die Liste nicht. Was verlangt es zuerst, und warum in dieser Reihenfolge?" }, hints: [ { en: "A list costs complexity on the hot path, so it needs a reason that exists rather than one that might.", de: "Eine Liste kostet Komplexität auf dem heißen Pfad, sie braucht also einen Grund, der existiert, nicht einen, der könnte." }, { en: "Name the UI pattern that would produce the cost you computed in the first task.", de: "Benenne das UI-Muster, das die Kosten erzeugen würde, die du in der ersten Aufgabe berechnet hast." }, { en: "The condition has two halves and both must appear in your answer: a pattern that really occurs, and evidence from a real load.", de: "Die Bedingung hat zwei Hälften und beide müssen in deiner Antwort auftauchen: ein Muster, das wirklich auftritt, und ein Beleg aus echter Last." } ] }
---
## Learning goal

Evaluate a real design decision in this firmware against measured numbers: the canvas tracks damage as one bounding box, and you will judge whether that is the right call and when it would stop being one.

## The decision as the project states it

`docs/reference/canvas.md` is explicit: *"A single bounding box is a deliberate simplification. Two small updates in opposite corners produce a box covering the screen."*

That is a decision with a stated failure case. What it costs, why it was taken anyway, and when it would fall are not written there — you compute and decide those in this step.

## The evidence

All measured on the physical board (`docs/reference/measurements.md`, `docs/explanation/dirty-rectangles.md`):

| Transfer | Pixels | Time | Rate |
|---|---|---|---|
| Full screen | 153 600 | **448 233 µs** | 342 kpixel/s |
| 40×40 rectangle | 1 600 | **4 717 µs** | 339 kpixel/s |

Partial transfers scale linearly — the rate is the same — so damage tracking buys exactly what it looks like it should: a factor of about 95 between a small update and a full redraw. The bus is the limit; the driver is at 97 % of the theoretical 351 kpixel/s, so there is no software headroom to recover.

One further consequence belongs here, and it is not a visual one: on this board the display and the Ethernet PHY share PA7 (`docs/explanation/pa7-conflict.md`), so the MAC's receiver is off for as long as a band is going out. A damage decision is therefore also a network decision — exactly how expensive is what you evaluate in M7-05.

## What the box hangs on

Whether a single box is enough depends entirely on where the UI puts its damage. `docs/explanation/dirty-rectangles.md` states a **design rule** for that — *"design the UI so damage stays small"* — and a rule is something apps follow, not a property the canvas guarantees. Which screens in this firmware keep the rule today, and which pattern would break it, is yours to work out in this step.

That the violation stays silent is the real reason for the care: `ok 7 - dirty rectangle limits the transfer` in the M0 gate asserts on `partial_pixels: 1600`, because otherwise a bug that promotes damage to full-screen shows up only as "the UI feels sluggish".

## Your task

Three steps, each on its own. First compute under a given load: two 40×40 updates in opposite corners in the same tick, once with one box and once with a list of two rectangles. Then take a position on whether the box is right for the layouts that exist today, and ground it in a concrete screen. Finally, name the condition under which this project would replace it. There is no code change in this step — the deliverable is a computed and defended decision.
