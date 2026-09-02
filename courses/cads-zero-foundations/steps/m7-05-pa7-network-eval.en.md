---
id: m7-05-pa7-network-eval
title: Evaluate the PA7 time-slice as a network decision
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-04-recon-tools]
estimatedMinutes: 15
links:
  - { step: m8-01-unit-tests }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/explanation/pa7-conflict.md, docs/HARDWARE.md, docs/reference/measurements.md, docs/ROADMAP.md]
tasks:
  - id: judge-the-tradeoff
    title: Judge the time-slice and the solder-bridge decision
    check: { type: question, prompt: { en: "The display and the Ethernet receiver share PA7 and are time-sliced per blit. Using the measured numbers, judge: (1) how large the worst-case receiver blackout is and why it is bounded at that value rather than the full redraw time; (2) which kinds of traffic tolerate it and which do not, and what that demands of anything you build on this board; (3) whether the SB121/SB122 solder-bridge fix should have been applied - state the decision the project took and argue for or against it with its own reasons.", de: "Display und Ethernet-Empfänger teilen sich PA7 und werden pro Blit zeitgeschlitzt. Beurteile anhand der gemessenen Zahlen: (1) wie groß der schlimmste Empfänger-Ausfall ist und warum er auf diesen Wert begrenzt ist statt auf die volle Neuzeichenzeit; (2) welche Verkehrsarten ihn vertragen und welche nicht, und was das von allem verlangt, was du auf diesem Board baust; (3) ob die SB121/SB122-Lötbrücken-Korrektur hätte angewendet werden sollen - nenne die Entscheidung des Projekts und argumentiere mit dessen eigenen Gründen dafür oder dagegen." }, rubric: "(1) 22.5 ms at /16 (11.5 ms at /8): cads_canvas_flush() pushes in bands of at most 16 rows and cads_hal_display_blit() claims/releases the bus per call, so the MAC comes back between bands; a full screen is 20 bands = 448 ms total but never one 448 ms blackout. (2) TCP absorbs it as a brief loss with retransmit/window adjustment; UDP simply loses what arrived in the window, so discovery or telemetry protocols built here must tolerate loss or repeat; dirty rectangles therefore become a network feature - redraw only what changed. (3) Decision 2026-08-18: no modification, CADS_SPI_MOSI_ON_PB5 stays 0; reasons: physical work on a shared lab board, diverges this firmware's requirements from every other project on the same hardware, surprises the next user; a defensible counter-argument is that the swap is reversible per UM1974 and removes all arbitration, letting both run at full speed. Any well-argued position that uses these facts passes.", bloom: evaluate }
socratic:
  - { trigger: "question:judge-the-tradeoff:weak", question: { en: "Why is the number that matters the longest single blackout rather than the total redraw time - what in the flush path makes those two different?", de: "Warum ist die maßgebliche Zahl der längste einzelne Ausfall und nicht die gesamte Neuzeichenzeit - was im Flush-Pfad macht die beiden verschieden?" }, hints: [ { en: "cads_canvas_flush() converts and pushes in 16-row bands; the bus claim is per blit, so the MAC restarts between bands.", de: "cads_canvas_flush() wandelt und schiebt in 16-Zeilen-Bändern; der Bus-Claim gilt pro Blit, der MAC startet also zwischen den Bändern neu." }, { en: "One 480x16 band at /16 is 22.5 ms; measurements.md and pa7-conflict.md both carry that table.", de: "Ein 480x16-Band bei /16 sind 22,5 ms; measurements.md und pa7-conflict.md tragen beide diese Tabelle." }, { en: "The decision and its reasons are under 'The decision: no modification' in pa7-conflict.md and in ROADMAP.md's Resolved decisions.", de: "Die Entscheidung und ihre Gründe stehen unter 'The decision: no modification' in pa7-conflict.md und in den Resolved decisions der ROADMAP.md." } ] }
---
## Learning goal

Evaluate, with the project's own measurements, what the PA7 display/Ethernet time-slice costs the network, and take a defended position on the solder-bridge fix the project chose not to apply.

## The constraint, once more

`SPI1_MOSI` (the display's data line, Arduino D11) and `ETH_RMII_CRS_DV` are both PA7, and carrier-sense has no alternative location on the STM32F429. One alternate function owns a pin at a time. The firmware's answer is arbitration per blit: `cads_hal_spi_claim_bus()` stops the MAC, drains in-flight frames, takes PA7, the rectangle goes out over DMA, and `cads_hal_spi_release_bus()` gives it back. Frames arriving during a blit are lost. You met the correctness side of this in M3; this step is about the cost.

## The number that matters

While the display owns PA7, the receiver is off. So the figure to reason about is not the total redraw time but the **longest uninterrupted blackout**. The flush path bounds it, by accident of a decision made for another reason: `cads_canvas_flush()` converts and pushes the damaged region in bands of at most sixteen rows, and `cads_hal_display_blit()` claims and releases per call, so the MAC comes back up between bands.

| | at /16 | at /8 |
|---|---|---|
| One 480×16 band | **22.5 ms** | 11.5 ms |
| Full screen, 20 bands | 448 ms total | 229 ms total |
| Longest single blackout | **22.5 ms** | **11.5 ms** |

22.5 ms is long on a 100 Mbit link — roughly 280 KB of wire time — but it is twenty times better than the 448 ms a single-transfer implementation would produce, and it is bounded rather than proportional to redraw size. Splitting bands smaller was considered and rejected: each band costs a bus claim, a MAC stop/start and a window-setting sequence, so halving the band doubles that overhead to halve a blackout TCP already handles.

## What follows for traffic

**TCP absorbs it.** A stalled receiver looks like a brief burst of loss; a retransmit and a window adjustment recover it. **UDP does not.** Datagrams that arrive during the window are gone. Anything built here that cares about individual datagrams — a discovery protocol, a telemetry stream, the recon watches from the previous step — has to tolerate that or repeat itself. And dirty rectangles stop being a display optimisation: a 40×40 update is one band, a single 4.7 ms blackout, so "redraw what changed" is now a network rule too. Screen streaming is self-limiting for the same reason — pushing the framebuffer needs the display *not* to be redrawing.

## The fix that exists, and the decision

UM1974 §6.9 documents solder bridges SB121/SB122: swapping them moves D11 to PB5, leaves PA7 to the PHY, and `-DCADS_SPI_MOSI_ON_PB5=1` compiles all arbitration away. **Decided 2026-08-18: the board stays stock.** The recorded reasons: it is physical work on a lab board other people use, it makes this firmware's requirements diverge from every other project on the same hardware, and a board modified for one project's convenience surprises the next person who picks it up. The project treats the time-slice as a constraint it designs around, not one it merely tolerates.

## Your task

Answer the three-part evaluation. Use the measured numbers, name the traffic classes explicitly, state the project's decision, and argue your own position on it with reasons — agreeing is not required, but using the facts is.
