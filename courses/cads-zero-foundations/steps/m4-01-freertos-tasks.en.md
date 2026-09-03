---
id: m4-01-freertos-tasks
title: FreeRTOS without a heap
bloom: apply
objectives: [cz.rtos.tasks]
requires: [m3-05-spi-mutex]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m3-04-stack-guard]
links:
  - { step: m4-02-ram-budget }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "modules/kernel/src/FreeRTOSConfig.h", line: 53 }
  - { file: "apps/bringup/tasks.c", line: 72 }
  - { file: "modules/kernel/src/kernel.c", line: 119 }
  - { doc: "docs/ROADMAP.md" }
sources: [modules/kernel/src/FreeRTOSConfig.h, apps/bringup/tasks.c, modules/kernel/src/kernel.c, docs/reference/memory-map.md]
tasks:
  - id: stack-report
    title: Have the board print its stack report
    check: { type: serialExpect, send: "k\n", pattern: "ui_free=", timeoutMs: 15000 }
  - id: console-used
    title: Compute how much of the console stack is in use
    check: { type: question, prompt: { en: "Your k run printed console_free. How many bytes of the console stack have actually been used?", de: "Dein k-Lauf hat console_free gedruckt. Wie viele Byte des Konsolen-Stacks sind damit tatsächlich benutzt?" }, rubric: "The answer names the student's own measured number and the arithmetic behind it, not an example from the text. CADS_CONSOLE_STACK is 1024 words, a word is four bytes, so the stack is 4096 bytes; used is 4096 minus the printed console_free. Reporting console_free itself as consumption misses what the name says: cads_thread_stack_free() returns uxTaskGetStackHighWaterMark, the smallest free remainder ever measured, times four bytes. An answer with no concrete number from the student's own board does not count.", bloom: apply }
socratic:
  - { trigger: "task:stack-report:failed", question: { en: "Did the board answer with anything at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command with no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal, then let the check run again.", de: "Sende scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The board is also silent while a debug session has it halted - resume or end that session first.", de: "Das Board schweigt auch, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende diese Sitzung zuerst." } ] }
  - { trigger: "question:console-used:weak", question: { en: "Does the word free in console_free describe what has been consumed, or what is left over?", de: "Beschreibt das Wort free in console_free, was verbraucht wurde, oder was übrig ist?" }, hints: [ { en: "Did you subtract from the stack's total size, or report the printed number unchanged?", de: "Hast du von der Gesamtgröße des Stacks abgezogen oder die gedruckte Zahl unverändert weitergegeben?" }, { en: "Read cads_thread_stack_free() in modules/kernel/src/kernel.c: it names the FreeRTOS call behind it and the factor it multiplies by.", de: "Lies cads_thread_stack_free() in modules/kernel/src/kernel.c: die Funktion nennt den FreeRTOS-Aufruf dahinter und den Faktor, mit dem sie multipliziert." }, { en: "CADS_CONSOLE_STACK is given in words in tasks.c, while the console prints bytes - one of the two numbers has to be converted before you subtract.", de: "CADS_CONSOLE_STACK steht in tasks.c in Wörtern, die Konsole druckt Byte - eine der beiden Zahlen muss vor dem Abziehen umgerechnet werden." } ] }
---
## Learning goal

Understand how CaDS Zero runs FreeRTOS with no kernel heap and task stacks in CCM, and read the live stack report from the board.

## Static allocation only

`modules/kernel/src/FreeRTOSConfig.h` sets `configSUPPORT_STATIC_ALLOCATION 1` and `configSUPPORT_DYNAMIC_ALLOCATION 0`. There is no `pvPortMalloc` and no kernel heap anywhere: every task, queue, mutex and timer is **caller-allocated**. The kernel wrappers in `modules/kernel` (`cads_thread`, `cads_mutex`, `cads_queue`, `cads_timer`, `cads_event`) follow the same convention — the caller owns the storage. Even the idle and timer service tasks get their memory from `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

Why so strict? Because on this board the SRAM heap *is* the safety margin (`docs/reference/memory-map.md`). A kernel that allocates at run time would spend memory the linker cannot see; a kernel that allocates nothing makes the whole RAM cost visible at link time, where the 48 KB assertion catches it.

## Where the stacks live

`apps/bringup/tasks.c` defines the three application tasks and their stacks, in words:

```c
#define CADS_UI_STACK      512
#define CADS_INPUT_STACK   1024
#define CADS_CONSOLE_STACK 1024

CADS_CCM_SECTION __attribute__((aligned(8))) static uint32_t cads_ui_stack[CADS_UI_STACK];
CADS_CCM_SECTION ... cads_input_stack[CADS_INPUT_STACK];
CADS_CCM_SECTION ... cads_console_stack[CADS_CONSOLE_STACK];
```

Two units meet here, and confusing them is the most common arithmetic slip in this module: FreeRTOS counts stacks in **words**, the `uint32_t` type makes that four bytes per word, and the console report you are about to read prints **bytes**.

`CADS_CCM_SECTION` (from `core/cads_hal.h`) puts them in the linker's `.ccm` output section at `0x10000000`. CCM is invisible to every DMA controller on the STM32F429, which makes it useless for a framebuffer but perfect for a stack: only the CPU ever touches it. The 4 KB main stack (MSP) sits at the top of CCM too (`__cads_main_stack_size = 4K` in the linker script). Result: all 192 KB of DMA-capable SRAM stays free for the framebuffer, staging buffers and lwIP, and CCM — 64 KB, of which the stacks use a few KB — costs nothing scarce.

## Three tasks, three priorities

The header comment of `apps/bringup/tasks.c` explains the selection: each of the three tasks stands for one way in which one can starve the others. `ui` owns the display, and a flush blocks for up to 448 ms; `input` samples buttons and touch at 100 Hz; `console` is the diagnostic channel. Which priority each one gets, and what follows from that, is the subject of M4-03 — here all that matters is that there are three of them and that they share hardware.

## Two hooks that keep watch

`configUSE_IDLE_HOOK 1` and `configCHECK_FOR_STACK_OVERFLOW 2` are both on. `vApplicationIdleHook()` in `tasks.c` polls stack-guard sentinels (the canary technique you met in M3-04); `vApplicationStackOverflowHook()` in `kernel.c` panics instead of continuing, because a task that has run off its stack has already overwritten whatever came next.

## Reading the live numbers

The explorer's `k` command (`cads_tasks_report()` in `tasks.c`) prints one line of this shape:

```
# tasks  ui_free=... input_free=... console_free=... tasks=... events=... last_key=...
```

Note the name: `*_free` is **remaining headroom**, not consumption. Behind it sits `cads_thread_stack_free()` in `modules/kernel/src/kernel.c`, which returns `uxTaskGetStackHighWaterMark()` — the *smallest* free remainder that task ever had — multiplied by the word width. So the value is a low-water mark over the whole run rather than a snapshot, and that is exactly what makes it useful for sizing.

At the M2 hardware gate those marks converged at ui 224 B, input 132 B and console 372 B — tiny against the budgets, which is exactly why the two overflows from M3-04 were surprising and why the numbers are worth reading every time. **Your** numbers will be different; they depend on what the board has done since boot.

## Your task

Bring the board to the console prompt (with `scripts/board_key.py quit` if needed) and let the check run `k`. Note the three numbers. Then compute how many bytes of the console stack are actually in use — with your own number, not the one in the text.
