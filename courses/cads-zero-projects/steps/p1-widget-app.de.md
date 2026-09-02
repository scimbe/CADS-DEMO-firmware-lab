---
id: p1-widget-app
title: "Projekt: eigene App mit Widget"
bloom: create
objectives: [cz.gui.app]
requires: []
estimatedMinutes: 120
links:
  - { file: "apps/about/cads_about.c" }
  - { file: "apps/menu/cads_menu_app.c" }
  - { doc: "docs/reference/canvas.md" }
sources: [apps/about/cads_about.c, apps/menu/cads_menu_app.c, gui/canvas.h]
tasks:
  - id: app-builds
    title: Die App ist registriert, ins Menü eingebunden und baut
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" }, { type: fileMatches, file: "apps/menu/cads_menu_app.c", pattern: "cads_project_app_init" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige den Entwurf
    check: { type: question, prompt: { en: "Describe your app's one job, the single widget it draws, and how it keeps its damage small. Why does it never draw outside a view's area, and how does a touch on the soft-key strip reach it as a key press?", de: "Beschreibe die eine Aufgabe deiner App, das eine Widget, das sie zeichnet, und wie sie ihren Schaden klein hält. Warum zeichnet sie nie außerhalb der Fläche einer View, und wie erreicht ein Tipp auf die Softkey-Leiste sie als Tastendruck?" }, rubric: "Nennt einen klaren Einzelzweck; benennt ein Widget und dessen Schaden-Rechteck; erklärt, dass Zeichnen auf cads_view_area()/dirty_rect beschränkt ist und Softkey-Berührungen vom Framework zu Tastenereignissen werden, sodass Taste und Touch einen Ereignisstrom ergeben.", bloom: create }
socratic:
  - { trigger: "task:app-builds:failed", question: { en: "The build cannot see your init, or the menu never calls it. Did you both link the app's library and register it the way apps/about is?", de: "Der Build sieht deine Init nicht, oder das Menü ruft sie nie. Hast du sowohl die Bibliothek der App gelinkt als auch sie so registriert wie apps/about?" }, hints: [ { en: "Model the whole shape on apps/about: a view, softkeys, and a cads_view_dispatcher_add() with a unique view id.", de: "Baue die ganze Form nach apps/about nach: eine View, Softkeys und ein cads_view_dispatcher_add() mit einer eindeutigen View-ID." }, { en: "cads_menu_app.c must #include your header, call cads_project_app_init(dispatcher), and add a cads_menu_item_t row pointing at your view id.", de: "cads_menu_app.c muss deinen Header einbinden, cads_project_app_init(dispatcher) aufrufen und eine cads_menu_item_t-Zeile ergänzen, die auf deine View-ID zeigt." }, { en: "Give the app its own CMake library and link it from apps/menu/CMakeLists.txt, exactly as cads_app_about is linked.", de: "Gib der App eine eigene CMake-Bibliothek und linke sie aus apps/menu/CMakeLists.txt, genau wie cads_app_about gelinkt wird." } ] }
---
## Ziel

Füge CaDS Zero eine wirklich neue Anwendung hinzu: eine eigene View, ein Widget, ins Menü eingebunden und auf dem echten Panel erreichbar.

## Worauf du aufbaust

Dieses Projekt setzt das Grundlagen-Modul M5 voraus, besonders den Step, in dem du deine eigene Menü-App ergänzt hast (m5-03-own-app), und das View-/Dispatcher-Modell (m5-02-view-dispatcher). Lies `apps/about/cads_about.c` erneut — es ist die kleinste vollständige App im Baum und deine beste Vorlage.

## Anforderungen

- Lege eine neue App unter `apps/<name>/` mit eigener CMake-Bibliothek an, nach dem Vorbild von `apps/about`.
- Stelle eine Init-Funktion mit genau dem Namen **`cads_project_app_init(cads_view_dispatcher_t*)`** bereit, die eine `cads_view_t` aufbaut, Titel und Softkeys setzt und eine eindeutige View-ID mit `cads_view_dispatcher_add()` registriert.
- Zeichne **ein Widget** deiner Wahl (eine Anzeige, eine Liste, ein kleines Messfeld) mit der Canvas-API und halte deinen Schaden auf das tatsächlich geänderte Rechteck begrenzt — zeichne nie den ganzen Bildschirm neu. Siehe `docs/reference/canvas.md`.
- Binde sie in den Launcher ein: `#include` deinen Header in `apps/menu/cads_menu_app.c`, rufe `cads_project_app_init(dispatcher)` neben den anderen `cads_*_init`-Aufrufen auf, ergänze eine `cads_menu_item_t`-Zeile mit deiner View-ID und linke deine Bibliothek aus `apps/menu/CMakeLists.txt`.
- Beachte die Beide-Targets-Regel: nichts oberhalb der HAL darf board-only werden, deine App muss also auch für den Host bauen.

## Abnahme

Der erste Check bestätigt, dass die ELF nun `cads_project_app_init` enthält, dass `apps/menu/cads_menu_app.c` es referenziert und dass das Board-Image sauber baut. Der zweite ist eine Entwurfsverteidigung: du erklärst die eine Aufgabe der App, ihr Widget, ihre Schadensdisziplin und wie Touch und Tasten einen Ereignisstrom liefern.

## Liefern

Eine kleine, fokussierte App — ein Bildschirm, der eine Sache gut macht — plus eine kurze Notiz zu den Entwurfsentscheidungen, die du im Review verteidigen würdest.
