---
id: m3-01-gdb-breakpoints
title: Breakpoints, stepping and the call stack
bloom: apply
objectives: [firmware-how-to-debug]
requires: [m2-05-explorer-command]
estimatedMinutes: 15
links:
  - { step: m3-02-registers-svd }
  - { doc: "docs/how-to/debug.md" }
  - { doc: "docs/how-to/vscode-setup.md" }
  - { file: "targets/itsboard/main.c", line: 13 }
sources: [docs/how-to/debug.md, docs/how-to/vscode-setup.md, targets/itsboard/main.c, apps/bringup/bringup.c]
tasks:
  - id: stop-in-main
    title: Halt on a breakpoint inside main()
    check: { type: debugStop, file: "targets/itsboard/main.c", line: 14 }
  - id: reset-on-attach
    title: Why the first backtrace shows early boot
    check: { type: question, prompt: { en: "You start a debug session and immediately ask for a backtrace. Why does it show the board a few milliseconds into boot rather than where it was when you decided to look, and why is this easy to misread as a hang?", de: "Du startest eine Debug-Sitzung und forderst sofort einen Backtrace an. Warum zeigt er das Board wenige Millisekunden nach dem Boot statt dort, wo es war, als du hinschauen wolltest, und warum ist das leicht als Hänger fehlzudeuten?" }, rubric: "States that the launch configuration issues 'monitor reset halt' and runs to the entry point main(), so attaching resets the target; the first stop is therefore early boot, not the previous live state, and a stack that looks stuck near Reset_Handler/main is the normal consequence, not evidence of a hang.", bloom: understand }
socratic:
  - { trigger: "task:stop-in-main:failed", question: { en: "The session started but never stopped at your breakpoint. Did it stop at main() at all, and is the breakpoint on a line that actually contains code?", de: "Die Sitzung startete, hielt aber nie an deinem Breakpoint. Hat sie überhaupt bei main() gehalten, und liegt der Breakpoint auf einer Zeile, die tatsächlich Code enthält?" }, hints: [ { en: "The launch configuration runs to main() first; if that never happened, the ELF and the flashed image may differ - rebuild and use Build + Flash.", de: "Die Launch-Konfiguration läuft zuerst bis main(); geschah das nie, unterscheiden sich womöglich ELF und geflashtes Image - neu bauen und Build + Flash nutzen." }, { en: "A breakpoint on a comment or blank line slides or is ignored; put it on the cads_bringup_run() call.", de: "Ein Breakpoint auf einem Kommentar oder einer Leerzeile rutscht oder wird ignoriert; setze ihn auf den Aufruf cads_bringup_run()." }, { en: "Only one client may hold the probe: end any earlier debug session before pressing F5 again.", de: "Nur ein Client darf die Probe halten: beende jede frühere Debug-Sitzung, bevor du F5 erneut drückst." } ] }
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

## Attaching is not free

Two facts about a halted target are easy to misread (`docs/how-to/debug.md`, "Where am I?" and "Time is frozen while halted"):

1. **Attaching resets the target.** The launch runs `monitor reset halt`, so the first stop is a few milliseconds into boot. A backtrace taken there shows `main()` or the reset handler, not wherever the firmware was before you pressed F5. That is normal, not a hang. To inspect a *live* crash you would attach without reset - the manual how-to documents `st-util --no-reset` for that; the bridge's `monitor halt` is the equivalent here.
2. **`DWT->CYCCNT` does not advance while halted.** Reading it twice from the debugger gives the same value; that is not a broken counter.

## Stepping

With the target stopped, *Step Over* (F10) executes `cads_hal_init()` as one unit; *Step Into* (F11) descends into it. The **Call Stack** panel shows the frames from `main()` upward, and the **Variables** panel shows locals of the selected frame. Continue (F5) resumes; pause halts the running core wherever it is - which, once the scheduler runs, will usually be the idle task.

## Your task

Set a breakpoint on `targets/itsboard/main.c` line 14 (the `cads_bringup_run()` call), start the session with F5 and let it run into that breakpoint; the check confirms the stop. Then answer why the first backtrace shows early boot. The next step reads peripheral registers from the same halted board.
