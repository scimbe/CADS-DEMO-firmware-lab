---
id: m1-03-sim-vs-board
title: Simulator versus board
bloom: understand
objectives: [cz.arch.sim-vs-board]
requires: [m1-02-hal-boundary]
estimatedMinutes: 12
scaffold: faded
recallFrom: [m0-03-build]
links:
  - { step: m1-04-splash }
  - { doc: "docs/how-to/port-to-new-board.md" }
  - { doc: "docs/reference/module-layout.md" }
  - { file: "modules/net/src/cads_net_sim.c", line: 1 }
sources: [docs/how-to/port-to-new-board.md, docs/reference/module-layout.md, targets/sim/hal_sim.c, CMakePresets.json, modules/net/src/cads_net_sim.c]
tasks:
  - id: host-tests
    title: The host build and its tests pass
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: net-stub
    title: Predict what the simulator's net stub reports
    check: { type: predict, prompt: { en: "modules/net has two implementations. What does the simulator one report when an app asks about the link?", de: "modules/net hat zwei Implementierungen. Was meldet die Simulator-Fassung, wenn eine App nach dem Link fragt?" }, then: { type: command, cwd: ".", command: "grep -n 'never a link' modules/net/src/cads_net_sim.c", expectExitCode: 0 }, rubric: "The prediction says in substance that the simulator version reports no link and that every query therefore comes back empty. The output shows four places carrying the same comment. A diverging prediction — a faked link, say, or an error return — counts as passed as soon as the difference is named and accounted for after the comparison.", bloom: understand }
  - id: both-targets
    title: Account for the standstill in the simulator
    check: { type: question, prompt: { en: "An app needs the network and never shows data in the simulator. Why is that intended rather than a simulator bug?", de: "Eine App braucht das Netz und zeigt im Simulator nie Daten. Warum ist das Absicht und kein Simulatorfehler?" }, rubric: "States that there is no RMII hardware in the simulator and that a faked link would let a real network dependency stay hidden until it hit silicon. The honest standstill makes the dependency visible already in the host build and pushes the proof where it belongs: onto the board. Calling the app faulty, or citing only that SDL cannot do Ethernet, does not name the purpose of that honesty.", bloom: understand }
socratic:
  - { trigger: "task:host-tests:failed", question: { en: "The host build needs no Arm toolchain, but it does need the library the simulator draws with. Does your first error message name one?", de: "Der Host-Build braucht keine Arm-Toolchain, aber die Bibliothek, mit der der Simulator zeichnet. Nennt deine erste Fehlermeldung eine?" }, hints: [ { en: "If the board build worked earlier, the cross toolchain is not the suspect here; this preset uses your own system's compiler.", de: "Wenn der Board-Build vorhin lief, ist die Cross-Toolchain hier nicht der Verdächtige; dieses Preset nimmt den Compiler deines eigenen Systems." }, { en: "Start the task by hand from the menu Terminal, Run Task..., and pick CaDS: Host tests; then read the FIRST failing test's name in the terminal, not the summary at the end.", de: "Starte den Task von Hand über das Menü Terminal, Run Task..., und wähle CaDS: Host tests; lies dann im Terminal den Namen des ERSTEN fehlschlagenden Tests, nicht die Zusammenfassung am Ende." }, { en: "A golden-image pixel diff of plus one in R, G or B on anti-aliased edges is SDL rounding, not a rendering regression - see the ROADMAP log of 2026-09-01.", de: "Ein Golden-Image-Pixelunterschied von plus eins in R, G oder B an geglätteten Kanten ist SDL-Rundung, keine Render-Regression - siehe ROADMAP-Log vom 2026-09-01." } ] }
  - { trigger: "task:net-stub:stuck", question: { en: "A stub has two honest options: pretend, or say no consistently. Which one fits a simulator with no network silicon?", de: "Ein Stub hat zwei ehrliche Möglichkeiten: so tun als ob, oder konsequent nein sagen. Welche passt zu einem Simulator ohne Netz-Silizium?" }, hints: [ { en: "The commonest reason to stall here is wanting to be right. The guess is not scored — the comparison afterwards is.", de: "Der häufigste Grund festzustecken ist, unbedingt richtig liegen zu wollen. Die Vorhersage wird nicht bewertet — der Vergleich danach schon." }, { en: "Before you guess, look at what targets/sim actually contains (Ctrl/Cmd+Shift+E, folder targets/sim): a screen, a keyboard, and nothing that carries packets.", de: "Sieh dir vor dem Raten an, was targets/sim überhaupt enthält (Strg/Cmd+Shift+E, Ordner targets/sim): einen Bildschirm, eine Tastatur und nichts, was Pakete trägt." }, { en: "Write your prediction down even if you are unsure, in one sentence. This task lives on the comparison with the file, not on a perfect guess.", de: "Schreib deine Vorhersage auch dann hin, wenn du unsicher bist, in einem Satz. Diese Aufgabe lebt vom Vergleich mit der Datei, nicht vom perfekten Raten." } ] }
  - { trigger: "question:both-targets:weak", question: { en: "Turn the question around: what could an app hide if the simulator faked a connection?", de: "Dreh die Frage um: was könnte eine App verstecken, wenn der Simulator eine Verbindung vortäuschte?" }, hints: [ { en: "The commonest wrong turn is to read the standstill as a shortcoming of the simulator. Ask instead whom it serves.", de: "Der häufigste Irrweg ist, den Stillstand als Mangel des Simulators zu lesen. Frag stattdessen, wem er nützt." }, { en: "Open modules/net/src/cads_net_sim.c with Ctrl/Cmd+P and read the file header, the first ten lines; it states the decision and its reason.", de: "Öffne modules/net/src/cads_net_sim.c mit Strg/Cmd+P und lies den Dateikopf, die ersten zehn Zeilen; er nennt die Entscheidung und ihren Grund." }, { en: "Remember the hardware gate from m0-01: code that merely compiled does not count as working. A faked link would move that proof — to where?", de: "Denk an das Hardware-Gate aus m0-01: Code, der nur kompiliert wurde, zählt nicht als funktionierend. Ein vorgetäuschter Link würde diesen Nachweis verschieben — wohin?" } ] }
---
## Learning goal

Understand what the simulator is, what it is not, and why "builds for both targets" is a completion criterion rather than a nicety.

## The same firmware, no board

`targets/sim/` implements `core/cads_hal.h` against SDL2 — the graphics library the simulator draws its window with. The `host` preset, which you already built in `m0-03`, compiles it with your system's native compiler, alongside the entire unit and golden-image suite; no Arm toolchain is involved. Because every module above the HAL is portable by construction (`docs/reference/module-layout.md`), the desktop, the menu, the apps, the canvas and the storage code that run in that SDL window are the **same object files** the board links — not a re-implementation.

That is what the layering in the previous steps buys:

- Portable code can be developed and tested **before the hardware exists**, or while someone else has the one board on their bench.
- The **whole test suite runs with no board attached**: `ctest` in `build/host` executes the **Unity** unit tests — Unity is the small C test framework this project uses — for the toolbox, storage, config, net helpers and GUI widgets, and the golden-image renders of real screens.
- A write-only display can still be **screenshotted deterministically**, which is the only way golden images exist for this panel at all.

## Where the simulator is honest

The simulator refuses to pretend where the hardware cannot be faked. The board descriptor it returns sets `display_readable = true` — an SDL surface is readable — while the ITSboard sets it `false`, and code is expected to cope with both.

`modules/net` has two implementations for one header: `cads_net_board.c` owns a real lwIP netif over the chip's RMII MAC, and `cads_net_sim.c` is a **stub** — a version that satisfies the interface completely but does not do the thing behind it, so that code using it still builds and runs. What exactly that stub reports is what you will predict yourself in a moment, before you open the file.

`modules/kernel` (FreeRTOS) is board-only; the host has no **scheduler** — no piece of software deciding which of several concurrent jobs currently gets the processor.

## Why it is a hard rule

The maintainer's own onboarding file states it plainly: a feature that only works on one target is not done. Two consequences follow. First, hardware dependence has to stay confined to `targets/`; a stray `#include "stm32f4xx.h"` in a feature module breaks the host build immediately, which is the point — the compiler catches the layering violation before a reviewer has to. Second, "it compiled" is never sufficient on either side: the host proves logic, the board's hardware gate proves it runs on silicon, and a change needs both.

`docs/how-to/port-to-new-board.md` shows the corollary: porting to different hardware means writing one new directory under `targets/` and changing nothing else. If a port requires editing `gui/`, `services/` or `apps/`, that is a bug in the abstraction.

## Your task

1. Run the host build and its tests: either with **Check** on the first task, or by hand from **Terminal → Run Task…** and **CaDS: Host tests**.
2. On the second task, write down in one sentence what the simulator's net stub reports, *before* you look. Only then does the check show you the places in `modules/net/src/cads_net_sim.c`, and you compare.
3. Finally, answer why the standstill in the simulator is intended.

The next step makes your first real code change and checks it on both sides.
