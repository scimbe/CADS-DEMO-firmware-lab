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
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "Is the image on the board the one you are debugging - or did the last build never reach the flash?", de: "Ist das Image auf dem Board dasselbe, das du debuggst - oder hat der letzte Bau den Flash nie erreicht?" }, { en: "Open targets/itsboard/main.c and check which line your red dot sits on; a dot on a comment or a blank line slides or is dropped.", de: "Öffne targets/itsboard/main.c und sieh nach, auf welcher Zeile dein roter Punkt sitzt; ein Punkt auf einem Kommentar oder einer Leerzeile rutscht oder entfällt." }, { en: "Only one client may hold the probe at a time - check whether an earlier debug session is still open before pressing F5 again.", de: "Nur ein Client darf die Probe gleichzeitig halten - prüfe, ob noch eine frühere Debug-Sitzung offen ist, bevor du F5 erneut drückst." } ] }
  - { trigger: "question:backtrace-frame:weak", question: { en: "How many lines does your Call Stack panel show, and did you take the backtrace after the halt or before it?", de: "Wie viele Zeilen zeigt dein Call-Stack-Panel, und hast du den Backtrace nach dem Halt genommen oder davor?" }, hints: [ { en: "A one-line stack usually means the target was still running when you looked - halt first, then read.", de: "Ein einzeiliger Stack heißt meistens, dass das Target beim Hinsehen noch lief - erst anhalten, dann lesen." }, { en: "Open targets/itsboard/startup/startup_stm32f429.c and search for the one place where main is called.", de: "Öffne targets/itsboard/startup/startup_stm32f429.c und suche die eine Stelle, an der main aufgerufen wird." }, { en: "Look up which single function the vector table names as the entry point after power-up - that one calls everything else.", de: "Sieh nach, welche einzelne Funktion die Vektortabelle als Einsprung nach dem Einschalten nennt - diese ruft alles Weitere auf." } ] }
---
## Learning goal

Run the real firmware under a debugger: stop at a breakpoint, step through the boot path, and read the call stack - and understand what the act of attaching itself does to the target.

## How debugging is wired here

Press **F5** with the configuration **Debug CaDS Zero (Board im Browser)** selected. It is a `cortex-debug` launch configuration with `servertype: external`: the GDB server is the lab's own bridge on `127.0.0.1:3333`, which talks to the ST-Link in your browser. There is no `st-util` and no OpenOCD in the container; F5 is the only debug path. The configuration:

- runs the **CaDS: Build + Flash** task first, so the ELF you debug is the image on the board;
- issues `monitor reset halt`, then runs to the entry point `main()`;
- loads `targets/itsboard/STM32F429.svd`, which the next step uses.

`docs/how-to/debug.md` describes the same session driven by hand with `st-util` and `arm-none-eabi-gdb`; every GDB concept there applies unchanged.

## The boot path you will step through

`targets/itsboard/main.c` is deliberately tiny:

```c
int main(void) {
    cads_hal_init();
    cads_bringup_run();
    for(;;) { __asm volatile("wfi"); }
}
```

`cads_hal_init()` brings up clocks, GPIO, console and display; `cads_bringup_run()` (in `apps/bringup/bringup.c`) runs the self test, draws the splash and starts the scheduler, and does not return. A breakpoint on line 14, the `cads_bringup_run()` call, therefore stops you exactly between "hardware ready" and "application running" - a good place to look at what the HAL left behind.

But `main()` is not the beginning. Before it, the reset path in `targets/itsboard/startup/startup_stm32f429.c` runs: the vector table names an entry function, that function copies `.data`, zeroes `.bss`, sets `VTOR`, and only then calls `main()`. That is exactly why a stack taken at your breakpoint has a frame **below** `main()` - and that frame is your task.

## Attaching is not free

Two facts about a halted target are easy to misread (`docs/how-to/debug.md`, "Where am I?" and "Time is frozen while halted"):

1. **Attaching resets the target.** The launch runs `monitor reset halt`, so the first stop is a few milliseconds into boot. A backtrace taken there shows early boot, not wherever the firmware was before you pressed F5. That is normal, not a hang. To inspect a *live* crash you would attach without reset - the manual how-to documents `st-util --no-reset` for that; the bridge's `monitor halt` is the equivalent here.
2. **`DWT->CYCCNT` does not advance while halted.** Reading it twice from the debugger gives the same value; that is not a broken counter.

## Stepping

With the target stopped, *Step Over* (F10) executes `cads_hal_init()` as one unit; *Step Into* (F11) descends into it. The **Call Stack** panel shows the frames from `main()` upward, and the **Variables** panel shows locals of the selected frame. Continue (F5) resumes; pause halts the running core wherever it is - which, once the scheduler runs, will usually be the idle task.

There are two ways to take a backtrace: read it off the **Call Stack** panel, or type `-exec bt` in the Debug Console for the same thing in text form. Both show the same frames, current one on top.

## Your task

Set a breakpoint on `targets/itsboard/main.c` line 14 (the `cads_bringup_run()` call), start the session with F5 and let it run into that breakpoint; the check confirms the stop. Then read the call stack and name the frame directly below `main()`. The next step reads peripheral registers from the same halted board.
