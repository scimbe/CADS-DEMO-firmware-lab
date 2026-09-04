---
id: m3-01-gdb-breakpoints
title: Breakpoints, stepping and the call stack
bloom: apply
objectives: [firmware-how-to-debug]
requires: [m2-05-explorer-command]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m3-02-registers-svd }
  - { doc: "docs/how-to/debug.md" }
  - { doc: "docs/how-to/vscode-setup.md" }
  - { file: "targets/itsboard/main.c", line: 13 }
  - { file: "targets/itsboard/startup/startup_stm32f429.c", line: 69 }
sources: [docs/how-to/debug.md, docs/how-to/vscode-setup.md, targets/itsboard/main.c, apps/bringup/bringup.c, targets/itsboard/startup/startup_stm32f429.c]
tasks:
  - id: stop-in-main
    title: Halt on a breakpoint inside main()
    check: { type: debugStop, file: "targets/itsboard/main.c", line: 14 }
  - id: backtrace-frame
    title: Name the frame below main()
    check: { type: question, prompt: { en: "Halt at your breakpoint and take a backtrace. Which frame sits directly below main()?", de: "Halte an deinem Breakpoint und nimm einen Backtrace. Welcher Frame steht direkt unter main()?" }, rubric: "Names Reset_Handler - or, equivalently, the startup / reset handler - as the frame below main(). Evidence is in targets/itsboard/startup/startup_stm32f429.c, which holds the one call to main(). An answer naming a task, the idle task, or nothing at all has not read the backtrace, or never halted the target. The exact spelling of the symbol does not matter.", bloom: apply }
socratic:
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "Is the image on the board the one you are debugging - or did the last build never reach the flash?", de: "Ist das Image auf dem Board dasselbe, das du debuggst - oder hat der letzte Bau den Flash nie erreicht?" }, { en: "Open targets/itsboard/main.c with Ctrl/Cmd+P and check which line your red dot sits on; a dot on a comment or a blank line slides or is dropped.", de: "Öffne targets/itsboard/main.c mit Strg/Cmd+P und sieh nach, auf welcher Zeile dein roter Punkt sitzt; ein Punkt auf einem Kommentar oder einer Leerzeile rutscht oder entfällt." }, { en: "Only one client may hold the probe at a time - end an earlier session with Stop on the debug toolbar at the top before pressing F5 again.", de: "Nur ein Client darf die Probe gleichzeitig halten - beende eine frühere Sitzung mit Stop in der Debug-Werkzeugleiste oben, bevor du F5 erneut drückst." } ] }
  - { trigger: "question:backtrace-frame:weak", question: { en: "How many lines does your Call Stack panel show, and did you take the backtrace after the halt or before it?", de: "Wie viele Zeilen zeigt dein Call-Stack-Panel, und hast du den Backtrace nach dem Halt genommen oder davor?" }, hints: [ { en: "A one-line stack usually means the target was still running when you looked - halt first, then read.", de: "Ein einzeiliger Stack heißt meistens, dass das Target beim Hinsehen noch lief - erst anhalten, dann lesen." }, { en: "Open targets/itsboard/startup/startup_stm32f429.c with Ctrl/Cmd+P and search it for the one place where main is called.", de: "Öffne targets/itsboard/startup/startup_stm32f429.c mit Strg/Cmd+P und suche darin die eine Stelle, an der main aufgerufen wird." }, { en: "Look up which single function the vector table names as the entry point after power-up - that one calls everything else.", de: "Sieh nach, welche einzelne Funktion die Vektortabelle als Einsprung nach dem Einschalten nennt - diese ruft alles Weitere auf." } ] }
---

## Learning goal

Run the real firmware under a debugger: stop at a breakpoint, step through the boot path, and read the call stack - and understand what the act of attaching itself does to the target.

## Where you click

The user interface is in English while this course text is in German - so the menu entry really is called `Run Task...`. There is no visible menu bar: the menus hide behind the three-line icon (**☰**) at the very top left, which opens `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` and `Help`.

The **Run and Debug** view sits behind the bug icon in the bar on the far left. One click shows the configuration list at the top and `VARIABLES`, `WATCH`, `CALL STACK` and `BREAKPOINTS` below it.

![The bug icon in the left bar opens the Run and Debug view, where F5 starts](run-and-debug-view.png)

Pick **`Debug CaDS Zero (Board im Browser)`** in that list. The second entry, `Attach CaDS Zero (Board im Browser, no flash)`, attaches to a board that is already running without flashing it; you do not need it here.

![The configuration list open, Debug CaDS Zero (Board im Browser) selected, Attach below it](debug-configurations.png)

It is a `cortex-debug` configuration with `servertype: external`: the GDB server is the lab's own bridge on `127.0.0.1:3333`, which talks to the ST-Link in your browser. Neither `st-util` nor OpenOCD is in the container; `F5` is the only debug path. The configuration runs the task `CaDS: Build + Flash` first, so the ELF you debug is the image on the board, issues `monitor reset halt`, runs to the entry point `main()`, and loads `targets/itsboard/STM32F429.svd`, which the next step uses.

## Setting the breakpoint

Open the file with `Ctrl`/`Cmd`+`P`, type the path and press Enter:

```text
targets/itsboard/main.c
```

Without the keyboard: the topmost icon in the bar on the far left (the file explorer), then click through the tree. Now click in the gutter to the left of line number 14. A red dot appears, and the `BREAKPOINTS` list in the Run and Debug view files it with its file and line. On a comment or a blank line the dot slides on at start-up, or is dropped.

![The red breakpoint dot in the gutter next to the cads_bringup_run() call, with the BREAKPOINTS list beside it](breakpoint-in-gutter.png)

## The boot path you will step through

`targets/itsboard/main.c` is deliberately tiny:

```c
int main(void) {
    cads_hal_init();
    cads_bringup_run();
    for(;;) { __asm volatile("wfi"); }
}
```

`cads_hal_init()` brings up clocks, GPIO, console and display; `cads_bringup_run()` (in `apps/bringup/bringup.c`) runs the self test, draws the splash and starts the scheduler, and does not return. Line 14, the `cads_bringup_run()` call, therefore stops you exactly between "hardware ready" and "application running".

But `main()` is not the beginning. Before it, the reset path in `targets/itsboard/startup/startup_stm32f429.c` runs: the vector table names an entry function, that function copies `.data`, zeroes `.bss`, sets `VTOR`, and only then calls `main()`. That is exactly why a stack taken at your breakpoint has a frame **below** `main()` - and that frame is your task.

## Starting the session

Press **`F5`**. Without the keyboard: **☰ → `Run` → `Start Debugging`**.

In the terminal area at the bottom a terminal named `CaDS: Build` opens first, then one named `CaDS: Flash` - about a minute for the build the first time, then about 15 seconds for the flash. If the area is folded away, `Ctrl`/`Cmd`+`J` opens and closes it.

Only then does GDB start, and the **first** halt is the entry point `main()`, not your breakpoint (`runToEntryPoint: main`). You can tell by three things at once: the debug toolbar appears at the top, `CALL STACK` reads `Paused on breakpoint`, and the halted line is highlighted in the editor.

![Halted at main(), with the debug toolbar and the call stack](debug-halted-at-main.png)

Now press **`F5`** once more (Continue). Execution runs into your breakpoint on line 14 and stops there; that stop is exactly what the check confirms.

![After Continue, execution stops on the breakpoint again](debug-after-continue.png)

## Stepping, and reading the stack

With the target halted, **`F10`** (Step Over) executes `cads_hal_init()` as one unit, **`F11`** (Step Into) descends into it, **`F5`** resumes. Without the keyboard: the same buttons on the debug toolbar at the top.

![The call stack after a Step Over, with the function, address and line of the new halt](debug-after-step-over.png)

`CALL STACK` shows the frames from `main()` upward, and `VARIABLES` shows the locals of the selected frame. The same backtrace in text form is in the `DEBUG CONSOLE` tab of the terminal area at the bottom; type there:

```text
-exec bt
```

Both show the same frames, current one on top.

## Attaching is not free

Two facts are easy to misread (`docs/how-to/debug.md`). **Attaching resets the target:** a backtrace at the first halt shows early boot, not wherever the firmware was before you pressed `F5`. For a live crash you take the second entry in the configuration list. And **`DWT->CYCCNT` does not advance while halted** - read twice it gives the same value, not a broken counter.

## Three operating mistakes almost everyone makes here once

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task - `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it - use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` - press `F1` instead, or go through **☰ → `Terminal`**.

## Your task

Set the breakpoint on `targets/itsboard/main.c` line 14, pick **`Debug CaDS Zero (Board im Browser)`** and start with **`F5`** (or **☰ → `Run` → `Start Debugging`**). After the halt at `main()` press **`F5`** once more, until execution stands on line 14. Then read the frame directly below `main()` off `CALL STACK`, or with `-exec bt` in the `DEBUG CONSOLE` tab.

Checking is the **Check** button on the task, or **Run all checks** at the top of the step-text tab in the middle. The next step reads peripheral registers from the same halted board.
