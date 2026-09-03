---
id: m4-04-iwdg-watchdog
title: The independent watchdog and the reset cause
bloom: understand
objectives: [cz.rtos.watchdog]
requires: [m4-03-mutex-spi-bus]
estimatedMinutes: 14
scaffold: independent
recallFrom: [m3-03-fault-forensics]
links:
  - { step: m4-05-stack-sizing }
  - { step: m3-03-fault-forensics }
  - { file: "core/cads_hal.h", line: 280 }
  - { file: "modules/kernel/src/kernel.c", line: 309 }
  - { file: "targets/itsboard/hal/hal_watchdog.c", line: 49 }
  - { doc: "docs/SAFETY.md" }
sources: [core/cads_hal.h, modules/kernel/src/kernel.c, targets/itsboard/hal/hal_watchdog.c, apps/bringup/explorer.c, docs/SAFETY.md]
tasks:
  - id: reset-cause
    title: Read this boot's reset cause
    check: { type: serialExpect, send: "E\n", pattern: "reset cause", timeoutMs: 15000 }
  - id: iwdg-period
    title: Compute the watchdog period
    check: { type: question, prompt: { en: "Prescaler /64, reload 1000, LSI at about 32 kHz. How long is the watchdog period?", de: "Prescaler /64, Reload 1000, LSI mit etwa 32 kHz. Wie lang ist die Watchdog-Periode?" }, rubric: "The prescaler divides the LSI frequency: 32,000 / 64 = 500 Hz, so one counter tick is about 2 ms. The counter runs down from 1000, making the period roughly 2 seconds (more precisely 64 / 32,000 s = 2.048 ms per tick, so about 2.048 s). The second half of the answer is the comparison: that is about four times the firmware's longest normal blocking span, the 448 ms full-screen flush - which is why no legitimate operation can trip the watchdog. Multiplying 1000 ticks by the raw LSI period instead of the divided one lands at 31 ms and skipped the prescaler.", bloom: understand }
misconceptions:
  - { pattern: "reset cause: IWDG watchdog", question: { en: "The board says the watchdog reset it. Does that make this boot clean or suspect?", de: "Das Board meldet einen Watchdog-Reset. Ist dieser Boot damit sauber oder verdächtig?" }, hints: [ { en: "Something stopped the tick from reaching the watchdog for two whole seconds - is that ever normal here?", de: "Etwas hat den Tick zwei ganze Sekunden lang nicht bis zum Watchdog kommen lassen - ist das hier je normal?" }, { en: "Read on past the reset-cause line: the same E output lists the forensic ring underneath it.", de: "Lies über die Reset-Ursachen-Zeile hinaus: dieselbe E-Ausgabe listet darunter den Forensik-Ring." }, { en: "A record written shortly before the reset survives in CCM, so the reason string that preceded the reset is usually still readable.", de: "Ein kurz vor dem Reset geschriebener Datensatz überlebt im CCM, die Grundzeichenkette vor dem Reset ist also meist noch lesbar." } ] }
socratic:
  - { trigger: "task:reset-cause:failed", question: { en: "Did E produce any output at all, or is the board still inside the app tree that ignores plain typed bytes?", de: "Hat E überhaupt eine Ausgabe erzeugt, oder steckt das Board noch im App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal, then let the check run again.", de: "Sende scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The reset-cause line is the first thing E prints, before the ring - if you see ring records but no cause line, the output was truncated at the top.", de: "Die Reset-Ursachen-Zeile ist das Erste, was E druckt, noch vor dem Ring - siehst du Ring-Datensätze, aber keine Ursachenzeile, wurde die Ausgabe oben abgeschnitten." } ] }
  - { trigger: "question:iwdg-period:weak", question: { en: "What does a prescaler of /64 do to the 32 kHz before the counter ever sees it?", de: "Was macht ein Prescaler von /64 mit den 32 kHz, bevor der Zähler sie überhaupt sieht?" }, hints: [ { en: "Are you dividing the clock first and then counting, or counting at the raw clock rate?", de: "Teilst du den Takt zuerst und zählst dann, oder zählst du mit dem rohen Takt?" }, { en: "Read the comment block above the two defines in targets/itsboard/hal/hal_watchdog.c; it walks the same two steps.", de: "Lies den Kommentarblock über den beiden Defines in targets/itsboard/hal/hal_watchdog.c; er geht dieselben zwei Schritte durch." }, { en: "One counting step lasts as long as one cycle of the already-divided clock; the reload number only says how many steps it takes to reach zero.", de: "Ein Zählschritt dauert so lange wie eine Schwingung des bereits geteilten Takts; die Reload-Zahl sagt nur, wie viele Schritte bis null nötig sind." } ] }
---
## Learning goal

Understand how the independent watchdog turns "the board sits locked up with the red LED on" into "the board recovers on its own, and the cause is still readable afterwards".

## Two halves of one feature

`core/cads_hal.h` documents the design in the comment above `cads_hal_watchdog_init()`:

1. **`cads_hal_watchdog_init()` / `cads_hal_watchdog_feed()`.** `modules/kernel/src/kernel.c` arms the IWDG at scheduler start and feeds it from `vApplicationTickHook()` — once per SysTick at 1 kHz — **never from an application task**.
2. **`cads_hal_reset_cause()`.** Decodes `RCC->CSR` before anything clears it, so a reset the watchdog caused is distinguishable from a power-on or a debugger reset.

One subtlety stands out on reading: `cads_hal_watchdog_init()` does take a timeout parameter (`CADS_WATCHDOG_TIMEOUT_MS` from `kernel.c`), but discards it with `(void)timeout_ms` and uses fixed prescaler and reload values. The actual period is therefore not in the caller but in the hardware configuration further down — and you are about to work it out yourself.

## Why the tick, not a task

Feeding from the tick is a deliberate scope choice. It proves that the interrupt subsystem is alive and reliably recovers from a true lockup — a HardFault recursion loop, or interrupts globally disabled — with **zero** risk of a spurious reset during any legitimate long-running operation. A 448 ms full-screen flush or a minutes-long explorer demo never stops the tick from running, so they can never trip it.

The honest limit: it does **not** catch a cooperative task spinning forever on something that will never happen while interrupts keep flowing. That is a different, harder problem, and the HAL comment says so rather than implying otherwise.

## What the hardware does

`targets/itsboard/hal/hal_watchdog.c` writes only IWDG, DBGMCU and `RCC->CSR` — no GPIO, so none of the pin rules in `docs/SAFETY.md` apply. Three things matter:

- **One-way door.** Once started with key `0xCCCC`, the IWDG cannot be stopped by software, not by a peripheral reset either — only a full power-on. It is clocked from the **LSI**, the chip's own RC oscillator at a nominal **32 kHz**, entirely independent of the PLL and HSE. It is configured with prescaler **`/64`** (`CADS_IWDG_PRESCALER_BITS`) and reload **1000** (`CADS_IWDG_RELOAD_VALUE`). How long a period that makes is your second task; compare the result with the 448 ms flush afterwards.
- **Frozen on debug halt.** `DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP`, so attaching GDB to a live panic never races a surprise reset out from under you. This keeps `docs/SAFETY.md`'s "halts usefully with a debugger attached" true. (It also explains a real bug you will read about in M7: a *reset* during flashing re-arms this watchdog before the core is halted again.)
- **Sticky flags.** `RCC->CSR`'s reset-cause bits survive until cleared. `cads_hal_reset_cause()` reads them exactly once per boot — `RCC_CSR_IWDGRSTF` maps to `CadsResetWatchdogIndependent`, POR/BOR to `CadsResetPowerOn`, NRST to `CadsResetPin` — clears them with `RMVF`, and returns the cached answer on every later call.

Incidentally, the LSI is an RC oscillator with no tight tolerance spec. Unlike HSE, the firmware never reads back what frequency it actually achieves; the computed period is therefore a nominal figure, not a guaranteed one. For a watchdog set about four times above the longest normal operation that is fine — and it is precisely why the margin is chosen so generously.

## Where you see it

The explorer's `E` command prints `# this boot's reset cause: ...` followed by the forensic ring from M3-03. Together they answer "did this boot follow a crash?" before you assume it was clean. A ring that does not grow across a good run is proof that old records are inert, not that a fault is recurring.

## Your task

Bring the board to the console prompt and let the check run `E`; read this boot's reset cause. Then compute the watchdog period from the three hardware values above, and compare it with the firmware's longest normal blocking span.
