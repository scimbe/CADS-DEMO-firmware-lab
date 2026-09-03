---
id: m5-04-dirty-rect-eval
title: One bounding box, or a damage list?
bloom: evaluate
objectives: [cz.gui.dirty-rects]
requires: [m5-03-own-app]
estimatedMinutes: 15
links:
  - { step: m6-01-littlefs }
  - { doc: "docs/explanation/dirty-rectangles.md" }
  - { doc: "docs/reference/measurements.md" }
  - { file: "gui/canvas.h", line: 145 }
sources: [docs/explanation/dirty-rectangles.md, docs/reference/measurements.md, docs/reference/canvas.md, docs/explanation/pa7-conflict.md]
tasks:
  - id: judge-design
    title: Judge the single-bounding-box design
    check: { type: question, prompt: { en: "The canvas keeps ONE damage bounding box, so two small updates in opposite corners produce a box covering the whole screen. A damage LIST would avoid that. Using the measured numbers (342 kpixel/s, ~448 ms full screen, 4.7 ms for 40x40) and the project's own reasoning, argue whether the single box is the right design today, name the concrete UI pattern that would make it wrong, and state what you would have to do before replacing it.", de: "Das Canvas hält EINE Damage-Bounding-Box, zwei kleine Updates in gegenüberliegenden Ecken erzeugen also eine Box über den ganzen Bildschirm. Eine Damage-LISTE würde das vermeiden. Argumentiere anhand der gemessenen Zahlen (342 kpixel/s, ~448 ms Vollbild, 4,7 ms für 40x40) und der projekteigenen Begründung, ob die einzelne Box heute das richtige Design ist, benenne das konkrete UI-Muster, das sie falsch machen würde, und sage, was du vor einem Ersatz tun müsstest." }, rubric: "Weighs the cost: worst case degrades a 4.7 ms update to ~448 ms, i.e. the UI momentarily falls to about 2 fps and the Ethernet receiver is blacked out for the whole redraw; recognises the box is a deliberate simplification because current widget layouts (status bar clock, menu selection moving two rows) do not produce opposite-corner damage; identifies the failing pattern (simultaneous small updates far apart, e.g. a clock in one corner and an indicator in another); and concludes with the project rule: measure a real workload first, then replace the box with a list on the hot path only if the measurement justifies the added complexity.", bloom: evaluate }
socratic:
  - { trigger: "question:judge-design:weak", question: { en: "What does a two-corner update actually cost in milliseconds with one box, and what would it cost with a list of two rectangles?", de: "Was kostet ein Zwei-Ecken-Update mit einer Box tatsächlich in Millisekunden, und was mit einer Liste aus zwei Rechtecken?" }, hints: [ { en: "One box covering 480x320 is a full flush: ~448 ms at 342 kpixel/s. Two 40x40 rectangles are 2 x 4.7 ms.", de: "Eine Box über 480x320 ist ein voller Flush: ~448 ms bei 342 kpixel/s. Zwei 40x40-Rechtecke sind 2 x 4,7 ms." }, { en: "docs/reference/canvas.md calls the single box a deliberate simplification because the widget layouts here do not generate that pattern.", de: "docs/reference/canvas.md nennt die einzelne Box eine bewusste Vereinfachung, weil die Widget-Layouts hier dieses Muster nicht erzeugen." }, { en: "The stated rule is: if a future app does generate it, measure before building a list - the list costs complexity on the hot path.", de: "Die festgelegte Regel lautet: erzeugt eine künftige App es doch, erst messen, dann eine Liste bauen - die Liste kostet Komplexität auf dem heißen Pfad." } ] }
---
## Learning goal

Evaluate a real design decision in this firmware against measured numbers: the canvas tracks damage as one bounding box, and you will judge whether that is the right call and when it would stop being one.

## The decision as the project states it

`docs/reference/canvas.md` is explicit: *"A single bounding box is a deliberate simplification. Two small updates in opposite corners produce a box covering the screen. A damage list would handle that better and is not implemented, because the widget layouts here do not generate that pattern and a list costs complexity on the hot path. If a future app does generate it, measure before building one."*

That is a decision with a stated reason, a stated failure case, and a stated condition for revisiting it. Your job in this step is to check each of the three against the evidence.

## The evidence

All measured on the physical board (`docs/reference/measurements.md`, `docs/explanation/dirty-rectangles.md`):

| Transfer | Pixels | Time | Rate |
|---|---|---|---|
| Full screen | 153 600 | **448 233 µs** | 342 kpixel/s |
| 40×40 rectangle | 1 600 | **4 717 µs** | 339 kpixel/s |

Partial transfers scale linearly — the rate is the same — so damage tracking buys exactly what it looks like it should: a factor of about 95 between a small update and a full redraw. The bus is the limit; the driver is at 97 % of the theoretical 351 kpixel/s, so there is no software headroom to recover.

Two consequences shape the evaluation. First, a UI that repaints the full screen runs at 2.2 fps and every touch response arrives half a second late — so promoting damage to full-screen is not a slowdown, it is unusability. Second, on this board the display and the Ethernet PHY share PA7 (`docs/explanation/pa7-conflict.md`): the MAC's receiver is off while a band is going out, so a full-screen redraw is twenty 22.5 ms blackouts back to back. A damage decision is therefore also a network decision.

## What the single box assumes

The box is correct when damage is spatially coherent: a menu moving its selection touches two adjacent rows; a status bar clock damages the clock, not the bar; your Hello app from the last step redraws one widget. The design guidance in `docs/explanation/dirty-rectangles.md` — *"design the UI so damage stays small"* — is what keeps that assumption true, and it is a rule apps follow rather than a property the canvas guarantees.

The box is wrong the moment two small, simultaneous updates are far apart. Then a 2 × 4.7 ms job becomes a 448 ms one, silently: `ok 7 - dirty rectangle limits the transfer` in the M0 gate asserts on `partial_pixels: 1600` precisely because a bug that promotes damage to full-screen shows up only as "the UI feels sluggish".

## Your task

Write your judgement. Take a position on whether the single box is right *today*, identify the concrete UI pattern that breaks it, quantify what that pattern costs with the numbers above, and say what the project requires you to do before replacing the box with a list. There is no code change in this step — the deliverable is a defended decision.
