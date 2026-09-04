---
id: m4-05-stack-sizing
title: Size a task stack from evidence
bloom: analyze
objectives: [cz.rtos.stack-sizing]
requires: [m4-04-iwdg-watchdog]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m3-04-stack-guard]
links:
  - { step: m5-01-canvas-draw }
  - { step: m3-04-stack-guard }
  - { file: "apps/bringup/tasks.c", line: 30 }
  - { doc: "docs/ROADMAP.md" }
  - { doc: "docs/reference/memory-map.md" }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/reference/memory-map.md, modules/kernel/src/kernel.c]
tasks:
  - id: ui-stayed-small
    title: Predict which of the three stacks did not have to grow
    check: { type: predict, prompt: { en: "input and console were both grown to 1024 words after real overflows. Predict the size of the third stack, ui, and the reason it was left as it was.", de: "input und console wurden nach echten Überläufen beide auf 1024 Worte vergrößert. Sage die Größe des dritten Stacks, ui, voraus und den Grund, aus dem er blieb, wie er war." }, then: { type: command, cwd: ".", command: "grep -nE 'define CADS_(UI|INPUT|CONSOLE)_STACK' apps/bringup/tasks.c", expectExitCode: 0 }, rubric: "The comparison shows CADS_UI_STACK 512 against 1024 twice. Passes if the prediction names ui as the task whose stack carries only the project's own drawing code - a chain that is visible in the tree and bounded - while input and console run foreign, app-specific handlers synchronously. A wrong number with that reasoning passes; the right number without reasoning does not.", bloom: analyze }
  - id: size-it
    title: Name the criterion
    check: { type: question, prompt: { en: "What do you size a task stack against when the task runs handlers it does not own?", de: "Wogegen dimensionierst du den Stack einer Task, die Handler ausführt, die ihr nicht gehören?" }, rubric: "Against the deepest foreign call chain that can land on that stack - library state machines, callbacks, app handlers - not against the task's own loop. Demands evidence rather than a guess: the high-water mark from the console command k, the sentinel in the idle hook, or the forensic ring. And a margin that is generous where the memory is cheap. An answer that only names a factor without saying what was measured against does not pass.", bloom: analyze }
socratic:
  - { trigger: "task:ui-stayed-small:stuck", question: { en: "Whose code runs on the ui task's stack, and could a future app make that chain deeper without anyone touching the ui task?", de: "Wessen Code läuft auf dem Stack der ui-Task, und könnte eine künftige App diese Kette vertiefen, ohne dass jemand die ui-Task anfasst?" }, hints: [ { en: "Two of the three tasks call into code that is written by whoever wrote the app; one calls only into the canvas.", de: "Zwei der drei Tasks rufen Code auf, den schreibt, wer die App schreibt; eine ruft nur in das Canvas hinein." }, { en: "The header comment of apps/bringup/tasks.c names, per task, what runs on its stack.", de: "Der Kopfkommentar von apps/bringup/tasks.c nennt je Task, was auf ihrem Stack läuft." }, { en: "Write the prediction down even if you are unsure - this task lives on the comparison afterwards, not on a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist - diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
  - { trigger: "question:size-it:weak", question: { en: "You are asked for a criterion, not a number. Against what would you have to measure before you could name any number at all?", de: "Gefragt ist ein Kriterium, keine Zahl. Wogegen müsstest du messen, bevor du überhaupt eine Zahl nennen könntest?" }, hints: [ { en: "Both overflows happened in tasks whose own loop is short. So the loop is not the quantity.", de: "Beide Überläufe trafen Tasks, deren eigene Schleife kurz ist. Die Schleife ist also nicht die Größe." }, { en: "The firmware has three places that report or record stack depth; name at least one and say what it tells you.", de: "Die Firmware hat drei Stellen, die Stacktiefe melden oder festhalten; nenne mindestens eine und sag, was sie dir verrät." }, { en: "A criterion has two halves: what you measure, and how much you add on top - and the second half depends on where the memory lives.", de: "Ein Kriterium hat zwei Hälften: was du misst und wie viel du darauf legst - und die zweite Hälfte hängt davon ab, wo der Speicher liegt." } ] }
---

## Learning goal

Learn to size a FreeRTOS task stack from evidence rather than habit — from the two overflows this firmware actually suffered, and the memory layout that made the fixes cheap.

## The wrong assumption

`apps/bringup/tasks.c` once described the input and console tasks as "flat" compared with the UI task that carries the canvas call chain. The M2 gate seemed to agree: high-water marks of ui 224 B, input 132 B, console 372 B. Both of the smaller tasks later overflowed.

**Look at the file yourself:** press `Ctrl`/`Cmd`+`P`, type `tasks.c`, Enter — it opens as a tab **in the middle** of the window. Without the keyboard: the topmost icon of the narrow bar on the far left (the file explorer), then click through the tree.

## You already know the case study

How a stack overflow announces itself — the sentinel in the idle hook, the garbage PC `0xF7FF0FF0`, the instruction-fetch violation through a destroyed return address — is told in full in **M3-04**. It is not retold here, it is used.

## Two tasks, two overflows, one pattern

**console (2026-08-28).** The console task's app-tree loop (`explorer_app_demo.c`) calls `cads_net_poll()` every tick. With `net.dhcp = 1` lwIP's DHCP client state machine then runs on the same 512-word stack the loop also uses for the whole app-tree tick chain (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`, …). Fix: `CADS_CONSOLE_STACK` 512 → 1024 words. *Why* the DHCP path in particular is deeper than the static one is the question of **M7-03**.

**input (2026-08-30).** `cads_input_tick()` calls the active app's input handler directly, synchronously, on the input task's stack. The Marauder app's menu navigation was deep enough to blow the original 256-word budget — the smallest of the three, even though it carries arbitrary app-specific depth. The forensic ring held the sentinel record `reason=input` 22 ms before the HardFault. Fix: `CADS_INPUT_STACK` 256 → 1024 words.

What they share: neither task was blown by its *own* loop.

## Why the fixes were cheap

Task stacks live in CCM (`CADS_CCM_SECTION`, M4-01) — the region invisible to DMA, which therefore carries only stacks and the MSP. Before the first fix about 59 KB of 64 KB were free there, after the second ~54.7 KB. The 2 KB and 3 KB came from there and **not a single byte** from the DMA-capable SRAM heap whose 256 B margin `scripts/check_ram_budget.py` guards (M4-02). Where the memory lives decides whether a generous fix is affordable.

## What you measure with

Three places in this firmware say something about stack depth: the console command `k` reports the free high-water marks of all three tasks, the stack-guard sentinel in the idle hook trips before the damage is final, and the forensic ring records which task last misbehaved. Which of them helps you *before* a crash and which only afterwards is the difference between sizing and autopsy.

**If you want to see `k` yourself** — this step does not require it, but it helps you argue: press **`F1`**, type `CaDS Board: Konsole öffnen`, Enter. **At the bottom** of the terminal area a terminal named `CaDS Board Console` opens at 115200 baud; `Ctrl`/`Cmd`+`J` folds that area open and shut. If the board is sitting in the touchscreen app tree it mishears single letters — then open a terminal first (**☰ → `Terminal` → `New Terminal`**; ☰ is the three-line icon at the very top left, there is no visible menu bar) and run once:

```bash
python3 scripts/board_key.py quit
```

Afterwards click into the terminal `CaDS Board Console`, type `k` there yourself and press Enter. The answer arrives in under a second and starts with `# tasks`.

## Task 1 — predict which stack did not have to grow

Write your prediction into this task's input field first. It sits at the bottom of the step text, the tab `CaDS Tutor: Sizing a task stack from evidence` **in the middle** of the window. Only the **Check** button next to it then uncovers the three numbers; before that you do not see them. The top of the same tab carries **Run all checks**.

<!-- SHOT: m4-predict-field-and-check | Eine predict-Aufgabe im Steptext: das Eingabefeld fuer die Vorhersage, der Knopf Pruefen daneben, die Enthuellung noch verdeckt -->

You can trigger the same reveal by hand. Open a terminal — **☰ → `Terminal` → `New Terminal`**, the working directory is the project root — and type:

```bash
grep -nE 'define CADS_(UI|INPUT|CONSOLE)_STACK' apps/bringup/tasks.c
```

It runs immediately; success is three lines with a line number and a define. But do it **only** once your prediction is written down — otherwise you are no longer testing anything.

## Task 2 — name the criterion

What do you size a stack against when you did not write its contents yourself?

## When the interface gets in the way

- **The command ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal you typed into — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it and drops the board console — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.
