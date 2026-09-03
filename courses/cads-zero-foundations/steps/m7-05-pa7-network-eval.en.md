---
id: m7-05-pa7-network-eval
title: Evaluate the PA7 time-slice as a network decision
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-04-recon-tools]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m3-05-spi-mutex, m4-03-mutex-spi-bus]
links:
  - { step: m8-01-unit-tests }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/reference/measurements.md" }
sources: [docs/explanation/pa7-conflict.md, docs/HARDWARE.md, docs/reference/measurements.md, docs/ROADMAP.md, gui/canvas.c]
tasks:
  - id: blackout-bound
    title: Why the blackout is bounded
    check: { type: question, prompt: { en: "Why is the longest single receiver blackout one band rather than a whole redraw?", de: "Warum ist der längste einzelne Empfänger-Ausfall ein Band und nicht ein ganzer Neuaufbau?" }, rubric: "Because cads_canvas_flush() does not transfer the damaged region in one piece but in bands, and cads_hal_display_blit() claims and releases the bus per band. Between two bands the MAC therefore comes back. The band limit is the staging buffer cads_stage, measured in pixels rather than rows: gui/canvas.c computes rows_per_band = CADS_STAGE_PIXELS / width, with CADS_STAGE_PIXELS = 480 × 16 = 7680. At full width that is sixteen rows per band; a damage box half as wide gets thirty-two out of the same pixel budget. The blackout is therefore bounded by the bank size in pixels, not by a fixed row count. A full screen is twenty such bands: 448 ms in total, but never a single 448 ms blackout - twenty of 22.5 ms with receive windows in between. Passes only if the granularity of the bus claim is named; saying merely that drawing happens in bands does not pass.", bloom: evaluate }
  - id: traffic-class
    title: Which traffic cannot take it
    check: { type: question, prompt: { en: "Which traffic class does not survive the blackout, and what does that demand of your protocol?", de: "Welche Verkehrsart übersteht den Ausfall nicht, und was verlangt das von deinem Protokoll?" }, rubric: "UDP. TCP absorbs the blackout as a brief burst of loss that retransmission and window adjustment recover; datagrams arriving inside the window, by contrast, are simply gone, because nobody repeats them. Consequence for your own design: anything built here that depends on individual datagrams - a discovery protocol, a telemetry stream, the passive watches from the previous step - has to tolerate loss or repeat itself. Also names that dirty rectangles thereby become a network rule. An answer without a rule for your own design does not pass.", bloom: evaluate }
  - id: solder-bridge
    title: The solder-bridge decision
    check: { type: question, prompt: { en: "Would you swap SB121/SB122 on this lab board?", de: "Würdest du SB121/SB122 auf diesem Laborboard tauschen?" }, rubric: "Any position passes that uses the facts. Names the project decision of 2026-08-18 - no modification - and at least one of the recorded reasons: physical work on a shared lab board, requirements diverging from every other project on the same hardware, surprising the next person to pick it up. And names what argues for the other side: per UM1974 the swap is reversible, moves D11 to PB5, leaves PA7 to the PHY, and with CADS_SPI_MOSI_ON_PB5 compiles all arbitration away, so display and Ethernet run at full speed at once. Repeating the project reasons without naming a condition under which the other choice wins does not pass.", bloom: evaluate }
socratic:
  - { trigger: "question:blackout-bound:weak", question: { en: "A full redraw and one band are both flushes. What does the flush path do between them that hands the pin back?", de: "Ein Vollbild und ein Band sind beide Flushes. Was tut der Flush-Pfad dazwischen, das den Pin zurückgibt?" }, hints: [ { en: "Look at how much of the damaged region cads_canvas_flush() converts at a time in gui/canvas.c - and note that rows_per_band is computed, not fixed.", de: "Sieh dir an, wie viel der beschädigten Region cads_canvas_flush() in gui/canvas.c auf einmal umwandelt - und beachte, dass rows_per_band gerechnet wird und nicht festverdrahtet ist." }, { en: "Ask where the bus claim and release sit - around the whole flush, or around each transfer.", de: "Frag dich, wo Claim und Release des Busses sitzen - um den ganzen Flush oder um jede einzelne Übertragung." }, { en: "Your answer needs the consequence for the MAC, not just the mechanism: what does it get to do between two bands?", de: "Deine Antwort braucht die Folge für den MAC, nicht nur den Mechanismus: was darf er zwischen zwei Bändern tun?" } ] }
  - { trigger: "question:traffic-class:weak", question: { en: "One of the two transport protocols notices loss and does something about it. Which one, and what does the other one do instead?", de: "Eines der beiden Transportprotokolle bemerkt Verlust und tut etwas dagegen. Welches, und was tut das andere stattdessen?" }, hints: [ { en: "Retransmission and window adjustment are properties of one protocol only.", de: "Neuübertragung und Fensteranpassung sind Eigenschaften nur eines Protokolls." }, { en: "Think about the recon watches from the previous step: they observe single frames that nobody repeats.", de: "Denk an die Wachen aus dem vorigen Step: sie beobachten einzelne Frames, die niemand wiederholt." }, { en: "The question asks for a demand on your own design, so end with a rule you would follow when building on this board.", de: "Gefragt ist eine Anforderung an deinen eigenen Entwurf, schließe also mit einer Regel, der du auf diesem Board folgen würdest." } ] }
  - { trigger: "question:solder-bridge:weak", question: { en: "The modification is documented and reversible. So what makes it a decision rather than an obvious improvement?", de: "Die Modifikation ist dokumentiert und reversibel. Was macht sie also zu einer Entscheidung statt zu einer offensichtlichen Verbesserung?" }, hints: [ { en: "Ask who else touches this board, and what they would find changed without being told.", de: "Frag, wer dieses Board sonst noch anfasst und was diese Person verändert vorfände, ohne es zu wissen." }, { en: "The recorded reasons are under the decision heading in docs/explanation/pa7-conflict.md and in the resolved decisions of docs/ROADMAP.md.", de: "Die festgehaltenen Gründe stehen unter der Entscheidungsüberschrift in docs/explanation/pa7-conflict.md und in den Resolved decisions von docs/ROADMAP.md." }, { en: "A position that only repeats the project's reasons is not an evaluation - say what would have to be true for the other choice to win.", de: "Eine Position, die nur die Gründe des Projekts wiederholt, ist keine Bewertung - sag, was wahr sein müsste, damit die andere Wahl gewinnt." } ] }
---
## Learning goal

Evaluate, with the project's own measurements, what the PA7 display/Ethernet time-slice costs the network, and take a defended position on the solder-bridge fix the project chose not to apply.

## You already know the constraint

That `SPI1_MOSI` and `ETH_RMII_CRS_DV` are the same pin, PA7, that one alternate function owns a pin at a time, and that the firmware arbitrates it per blit with `cads_hal_spi_claim_bus()` / `release_bus()` is in **M3-05**, and becomes a scheduler question in **M4-03**. The table of numbers — band, full screen, longest blackout at `/16` and `/8` — is in `docs/explanation/pa7-conflict.md`, in the section on the longest uninterrupted blackout; there and nowhere else. `docs/reference/measurements.md` carries the measured full-screen times and throughputs per SPI divider alongside it (448 233 µs at `/16`, 229 526 µs at `/8`), but no band row. All of it is **used** here, not repeated: look the numbers up there when you need them.

What is new is the question: what does this constraint cost the **network**, and what follows from it for everything you build on this board?

## The quantity worth reasoning about

While the display owns PA7, the MAC's receiver is off. So the interesting number is not the total redraw time but the **longest uninterrupted blackout** — and the two are not the same. Why they come apart lies in the flush path (`gui/canvas.c`) and is the first question of this step.

For scale: 22.5 ms is roughly 280 KB of wire time on a 100 Mbit link. Smaller bands were considered and rejected, because each band costs a bus claim, a MAC stop/start and a window-setting sequence — halving the band doubles that overhead to halve a blackout that not every traffic class even notices. Which class does notice is the second question.

## The fix that exists

UM1974 §6.9 documents solder bridges SB121/SB122: swapping them moves D11 to PB5, leaves PA7 to the PHY, and `-DCADS_SPI_MOSI_ON_PB5=1` compiles all arbitration away — display and Ethernet would then run at full speed at once. **Decided 2026-08-18: the board stays stock.** The reasons are under the decision heading in `docs/explanation/pa7-conflict.md` and in the resolved decisions of `docs/ROADMAP.md`. The project treats the time-slice as a constraint it designs around, not one it merely tolerates.

## Your task

Three separate judgements. First the mechanism: why the blackout is bounded to one band rather than to a redraw — open `gui/canvas.c` and look at how `rows_per_band` is arrived at. Then the consequence: which traffic class cannot take it, and what rule you derive from that for protocols of your own. Finally the decision: would you swap the solder bridges? Agreeing is not required — using the facts is, and so is naming a condition under which the other choice wins.

**Where you do this:**
- Open a file: `Ctrl`/`Cmd`+`P`.
- Open a terminal: menu *Terminal → New Terminal*.
- Open the board console: `F1`, then *CaDS Board: Konsole öffnen*.
- Build: menu *Terminal → Run Build Task…*.
