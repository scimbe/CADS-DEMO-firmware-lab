---
id: p6-perf-measurement
title: "Project: a performance measurement"
bloom: evaluate
objectives: [cz.net.arbitration]
requires: []
estimatedMinutes: 90
links:
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/explanation/dirty-rectangles.md" }
sources: [docs/reference/measurements.md, docs/explanation/pa7-conflict.md, docs/explanation/dirty-rectangles.md]
tasks:
  - id: measured
    title: You ran a measurement on the real board
    check: { type: manual }
  - id: judge
    title: Interpret and judge the result
    check: { type: question, prompt: { en: "Report the number you measured and compare it to the documented figure in measurements.md. Given the PA7 time-slice — a full-screen redraw is ~448 ms at /16 and the longest receiver blackout per 16-row band is ~22.5 ms — judge one design decision: is the /16 divider, the single-bounding-box damage model, or leaving SB121/SB122 unswapped the right call for this board, and under what workload would you revisit it?", de: "Berichte die gemessene Zahl und vergleiche sie mit dem dokumentierten Wert in measurements.md. Angesichts des PA7-Zeitmultiplex — ein Vollbild-Neuaufbau dauert ~448 ms bei /16 und die längste Empfänger-Blackout-Zeit je 16-Zeilen-Band ~22,5 ms — beurteile eine Entwurfsentscheidung: ist der /16-Teiler, das Einzel-Bounding-Box-Schadensmodell oder das Nicht-Umlöten von SB121/SB122 die richtige Wahl für dieses Board, und unter welcher Last würdest du sie überdenken?" }, rubric: "Reports a measured value and compares it to the documented ~342 kpixel/s (or the relevant figure); explains the number in terms of the 16-clocks-per-pixel bus limit; and reaches a defended judgement on one decision (e.g. /16 is safe and near the bus ceiling; a damage list only pays off for opposite-corner updates; the solder swap trades portability for concurrent display+Ethernet), naming a workload that would change it.", bloom: evaluate }
socratic:
  - { trigger: "question:judge:weak", question: { en: "Is the bottleneck the driver or the bus, and how does the measured number settle that?", de: "Ist der Engpass der Treiber oder der Bus, und wie entscheidet die gemessene Zahl das?" }, hints: [ { en: "The V command re-measures flush throughput under real scheduler and network contention; compare its min/avg/max to 342 kpixel/s.", de: "Der V-Befehl misst den Flush-Durchsatz unter echter Scheduler- und Netzlast neu; vergleiche sein Min/Mittel/Max mit 342 kpixel/s." }, { en: "16 SPI clocks per pixel at /16 gives a theoretical 351 kpixel/s, so 342 is 97% — there is no driver inefficiency left, the bus is the wall.", de: "16 SPI-Takte pro Pixel bei /16 ergeben theoretische 351 kpixel/s, 342 sind also 97 % — es bleibt keine Treiber-Ineffizienz, der Bus ist die Wand." }, { en: "A judgement needs a workload: TCP absorbs a 22.5 ms blackout with a retransmit; a UDP telemetry stream during a full redraw does not.", de: "Ein Urteil braucht eine Last: TCP verkraftet eine 22,5-ms-Blackout mit Neuübertragung; ein UDP-Telemetriestrom während eines Vollbild-Neuaufbaus nicht." } ] }
---
## Goal

Measure something real on the board, compare it to the project's own documented numbers, and reach a defended judgement about a design decision it implies.

## What you build on

This project assumes the Foundations steps on the dirty-rectangle evaluation (m5-04-dirty-rect-eval) and the PA7 network evaluation (m7-05-pa7-network-eval). The measured figures you compare against are in `docs/reference/measurements.md`; the reasoning behind the constraints is in `docs/explanation/dirty-rectangles.md` and `docs/explanation/pa7-conflict.md`.

## Requirements

- Take one honest measurement on the real board. The `V` explorer command re-measures full-screen flush throughput under real scheduler and live-netif contention and prints min/avg/max kpixel/s; that is the easiest starting point, but you may design your own (a redraw-rate measurement, a per-band blackout estimate).
- **Compare, do not just report.** Put your number next to the documented one (about 342 kpixel/s at the `/16` divider, a full screen about 448 ms) and explain the gap or the agreement. Remember the model: 16 SPI clocks per pixel, so the bus is the ceiling and the driver already runs at 97 % of it.
- **Judge one decision.** Using your number and the documented ones, evaluate a real choice this board made — the `/16` divider, the single-bounding-box damage model, or leaving SB121/SB122 unswapped — and name the workload under which you would revisit it.
- This is an evaluate-level task: the deliverable is a reasoned argument grounded in measured data, not code.

## Acceptance

The first task records that you ran a measurement on the real board. The second is the substance: report the number, compare it to `docs/reference/measurements.md`, explain it through the bus model, and defend a judgement about one design decision with a concrete workload that would change it.

## Deliver

A short measurement report: your number, the documented number, the explanation, and one defended design judgement.
