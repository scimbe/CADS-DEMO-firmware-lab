---
id: m4-05-stack-sizing
title: Einen Task-Stack aus Evidenz dimensionieren
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
    title: Sage voraus, welcher der drei Stacks nicht wachsen musste
    check: { type: predict, prompt: { en: "input and console were both grown to 1024 words after real overflows. Predict the size of the third stack, ui, and the reason it was left as it was.", de: "input und console wurden nach echten Überläufen beide auf 1024 Worte vergrößert. Sage die Größe des dritten Stacks, ui, voraus und den Grund, aus dem er blieb, wie er war." }, then: { type: command, cwd: ".", command: "grep -nE 'define CADS_(UI|INPUT|CONSOLE)_STACK' apps/bringup/tasks.c", expectExitCode: 0 }, rubric: "Der Vergleich zeigt CADS_UI_STACK 512 gegen zweimal 1024. Bestanden, wenn die Vorhersage ui als die Task benennt, deren Stack ausschließlich projekteigenen Zeichencode trägt — eine Kette, die im Baum sichtbar und begrenzt ist —, während input und console fremde, app-spezifische Handler synchron ausführen. Eine falsche Zahl mit dieser Begründung besteht; die richtige Zahl ohne Begründung nicht.", bloom: analyze }
  - id: size-it
    title: Nenne das Kriterium
    check: { type: question, prompt: { en: "What do you size a task stack against when the task runs handlers it does not own?", de: "Wogegen dimensionierst du den Stack einer Task, die Handler ausführt, die ihr nicht gehören?" }, rubric: "Gegen die tiefste fremde Aufrufkette, die auf diesem Stack landen kann — Bibliotheks-Zustandsmaschinen, Callbacks, App-Handler —, nicht gegen die eigene Schleife der Task. Verlangt einen Beleg statt einer Schätzung: den Höchststand aus dem Konsolenbefehl k, den Wächter im Idle-Hook oder den Forensik-Ring. Und eine Reserve, die dort großzügig ausfällt, wo der Speicher billig ist. Eine Antwort, die nur einen Faktor nennt, ohne zu sagen, wogegen gemessen wurde, besteht nicht.", bloom: analyze }
socratic:
  - { trigger: "task:ui-stayed-small:stuck", question: { en: "Whose code runs on the ui task's stack, and could a future app make that chain deeper without anyone touching the ui task?", de: "Wessen Code läuft auf dem Stack der ui-Task, und könnte eine künftige App diese Kette vertiefen, ohne dass jemand die ui-Task anfasst?" }, hints: [ { en: "Two of the three tasks call into code that is written by whoever wrote the app; one calls only into the canvas.", de: "Zwei der drei Tasks rufen Code auf, den schreibt, wer die App schreibt; eine ruft nur in das Canvas hinein." }, { en: "The header comment of apps/bringup/tasks.c names, per task, what runs on its stack.", de: "Der Kopfkommentar von apps/bringup/tasks.c nennt je Task, was auf ihrem Stack läuft." }, { en: "Write the prediction down even if you are unsure - this task lives on the comparison afterwards, not on a perfect guess.", de: "Schreib die Vorhersage auch dann hin, wenn du unsicher bist - diese Aufgabe lebt vom Vergleich danach, nicht vom perfekten Raten." } ] }
  - { trigger: "question:size-it:weak", question: { en: "You are asked for a criterion, not a number. Against what would you have to measure before you could name any number at all?", de: "Gefragt ist ein Kriterium, keine Zahl. Wogegen müsstest du messen, bevor du überhaupt eine Zahl nennen könntest?" }, hints: [ { en: "Both overflows happened in tasks whose own loop is short. So the loop is not the quantity.", de: "Beide Überläufe trafen Tasks, deren eigene Schleife kurz ist. Die Schleife ist also nicht die Größe." }, { en: "The firmware has three places that report or record stack depth; name at least one and say what it tells you.", de: "Die Firmware hat drei Stellen, die Stacktiefe melden oder festhalten; nenne mindestens eine und sag, was sie dir verrät." }, { en: "A criterion has two halves: what you measure, and how much you add on top - and the second half depends on where the memory lives.", de: "Ein Kriterium hat zwei Hälften: was du misst und wie viel du darauf legst - und die zweite Hälfte hängt davon ab, wo der Speicher liegt." } ] }
---

## Lernziel

Lerne, einen FreeRTOS-Task-Stack aus Evidenz statt aus Gewohnheit zu dimensionieren — anhand der zwei Überläufe, die diese Firmware tatsächlich erlitt, und der Speicheraufteilung, die die Korrekturen billig machte.

## Die falsche Annahme

`apps/bringup/tasks.c` beschrieb die input- und console-Tasks einst als „flach“ gegenüber der UI-Task, die die Canvas-Aufrufkette trägt. Das M2-Gate schien zuzustimmen: Höchststände ui 224 B, input 132 B, console 372 B. Beide kleineren Tasks liefen später über.

**Sieh dir die Datei selbst an:** drücke `Strg`/`Cmd`+`P`, tippe `tasks.c`, Enter — sie öffnet sich als Reiter **in der Mitte** des Fensters. Ohne Tastatur: ganz links das oberste Symbol der schmalen Leiste (der Datei-Explorer), dann durch den Baum klicken.

## Die Fallstudie kennst du schon

Wie ein Stack-Überlauf sich meldet — der Wächter im Idle-Hook, der Müll-PC `0xF7FF0FF0`, die Instruction-Fetch-Verletzung über eine zerstörte Rücksprungadresse — steht vollständig in **M3-04**. Hier wird sie nicht noch einmal erzählt, sondern benutzt.

## Zwei Tasks, zwei Überläufe, ein Muster

**console (2026-08-28).** Die App-Tree-Schleife der console-Task (`explorer_app_demo.c`) ruft jeden Tick `cads_net_poll()`. Mit `net.dhcp = 1` läuft dabei die DHCP-Client-Zustandsmaschine von lwIP auf demselben 512-Wort-Stack, den die Schleife auch für die gesamte App-Tree-Tick-Kette nutzt (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`, …). Korrektur: `CADS_CONSOLE_STACK` 512 → 1024 Worte. *Warum* ausgerechnet der DHCP-Pfad tiefer ist als der statische, ist die Frage von **M7-03**.

**input (2026-08-30).** `cads_input_tick()` ruft direkt den Input-Handler der aktiven App, synchron, auf dem Stack der input-Task. Die Menünavigation der Marauder-App war tief genug, das ursprüngliche 256-Wort-Budget zu sprengen — das kleinste der drei, obwohl es beliebige app-spezifische Tiefe trägt. Der Forensik-Ring hielt den Wächtereintrag `reason=input` 22 ms vor dem HardFault fest. Korrektur: `CADS_INPUT_STACK` 256 → 1024 Worte.

Das Gemeinsame: keine der beiden Tasks wurde von ihrer *eigenen* Schleife gesprengt.

## Warum die Korrekturen billig waren

Task-Stacks liegen im CCM (`CADS_CCM_SECTION`, M4-01) — der Region, die für DMA unsichtbar ist und deshalb nur Stacks und den MSP trägt. Dort waren vor der ersten Korrektur rund 59 KB von 64 KB frei, nach der zweiten ~54,7 KB. Die 2 KB und 3 KB kamen von dort und **kein einziges Byte** aus dem DMA-fähigen SRAM-Heap, dessen 256-B-Marge `scripts/check_ram_budget.py` bewacht (M4-02). Wo der Speicher liegt, entscheidet, ob eine großzügige Korrektur bezahlbar ist.

## Womit du prüfst

Drei Stellen dieser Firmware sagen etwas über Stacktiefe: der Konsolenbefehl `k` meldet die freien Höchststände aller drei Tasks, der Stack-Guard-Wächter im Idle-Hook schlägt an, bevor der Schaden endgültig ist, und der Forensik-Ring hält fest, welche Task zuletzt auffiel. Welche davon dir *vor* einem Absturz nützt und welche erst danach, ist der Unterschied zwischen Dimensionieren und Obduzieren.

**Willst du `k` selbst sehen** — dieser Step verlangt es nicht, aber es hilft beim Argumentieren: drücke **`F1`**, tippe `CaDS Board: Konsole öffnen`, Enter. **Unten** im Terminal-Bereich öffnet sich ein Terminal namens `CaDS Board Console` mit 115200 Baud; `Strg`/`Cmd`+`J` klappt den Bereich auf und wieder zu. Steht das Board im Touchscreen-App-Baum, überhört es einzelne Buchstaben — dann zuerst ein Terminal öffnen (**☰ → `Terminal` → `New Terminal`**; ☰ ist das Symbol mit den drei Strichen ganz oben links, eine sichtbare Menüleiste gibt es nicht) und einmal ausführen:

```bash
python3 scripts/board_key.py quit
```

Danach klickst du in das Terminal `CaDS Board Console`, tippst dort selbst `k` und drückst Enter. Die Antwort kommt in unter einer Sekunde und beginnt mit `# tasks`.

## Aufgabe 1 — vorhersagen, welcher Stack nicht wachsen musste

Schreib deine Vorhersage zuerst in das Eingabefeld dieser Aufgabe. Es steht unten im Steptext, dem Reiter `CaDS Tutor: Einen Task-Stack aus Evidenz dimensionieren` **in der Mitte** des Fensters. Erst der Knopf **Prüfen** daneben deckt danach die drei Zahlen auf; vorher siehst du sie nicht. Oben im selben Reiter liegt **Run all checks**.

<!-- SHOT: m4-predict-field-and-check | Eine predict-Aufgabe im Steptext: das Eingabefeld fuer die Vorhersage, der Knopf Pruefen daneben, die Enthuellung noch verdeckt -->

Dieselbe Enthüllung kannst du auch von Hand auslösen. Öffne ein Terminal — **☰ → `Terminal` → `New Terminal`**, Arbeitsverzeichnis ist die Projektwurzel — und tippe:

```bash
grep -nE 'define CADS_(UI|INPUT|CONSOLE)_STACK' apps/bringup/tasks.c
```

Es läuft sofort; Erfolg sind drei Zeilen mit Zeilennummer und Define. Tu das aber **erst**, nachdem deine Vorhersage steht — sonst prüfst du nichts mehr.

## Aufgabe 2 — das Kriterium nennen

Wogegen dimensionierst du einen Stack, dessen Inhalt du nicht selbst geschrieben hast?

## Wenn die Bedienung klemmt

- **Der Befehl lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, in dem du getippt hast — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin und trennt die Board-Konsole — zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt sie weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.
