---
id: p4-unit-test-golden
title: "Projekt: ein Unit-Test und ein Golden Image"
bloom: create
objectives: [cz.quality.golden]
requires: []
estimatedMinutes: 90
links:
  - { file: "tests/unit/CMakeLists.txt" }
  - { file: "targets/sim/tests/CMakeLists.txt" }
  - { doc: "docs/reference/canvas.md" }
sources: [tests/unit/CMakeLists.txt, targets/sim/tests/CMakeLists.txt, tests/gallery/gallery.c]
tasks:
  - id: tests-pass
    title: Der neue Test ist registriert und die Host-Suite ist grün
    check: { type: all, checks: [ { type: fileMatches, file: "tests/unit/CMakeLists.txt", pattern: "test_project" }, { type: task, label: "CaDS: Host tests", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige die Tests
    check: { type: question, prompt: { en: "What exactly does your unit test prove, and what would it catch that a golden image would not? For the write-only display, why is a golden image the right tool, and how would you tell an environmental pixel diff (SDL rounding) from a real rendering regression?", de: "Was genau beweist dein Unit-Test, und was finge er, das ein Golden Image nicht fängt? Warum ist für das nur beschreibbare Display ein Golden Image das richtige Werkzeug, und wie unterscheidest du einen umgebungsbedingten Pixel-Unterschied (SDL-Rundung) von einer echten Rendering-Regression?" }, rubric: "Nennt eine präzise Zusicherung des Unit-Tests; erklärt, dass ein Golden Image festhält, was der Compositor an ein nicht rücklesbares Panel schicken würde; und unterscheidet einen gleichförmigen Off-by-one-RGB565-Rundungsunterschied an Kantenglättung (umgebungsbedingt) von einer strukturellen Änderung in flachen Palettenflächen (echte Regression).", bloom: create }
socratic:
  - { trigger: "task:tests-pass:failed", question: { en: "The suite is not green, or your test is not registered. Did you add it with cads_add_unit_test and link the module it exercises?", de: "Die Suite ist nicht grün, oder dein Test ist nicht registriert. Hast du ihn mit cads_add_unit_test ergänzt und das geprüfte Modul gelinkt?" }, hints: [ { en: "tests/unit/CMakeLists.txt registers each test with cads_add_unit_test(test_<name> test_<name>.c) plus a target_link_libraries line.", de: "tests/unit/CMakeLists.txt registriert jeden Test mit cads_add_unit_test(test_<name> test_<name>.c) plus einer target_link_libraries-Zeile." }, { en: "Name your test test_project so the acceptance check finds it, and link the toolbox/module it tests.", de: "Nenne deinen Test test_project, damit der Abnahme-Check ihn findet, und linke das Toolbox-/Modul, das er testet." }, { en: "For the golden side, add a case in targets/sim/tests and regenerate with the update_golden target; review the PNG before trusting it.", de: "Für die Golden-Seite ergänze einen Fall in targets/sim/tests und regeneriere mit dem Ziel update_golden; prüfe das PNG, bevor du ihm traust." } ] }
---
## Ziel

Beweise ein Stück CaDS Zero auf zwei Wegen: einen Unity-Unit-Test für portable Logik und ein Golden Image für etwas, das zeichnet — die einzige Art, ein nur beschreibbares Display zu testen.

## Worauf du aufbaust

Dieses Projekt setzt die Grundlagen-Steps zu Unit-Tests (m8-01-unit-tests) und Golden Images (m8-02-golden-images) voraus. Die Test-Verdrahtung steht in `tests/unit/CMakeLists.txt`; Golden-Tests liegen in `targets/sim/tests/` und rendern über dasselbe Canvas wie das Board (`tests/gallery/gallery.c`).

## Anforderungen

- **Unit-Test.** Ergänze einen Unity-Test mit genau dem Namen **`test_project`** für ein portables Modul (einen `modules/toolbox`-Parser, eine `modules/config`-Rundreise, ein Canvas-Primitiv). Registriere ihn in `tests/unit/CMakeLists.txt` mit `cads_add_unit_test(test_project test_project.c)` und linke das geprüfte Modul. Sichere eine konkrete, sinnvolle Eigenschaft zu — nicht bloß, dass der Code läuft.
- **Golden Image.** Ergänze oder erweitere einen Golden-Image-Fall in `targets/sim/tests/` für ein Rendering, das dir wichtig ist. Golden-Tests vergleichen die echte Compositor-Ausgabe pixelgenau mit einem Referenz-PNG; regeneriere Referenzen nur über das Ziel `update_golden` und nur nach Sichtprüfung des PNG, denn ein Golden, das einen Fehler festhielt, ist schlimmer als keines.
- Alles hier ist host-only und braucht kein Board — genau das ist der Sinn der Trennung.

## Abnahme

Der erste Check bestätigt, dass `tests/unit/CMakeLists.txt` `test_project` registriert und dass die vollständige Host-Suite (`CaDS: Host tests`) grün ist. Der zweite verteidigt, was jeder Test beweist und wie du einen Pixel-Diff-Fehlschlag liest — einen harmlosen SDL-RGB565-Rundungsunterschied von einer echten Rendering-Regression unterscheidend.

## Liefern

Ein Unit-Test mit präziser Zusicherung und ein Golden-Fall, plus eine kurze Notiz, was jeder absichert und warum das Display das Golden braucht.
