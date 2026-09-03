---
id: p6-perf-measurement
title: "Project: a performance measurement"
bloom: evaluate
objectives: [cz.net.arbitration]
requires: []
estimatedMinutes: 90
scaffold: independent
links:
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/explanation/dirty-rectangles.md" }
sources: [docs/reference/measurements.md, docs/explanation/pa7-conflict.md, docs/explanation/dirty-rectangles.md, apps/bringup/explorer_throughput_demo.c]
tasks:
  - id: measured
    title: You measured throughput on the real board
    check: { type: serialExpect, send: "V 10\n", pattern: "kpixel/s: min=", timeoutMs: 45000, bloom: evaluate }
  - id: compare
    title: Compare against the documented number
    check: { type: question, prompt: { en: "How far does your measured rate sit from the documented 342 kpixel/s, and what explains the gap?", de: "Wie weit liegt deine gemessene Rate von den dokumentierten 342 kpixel/s entfernt, und was erklärt die Abweichung?" }, rubric: "Reports min, average and max from your own run and puts them next to the documented 342 kpixel/s. Explains the number through the bus model: sixteen SPI clocks per pixel at the /16 divider give a theoretical 351 kpixel/s, so the driver sits at about 97 percent of it and there is no software headroom left - the bus is the ceiling. If the numbers differ, names a cause from the measurement conditions rather than from a feeling: the command measures under scheduler and live-netif contention, and the spread between min and max is itself the evidence. An answer with a single number and no bus model does not pass.", bloom: evaluate }
  - id: judge
    title: Judge a design decision
    check: { type: question, prompt: { en: "Under which workload would you revisit one of this board's three design decisions?", de: "Unter welcher Last würdest du eine der drei Entwurfsentscheidungen dieses Boards revidieren?" }, rubric: "Names a concrete workload that does not exist today and the decision it breaks first. Examples that pass: a UDP telemetry stream that cannot repeat individual datagrams breaks leaving SB121/SB122 unswapped, because only there do display and Ethernet run at once; a UI with simultaneous small updates in opposite corners breaks the single-bounding-box model; a required redraw rate above two frames per second breaks the /16 divider. Ends with what would be measured first to confirm the workload. A judgement without a named workload does not pass.", bloom: evaluate }
socratic:
  - { trigger: "task:measured:failed", question: { en: "The command measures under real contention, so it needs a console prompt and time. Which of the two is missing?", de: "Der Befehl misst unter echter Last, er braucht also einen Konsolen-Prompt und Zeit. Welches der beiden fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "It waits briefly for a link before it starts, then runs for the number of seconds you gave it.", de: "Es wartet kurz auf einen Link, bevor es beginnt, und läuft dann die von dir angegebene Anzahl Sekunden." }, { en: "Too short a duration can finish no full-screen flush at all, and the report says so instead of printing rates.", de: "Eine zu kurze Dauer schafft womöglich keinen einzigen Vollbild-Flush, und der Bericht sagt das, statt Raten zu drucken." } ] }
  - { trigger: "question:compare:weak", question: { en: "Is the bottleneck the driver or the bus, and which of the two would your number have to beat to prove the other?", de: "Ist der Engpass der Treiber oder der Bus, und welchen der beiden müsste deine Zahl schlagen, um den anderen zu beweisen?" }, hints: [ { en: "Sixteen SPI clocks per pixel at the /16 divider give a theoretical ceiling; compare your number to that, not only to the documented one.", de: "Sechzehn SPI-Takte pro Pixel beim /16-Teiler ergeben eine theoretische Decke; vergleich deine Zahl damit, nicht nur mit der dokumentierten." }, { en: "The command measures under scheduler and live-netif contention, so min and avg can differ from a quiet-bench figure.", de: "Der Befehl misst unter Scheduler- und Netzlast, min und Mittel können also von einem Wert an der stillen Werkbank abweichen." }, { en: "Report min, average and max, not one number - the spread is itself evidence about contention.", de: "Berichte Minimum, Mittel und Maximum, nicht eine Zahl - die Streuung ist selbst ein Beleg über die Last." } ] }
  - { trigger: "question:judge:weak", question: { en: "A judgement needs a workload that does not exist today. Describe one, then say which decision it breaks first.", de: "Ein Urteil braucht eine Last, die es heute nicht gibt. Beschreib eine und sag dann, welche Entscheidung sie zuerst bricht." }, hints: [ { en: "The three candidates fail under different loads: a redraw rate, a damage pattern, and a simultaneous display-plus-network demand.", de: "Die drei Kandidaten scheitern unter verschiedenen Lasten: einer Neuzeichenrate, einem Damage-Muster und einer gleichzeitigen Display- und Netzanforderung." }, { en: "TCP absorbs a bounded blackout with a retransmit; a stream of single datagrams does not.", de: "TCP verkraftet einen begrenzten Ausfall mit einer Neuübertragung; ein Strom einzelner Datagramme nicht." }, { en: "End with what you would measure first to confirm the workload really breaks it - the project requires evidence before complexity.", de: "Schließe damit, was du zuerst messen würdest, um zu bestätigen, dass die Last sie wirklich bricht - das Projekt verlangt Belege vor Komplexität." } ] }
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

1. **The measurement.** The check sends `V 10` to the board console and waits for the result line with min, average and max. There is no tick box here: either the board measured, or the check fails.
2. **The comparison.** You report your three numbers against the documented 342 kpixel/s and explain the gap or the agreement through the bus model.
3. **The judgement.** You name a workload under which you would revisit one of the three design decisions.

## Deliver

A short measurement report: your number, the documented number, the explanation, and one defended design judgement.
