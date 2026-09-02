---
id: m1-01-board
title: Flashen, Konsole und ein Breakpoint
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
    title: Board verbunden
    check: { type: board, state: connected }
  - id: flashed
    title: Firmware in diesem Step geflasht
    check: { type: flash, since: stepStart }
  - id: tap
    title: Selbsttest auf der Konsole besteht
    check: { type: serialExpect, send: "t\n", pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: bp
    title: Halt an einem Breakpoint in explorer_app_demo.c
    check: { type: debugStop, file: "apps/bringup/explorer_app_demo.c", line: 120, timeoutMs: 120000 }
  - id: either
    title: Irgendein Beleg, dass das Board läuft (Flash oder Konsole)
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
# Flashen, Konsole und ein Breakpoint

Diese Checks brauchen die Board-Bridge (`cads.cads-board-bridge`). Ohne sie melden sie *nicht verfügbar* statt zu scheitern.

1. Board verbinden (**CaDS Board: Connect**).
2. Flashen (**CaDS Board: Flash**).
3. Konsole öffnen und `t` senden – der Selbsttest muss `RESULT: PASS` ausgeben.
4. Breakpoint bei [explorer_app_demo.c:120](file:apps/bringup/explorer_app_demo.c#L120) setzen und Debuggen starten (F5).
