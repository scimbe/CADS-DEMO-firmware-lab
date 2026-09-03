---
id: m1-03-sim-vs-board
title: Simulator versus board
bloom: understand
objectives: [cz.arch.sim-vs-board]
requires: [m1-02-hal-boundary]
estimatedMinutes: 12
links:
  - { step: m1-04-splash }
  - { doc: "docs/how-to/port-to-new-board.md" }
  - { doc: "docs/reference/module-layout.md" }
sources: [docs/how-to/port-to-new-board.md, docs/reference/module-layout.md, targets/sim/hal_sim.c, CMakePresets.json]
tasks:
  - id: host-tests
    title: The host build and its tests pass
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: both-targets
    title: Why both targets is a hard rule
    check: { type: question, prompt: { en: "CaDS Zero says a feature that builds for only one of board and simulator is not finished. Name two concrete things the simulator gives the project that the board alone cannot, and one thing the simulator honestly refuses to pretend.", de: "CaDS Zero sagt, ein Feature, das nur für Board oder nur für Simulator baut, ist nicht fertig. Nenne zwei konkrete Dinge, die der Simulator dem Projekt gibt und die das Board allein nicht kann, und eine Sache, die der Simulator ehrlich nicht vortäuscht." }, rubric: "Gives two of: developing/testing portable code before or without hardware, letting several people work when there is one board, running the unit and golden-image suite with no board attached, deterministic screenshots of a write-only display. Names that the sim's net stub reports no link ever (no RMII hardware to simulate) or that the kernel module is board-only.", bloom: understand }
socratic:
  - { trigger: "task:host-tests:failed", question: { en: "The host build needs no Arm toolchain but does need one library the simulator draws with. Which one, and does the first error mention it?", de: "Der Host-Build braucht keine Arm-Toolchain, aber eine Bibliothek, mit der der Simulator zeichnet. Welche, und nennt die erste Fehlermeldung sie?" }, hints: [ { en: "The host preset builds targets/sim against SDL2; the container ships libsdl2-dev.", de: "Das Host-Preset baut targets/sim gegen SDL2; der Container liefert libsdl2-dev mit." }, { en: "ctest runs the unit and golden tests; read the first failing test's name, not the summary.", de: "ctest führt Unit- und Golden-Tests aus; lies den Namen des ersten fehlschlagenden Tests, nicht die Zusammenfassung." }, { en: "A golden-image pixel diff of +1 in R/G/B on anti-aliased edges is SDL rounding, not a rendering regression - see the ROADMAP log of 2026-09-01.", de: "Ein Golden-Image-Pixelunterschied von +1 in R/G/B an Kanten ist SDL-Rundung, keine Render-Regression - siehe ROADMAP-Log vom 2026-09-01." } ] }
---
## Learning goal

Understand what the simulator is, what it is not, and why "builds for both targets" is a completion criterion rather than a nicety.

## The same firmware, no board

`targets/sim/` implements `core/cads_hal.h` against SDL2. The `host` preset builds it with your native compiler, alongside the entire unit and golden-image suite; no Arm toolchain is involved. Because every module above the HAL is portable by construction (`docs/reference/module-layout.md`), the desktop, the menu, the apps, the canvas and the storage code that run in that SDL window are the **same object files** the board links — not a re-implementation.

That is what the layering in the previous steps buys:

- Portable code can be developed and tested **before the hardware exists**, or while someone else has the one board on their bench.
- The **whole test suite runs with no board attached**: `ctest` in `build/host` executes the Unity unit tests for the toolbox, storage, config, net helpers and GUI widgets, and the golden-image renders of real screens.
- A write-only display can still be **screenshotted deterministically**, which is the only way golden images exist for this panel at all.

## Where the simulator is honest

The simulator refuses to pretend where the hardware cannot be faked. The board descriptor it returns sets `display_readable = true` — an SDL surface is readable — while the ITSboard sets it `false`, and code is expected to cope with both. `modules/net` has two implementations for one header: `cads_net_board.c` owns a real lwIP netif over the RMII MAC, `cads_net_sim.c` reports **no link, ever**, because there is no RMII hardware to simulate and pretending otherwise would let an app hide a real network dependency until it hit silicon. `modules/kernel` (FreeRTOS) is board-only; the host has no scheduler.

## Why it is a hard rule

The maintainer's own onboarding file states it plainly: a feature that only works on one target is not done. Two consequences follow. First, hardware dependence has to stay confined to `targets/`; a stray `#include "stm32f4xx.h"` in a feature module breaks the host build immediately, which is the point — the compiler catches the layering violation before a reviewer has to. Second, "it compiled" is never sufficient on either side: the host proves logic, the board's hardware gate proves it runs on silicon, and a change needs both.

`docs/how-to/port-to-new-board.md` shows the corollary: porting to different hardware means writing one new directory under `targets/` and changing nothing else. If a port requires editing `gui/`, `services/` or `apps/`, that is a bug in the abstraction.

## Your task

Run the host build and tests (task **CaDS: Host tests**) and let them pass, then answer what the simulator gives and what it refuses to fake. The next step makes your first real code change and checks it on both sides.
