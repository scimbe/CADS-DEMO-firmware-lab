---
id: m1-03-sim-vs-board
title: Simulator gegen Board
bloom: understand
objectives: [cz.arch.sim-vs-board]
requires: [m1-02-hal-boundary]
estimatedMinutes: 12
scaffold: faded
recallFrom: [m0-02-connect]
links:
  - { step: m1-04-splash }
  - { doc: "docs/how-to/port-to-new-board.md" }
  - { doc: "docs/reference/module-layout.md" }
  - { file: "modules/net/src/cads_net_sim.c", line: 1 }
sources: [docs/how-to/port-to-new-board.md, docs/reference/module-layout.md, targets/sim/hal_sim.c, CMakePresets.json, modules/net/src/cads_net_sim.c]
tasks:
  - id: host-tests
    title: Host-Build und seine Tests bestehen
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: net-stub
    title: Sage voraus, was der Netz-Stub des Simulators meldet
    check: { type: predict, prompt: { en: "modules/net has two implementations. What does the simulator one report when an app asks about the link?", de: "modules/net hat zwei Implementierungen. Was meldet die Simulator-Fassung, wenn eine App nach dem Link fragt?" }, then: { type: command, cwd: ".", command: "grep -n 'never a link' modules/net/src/cads_net_sim.c", expectExitCode: 0 }, rubric: "Die Vorhersage sagt sinngemäß, dass die Simulator-Fassung keinen Link meldet und deshalb jede Abfrage leer ausgeht. Die Ausgabe zeigt vier Stellen mit demselben Kommentar. Eine abweichende Vorhersage — etwa ein vorgetäuschter Link oder eine Fehlermeldung — zählt als bestanden, sobald der Unterschied nach dem Vergleich benannt und begründet wird.", bloom: understand }
  - id: both-targets
    title: Begründe den Stillstand im Simulator
    check: { type: question, prompt: { en: "An app needs the network and never shows data in the simulator. Why is that intended rather than a simulator bug?", de: "Eine App braucht das Netz und zeigt im Simulator nie Daten. Warum ist das Absicht und kein Simulatorfehler?" }, rubric: "Nennt, dass es im Simulator keine RMII-Hardware gibt und ein vorgetäuschter Link erlauben würde, eine echte Netzabhängigkeit bis zum Silizium zu verstecken. Der ehrliche Stillstand macht die Abhängigkeit schon im Host-Build sichtbar und schiebt den Nachweis dorthin, wo er hingehört: auf das Board. Wer die App für fehlerhaft hält oder nur anführt, SDL könne kein Ethernet, hat den Zweck dieser Ehrlichkeit nicht benannt.", bloom: understand }
socratic:
  - { trigger: "task:host-tests:failed", question: { en: "The host build needs no Arm toolchain, but it does need the library the simulator draws with. Does your first error message name one?", de: "Der Host-Build braucht keine Arm-Toolchain, aber die Bibliothek, mit der der Simulator zeichnet. Nennt deine erste Fehlermeldung eine?" }, hints: [ { en: "If the board build worked earlier, the cross toolchain is not the suspect here; this preset uses your own system's compiler.", de: "Wenn der Board-Build vorhin lief, ist die Cross-Toolchain hier nicht der Verdächtige; dieses Preset nimmt den Compiler deines eigenen Systems." }, { en: "Start the task by hand from the menu Terminal, Run Task..., and pick CaDS: Host tests; then read the FIRST failing test's name in the terminal, not the summary at the end.", de: "Starte den Task von Hand über das Menü Terminal, Run Task..., und wähle CaDS: Host tests; lies dann im Terminal den Namen des ERSTEN fehlschlagenden Tests, nicht die Zusammenfassung am Ende." }, { en: "A golden-image pixel diff of plus one in R, G or B on anti-aliased edges is SDL rounding, not a rendering regression - see the ROADMAP log of 2026-09-01.", de: "Ein Golden-Image-Pixelunterschied von plus eins in R, G oder B an geglätteten Kanten ist SDL-Rundung, keine Render-Regression - siehe ROADMAP-Log vom 2026-09-01." } ] }
  - { trigger: "task:net-stub:stuck", question: { en: "A stub has two honest options: pretend, or say no consistently. Which one fits a simulator with no network silicon?", de: "Ein Stub hat zwei ehrliche Möglichkeiten: so tun als ob, oder konsequent nein sagen. Welche passt zu einem Simulator ohne Netz-Silizium?" }, hints: [ { en: "The commonest reason to stall here is wanting to be right. The guess is not scored — the comparison afterwards is.", de: "Der häufigste Grund festzustecken ist, unbedingt richtig liegen zu wollen. Die Vorhersage wird nicht bewertet — der Vergleich danach schon." }, { en: "Before you guess, look at what targets/sim actually contains (Ctrl/Cmd+Shift+E, folder targets/sim): a screen, a keyboard, and nothing that carries packets.", de: "Sieh dir vor dem Raten an, was targets/sim überhaupt enthält (Strg/Cmd+Shift+E, Ordner targets/sim): einen Bildschirm, eine Tastatur und nichts, was Pakete trägt." }, { en: "Write your prediction down even if you are unsure, in one sentence. This task lives on the comparison with the file, not on a perfect guess.", de: "Schreib deine Vorhersage auch dann hin, wenn du unsicher bist, in einem Satz. Diese Aufgabe lebt vom Vergleich mit der Datei, nicht vom perfekten Raten." } ] }
  - { trigger: "question:both-targets:weak", question: { en: "Turn the question around: what could an app hide if the simulator faked a connection?", de: "Dreh die Frage um: was könnte eine App verstecken, wenn der Simulator eine Verbindung vortäuschte?" }, hints: [ { en: "The commonest wrong turn is to read the standstill as a shortcoming of the simulator. Ask instead whom it serves.", de: "Der häufigste Irrweg ist, den Stillstand als Mangel des Simulators zu lesen. Frag stattdessen, wem er nützt." }, { en: "Open modules/net/src/cads_net_sim.c with Ctrl/Cmd+P and read the file header, the first ten lines; it states the decision and its reason.", de: "Öffne modules/net/src/cads_net_sim.c mit Strg/Cmd+P und lies den Dateikopf, die ersten zehn Zeilen; er nennt die Entscheidung und ihren Grund." }, { en: "Remember the hardware gate from m0-01: code that merely compiled does not count as working. A faked link would move that proof — to where?", de: "Denk an das Hardware-Gate aus m0-01: Code, der nur kompiliert wurde, zählt nicht als funktionierend. Ein vorgetäuschter Link würde diesen Nachweis verschieben — wohin?" } ] }
---
## Lernziel

Verstehe, was der Simulator ist, was er nicht ist, und warum „baut für beide Targets“ ein Fertigstellungskriterium ist und keine Nettigkeit.

## Dieselbe Firmware, kein Board

`targets/sim/` implementiert `core/cads_hal.h` gegen SDL2 — die Grafikbibliothek, mit der der Simulator sein Fenster zeichnet. Das Preset `host`, das du in `m0-03` schon gebaut hast, übersetzt es mit dem nativen Compiler deines Systems, zusammen mit der gesamten Unit- und Golden-Image-Suite; keine Arm-Toolchain ist beteiligt. Weil jedes Modul oberhalb der HAL konstruktionsbedingt portabel ist (`docs/reference/module-layout.md`), sind Desktop, Menü, Apps, Canvas und Storage-Code, die in diesem SDL-Fenster laufen, **dieselben Objektdateien**, die das Board linkt — keine Neuimplementierung.

Das bringt die Schichtung der vorigen Steps ein:

- Portabler Code lässt sich entwickeln und testen, **bevor die Hardware existiert**, oder während jemand anderes das eine Board auf dem Tisch hat.
- Die **gesamte Testsuite läuft ohne angeschlossenes Board**: `ctest` in `build/host` führt die **Unity**-Unit-Tests aus — Unity ist das kleine C-Test-Framework, das dieses Projekt benutzt — für Toolbox, Storage, Config, Net-Helfer und GUI-Widgets, dazu die Golden-Image-Renderings echter Bildschirme.
- Ein nur beschreibbares Display lässt sich trotzdem **deterministisch aufnehmen**, und nur so existieren für dieses Panel überhaupt Golden Images.

## Wo der Simulator ehrlich ist

Der Simulator täuscht nichts vor, wo die Hardware nicht zu fälschen ist. Sein Board-Descriptor setzt `display_readable = true` — eine SDL-Oberfläche ist lesbar — während das ITSboard `false` setzt, und Code muss mit beidem umgehen.

`modules/net` hat zwei Implementierungen für einen Header: `cads_net_board.c` besitzt ein echtes lwIP-netif über den RMII-MAC des Chips, und `cads_net_sim.c` ist ein **Stub** — eine Fassung, die die Schnittstelle vollständig erfüllt, aber die Sache dahinter nicht tut, damit Code, der sie benutzt, trotzdem baut und läuft. Was genau dieser Stub meldet, sagst du gleich selbst voraus, bevor du die Datei aufschlägst.

`modules/kernel` (FreeRTOS) wird nur für das Board gebaut; der Host hat keinen **Scheduler** — kein Stück Software, das entscheidet, welche von mehreren gleichzeitigen Aufgaben gerade den Prozessor bekommt.

## Warum es eine harte Regel ist

Die Onboarding-Datei des Maintainers sagt es unverblümt: ein Feature, das nur auf einem Target läuft, ist nicht fertig. Zwei Folgen: Erstens muss Hardwareabhängigkeit in `targets/` bleiben; ein verirrtes `#include "stm32f4xx.h"` in einem Feature-Modul bricht den Host-Build sofort — und genau das ist gewollt, der Compiler fängt den Schichtverstoß, bevor ein Reviewer es muss. Zweitens genügt „es hat kompiliert“ auf keiner Seite: der Host beweist Logik, das Hardware-Gate des Boards beweist, dass es auf Silizium läuft, und eine Änderung braucht beides.

`docs/how-to/port-to-new-board.md` zeigt die Umkehrung: eine Portierung auf andere Hardware heißt, ein neues Verzeichnis unter `targets/` zu schreiben und sonst nichts zu ändern. Verlangt eine Portierung Änderungen in `gui/`, `services/` oder `apps/`, ist das ein Fehler in der Abstraktion.

## Deine Aufgabe

1. Lass Host-Build und Tests laufen: entweder mit **Prüfen** bei der ersten Aufgabe oder von Hand über **Terminal → Run Task…** und **CaDS: Host tests**.
2. Schreib bei der zweiten Aufgabe in einem Satz auf, was der Netz-Stub des Simulators meldet, *bevor* du nachsiehst. Erst danach zeigt dir der Check die Stellen in `modules/net/src/cads_net_sim.c`, und du vergleichst.
3. Beantworte zuletzt, warum der Stillstand im Simulator Absicht ist.

Der nächste Step macht deine erste echte Codeänderung und prüft sie auf beiden Seiten.
