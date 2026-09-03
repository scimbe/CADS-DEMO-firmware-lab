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

Learn to size a FreeRTOS task stack from evidence rather than habit, using the two overflows this firmware actually suffered and the memory split that made the fixes cheap.

## The wrong assumption

`apps/bringup/tasks.c` once described the input and console tasks as "shallow" next to the UI task, which carries the canvas call chain. The M2 gate seemed to agree: high-water marks of ui 224 B, input 132 B, console 372 B. Both smaller tasks later overflowed.

## You already know the case study

How a stack overflow announces itself — the sentinel in the idle hook, the garbage PC `0xF7FF0FF0`, the instruction-fetch violation reached through a corrupted return address — is told in full in **M3-04**. It is not retold here; it is used. If the sequence has faded, look it up there; this step asks something else.

## Two tasks, two overflows, one pattern

**console (2026-08-28).** The console task's app-tree loop (`explorer_app_demo.c`) calls `cads_net_poll()` every tick. With `net.dhcp = 1` that runs lwIP's DHCP client state machine on the same 512-word stack the loop also uses for the full app-tree tick chain (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`, …). Fix: `CADS_CONSOLE_STACK` 512 → 1024 words. *Why* the DHCP path in particular is deeper than the static one is the question of **M7-03** — not of this step.

**input (2026-08-30).** `cads_input_tick()` calls straight into the active app's input handler, synchronously, on the input task's own stack. The Marauder app's menu navigation was deep enough to break the original 256-word budget — the smallest of the three, despite carrying arbitrary app-specific depth. The forensic ring (`E`) held the sentinel record `reason=input` 22 ms before the HardFault. Fix: `CADS_INPUT_STACK` 256 → 1024 words, matched to the console's size.

What they have in common: neither task was broken by its *own* loop.

## Why the fixes were cheap

Task stacks live in CCM (`CADS_CCM_SECTION`, M4-01) — the region that is invisible to DMA and therefore carries only stacks and the MSP. It had roughly 59 KB free of 64 KB before the first fix and ~54.7 KB after the second. The 2 KB and 3 KB came from there and **not one byte** from the DMA-capable SRAM heap whose 256 B margin `scripts/check_ram_budget.py` guards (M4-02). Where the memory lives decides whether a generous fix is affordable.

## What you check with

Three places in this firmware say something about stack depth: the console command `k` reports the free high-water mark of all three tasks, the stack-guard sentinel in the idle hook fires before the damage is final, and the forensic ring records which task last misbehaved. Which of those helps you *before* a crash and which only after is the difference between sizing and performing an autopsy.

## Your task

First a prediction: one of the three task stacks did not have to grow — which one, and why. Then the question this step actually asks: what do you size a stack against when you did not write what runs on it.
