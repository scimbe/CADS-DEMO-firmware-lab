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
    check: { type: question, prompt: { en: "How far does your measured rate sit from the documented 342 kpixel/s, and what explains the gap? Your three numbers - min, average, max - beside the documented one, plus two sentences: the bus model and the cause of the deviation.", de: "Wie weit liegt deine gemessene Rate von den dokumentierten 342 kpixel/s entfernt, und was erklärt die Abweichung? Deine drei Zahlen - Minimum, Mittel, Maximum - neben die dokumentierte, plus zwei Sätze: das Busmodell und die Ursache der Abweichung." }, rubric: "Reports min, average and max from your own run and puts them next to the documented 342 kpixel/s. Explains the number through the bus model: sixteen SPI clocks per pixel at the /16 divider give a theoretical 351 kpixel/s, so the driver sits at about 97 percent of it and there is no software headroom left - the bus is the ceiling. If the numbers differ, names a cause from the measurement conditions rather than from a feeling: the command measures under scheduler and live-netif contention, and the spread between min and max is itself the evidence. An answer with a single number and no bus model does not pass.", bloom: evaluate }
  - id: judge
    title: Judge a design decision
    check: { type: question, prompt: { en: "Under which workload would you revisit one of this board's three design decisions? Three sentences - the named workload, the decision it breaks first, and the measurement you would take first to confirm it.", de: "Unter welcher Last würdest du eine der drei Entwurfsentscheidungen dieses Boards revidieren? Drei Sätze - die benannte Last, die davon zuerst gebrochene Entscheidung, und die Messung, die du zuerst machen würdest, um sie zu bestätigen." }, rubric: "Names a concrete workload that does not exist today and the decision it breaks first. Examples that pass: a UDP telemetry stream that cannot repeat individual datagrams breaks leaving SB121/SB122 unswapped, because only there do display and Ethernet run at once; a UI with simultaneous small updates in opposite corners breaks the single-bounding-box model; a required redraw rate above two frames per second breaks the /16 divider. Ends with what would be measured first to confirm the workload. A judgement without a named workload does not pass.", bloom: evaluate }
socratic:
  - { trigger: "task:measured:failed", question: { en: "The command measures under real contention, so it needs a console prompt and time. Which of the two is missing?", de: "Der Befehl misst unter echter Last, er braucht also einen Konsolen-Prompt und Zeit. Welches der beiden fehlt?" }, hints: [ { en: "Does the console answer at all - or is the board still inside the app tree, where the dispatch never sees your line?", de: "Antwortet die Konsole überhaupt - oder sitzt das Board noch im App-Baum, wo das Dispatch deine Zeile nie sieht?" }, { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree, then V with a duration; the command waits briefly for a link before it starts.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt, dann V mit einer Dauer; der Befehl wartet kurz auf einen Link, bevor er beginnt." }, { en: "Too short a duration can finish no full-screen flush at all, and the report says so instead of printing rates.", de: "Eine zu kurze Dauer schafft womöglich keinen einzigen Vollbild-Flush, und der Bericht sagt das, statt Raten zu drucken." } ] }
  - { trigger: "question:compare:weak", question: { en: "Is the bottleneck the driver or the bus, and which of the two would your number have to beat to prove the other?", de: "Ist der Engpass der Treiber oder der Bus, und welchen der beiden müsste deine Zahl schlagen, um den anderen zu beweisen?" }, hints: [ { en: "Are you comparing your number only against the documented one - or also against the ceiling the bus allows at all?", de: "Vergleichst du deine Zahl nur mit der dokumentierten - oder auch mit der Decke, die der Bus überhaupt zulässt?" }, { en: "The command measures under scheduler and live-netif contention; docs/reference/measurements.md states the conditions under which the documented figure was taken.", de: "Der Befehl misst unter Scheduler- und Netzlast; docs/reference/measurements.md nennt die Bedingungen, unter denen die dokumentierte Zahl entstand." }, { en: "Sixteen SPI clocks per pixel at the /16 divider give the theoretical ceiling; how close your driver sits to it is yours to work out, and the spread between min and max is itself evidence about contention.", de: "Sechzehn SPI-Takte je Pixel beim /16-Teiler ergeben die theoretische Decke; wie nah dein Treiber daran liegt, rechnest du aus, und die Streuung zwischen Minimum und Maximum ist selbst ein Beleg über die Last." } ] }
  - { trigger: "question:judge:weak", question: { en: "A judgement needs a workload that does not exist today. Describe one, then say which decision it breaks first.", de: "Ein Urteil braucht eine Last, die es heute nicht gibt. Beschreib eine und sag dann, welche Entscheidung sie zuerst bricht." }, hints: [ { en: "Are you describing a workload that already exists today? Then it is no test - it is running.", de: "Beschreibst du eine Last, die es heute schon gibt? Dann ist sie kein Prüfstein - sie läuft ja." }, { en: "The three candidates fail under different loads - a redraw rate, a damage pattern, and a simultaneous display-plus-network demand; docs/explanation/pa7-conflict.md and docs/explanation/dirty-rectangles.md each name the constraint behind one.", de: "Die drei Kandidaten scheitern unter verschiedenen Lasten - einer Neuzeichenrate, einem Damage-Muster und einer gleichzeitigen Display- und Netzanforderung; docs/explanation/pa7-conflict.md und docs/explanation/dirty-rectangles.md nennen je den Zwang dahinter." }, { en: "TCP absorbs a bounded blackout with a retransmit; a stream of single datagrams does not. That difference is what makes one workload a test and another one not.", de: "TCP verkraftet einen begrenzten Ausfall mit einer Neuübertragung; ein Strom einzelner Datagramme nicht. Genau dieser Unterschied macht die eine Last zum Prüfstein und die andere nicht." } ] }
---
## Goal

Measure something real on the board, compare it to the project's own documented numbers, and reach a defended judgement about a design decision it implies.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m5-04-dirty-rect-eval` and `m7-05-pa7-network-eval`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

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
