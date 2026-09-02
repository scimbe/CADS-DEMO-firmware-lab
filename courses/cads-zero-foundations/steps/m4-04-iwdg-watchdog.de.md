---
id: m4-04-iwdg-watchdog
title: Der unabhängige Watchdog und die Reset-Ursache
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
    title: Lies die Reset-Ursache dieses Boots
    check: { type: manual }
  - id: feed-from-tick
    title: Erkläre, wer den Watchdog füttert und warum
    check: { type: question, prompt: { en: "The IWDG is fed from vApplicationTickHook, once per SysTick, and never from an application task. Why that choice, what class of lockup does it therefore not catch, and how does the firmware tell an IWDG reset apart from a power-on at the next boot?", de: "Der IWDG wird aus vApplicationTickHook gefüttert, einmal je SysTick, und nie aus einer Anwendungs-Task. Warum diese Wahl, welche Art von Hänger fängt er dadurch nicht, und wie unterscheidet die Firmware beim nächsten Boot einen IWDG-Reset von einem Power-on?" }, rubric: "Füttern aus dem 1-kHz-Tick beweist, dass das Interrupt-System lebt, und erholt sich von einer HardFault-Rekursion oder einem Deadlock mit gesperrten Interrupts, ohne Risiko eines Fehl-Resets bei legitimen langen Operationen wie einem 448-ms-Flush oder minutenlangen Explorer-Demos, da diese den Tick nie anhalten. Es fängt NICHT eine Task, die bei laufenden Interrupts ewig schleift. cads_hal_reset_cause() dekodiert RCC->CSR einmal je Boot (IWDGRSTF -> CadsResetWatchdogIndependent vs POR/BOR -> CadsResetPowerOn), löscht die haftenden Flags per RMVF und cacht die Antwort; der Befehl `E` druckt sie.", bloom: understand }
socratic:
  - { trigger: "question:feed-from-tick:weak", question: { en: "If a task spins in a loop with interrupts enabled, does SysTick still fire? What does that imply for a watchdog fed from the tick?", de: "Wenn eine Task mit aktivierten Interrupts endlos schleift, feuert SysTick dann noch? Was folgt daraus für einen aus dem Tick gefütterten Watchdog?" }, hints: [ { en: "core/cads_hal.h, the comment above cads_hal_watchdog_init(): the tick feed proves the interrupt subsystem is alive, nothing more.", de: "core/cads_hal.h, Kommentar über cads_hal_watchdog_init(): das Tick-Füttern beweist, dass das Interrupt-System lebt, mehr nicht." }, { en: "A cooperative task spinning forever is explicitly the 'different, harder problem this feature does not claim to solve'.", de: "Eine kooperative Task, die ewig schleift, ist ausdrücklich das 'andere, schwerere Problem, das dieses Feature nicht zu lösen beansprucht'." }, { en: "hal_watchdog.c: RCC_CSR_IWDGRSTF selects CadsResetWatchdogIndependent; RCC->CSR |= RMVF clears the flags for the next boot.", de: "hal_watchdog.c: RCC_CSR_IWDGRSTF wählt CadsResetWatchdogIndependent; RCC->CSR |= RMVF löscht die Flags für den nächsten Boot." } ] }
---
## Lernziel

Verstehe, wie der unabhängige Watchdog aus „das Board hängt mit roter LED" ein „das Board erholt sich selbst, und die Ursache ist danach noch lesbar" macht.

## Zwei Hälften eines Features

`core/cads_hal.h` dokumentiert das Design im Kommentar über `cads_hal_watchdog_init()`:

1. **`cads_hal_watchdog_init()` / `cads_hal_watchdog_feed()`.** `modules/kernel/src/kernel.c` schärft den IWDG beim Scheduler-Start mit `CADS_WATCHDOG_TIMEOUT_MS` (2000 ms) und füttert ihn aus `vApplicationTickHook()` — einmal je SysTick bei 1 kHz — **nie aus einer Anwendungs-Task**.
2. **`cads_hal_reset_cause()`.** Dekodiert `RCC->CSR`, bevor etwas es löscht, sodass ein vom Watchdog verursachter Reset von einem Power-on oder einem Debugger-Reset unterscheidbar ist.

## Warum der Tick, nicht eine Task

Das Füttern aus dem Tick ist eine bewusste Scope-Entscheidung. Es beweist, dass das Interrupt-System lebt, und erholt sich zuverlässig von einem echten Lockup — einer HardFault-Rekursion oder global gesperrten Interrupts — mit **null** Risiko eines Fehl-Resets während einer legitimen langen Operation. Ein 448-ms-Vollbild-Flush oder eine minutenlange Explorer-Demo halten den Tick nie an, können ihn also nie auslösen.

Die ehrliche Grenze: er fängt **nicht** eine kooperative Task, die ewig auf etwas wartet, das nie eintritt, während Interrupts weiterlaufen. Das ist ein anderes, schwereres Problem, und der HAL-Kommentar sagt das, statt anderes anzudeuten.

## Was die Hardware tut

`targets/itsboard/hal/hal_watchdog.c` schreibt nur IWDG, DBGMCU und `RCC->CSR` — kein GPIO, also greift keine Pin-Regel aus `docs/SAFETY.md`. Drei Dinge zählen:

- **Einbahnstraße.** Einmal mit Schlüssel `0xCCCC` gestartet, lässt sich der IWDG per Software nicht stoppen, auch nicht per Peripherie-Reset — nur durch ein volles Power-on. Der Prescaler ist `/64` mit Reload 1000 am ~32-kHz-LSI-RC-Oszillator, etwa 2 s: rund das Vierfache der längsten normalen Blockierspanne.
- **Eingefroren beim Debug-Halt.** `DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP`, sodass GDB an einer lebenden Panic nie gegen einen überraschenden Reset antritt. Damit bleibt „hält mit Debugger nützlich an" aus `docs/SAFETY.md` wahr. (Es erklärt auch einen echten Fehler aus M7: ein *Reset* beim Flashen schärft diesen Watchdog neu, bevor der Kern wieder angehalten ist.)
- **Haftende Flags.** Die Reset-Ursachen-Bits in `RCC->CSR` bleiben bis zum Löschen. `cads_hal_reset_cause()` liest sie genau einmal je Boot — `RCC_CSR_IWDGRSTF` wird zu `CadsResetWatchdogIndependent`, POR/BOR zu `CadsResetPowerOn`, NRST zu `CadsResetPin` — löscht sie per `RMVF` und liefert bei jedem späteren Aufruf die gecachte Antwort.

## Wo du es siehst

Der Explorer-Befehl `E` druckt `# this boot's reset cause: ...`, gefolgt vom Forensik-Ring aus M3-03. Zusammen beantworten sie „folgte dieser Boot auf einen Absturz?", bevor du ihn für sauber hältst. Ein Ring, der über einen guten Lauf nicht wächst, beweist, dass alte Einträge inert sind — nicht, dass ein Fehler wiederkehrt.

## Deine Aufgabe

Führe `E` auf der Konsole aus und lies die Reset-Ursache dieses Boots. Beantworte dann die Frage, warum der Tick den Watchdog füttert und wie ein Watchdog-Reset erkannt wird.
