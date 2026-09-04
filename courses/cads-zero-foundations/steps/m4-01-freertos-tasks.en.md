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
  - { trigger: "task:stack-report:failed", question: { en: "Did the board answer with anything at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command with no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal at the bottom (menu icon with three lines at the top left, then Terminal, then New Terminal), run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne unten ein Terminal (Symbol mit den drei Strichen oben links, dann Terminal, dann New Terminal), führe dort python3 scripts/board_key.py quit aus, dann lass den Check erneut laufen." }, { en: "The board is also silent while a debug session has it halted - resume or end that session first.", de: "Das Board schweigt auch, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende diese Sitzung zuerst." } ] }
  - { trigger: "question:console-used:weak", question: { en: "Does the word free in console_free describe what has been consumed, or what is left over?", de: "Beschreibt das Wort free in console_free, was verbraucht wurde, oder was übrig ist?" }, hints: [ { en: "Did you subtract from the stack's total size, or report the printed number unchanged?", de: "Hast du von der Gesamtgröße des Stacks abgezogen oder die gedruckte Zahl unverändert weitergegeben?" }, { en: "Read cads_thread_stack_free() in modules/kernel/src/kernel.c: it names the FreeRTOS call behind it and the factor it multiplies by.", de: "Lies cads_thread_stack_free() in modules/kernel/src/kernel.c: die Funktion nennt den FreeRTOS-Aufruf dahinter und den Faktor, mit dem sie multipliziert." }, { en: "CADS_CONSOLE_STACK is given in words in tasks.c, while the console prints bytes - one of the two numbers has to be converted before you subtract.", de: "CADS_CONSOLE_STACK steht in tasks.c in Wörtern, die Konsole druckt Byte - eine der beiden Zahlen muss vor dem Abziehen umgerechnet werden." } ] }
---

## Learning goal

Understand how CaDS Zero runs FreeRTOS with no kernel heap and task stacks in CCM, and read the live stack report from the board.

## Static allocation only

`modules/kernel/src/FreeRTOSConfig.h` sets `configSUPPORT_STATIC_ALLOCATION 1` and `configSUPPORT_DYNAMIC_ALLOCATION 0`. There is no `pvPortMalloc` and no kernel heap anywhere: every task, queue, mutex and timer is **caller-allocated**. Even the idle and timer service tasks get their memory from `vApplicationGetIdleTaskMemory()` / `vApplicationGetTimerTaskMemory()` in `modules/kernel/src/kernel.c`.

**Read it yourself:** press `Ctrl`/`Cmd`+`P`, type `FreeRTOSConfig.h`, Enter. The file opens as a tab **in the middle** of the window. Without the keyboard: the topmost icon of the narrow bar on the far left (the file explorer), then click through the tree. It takes a moment, and you know it worked when the tab at the top reads `FreeRTOSConfig.h`.

Why so strict? Because on this board the SRAM heap *is* the safety margin (`docs/reference/memory-map.md`). A kernel that allocates nothing makes the whole RAM cost visible at link time, where the 48 KB assertion catches it.

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

`CADS_CCM_SECTION` (from `core/cads_hal.h`) puts them in the `.ccm` section at `0x10000000`. CCM is invisible to every DMA controller on the STM32F429 — useless for a framebuffer, perfect for a stack. The 4 KB main stack (MSP) sits there too. All 192 KB of DMA-capable SRAM therefore stays free for the framebuffer, staging buffers and lwIP.

## Three tasks, three priorities

The header comment of `apps/bringup/tasks.c` explains the selection: `ui` owns the display, and a flush blocks for up to 448 ms; `input` samples buttons and touch at 100 Hz; `console` is the diagnostic channel. Which priority each one gets is the subject of M4-03.

## Two hooks that keep watch

`configUSE_IDLE_HOOK 1` and `configCHECK_FOR_STACK_OVERFLOW 2` are both on. `vApplicationIdleHook()` in `tasks.c` polls the stack-guard sentinels; `vApplicationStackOverflowHook()` in `kernel.c` panics instead of continuing.

## Reading the live numbers

The explorer's `k` command (`cads_tasks_report()` in `tasks.c`) prints one line of this shape:

```
# tasks  ui_free=... input_free=... console_free=... tasks=... events=... last_key=...
```

Note the name: `*_free` is **remaining headroom**, not consumption. Behind it sits `cads_thread_stack_free()` in `modules/kernel/src/kernel.c`, which returns `uxTaskGetStackHighWaterMark()` — the *smallest* free remainder that task ever had — multiplied by the word width. The value is a low-water mark over the whole run, and that is exactly what makes it useful for sizing.

At the M2 hardware gate those marks converged at ui 224 B, input 132 B and console 372 B. **Your** numbers will be different; they depend on what the board has done since boot.

## Your task

**Step 1 — open the board console so you can read along.** Press **`F1`**, type `CaDS Board: Konsole öffnen`, Enter. **At the bottom** of the terminal area a terminal named `CaDS Board Console` appears, the board's serial console at 115200 baud. That area sits at the bottom and carries the tabs `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`; `Ctrl`/`Cmd`+`J` folds it open and shut. It takes a second, and you know it worked from the terminal's blue header line.

<!-- SHOT: m4-board-console-terminal | Der Terminal-Bereich unten mit dem geoeffneten Terminal CaDS Board Console und seiner blauen Kopfzeile | HARDWARE -->

**Step 2 — bring the board to the prompt.** A freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal first (**☰ → `Terminal` → `New Terminal`**; ☰ is the three-line icon at the very top left, there is no visible menu bar) and run once:

```bash
python3 scripts/board_key.py quit
```

The working directory is the project root, it takes under a second, and afterwards the console answers letters again.

**Step 3 — ask for the report.** You do not type `k` yourself: the **Check** button on this task sends it, you only read the answer. That button sits on the task at the bottom of the step text, the tab `CaDS Tutor: FreeRTOS without a heap` **in the middle** of the window; the top of that tab also carries **Run all checks**. The answer arrives in under a second and starts with `# tasks`. Note the three numbers.

**Step 4.** Compute how many bytes of the console stack are actually in use — with your own number, not the one in the text.

## When the interface gets in the way

- **The command ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal `CaDS Board Console` — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it and drops the console — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

**Where you work:** open a file `Ctrl`/`Cmd`+`P` · terminal area `Ctrl`/`Cmd`+`J` · command palette `F1` · menu **☰** at the top left · board console `F1` → `CaDS Board: Konsole öffnen` · check with **Check** on the task or **Run all checks** at the top of the step text. The interface is in English while the course text is German, so the menu entry reads `New Terminal`.
