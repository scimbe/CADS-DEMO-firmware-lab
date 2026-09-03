---
id: m3-05-spi-mutex
title: The shared SPI bus - a case study
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m3-04-stack-guard]
estimatedMinutes: 22
scaffold: independent
links:
  - { step: m4-01-freertos-tasks }
  - { step: m3-02-registers-svd }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/ROADMAP.md" }
  - { file: "targets/itsboard/hal/hal_spi.h", line: 42 }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 89 }
  - { doc: "docs/SAFETY.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, targets/itsboard/hal/hal_spi.h, targets/itsboard/hal/hal_spi.c, targets/itsboard/hal/hal_console.c, modules/kernel/src/FreeRTOSConfig.h, docs/SAFETY.md, core/cads_hal.h]
tasks:
  - id: per-byte-count
    title: Derive the 307,200 MAC cycles
    check: { type: question, prompt: { en: "The older driver arbitrates per byte. Where do its 307,200 MAC cycles per full frame come from?", de: "Der ältere Treiber arbitriert pro Byte. Woraus ergeben sich seine 307 200 MAC-Zyklen je Vollbild?" }, rubric: "From the panel size times the bus's colour depth: 480 × 320 = 153,600 pixels, and the panel is written in RGB565, so two bytes per pixel - 307,200 bytes per full frame. Arbitrating per byte means exactly one MAC stop-and-start cycle per byte, hence 307,200 cycles. Answering 153,600 forgets the two bytes per pixel; answering 76,800 used the framebuffer's 4 bpp instead of the bus format.", bloom: analyze }
  - id: basepri-dma
    title: Explain why 0x50 hit the DMA of all things
    check: { type: question, prompt: { en: "BASEPRI read 0x50. Why did that mask the DMA completion interrupt in particular?", de: "BASEPRI stand auf 0x50. Warum maskierte das ausgerechnet den DMA-Abschluss-Interrupt?" }, rubric: "The answer carries out the arithmetic: 6 is stored as 0x60, and 0x60 is numerically greater than 0x50, so DMA2_Stream3 falls under the block - and with it the completion signal the flush was waiting for. Comparing 6 against 0x50 directly leaves out the shift and reaches the opposite conclusion. Merely restating that the DMA was masked, without carrying out the numeric comparison, does not answer the question asked.", bloom: analyze }
  - id: find-gate
    title: Find the guard in the source
    check: { type: command, cwd: ".", command: "grep -n 'xTaskGetSchedulerState' targets/itsboard/hal/hal_spi.c", expectExitCode: 0 }
socratic:
  - { trigger: "question:per-byte-count:weak", question: { en: "How many pixels does this panel have, and how many bytes does one pixel take on the wire?", de: "Wie viele Bildpunkte hat dieses Panel, und wie viele Byte belegt ein Bildpunkt auf der Leitung?" }, hints: [ { en: "Is 307,200 a round multiple of the pixel count, and if so, by what factor?", de: "Ist 307 200 ein glattes Vielfaches der Bildpunktzahl, und wenn ja, mit welchem Faktor?" }, { en: "The panel resolution is in docs/HARDWARE.md; the format the display bus is fed with is named in this step under Arbitration per blit.", de: "Die Panelauflösung steht in docs/HARDWARE.md; das Format, in dem der Displaybus gefüttert wird, nennt dieser Step im Abschnitt Arbitration per blit." }, { en: "The framebuffer's own depth and the depth on the bus are not the same number - the conversion happens on the way out.", de: "Die Tiefe des Framebuffers und die Tiefe auf dem Bus sind nicht dieselbe Zahl - die Umwandlung passiert erst auf dem Weg hinaus." } ] }
  - { trigger: "question:basepri-dma:weak", question: { en: "Is a numerically larger priority value more urgent or less urgent on this core, and which way does BASEPRI compare?", de: "Ist ein numerisch größerer Prioritätswert auf diesem Kern dringender oder weniger dringend, und in welche Richtung vergleicht BASEPRI?" }, hints: [ { en: "Did you compare 6 against 0x50, or the value the NVIC actually stores for priority 6?", de: "Hast du 6 mit 0x50 verglichen oder den Wert, den die NVIC für Priorität 6 tatsächlich ablegt?" }, { en: "The section What BASEPRI masks gives the shift rule and names the two interrupt priorities this firmware sets; hal_spi.c sets one of them.", de: "Der Abschnitt What BASEPRI masks nennt die Verschiebungsregel und die beiden Interrupt-Prioritäten, die diese Firmware setzt; hal_spi.c setzt eine davon." }, { en: "With four priority bits the stored byte is the priority number times sixteen - do that one multiplication before comparing.", de: "Bei vier Prioritätsbits ist das abgelegte Byte die Prioritätsnummer mal sechzehn - mach diese eine Multiplikation vor dem Vergleich." } ] }
  - { trigger: "task:find-gate:failed", question: { en: "Is the search running from the firmware's top-level directory, and is the path spelled exactly as in the repository?", de: "Läuft die Suche aus dem obersten Verzeichnis der Firmware, und ist der Pfad genau so geschrieben wie im Repository?" }, hints: [ { en: "A grep that finds nothing exits non-zero - is that because the pattern is wrong or because the file is not where you looked?", de: "Ein grep ohne Treffer endet mit einem Fehlercode - liegt das am Muster oder daran, dass die Datei nicht dort liegt, wo du gesucht hast?" }, { en: "Open targets/itsboard/hal/hal_spi.c and read the comment block above cads_spi_lock_active().", de: "Öffne targets/itsboard/hal/hal_spi.c und lies den Kommentarblock über cads_spi_lock_active()." }, { en: "The gate is a single comparison against one FreeRTOS enumerator that describes the state before the scheduler exists.", de: "Die Absicherung ist ein einziger Vergleich gegen einen FreeRTOS-Aufzählungswert, der den Zustand vor der Existenz des Schedulers beschreibt." } ] }
---
## Learning goal

Analyse how one contested pin forced a bus-arbitration design, and why adding a mutex to that design crashed the boot - a case study in shared resources under a scheduler.

## One pin, two owners

`SPI1_MOSI` - the display's data line, arriving on Arduino D11 - and `ETH_RMII_CRS_DV` - carrier sense / data valid, which the MAC needs on every received frame - are **the same physical pin, PA7**. `CRS_DV` has exactly one possible location on the STM32F429; there is no alternate mapping. A pin has one alternate function at a time, so whichever driver initialises last wins the mux, and the other goes silent (`docs/explanation/pa7-conflict.md`). The clean fix is a solder-bridge swap (SB121/SB122) moving MOSI to PB5; the project decided to leave the board stock, so the firmware designs around the conflict permanently.

This is the one place in the course where those facts are laid out in full. M4 and M7 recall them rather than repeating them.

## Arbitration per blit

`cads_hal_spi_claim_bus()` / `cads_hal_spi_release_bus()` (`targets/itsboard/hal/hal_spi.h`) do the arbitration at the level of a whole blit:

```
claim:    stop MAC -> drain in-flight frames -> steal PA7
          set window, RAMWR, DMA the whole rectangle
release:  wait for SPI idle -> return PA7 -> restart MAC
```

The lab's older reference driver did the same dance **per byte**, for every byte that crosses the bus: the panel is written in **RGB565**, so two bytes per pixel, at 480 × 320 pixels. How many MAC stop/start cycles that adds up to per full frame is yours to work out in a moment. Per blit it is three orders of magnitude fewer restarts, and DMA becomes usable at all, because an alternate function cannot be flipped mid-burst. The claims nest, so the touch controller takes the bus once around several transfers. When the Ethernet data path is not up at all, the arbitration is skipped (`cads_hal_spi_set_eth_datapath_active()`).

The rules that follow are binding (`docs/SAFETY.md` §6): **never touch the display or the touch controller outside a claim/release pair** - it corrupts whatever the PHY is receiving, and the symptom (occasional dropped frames under load) is miserable to track down; never reconfigure an RMII pin outside the Ethernet driver; and **assume the pin can be taken from you** - code that caches "the SPI is configured for the display" across a yield is wrong, because another task or the driver may have moved the mux.

## Adding a mutex, and crashing the boot

Once several tasks (ui, input, console) shared the bus, a FreeRTOS **recursive mutex** was added inside `claim_bus` (commit `9506a46`). The board then arrived crash-looping before it had printed a single line: a live register read showed `PC = 0x0`, a UsageFault `INVSTATE`, and an empty forensic ring (`docs/ROADMAP.md`, 2026-08-26). The cause: the boot path flushes the panel (self test, splash) **before** the scheduler starts, and `xSemaphoreTakeRecursive` dereferences `pxCurrentTCB`, which is NULL until then - FreeRTOS forbids blocking calls before `vTaskStartScheduler()`. The fix in `hal_spi.c` gates the take/give on `xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED`: boot is single-threaded by construction, so the lock is both unnecessary and unsafe there.

A **second** hang surfaced immediately: the banner printed, then the first `cads_canvas_flush()` spun forever. Live: the DMA was running, but `BASEPRI` read `0x50`. Creating the mutex before the scheduler had entered a critical section whose exit decremented the port's poison nesting value instead of restoring `BASEPRI` - so the value simply stayed there. Fix: `portENABLE_INTERRUPTS()` right after creating the mutex.

Both were found by **reading registers on the halted board**, not by reasoning about the code - the habit from the previous steps.

## What `BASEPRI` masks

`BASEPRI` is a Cortex-M4 core register with exactly one job: **it blocks exceptions below an urgency threshold without switching all interrupts off.** Three rules are enough to read any value in it:

1. **Smaller means more urgent.** Priorities on Cortex-M are inverted: priority 0 is the most urgent. With the value *n* in `BASEPRI`, the core blocks every exception whose priority value is **greater than or equal to** *n*. `BASEPRI = 0` is the special case "nothing blocked".
2. **The NVIC uses the upper nibble.** The STM32F429 implements four priority bits (`configPRIO_BITS 4` in `modules/kernel/src/FreeRTOSConfig.h`). They sit at the **top** end of the priority byte, so a priority number is stored shifted `8 - 4 = 4` places left. Priority 5 becomes `0x50`, priority 6 becomes `0x60`.
3. **0x50 is a named constant, not a coincidence.** `configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY` is 5, and `configMAX_SYSCALL_INTERRUPT_PRIORITY` is that value after the shift from rule 2. It is what FreeRTOS writes into `BASEPRI` when it enters a critical section: everything the kernel must be able to serve stays out, and the time-critical interrupts above the threshold keep running.

The comment at the top of `FreeRTOSConfig.h` draws the consequence for drivers: any ISR that calls a `FromISR` API must carry a numerically **greater** priority number than 5. This firmware has exactly two real ISR handlers and both comply: the display DMA is set in `targets/itsboard/hal/hal_spi.c` with `NVIC_SetPriority(DMA2_Stream3_IRQn, 6u)`, the console UART in `targets/itsboard/hal/hal_console.c` at 8.

That gives you every number the second task needs. The work is one multiplication and one comparison.

## Your task

Read the doc comment above `cads_hal_spi_claim_bus()` and the 2026-08-26 ROADMAP entry. Then derive where the old driver's 307,200 MAC cycles come from, and explain why `BASEPRI = 0x50` shut down the display DMA of all things. The third check has you locate the guard in `hal_spi.c` yourself. M4 picks up the scheduler side of the same story.
