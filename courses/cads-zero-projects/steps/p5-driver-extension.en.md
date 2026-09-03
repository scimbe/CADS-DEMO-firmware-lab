---
id: p5-driver-extension
title: "Project: a driver extension"
bloom: create
objectives: [cz.explorer.extend]
requires: []
estimatedMinutes: 120
creates: [cads_project_driver]
links:
  - { file: "apps/bringup/explorer.c" }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [apps/bringup/explorer.c, targets/itsboard/hal/hal_pwm.h, docs/SAFETY.md]
tasks:
  - id: driver-builds
    title: The diagnostic exists, is reachable, and builds
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_driver" }, { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_project_driver" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the safety of your diagnostic
    check: { type: question, prompt: { en: "Which pins does your diagnostic drive or read, and how do you know every one of them is safe to touch? Name at least one pin your tool deliberately never drives, and why.", de: "Welche Pins treibt oder liest deine Diagnose, und woher weißt du, dass jeder einzelne sicher zu berühren ist? Nenne mindestens einen Pin, den dein Werkzeug bewusst nie treibt, und warum." }, rubric: "Names the specific pins used with a direction for each; cites SAFETY.md rules (PF0-7/PG0-5 never outputs; PA13/PA14 SWD and PH0/PH1 HSE untouched; RMII pins left to the Ethernet driver); and gives at least one pin left alone with the reason.", bloom: create }
socratic:
  - { trigger: "task:driver-builds:failed", question: { en: "The build cannot see cads_project_driver, or nothing calls it. Did you add a dispatch case and keep the handler board-portable?", de: "Der Build sieht cads_project_driver nicht, oder nichts ruft es auf. Hast du einen Dispatch-Case ergänzt und den Handler board-portabel gehalten?" }, hints: [ { en: "Add a case to the switch on line[0] in apps/bringup/explorer.c calling cads_project_driver, and give it a help line in cads_help().", de: "Ergänze im switch über line[0] in apps/bringup/explorer.c einen Case, der cads_project_driver aufruft, und gib ihm eine Hilfezeile in cads_help()." }, { en: "For a PWM-style tool, cads_hal_pwm_start/stop already drives PE5 (OUT13, TIM9_CH1) safely — reuse the HAL rather than poking a timer directly.", de: "Für ein PWM-Werkzeug treibt cads_hal_pwm_start/stop bereits PE5 (OUT13, TIM9_CH1) sicher — nutze die HAL, statt direkt einen Timer anzufassen." }, { en: "Board-only hardware code needs a sim counterpart or a guard so the host build still links, matching the explorer_*_demo.c / _sim.c split.", de: "Board-only-Hardwarecode braucht ein Sim-Gegenstück oder einen Guard, damit der Host-Build weiter linkt, passend zur explorer_*_demo.c / _sim.c-Trennung." } ] }
---
## Goal

Extend the board's driver surface with a new hardware diagnostic — a genuinely useful measurement or generator — reached from the explorer console and provably safe.

## What you build on

This project assumes the Foundations steps on adding an explorer command (m2-05-explorer-command) and driving GPIO (m2-02-mmio-gpio), and the binding rules in `docs/SAFETY.md`. The existing diagnostics in `apps/bringup/explorer.c` (the `F` frequency counter, the `D` PWM generator on PE5, the `L` logic analyzer) are your models.

## Requirements

- Build a handler named exactly **`cads_project_driver`** that exercises real hardware: a timing measurement, a signal generator, a bus probe, or similar. Reach it by adding a case to the explorer dispatch (`switch(line[0])`) and a help line in `cads_help()`.
- Prefer the HAL. If you want PWM, `cads_hal_pwm_start()/stop()` already drives PE5 (adapter OUT13, TIM9_CH1) — the only genuinely PWM-capable OUT pin — and returns it cleanly. Reuse a HAL surface rather than writing raw timer registers.
- **Safety is the hard requirement.** Never configure PF0-7 or PG0-5 as outputs; never touch PA13/PA14 (SWD) or PH0/PH1 (HSE); leave the RMII pins to the Ethernet driver. If your tool needs a jumper (like the continuity test `K`), say so, and treat "nothing wired" as a well-formed negative result, not a failure.
- Keep the host build linking: split board-only code the way the existing `explorer_*_demo.c` / `_sim.c` pairs do.

## Acceptance

The first check confirms `cads_project_driver` is in the ELF, that `apps/bringup/explorer.c` references it, and that the board image builds. The second is a safety defence: you name every pin your tool drives or reads, justify each against `docs/SAFETY.md`, and name one you deliberately leave alone.

## Deliver

One hardware diagnostic that measures or generates something real, with a written safety argument for every pin it touches.
