---
id: m4-01-freertos-tasks
title: FreeRTOS ohne Heap
bloom: apply
objectives: [cz.rtos.tasks]
requires: [m3-05-spi-mutex]
estimatedMinutes: 15
links:
  - { step: m4-02-ram-budget }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 53 }
  - { file: "apps/bringup/tasks.c", line: 72 }
  - { doc: "docs/ROADMAP.md" }
sources: [modules/kernel/src/FreeRTOSConfig.h, apps/bringup/tasks.c, modules/kernel/src/kernel.c, docs/reference/memory-map.md]
tasks:
  - id: stack-report
    title: Lies die Stack-Höchststände je Task
    check: { type: manual }
  - id: why-static
    title: Erkläre Allokations- und Platzierungsentscheidung
    check: { type: question, prompt: { en: "CaDS Zero builds FreeRTOS with static allocation only and places every task stack in CCM. Why no kernel heap at all, why CCM rather than SRAM for the stacks, and what does that choice cost?", de: "CaDS Zero baut FreeRTOS ausschließlich mit statischer Allokation und legt jeden Task-Stack ins CCM. Warum gar kein Kernel-Heap, warum CCM statt SRAM für die Stacks, und was kostet diese Entscheidung?" }, rubric: "Nennt configSUPPORT_DYNAMIC_ALLOCATION=0, sodass jede Task/Queue/Mutex vom Aufrufer allokiert wird und die RAM-Kosten zur Linkzeit sichtbar sind; CCM ist für DMA unerreichbar, also wertlos für Puffer, aber ideal für CPU-only-Stacks, sodass alle 192 KB DMA-fähiges SRAM für Framebuffer/lwIP bleiben; Kosten: Stackgrößen sind feste Compile-Zeit-Konstanten in tasks.c und müssen aus Evidenz dimensioniert werden.", bloom: analyze }
socratic:
  - { trigger: "question:why-static:weak", question: { en: "Which memory region can a DMA controller on this part never read, and what does that make it good for?", de: "Welchen Speicherbereich kann ein DMA-Controller dieses Chips nie lesen, und wofür ist er dadurch gut?" }, hints: [ { en: "docs/reference/memory-map.md: CCM at 0x10000000 is invisible to every DMA controller.", de: "docs/reference/memory-map.md: CCM bei 0x10000000 ist für jeden DMA-Controller unsichtbar." }, { en: "A task stack is touched only by the CPU, so it can live where DMA buffers cannot.", de: "Einen Task-Stack berührt nur die CPU, er darf also dort liegen, wo DMA-Puffer nicht liegen dürfen." }, { en: "tasks.c: CADS_CCM_SECTION on cads_ui_stack/cads_input_stack/cads_console_stack; FreeRTOSConfig.h line 54 disables dynamic allocation.", de: "tasks.c: CADS_CCM_SECTION an cads_ui_stack/cads_input_stack/cads_console_stack; FreeRTOSConfig.h Zeile 54 schaltet dynamische Allokation ab." } ] }
---
## Lernziel

Verstehe, wie CaDS Zero FreeRTOS ohne Kernel-Heap und mit Task-Stacks im CCM betreibt, und lies den Live-Stack-Bericht vom Board.

## Nur statische Allokation

`modules/kernel/src/FreeRTOSConfig.h` setzt `configSUPPORT_STATIC_ALLOCATION 1` und `configSUPPORT_DYNAMIC_ALLOCATION 0`. Es gibt kein `pvPortMalloc` und nirgends einen Kernel-Heap: jede Task, Queue, Mutex und jeder Timer wird **vom Aufrufer allokiert**. Die Kernel-Wrapper in `modules/kernel` (`cads_thread`, `cads_mutex`, `cads_queue`, `cads_timer`, `cads_event`) folgen derselben Konvention — der Aufrufer besitzt den Speicher. Selbst Idle- und Timer-Service-Task bekommen ihren Speicher aus `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

Warum so streng? Weil auf diesem Board der SRAM-Heap *die* Sicherheitsreserve ist (`docs/reference/memory-map.md`). Ein Kernel, der zur Laufzeit allokiert, verbraucht Speicher, den der Linker nicht sieht; ein Kernel, der nichts allokiert, macht die gesamten RAM-Kosten zur Linkzeit sichtbar, wo die 48-KB-Zusicherung sie abfängt.

## Wo die Stacks liegen

`apps/bringup/tasks.c` definiert die drei Anwendungs-Tasks und ihre Stacks, in Worten:

```c
#define CADS_UI_STACK      512
#define CADS_INPUT_STACK   1024
#define CADS_CONSOLE_STACK 1024

CADS_CCM_SECTION __attribute__((aligned(8))) static uint32_t cads_ui_stack[CADS_UI_STACK];
CADS_CCM_SECTION ... cads_input_stack[CADS_INPUT_STACK];
CADS_CCM_SECTION ... cads_console_stack[CADS_CONSOLE_STACK];
```

`CADS_CCM_SECTION` (aus `core/cads_hal.h`) legt sie in die `.ccm`-Ausgabesektion des Linkers bei `0x10000000`. CCM ist für jeden DMA-Controller des STM32F429 unsichtbar — nutzlos für einen Framebuffer, aber perfekt für einen Stack: nur die CPU berührt ihn je. Auch der 4 KB große Main-Stack (MSP) sitzt oben im CCM (`__cads_main_stack_size = 4K` im Linkerskript). Ergebnis: alle 192 KB DMA-fähiges SRAM bleiben frei für Framebuffer, Staging-Puffer und lwIP, und CCM — 64 KB, davon belegen die Stacks wenige KB — kostet nichts Knappes.

## Zwei Hooks, die wachen

`configUSE_IDLE_HOOK 1` und `configCHECK_FOR_STACK_OVERFLOW 2` sind beide aktiv. `vApplicationIdleHook()` in `tasks.c` prüft die Stack-Guard-Wächter (die Canary-Technik aus M3); `vApplicationStackOverflowHook()` in `kernel.c` löst eine Panic aus, statt weiterzulaufen, denn eine Task, die ihren Stack verlassen hat, hat bereits überschrieben, was danach kam.

## Die Live-Zahlen lesen

Der Explorer-Befehl `k` (`cads_tasks_report()` in `tasks.c`) druckt je Task den Stack-Höchststand, die Task-Anzahl und die Eingabezähler. Am M2-Hardware-Gate konvergierten die Marken bei ui 224 B, input 132 B, console 372 B — winzig gegenüber den Budgets, weshalb die zwei späteren Überläufe (M4-05) überraschten und die Zahlen bei jedem Lauf gelesen werden sollten.

## Deine Aufgabe

Kehre bei Bedarf zum Konsolen-Prompt zurück, führe `k` aus und notiere den Höchststand jeder Task. Beantworte dann die Frage, warum der Kernel nichts allokiert und warum die Stacks im CCM liegen.
