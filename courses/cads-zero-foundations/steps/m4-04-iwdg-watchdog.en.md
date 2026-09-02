---
id: m4-04-iwdg-watchdog
title: The independent watchdog and the reset cause
bloom: understand
objectives: [cz.rtos.watchdog]
requires: [m4-03-mutex-spi-bus]
estimatedMinutes: 12
links:
  - { step: m4-05-stack-sizing }
  - { step: m3-03-fault-forensics }
  - { file: "core/cads_hal.h", line: 280 }
  - { file: "modules/kernel/src/kernel.c", line: 309 }
  - { file: "targets/itsboard/hal/hal_watchdog.c", line: 49 }
  - { doc: "docs/SAFETY.md" }
sources: [core/cads_hal.h, modules/kernel/src/kernel.c, targets/itsboard/hal/hal_watchdog.c, docs/SAFETY.md]
tasks:
  - id: reset-cause
    title: Read this boot's reset cause
    check: { type: manual }
  - id: feed-from-tick
    title: Explain who feeds the watchdog and why
    check: { type: question, prompt: { en: "The IWDG is fed from vApplicationTickHook, once per SysTick, and never from an application task. Why that choice, what class of lockup does it therefore not catch, and how does the firmware tell an IWDG reset apart from a power-on at the next boot?", de: "Der IWDG wird aus vApplicationTickHook gefüttert, einmal je SysTick, und nie aus einer Anwendungs-Task. Warum diese Wahl, welche Art von Hänger fängt er dadurch nicht, und wie unterscheidet die Firmware beim nächsten Boot einen IWDG-Reset von einem Power-on?" }, rubric: "Feeding from the 1 kHz tick proves the interrupt subsystem is alive and recovers from a HardFault-recursion loop or an interrupts-disabled deadlock, with zero risk of a spurious reset during a legitimate long operation such as a 448 ms flush or a minutes-long explorer demo, since those never stop the tick. It does NOT catch a task that spins forever while interrupts keep flowing. cads_hal_reset_cause() decodes RCC->CSR once per boot (IWDGRSTF -> CadsResetWatchdogIndependent vs POR/BOR -> CadsResetPowerOn), clears the sticky flags with RMVF, and caches the answer; the `E` command prints it.", bloom: understand }
socratic:
  - { trigger: "question:feed-from-tick:weak", question: { en: "If a task spins in a loop with interrupts enabled, does SysTick still fire? What does that imply for a watchdog fed from the tick?", de: "Wenn eine Task mit aktivierten Interrupts endlos schleift, feuert SysTick dann noch? Was folgt daraus für einen aus dem Tick gefütterten Watchdog?" }, hints: [ { en: "core/cads_hal.h, the comment above cads_hal_watchdog_init(): the tick feed proves the interrupt subsystem is alive, nothing more.", de: "core/cads_hal.h, Kommentar über cads_hal_watchdog_init(): das Tick-Füttern beweist, dass das Interrupt-System lebt, mehr nicht." }, { en: "A cooperative task spinning forever is explicitly the 'different, harder problem this feature does not claim to solve'.", de: "Eine kooperative Task, die ewig schleift, ist ausdrücklich das 'andere, schwerere Problem, das dieses Feature nicht zu lösen beansprucht'." }, { en: "hal_watchdog.c: RCC_CSR_IWDGRSTF selects CadsResetWatchdogIndependent; RCC->CSR |= RMVF clears the flags for the next boot.", de: "hal_watchdog.c: RCC_CSR_IWDGRSTF wählt CadsResetWatchdogIndependent; RCC->CSR |= RMVF löscht die Flags für den nächsten Boot." } ] }
---
## Learning goal

Understand how the independent watchdog turns "the board sits locked up with the red LED on" into "the board recovers on its own, and the cause is still readable afterwards".

## Two halves of one feature

`core/cads_hal.h` documents the design in the comment above `cads_hal_watchdog_init()`:

1. **`cads_hal_watchdog_init()` / `cads_hal_watchdog_feed()`.** `modules/kernel/src/kernel.c` arms the IWDG at scheduler start with `CADS_WATCHDOG_TIMEOUT_MS` (2000 ms) and feeds it from `vApplicationTickHook()` — once per SysTick at 1 kHz — **never from an application task**.
2. **`cads_hal_reset_cause()`.** Decodes `RCC->CSR` before anything clears it, so a reset the watchdog caused is distinguishable from a power-on or a debugger reset.

## Why the tick, not a task

Feeding from the tick is a deliberate scope choice. It proves that the interrupt subsystem is alive and reliably recovers from a true lockup — a HardFault recursion loop, or interrupts globally disabled — with **zero** risk of a spurious reset during any legitimate long-running operation. A 448 ms full-screen flush or a minutes-long explorer demo never stops the tick from running, so they can never trip it.

The honest limit: it does **not** catch a cooperative task spinning forever on something that will never happen while interrupts keep flowing. That is a different, harder problem, and the HAL comment says so rather than implying otherwise.

## What the hardware does

`targets/itsboard/hal/hal_watchdog.c` writes only IWDG, DBGMCU and `RCC->CSR` — no GPIO, so none of the pin rules in `docs/SAFETY.md` apply. Three things matter:

- **One-way door.** Once started with key `0xCCCC`, the IWDG cannot be stopped by software, not by a peripheral reset either — only a full power-on. The prescaler is `/64` with reload 1000 on the ~32 kHz LSI RC oscillator, roughly 2 s: about 4× the worst normal blocking span.
- **Frozen on debug halt.** `DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP`, so attaching GDB to a live panic never races a surprise reset out from under you. This keeps `docs/SAFETY.md`'s "halts usefully with a debugger attached" true. (It also explains a real bug you will read about in M7: a *reset* during flashing re-arms this watchdog before the core is halted again.)
- **Sticky flags.** `RCC->CSR`'s reset-cause bits survive until cleared. `cads_hal_reset_cause()` reads them exactly once per boot — `RCC_CSR_IWDGRSTF` maps to `CadsResetWatchdogIndependent`, POR/BOR to `CadsResetPowerOn`, NRST to `CadsResetPin` — clears them with `RMVF`, and returns the cached answer on every later call.

## Where you see it

The explorer's `E` command prints `# this boot's reset cause: ...` followed by the forensic ring from M3-03. Together they answer "did this boot follow a crash?" before you assume it was clean. A ring that does not grow across a good run is proof that old records are inert, not that a fault is recurring.

## Your task

Run `E` on the console and read this boot's reset cause. Then answer the question on why the tick feeds the watchdog and how a watchdog reset is recognised.
