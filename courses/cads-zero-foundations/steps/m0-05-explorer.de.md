---
id: m0-05-explorer
title: Die Bring-up-Explorer-Konsole
bloom: understand
objectives: [firmware-how-to-board-test]
requires: [m0-04-flash-console]
estimatedMinutes: 12
links:
  - { step: m1-01-module-layout }
  - { doc: "docs/reference/explorer-console.md" }
  - { doc: "docs/how-to/debug.md" }
sources: [docs/reference/explorer-console.md, docs/how-to/debug.md]
tasks:
  - id: tried-commands
    title: Du hast einige Explorer-Befehle ausgeführt
    check: { type: manual }
  - id: which-command
    title: Ordne ein Symptom dem richtigen Befehl zu
    check: { type: question, prompt: { en: "A button on the adapter does nothing when pressed, and you do not know which STM32 pin it is wired to. Which single-letter explorer command finds that out, and how does it work?", de: "Ein Taster am Adapter tut nichts, und du weißt nicht, an welchem STM32-Pin er hängt. Welcher Ein-Buchstaben-Explorer-Befehl findet das heraus, und wie funktioniert er?" }, rubric: "Nennt den Befehl 'w' und erklärt, dass er das Eingaberegister (IDR) jedes Ports auf Änderungen beobachtet, sodass der Tastendruck zeigt, welcher Pin sich bewegt; 'i' liefert eine statische Einmal-Ausgabe.", bloom: understand }
socratic:
  - { trigger: "task:tried-commands:stuck", question: { en: "A freshly flashed board boots into the touchscreen app tree, which ignores plain typed commands. How do you get back to the console prompt so a command is heard?", de: "Ein frisch geflashtes Board bootet in den Touchscreen-App-Baum, der einfache Tastenbefehle ignoriert. Wie kommst du zurück zum Konsolen-Prompt, damit ein Befehl gehört wird?" }, hints: [ { en: "The app-tree session only ends on the reserved quit byte, not any typed character.", de: "Die App-Baum-Sitzung endet nur beim reservierten Quit-Byte, nicht bei einem getippten Zeichen." }, { en: "Send board_key.py quit once, then your plain console command is heard again.", de: "Sende einmal board_key.py quit, danach wird dein einfacher Konsolenbefehl wieder gehört." }, { en: "Send '?' to reprint the command list once you are at the prompt.", de: "Sende '?', um am Prompt die Befehlsliste erneut auszugeben." } ] }
---
## Lernziel

Lerne, was die Bring-up-Explorer-Konsole ist, und baue dir eine Zuordnung von Symptom zu Befehl auf, damit du das Board direkt befragst, statt zu raten.

## Eine Konsole, die älter ist als die GUI

`apps/bringup` baut einen zweiten Firmware-Einsprungpunkt, getrennt vom echten App-Baum: eine **Ein-Buchstaben-Befehlskonsole** über dieselbe USART, die die ST-Link als virtuellen COM-Port bereitstellt. Sie existiert, weil die meisten Subsysteme dieses Boards — der Ethernet-MAC und die PHY, die GPIO-Bänke des Adapters, der nur beschreibbare Displaybus — einem Menschen ihren Zustand nicht melden können, ohne dass ein Treiber bereits vertrauenswürdig ist. Diese Konsole hat jedes einzelne davon in Betrieb genommen und per Hardware-Gate abgesichert, bevor die GUI existierte, die es später umschloss.

Jeder Befehl ist ein Zeichen, optional gefolgt von ein oder zwei durch Leerraum getrennten Argumenten. Sende jederzeit `?`, um die vollständige Befehlsliste erneut auszugeben; die Hilfezeichenkette der Firmware ist die maßgebliche Wahrheit, falls die Referenz je abweicht. Vollständiger Katalog: `docs/reference/explorer-console.md`.

## Von Symptom zu Befehl

Der Wert des Explorers liegt darin, dass es meist schneller ist, ein Subsystem direkt zu fragen, als einen Debugger anzuhängen. Einige Zuordnungen, die dir wieder begegnen (`docs/how-to/debug.md`):

| Symptom | Greife zu | Warum |
|---|---|---|
| Ein Taster tut nichts oder das Falsche | `w`, dann `i` | `w` beobachtet das Eingaberegister jedes Ports auf Änderungen — Taster drücken, sehen, welcher Pin sich bewegt |
| Eine Task wirkt ausgehungert oder ein Stack knapp | `k` | Stack-Höchststände je Task, Task-Anzahl, Eingabezähler |
| Der Ethernet-Link verhält sich seltsam | `e`, `a`, `m` | sie sprechen die PHY über MDIO *unterhalb* von lwIP an, antworten also unabhängig davon, ob ein netif läuft |
| Der Display-Durchsatz wirkt daneben | `V` | misst den Vollbild-Flush-Durchsatz unter echter Scheduler- und Netzwerklast neu |

Ein Befehl, `z FAULT`, ist absichtlich destruktiv: er löst gezielt einen UsageFault aus und hält für immer an, um zu beweisen, dass der Fault-Handler funktioniert. Er verlangt das wörtliche Argument `FAULT`, damit ein Vertipper ihn nicht auslöst. Alles andere ist nur lesend oder von begrenzter Dauer.

## Ein Stolperstein, den du einmal triffst

Ein frisch geflashtes Board bootet direkt in den Touchscreen-App-Baum (`boot.autostart = 1`), und diese Sitzung **ignoriert einfache getippte Bytes mit Absicht** — ein verirrter Konsolenbefehl tut nichts und druckt nichts, nicht einmal einen Fehler, was genau wie ein hängendes Board aussieht. Sende einmal `scripts/board_key.py quit`, um zum Konsolen-Prompt zurückzukehren, dann werden deine einfachen Befehle wieder gehört.

## Deine Aufgabe

Öffne die Board-Konsole, kehre bei Bedarf zum Prompt zurück und probiere einige Befehle — `?` für die Liste, `k` für den Task-Bericht, `i` für eine Einmal-Portausgabe. Beantworte dann eine Frage, die ein Symptom dem richtigen Befehl zuordnet. Das nächste Modul öffnet, wie die Firmware tatsächlich strukturiert ist.
