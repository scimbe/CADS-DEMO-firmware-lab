---
id: m7-06-pa7-position
title: The solder-bridge decision
bloom: evaluate
objectives: [cz.net.arbitration]
requires: [m7-05-pa7-network-cost]
estimatedMinutes: 8
scaffold: independent
links:
  - { step: m7-05-pa7-network-cost }
  - { step: m8-01-unit-tests }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/HARDWARE.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, docs/HARDWARE.md]
tasks:
  - id: solder-bridge
    title: The solder-bridge decision
    check: { type: question, prompt: { en: "Would you swap SB121/SB122 on this lab board?", de: "Würdest du SB121/SB122 auf diesem Laborboard tauschen?" }, rubric: "Any position passes that uses the facts. Names the project decision of 2026-08-18 - no modification - and at least one of the recorded reasons: physical work on a shared lab board, requirements diverging from every other project on the same hardware, surprising the next person to pick it up. And names what argues for the other side: per UM1974 the swap is reversible, moves D11 to PB5, leaves PA7 to the PHY, and with CADS_SPI_MOSI_ON_PB5 compiles all arbitration away, so display and Ethernet run at full speed at once. Repeating the project reasons without naming a condition under which the other choice wins does not pass.", bloom: evaluate }
socratic:
  - { trigger: "question:solder-bridge:weak", question: { en: "The modification is documented and reversible. So what makes it a decision rather than an obvious improvement?", de: "Die Modifikation ist dokumentiert und reversibel. Was macht sie also zu einer Entscheidung statt zu einer offensichtlichen Verbesserung?" }, hints: [ { en: "Ask who else touches this board, and what they would find changed without being told.", de: "Frag, wer dieses Board sonst noch anfasst und was diese Person verändert vorfände, ohne es zu wissen." }, { en: "The recorded reasons are under the decision heading in docs/explanation/pa7-conflict.md and in the resolved decisions of docs/ROADMAP.md.", de: "Die festgehaltenen Gründe stehen unter der Entscheidungsüberschrift in docs/explanation/pa7-conflict.md und in den Resolved decisions von docs/ROADMAP.md." }, { en: "A position that only repeats the project's reasons is not an evaluation - say what would have to be true for the other choice to win.", de: "Eine Position, die nur die Gründe des Projekts wiederholt, ist keine Bewertung - sag, was wahr sein müsste, damit die andere Wahl gewinnt." } ] }
---
## Learning goal

Take a defended position on the one hardware fix that would remove the PA7 time-slice entirely - using the cost you just measured, not a fresh guess at it.

## The cost this decision rests on

[M7-05](step:m7-05-pa7-network-cost) measured the constraint you are judging here: the longest uninterrupted receiver blackout is one band, about **22.5 ms**, bounded by the canvas staging buffer; a full-screen redraw spreads that across twenty such bands rather than one 448 ms blackout. You also named which traffic class cannot tolerate even the short blackout - UDP - and what that demands of a protocol built on this board. Both numbers argue below; neither is recomputed here.

## The fix that exists

UM1974 §6.9 documents solder bridges SB121/SB122: swapping them moves D11 to PB5, leaves PA7 to the PHY, and `-DCADS_SPI_MOSI_ON_PB5=1` compiles all arbitration away — display and Ethernet would then run at full speed at once. **Decided 2026-08-18: the board stays stock.** The reasons are under the decision heading in `docs/explanation/pa7-conflict.md` and in the resolved decisions of `docs/ROADMAP.md`. The project treats the time-slice as a constraint it designs around, not one it merely tolerates.

This step asks for **no hardware change**: you evaluate the decision, you do not solder. There is nothing to build and nothing to flash either.

## Your task

One free-text question, at the bottom of the step text with an answer field and a **Check** button beside it. If it stays red, the **Show hint** button helps; its first tier asks about what most often goes wrong.

Would you swap the solder bridges on this lab board? Agreeing with the project is not required — using the facts is, and so is naming a condition under which the other choice wins.

<!-- SHOT: m7-position-task | Step-text tab in the middle, at the bottom the free-text task with answer field, Check button and Show hint button -->

To jump to another step in between:

::: do palette="> CaDS Tutor: Zu Schritt springen"
Press **`F1`**, type `Zu Schritt springen` and confirm with `Enter`.
> expect: The palette lists this course's steps, and picking one opens that step text as a tab in the middle.
> recover: If the palette does not react at all, the browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — `F1` always works. With the mouse, the course tree on the left in the side bar does the same, behind the graduation-cap icon of the outermost bar.
:::

The interface is in English while the course text is German; the tutor's own commands, by contrast, are German, so `Zu Schritt springen` really is spelled that way.
