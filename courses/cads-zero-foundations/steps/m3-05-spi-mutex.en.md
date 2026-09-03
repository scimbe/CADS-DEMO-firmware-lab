---
id: m3-05-spi-mutex
title: The shared SPI bus - a case study
bloom: analyze
objectives: [cz.rtos.mutex]
requires: [m3-04-stack-guard]
estimatedMinutes: 20
links:
  - { step: m4-01-freertos-tasks }
  - { step: m3-02-registers-svd }
  - { doc: "docs/explanation/pa7-conflict.md" }
  - { doc: "docs/ROADMAP.md" }
  - { file: "targets/itsboard/hal/hal_spi.h", line: 42 }
  - { doc: "docs/SAFETY.md" }
sources: [docs/explanation/pa7-conflict.md, docs/ROADMAP.md, targets/itsboard/hal/hal_spi.h, targets/itsboard/hal/hal_spi.c, docs/SAFETY.md, core/cads_hal.h]
tasks:
  - id: claim-release
    title: Explain the bus arbitration and its failure modes
    check: { type: question, prompt: { en: "Why must every display or touch access sit between cads_hal_spi_claim_bus() and cads_hal_spi_release_bus() on a stock board? What does claim_bus actually do, why is it per blit rather than per byte, and what goes wrong if code caches 'the SPI is configured for the display' across a yield? Finally: why did adding a FreeRTOS mutex inside claim_bus crash the boot, and how was it gated?", de: "Warum muss auf einem unveränderten Board jeder Display- oder Touch-Zugriff zwischen cads_hal_spi_claim_bus() und cads_hal_spi_release_bus() liegen? Was tut claim_bus tatsächlich, warum pro Blit statt pro Byte, und was geht schief, wenn Code 'die SPI ist für das Display konfiguriert' über einen Yield hinweg zwischenspeichert? Und: warum ließ ein FreeRTOS-Mutex in claim_bus den Boot abstürzen, und wie wurde er abgesichert?" }, rubric: "PA7 is both SPI1_MOSI (display data) and ETH_RMII_CRS_DV, and CRS_DV has no alternative pin, so only one alternate function can own it at a time. claim_bus stops the MAC, drains in-flight frames and steals PA7; release returns the pin and restarts the MAC; the claims nest. Per blit (one DMA rectangle) instead of per byte cuts MAC restarts by three orders of magnitude and makes DMA possible. An access outside the bracket corrupts what the PHY is receiving; caching the pin state across a yield is wrong because another task or the Ethernet driver can take the pin back, so ownership must be re-established per access. The mutex crash: claim_bus took a recursive FreeRTOS mutex unconditionally, but the boot flushes the panel before the scheduler starts; xSemaphoreTakeRecursive dereferenced the NULL pxCurrentTCB -> UsageFault INVSTATE, PC=0x0, empty forensic ring. Fix: take/give only when xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED, and portENABLE_INTERRUPTS() after creating the mutex because the pre-scheduler critical section left BASEPRI at 0x50 and masked the DMA completion IRQ.", bloom: analyze }
socratic:
  - { trigger: "question:claim-release:weak", question: { en: "Which physical pin do the display and the Ethernet PHY both need, and how many alternative locations does the PHY's signal have on this part?", de: "Welchen physischen Pin brauchen Display und Ethernet-PHY beide, und wie viele alternative Positionen hat das PHY-Signal auf diesem Chip?" }, hints: [ { en: "docs/explanation/pa7-conflict.md: SPI1_MOSI and ETH_RMII_CRS_DV are both PA7, and CRS_DV has exactly one possible location.", de: "docs/explanation/pa7-conflict.md: SPI1_MOSI und ETH_RMII_CRS_DV sind beide PA7, und CRS_DV hat genau eine mögliche Position." }, { en: "Read the doc comment above cads_hal_spi_claim_bus() in targets/itsboard/hal/hal_spi.h: stop MAC, steal PA7, nested claims, restart on the outermost release.", de: "Lies den Doc-Kommentar über cads_hal_spi_claim_bus() in targets/itsboard/hal/hal_spi.h: MAC anhalten, PA7 übernehmen, verschachtelte Claims, Neustart beim äußersten Release." }, { en: "The boot crash is the 2026-08-26 ROADMAP entry: PC=0x0, INVSTATE, pxCurrentTCB NULL before vTaskStartScheduler; the fix gates on xTaskGetSchedulerState().", de: "Der Boot-Absturz ist der ROADMAP-Eintrag vom 2026-08-26: PC=0x0, INVSTATE, pxCurrentTCB NULL vor vTaskStartScheduler; die Korrektur prüft xTaskGetSchedulerState()." } ] }
---
## Learning goal

Analyse how one contested pin forced a bus-arbitration design, and why adding a mutex to that design crashed the boot - a case study in shared resources under a scheduler.

## One pin, two owners

`SPI1_MOSI` - the display's data line, arriving on Arduino D11 - and `ETH_RMII_CRS_DV` - carrier sense / data valid, which the MAC needs on every received frame - are **the same physical pin, PA7**. `CRS_DV` has exactly one possible location on the STM32F429; there is no alternate mapping. A pin has one alternate function at a time, so whichever driver initialises last wins the mux, and the other goes silent (`docs/explanation/pa7-conflict.md`). The clean fix is a solder-bridge swap (SB121/SB122) moving MOSI to PB5; the project decided to leave the board stock, so the firmware designs around the conflict permanently.

## Arbitration per blit

`cads_hal_spi_claim_bus()` / `cads_hal_spi_release_bus()` (`targets/itsboard/hal/hal_spi.h`) do the arbitration at the level of a whole blit:

```
claim:    stop MAC -> drain in-flight frames -> steal PA7
          set window, RAMWR, DMA the whole rectangle
release:  wait for SPI idle -> return PA7 -> restart MAC
```

The lab's older reference driver did the same dance **per byte** - 307 200 MAC stop/start cycles per full screen, and no DMA possible because an alternate function cannot be flipped mid-burst. Per blit is three orders of magnitude fewer restarts, and DMA becomes usable. The claims nest, so the touch controller takes the bus once around several transfers. When the Ethernet data path is not up at all, the arbitration is skipped (`cads_hal_spi_set_eth_datapath_active()`).

The rules that follow are binding (`docs/SAFETY.md` §6): **never touch the display or the touch controller outside a claim/release pair** - it corrupts whatever the PHY is receiving, and the symptom (occasional dropped frames under load) is miserable to track down; never reconfigure an RMII pin outside the Ethernet driver; and **assume the pin can be taken from you** - code that caches "the SPI is configured for the display" across a yield is wrong, because another task or the driver may have moved the mux.

## Adding a mutex, and crashing the boot

Once several tasks (ui, input, console) shared the bus, a FreeRTOS **recursive mutex** was added inside `claim_bus` (commit `9506a46`). The board then arrived crash-looping before it had printed a single line: a live register read showed `PC = 0x0`, a UsageFault `INVSTATE`, and an empty forensic ring (`docs/ROADMAP.md`, 2026-08-26). The cause: the boot path flushes the panel (self test, splash) **before** the scheduler starts, and `xSemaphoreTakeRecursive` dereferences `pxCurrentTCB`, which is NULL until then - FreeRTOS forbids blocking calls before `vTaskStartScheduler()`. The fix in `hal_spi.c` gates the take/give on `xTaskGetSchedulerState() != taskSCHEDULER_NOT_STARTED`: boot is single-threaded by construction, so the lock is both unnecessary and unsafe there.

A **second** hang surfaced immediately: the banner printed, then the first `cads_canvas_flush()` spun forever. Live: the DMA was running, but `BASEPRI` read `0x50` - creating the mutex before the scheduler had entered a critical section whose exit decremented the port's poison nesting value instead of restoring `BASEPRI`, masking the DMA completion interrupt. Fix: `portENABLE_INTERRUPTS()` right after creating the mutex.

Both were found by **reading registers on the halted board**, not by reasoning about the code - the habit from the previous steps.

## Your task

Read the doc comment above `cads_hal_spi_claim_bus()` and the 2026-08-26 ROADMAP entry, then answer the question: what claim/release does, why per blit, why caching ownership is wrong, and how the mutex crash was gated. M4 picks up the scheduler side of the same story.
