---
id: m4-05-stack-sizing
title: Einen Task-Stack aus Evidenz dimensionieren
bloom: analyze
objectives: [cz.rtos.stack-sizing]
requires: [m4-04-iwdg-watchdog]
estimatedMinutes: 15
links:
  - { step: m5-01-canvas-draw }
  - { step: m3-04-stack-guard }
  - { file: "apps/bringup/tasks.c", line: 30 }
  - { doc: "docs/ROADMAP.md" }
  - { doc: "docs/reference/memory-map.md" }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/reference/memory-map.md, modules/kernel/src/kernel.c]
tasks:
  - id: size-it
    title: Dimensioniere einen Stack, wie es das Projekt tat
    check: { type: question, prompt: { en: "Two task stacks in apps/bringup/tasks.c were resized after real overflows: CADS_CONSOLE_STACK 512->1024 words and CADS_INPUT_STACK 256->1024 words. Using the evidence each fix cites, explain how you would size a task stack in this firmware, and why spending CCM on it is the right trade even though the SRAM margin is a few hundred bytes.", de: "Zwei Task-Stacks in apps/bringup/tasks.c wurden nach echten Überläufen vergrößert: CADS_CONSOLE_STACK 512->1024 Worte und CADS_INPUT_STACK 256->1024 Worte. Erkläre anhand der zitierten Evidenz, wie du in dieser Firmware einen Task-Stack dimensionierst und warum CCM dafür der richtige Preis ist, obwohl die SRAM-Marge nur wenige hundert Byte beträgt." }, rubric: "Geht von dem aus, was tatsächlich auf dem Stack läuft, nicht von der eigenen Schleife der Task: die console-Task führt die gesamte App-Tree-Tick-Kette plus lwIPs DHCP-Zustandsmaschine bei net.dhcp=1 aus; die input-Task führt jeden App-Input-Handler synchron über cads_input_tick() aus. Evidenz: der Stack-Guard-Wächter im Idle-Hook faultete mit Müll-PC 0xF7FF0FF0 (console), und der Forensik-Ring hielt reason=input 22 ms vor einem HardFault fest (Marauder). Großzügig dimensionieren (2x/4x), Größen über Tasks angleichen, mit `k`-Höchstständen bestätigen. CCM trägt nur CPU-berührte Stacks und hatte ~54-59 KB von 64 KB frei; 2-3 KB dort kosten nichts vom DMA-fähigen SRAM-Heap, den check_ram_budget.py bewacht.", bloom: analyze }
socratic:
  - { trigger: "question:size-it:weak", question: { en: "What code actually executes on the input task's stack when the Marauder menu is open - only the polling loop, or something deeper?", de: "Welcher Code läuft tatsächlich auf dem Stack der input-Task, wenn das Marauder-Menü offen ist - nur die Poll-Schleife oder etwas Tieferes?" }, hints: [ { en: "tasks.c's header comment: cads_input_tick() calls the active app's input handler synchronously via cads_input_set_callback().", de: "Kopfkommentar in tasks.c: cads_input_tick() ruft den Input-Handler der aktiven App synchron über cads_input_set_callback() auf." }, { en: "The console task's loop calls cads_net_poll() every tick; with net.dhcp=1 that is lwIP's DHCP state machine on the same stack.", de: "Die Schleife der console-Task ruft cads_net_poll() jeden Tick; mit net.dhcp=1 ist das die DHCP-Zustandsmaschine von lwIP auf demselben Stack." }, { en: "memory-map.md: CCM is no-DMA and holds only task stacks and the MSP; the 48 KB floor is about SRAM, not CCM.", de: "memory-map.md: CCM ist DMA-los und trägt nur Task-Stacks und den MSP; die 48-KB-Grenze betrifft SRAM, nicht CCM." } ] }
---
## Lernziel

Lerne, einen FreeRTOS-Task-Stack aus Evidenz statt aus Gewohnheit zu dimensionieren — anhand der zwei Überläufe, die diese Firmware tatsächlich erlitt, und der Speicheraufteilung, die die Korrekturen billig machte.

## Die falsche Annahme

`apps/bringup/tasks.c` beschrieb die input- und console-Tasks einst als „flach" gegenüber der UI-Task, die die Canvas-Aufrufkette trägt. Das M2-Gate schien zuzustimmen: Höchststände ui 224 B, input 132 B, console 372 B. Beide kleineren Tasks liefen später über. Der Fehler war, für die *eigene* Schleife der Task zu dimensionieren statt für **alles, was auf ihrem Stack läuft**.

## Fall 1: die console-Task und DHCP (2026-08-28)

Die App-Tree-Schleife der console-Task (`explorer_app_demo.c`) ruft jeden Tick `cads_net_poll()`. Mit `net.dhcp = 1` läuft dabei die DHCP-Client-Zustandsmaschine von lwIP — sichtbar tiefer als der Static-IP-Pfad — auf **demselben** 512-Wort-Stack, den die Schleife auch für die gesamte App-Tree-Tick-Kette nutzt (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`, …). `net.dhcp = 1` ließ das Board bei jedem Reset abstürzen.

Evidenz, live über SWD gefangen: `vApplicationIdleHook()` — die Stack-Guard-Wächterprüfung aus M3-04 — faultete mit einem Müll-PC `0xF7FF0FF0`, einer Instruction-Fetch-Verletzung über eine korrumpierte Rücksprungadresse. Das ist die Lehrbuch-Signatur eines Überlaufs, der schwer genug ist, genau den Code zu zerstören, der ihn erkennen soll. Zwei falsche Spuren (Dateisystem-Korruption, SWD-Flackern) wurden zuerst ausgeschlossen und stehen in `docs/ROADMAP.md`, damit niemand sie blind wiederholt.

Korrektur: `CADS_CONSOLE_STACK` verdoppelt, 512 → 1024 Worte (2 KB → 4 KB). Bestätigt mit einem echten DHCP-Lease über zwei saubere Läufe und einem Forensik-Ring, der nicht wuchs.

## Fall 2: die input-Task und das Marauder-Menü (2026-08-30)

`cads_input_tick()` ruft direkt den Input-Handler der aktiven App, synchron, auf dem Stack der input-Task. Die Menünavigation der Marauder-App — Befehlsformatierung und Zustandsverfolgung für das Koprozessor-UART-Protokoll — war tief genug, das ursprüngliche 256-Wort-Budget (1 KB) zu sprengen, das kleinste der drei, obwohl es beliebige App-spezifische Tiefe trägt.

Evidenz: der Forensik-Ring (`E`) hielt einen `reason=input`-Eintrag des Stack-Guards 22 ms vor einem HardFault mit `HFSR = 0x80000000` (DEBUGEVT) — die `bkpt`-ohne-Debugger-Eskalation aus M3-03, aus einem ungeschützten `cads_hal_panic()`, im selben Zug behoben.

Korrektur: `CADS_INPUT_STACK` vervierfacht, 256 → 1024 Worte, an die console-Größe angeglichen für eine konsistente statt minimale Marge.

## Warum die Korrekturen billig waren

Task-Stacks liegen im CCM (`CADS_CCM_SECTION`, M4-01). CCM ist DMA-loser Speicher, der nur Stacks und den MSP trägt, und hatte vor der ersten Korrektur rund 59 KB von 64 KB frei, nach der zweiten ~54,7 KB. Die 2 KB und 3 KB kamen von dort — **kein einziges Byte** aus dem DMA-fähigen SRAM-Heap, dessen Marge `check_ram_budget.py` bei 256 B bewacht (M4-02). Wo der Speicher liegt, entscheidet, ob eine großzügige Korrektur bezahlbar ist.

## Die Methode

1. Zähle auf, was wirklich auf dem Stack läuft: Callbacks, Polls, Bibliotheks-Zustandsmaschinen, nicht nur den Task-Rumpf.
2. Lies die Evidenz, wenn es scheitert: den Wächter, den Forensik-Ring, den Fault-PC.
3. Dimensioniere großzügig im CCM (2×–4×), halte Größen über Tasks konsistent, bestätige mit `k`. Der Feldeinsatz hat das letzte Wort — ein Build, der bloß läuft, ist kein Beweis.

## Deine Aufgabe

Beantworte die Frage: dimensioniere einen Task-Stack so, wie es dieses Projekt tat, mit Evidenz und Speicheraufteilung.
