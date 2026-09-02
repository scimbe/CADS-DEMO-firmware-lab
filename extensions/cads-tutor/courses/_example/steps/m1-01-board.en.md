---
id: m1-01-board
title: Flash, console and a breakpoint
bloom: apply
objectives: [firmware-how-to-flash, firmware-how-to-debug]
requires: [m0-02-build]
estimatedMinutes: 20
links:
  - { doc: "docs/how-to/flash.md" }
  - { doc: "docs/how-to/debug.md" }
  - { file: "apps/bringup/explorer_app_demo.c", line: 120 }
tasks:
  - id: connected
    title: Board connected
    check: { type: board, state: connected }
  - id: flashed
    title: Firmware flashed in this step
    check: { type: flash, since: stepStart }
  - id: tap
    title: Self-test passes on the console
    check: { type: serialExpect, send: "t\n", pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: bp
    title: Stop at a breakpoint in explorer_app_demo.c
    check: { type: debugStop, file: "apps/bringup/explorer_app_demo.c", line: 120, timeoutMs: 120000 }
  - id: either
    title: Any evidence the board runs (flash or console)
    check:
      type: any
      checks:
        - { type: flash, since: sessionStart }
        - { type: serialExpect, pattern: "CaDS", timeoutMs: 5000 }
socratic:
  - trigger: "event:hardfault"
    question: { en: "A HardFault – which register holds the faulting address?", de: "Ein HardFault – welches Register enthält die fehlerhafte Adresse?" }
    hints:
      - { en: "Look at SCB->HFSR and SCB->CFSR in the peripheral view (SVD).", de: "Schau dir SCB->HFSR und SCB->CFSR in der Peripherie-Ansicht (SVD) an." }
---
# Flash, console and a breakpoint

These checks need the Board-Bridge (`cads.cads-board-bridge`). Without it they report *unavailable* instead of failing.

1. Connect the board (**CaDS Board: Connect**).
2. Flash (**CaDS Board: Flash**).
3. Open the console and send `t` – the self-test must print `RESULT: PASS`.
4. Set a breakpoint at [explorer_app_demo.c:120](file:apps/bringup/explorer_app_demo.c#L120) and start debugging (F5).
