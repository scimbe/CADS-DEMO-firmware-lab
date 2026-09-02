---
id: m1-03-sim-vs-board
title: Simulator gegen Board
bloom: understand
objectives: [cz.arch.sim-vs-board]
requires: [m1-02-hal-boundary]
estimatedMinutes: 12
links:
  - { step: m1-04-splash }
  - { doc: "docs/how-to/port-to-new-board.md" }
  - { doc: "docs/reference/module-layout.md" }
sources: [docs/how-to/port-to-new-board.md, docs/reference/module-layout.md, targets/sim/hal_sim.c, CMakePresets.json]
tasks:
  - id: host-tests
    title: Host-Build und seine Tests bestehen
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: both-targets
    title: Warum beide Targets eine harte Regel sind
    check: { type: question, prompt: { en: "CaDS Zero says a feature that builds for only one of board and simulator is not finished. Name two concrete things the simulator gives the project that the board alone cannot, and one thing the simulator honestly refuses to pretend.", de: "CaDS Zero sagt, ein Feature, das nur für Board oder nur für Simulator baut, ist nicht fertig. Nenne zwei konkrete Dinge, die der Simulator dem Projekt gibt und die das Board allein nicht kann, und eine Sache, die der Simulator ehrlich nicht vortäuscht." }, rubric: "Nennt zwei von: portablen Code vor oder ohne Hardware entwickeln/testen, mehrere Personen arbeiten mit einem einzigen Board, Unit- und Golden-Image-Suite ohne Board ausführen, deterministische Screenshots eines nur beschreibbaren Displays. Nennt, dass der Net-Stub des Simulators nie einen Link meldet (keine RMII-Hardware zu simulieren) oder dass das Kernel-Modul nur für das Board gebaut wird.", bloom: understand }
socratic:
  - { trigger: "task:host-tests:failed", question: { en: "The host build needs no Arm toolchain but does need one library the simulator draws with. Which one, and does the first error mention it?", de: "Der Host-Build braucht keine Arm-Toolchain, aber eine Bibliothek, mit der der Simulator zeichnet. Welche, und nennt die erste Fehlermeldung sie?" }, hints: [ { en: "The host preset builds targets/sim against SDL2; the container ships libsdl2-dev.", de: "Das Host-Preset baut targets/sim gegen SDL2; der Container liefert libsdl2-dev mit." }, { en: "ctest runs the unit and golden tests; read the first failing test's name, not the summary.", de: "ctest führt Unit- und Golden-Tests aus; lies den Namen des ersten fehlschlagenden Tests, nicht die Zusammenfassung." }, { en: "A golden-image pixel diff of +1 in R/G/B on anti-aliased edges is SDL rounding, not a rendering regression - see the ROADMAP log of 2026-09-01.", de: "Ein Golden-Image-Pixelunterschied von +1 in R/G/B an Kanten ist SDL-Rundung, keine Render-Regression - siehe ROADMAP-Log vom 2026-09-01." } ] }
---
## Lernziel

Verstehe, was der Simulator ist, was er nicht ist, und warum „baut für beide Targets" ein Fertigstellungskriterium ist und keine Nettigkeit.

## Dieselbe Firmware, kein Board

`targets/sim/` implementiert `core/cads_hal.h` gegen SDL2. Das Preset `host` baut es mit deinem nativen Compiler, zusammen mit der gesamten Unit- und Golden-Image-Suite; keine Arm-Toolchain ist beteiligt. Weil jedes Modul oberhalb der HAL konstruktionsbedingt portabel ist (`docs/reference/module-layout.md`), sind Desktop, Menü, Apps, Canvas und Storage-Code, die in diesem SDL-Fenster laufen, **dieselben Objektdateien**, die das Board linkt — keine Neuimplementierung.

Das bringt die Schichtung der vorigen Steps ein:

- Portabler Code lässt sich entwickeln und testen, **bevor die Hardware existiert**, oder während jemand anderes das eine Board auf dem Tisch hat.
- Die **gesamte Testsuite läuft ohne angeschlossenes Board**: `ctest` in `build/host` führt die Unity-Unit-Tests für Toolbox, Storage, Config, Net-Helfer und GUI-Widgets aus, dazu die Golden-Image-Renderings echter Bildschirme.
- Ein nur beschreibbares Display lässt sich trotzdem **deterministisch aufnehmen**, und nur so existieren für dieses Panel überhaupt Golden Images.

## Wo der Simulator ehrlich ist

Der Simulator täuscht nichts vor, wo die Hardware nicht zu fälschen ist. Sein Board-Descriptor setzt `display_readable = true` — eine SDL-Oberfläche ist lesbar — während das ITSboard `false` setzt, und Code muss mit beidem umgehen. `modules/net` hat zwei Implementierungen für einen Header: `cads_net_board.c` besitzt ein echtes lwIP-netif über den RMII-MAC, `cads_net_sim.c` meldet **nie einen Link**, weil es keine RMII-Hardware zu simulieren gibt und ein Vortäuschen einer App erlauben würde, eine echte Netzwerkabhängigkeit bis zum Silizium zu verstecken. `modules/kernel` (FreeRTOS) wird nur für das Board gebaut; der Host hat keinen Scheduler.

## Warum es eine harte Regel ist

Die Onboarding-Datei des Maintainers sagt es unverblümt: ein Feature, das nur auf einem Target läuft, ist nicht fertig. Zwei Folgen: Erstens muss Hardwareabhängigkeit in `targets/` bleiben; ein verirrtes `#include "stm32f4xx.h"` in einem Feature-Modul bricht den Host-Build sofort — und genau das ist gewollt, der Compiler fängt den Schichtverstoß, bevor ein Reviewer es muss. Zweitens genügt „es hat kompiliert" auf keiner Seite: der Host beweist Logik, das Hardware-Gate des Boards beweist, dass es auf Silizium läuft, und eine Änderung braucht beides.

`docs/how-to/port-to-new-board.md` zeigt die Umkehrung: eine Portierung auf andere Hardware heißt, ein neues Verzeichnis unter `targets/` zu schreiben und sonst nichts zu ändern. Verlangt eine Portierung Änderungen in `gui/`, `services/` oder `apps/`, ist das ein Fehler in der Abstraktion.

## Deine Aufgabe

Führe Host-Build und Tests aus (Task **CaDS: Host tests**) und lass sie bestehen, dann beantworte, was der Simulator gibt und was er nicht vortäuscht. Der nächste Step macht deine erste echte Codeänderung und prüft sie auf beiden Seiten.
