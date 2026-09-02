---
id: m4-03-mutex-spi-bus
title: One bus, two owners - the SPI claim as a mutex
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m4-02-ram-budget]
estimatedMinutes: 15
links:
  - { step: m4-04-iwdg-watchdog }
  - { step: m3-05-spi-mutex }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/reference/hal.md" }
  - { file: "targets/itsboard/hal/hal_spi.c", line: 38 }
sources: [docs/explanation/pa7-conflict.md, targets/itsboard/hal/hal_spi.c, targets/itsboard/hal/hal_spi.h, docs/reference/measurements.md]
tasks:
  - id: per-blit
    title: Argue per-blit arbitration and banding
    check: { type: question, prompt: { en: "The display and the Ethernet PHY share PA7. The lab's reference project arbitrates per byte; CaDS Zero arbitrates per blit and flushes in 16-row bands. Why per blit instead of per byte, and why does the banding matter for the network rather than for the display?", de: "Display und Ethernet-PHY teilen sich PA7. Das Referenzprojekt des Labors arbitriert pro Byte; CaDS Zero arbitriert pro Blit und flusht in 16-Zeilen-Bändern. Warum pro Blit statt pro Byte, und warum ist das Banding für das Netzwerk wichtig, nicht für das Display?" }, rubric: "Per byte tears the MAC down 307200 times per frame and makes DMA impossible; per blit is one stop/drain/steal/DMA/restore per rectangle, three orders of magnitude fewer restarts and DMA becomes usable. While the display owns PA7 the receiver is off and frames are lost, so the metric is the longest blackout, not total redraw time; 16-row bands with claim/release per blit cap it at 22.5 ms at /16 (11.5 ms at /8) instead of the whole 448 ms frame.", bloom: analyze }
socratic:
  - { trigger: "question:per-blit:weak", question: { en: "While a blit owns PA7, what is the Ethernet receiver doing, and what happens to a frame that arrives then?", de: "Während ein Blit PA7 besitzt, was tut der Ethernet-Empfänger, und was passiert mit einem Frame, der dann ankommt?" }, hints: [ { en: "claim: stop MAC -> drain in-flight frames -> steal PA7; release: wait idle -> return PA7 -> restart MAC.", de: "claim: MAC stoppen -> laufende Frames abschließen -> PA7 übernehmen; release: auf idle warten -> PA7 zurückgeben -> MAC neu starten." }, { en: "The number that matters is the longest uninterrupted blackout; see the table in pa7-conflict.md.", de: "Die entscheidende Zahl ist der längste ununterbrochene Blackout; siehe Tabelle in pa7-conflict.md." }, { en: "One 480x16 band is 22.5 ms at /16; a full screen is 20 such bands with the MAC back up in between.", de: "Ein 480x16-Band dauert 22,5 ms bei /16; ein Vollbild sind 20 solche Bänder, dazwischen ist der MAC wieder an." } ] }
---
## Learning goal

Analyse the SPI bus claim as the concrete mutual-exclusion primitive of this firmware: what it serialises, how it arbitrates PA7 with the Ethernet MAC, and why the per-blit, banded design bounds the network cost.

## Two peripherals, one pin

`SPI1_MOSI` (the display's data line, Arduino D11) and `ETH_RMII_CRS_DV` are the same physical pin, PA7, and `CRS_DV` has no alternate location on the STM32F429 (`docs/explanation/pa7-conflict.md`). Only one alternate function can own a pin, so display and MAC cannot both be connected. The solder-bridge fix (SB121/SB122) was decided against; the firmware time-slices instead.

## The claim/release pair

`cads_hal_spi_claim_bus()` and `cads_hal_spi_release_bus()` in `targets/itsboard/hal/hal_spi.c` bracket every display blit and every touch read:

```
claim:    stop MAC -> drain in-flight frames -> steal PA7 (AF5 SPI1)
          set window, RAMWR, DMA the whole rectangle
release:  wait for SPI idle -> return PA7 (AF11 ETH) -> restart MAC
```

The lab's reference `Stack` project does the same dance **per byte**: a full frame is 307 200 bytes, so 307 200 MAC stop/start cycles, and DMA is structurally impossible because you cannot flip an alternate function mid-burst. CaDS Zero does it **per blit**: one stop and one start per rectangle, three orders of magnitude fewer restarts, and DMA becomes usable — which is where the measured 342 kpixel/s comes from.

Claims nest, so a driver needing several transfers under one lock (the touch controller) takes the bus once.

## Why it is also a real mutex

Arbitrating the pin is not the same as excluding tasks. The `THE MISSING LOCK` comment at the top of `hal_spi.c` records the bug you analysed in M3-05: the ui task (display flush) and the input/console tasks (touch reads) ran this code concurrently with nothing stopping them interleaving; a touch read hung in `while(!(SR & RXNE))` with CR1 showing the display divider, because the other task had reconfigured SPI1 mid-transfer. The fix put a genuine FreeRTOS **recursive mutex** (`cads_spi_mutex`, taken with `xSemaphoreTakeRecursive`) inside claim/release, so nested claims from the same task never deadlock against themselves, while boot stays lock-free because before the scheduler runs it is single-threaded by construction.

## Why bands matter to the network, not the display

While the display owns PA7 the MAC's receiver is off and arriving frames are simply lost. So the number that matters is not total redraw time but the **longest uninterrupted blackout**. `cads_canvas_flush()` converts and pushes the damaged region in bands of at most 16 rows, and `cads_hal_display_blit()` claims and releases per call, so the MAC comes back between bands:

| | at /16 | at /8 |
|---|---|---|
| One 480×16 band | 22.5 ms | 11.5 ms |
| Full screen (20 bands) | 448 ms | 229 ms |
| Longest single blackout | **22.5 ms** | **11.5 ms** |

TCP absorbs a 22.5 ms gap as loss and retransmits; UDP loses whatever arrived. Dirty rectangles therefore stop being a display optimisation and become a network feature: a 40×40 update is one 4.7 ms blackout.

## Your task

Answer the analysis question: why per-blit arbitration beats per-byte, and why the 16-row banding is a network decision.
