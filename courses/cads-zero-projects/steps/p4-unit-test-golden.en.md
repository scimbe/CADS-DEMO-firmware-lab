---
id: p4-unit-test-golden
title: "Project: a unit test and a golden image"
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
    title: The new test is registered and the host suite is green
    check: { type: all, checks: [ { type: fileMatches, file: "tests/unit/CMakeLists.txt", pattern: "test_project" }, { type: task, label: "CaDS: Host tests", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the tests
    check: { type: question, prompt: { en: "What exactly does your unit test prove, and what would it catch that a golden image would not? For the write-only display, why is a golden image the right tool, and how would you tell an environmental pixel diff (SDL rounding) from a real rendering regression?", de: "Was genau beweist dein Unit-Test, und was finge er, das ein Golden Image nicht fängt? Warum ist für das nur beschreibbare Display ein Golden Image das richtige Werkzeug, und wie unterscheidest du einen umgebungsbedingten Pixel-Unterschied (SDL-Rundung) von einer echten Rendering-Regression?" }, rubric: "States a precise assertion the unit test makes; explains a golden image captures what the compositor would push to a panel that cannot be read back; and distinguishes a uniform off-by-one RGB565 rounding diff on anti-aliased edges (environmental) from a structural change in flat palette regions (a real regression).", bloom: create }
socratic:
  - { trigger: "task:tests-pass:failed", question: { en: "The suite is not green, or your test is not registered. Did you add it with cads_add_unit_test and link the module it exercises?", de: "Die Suite ist nicht grün, oder dein Test ist nicht registriert. Hast du ihn mit cads_add_unit_test ergänzt und das geprüfte Modul gelinkt?" }, hints: [ { en: "tests/unit/CMakeLists.txt registers each test with cads_add_unit_test(test_<name> test_<name>.c) plus a target_link_libraries line.", de: "tests/unit/CMakeLists.txt registriert jeden Test mit cads_add_unit_test(test_<name> test_<name>.c) plus einer target_link_libraries-Zeile." }, { en: "Name your test test_project so the acceptance check finds it, and link the toolbox/module it tests.", de: "Nenne deinen Test test_project, damit der Abnahme-Check ihn findet, und linke das Toolbox-/Modul, das er testet." }, { en: "For the golden side, add a case in targets/sim/tests and regenerate with the update_golden target; review the PNG before trusting it.", de: "Für die Golden-Seite ergänze einen Fall in targets/sim/tests und regeneriere mit dem Ziel update_golden; prüfe das PNG, bevor du ihm traust." } ] }
---
## Goal

Prove a piece of CaDS Zero two ways: a Unity unit test for portable logic, and a golden image for something that draws — the only way to test a write-only display.

## What you build on

This project assumes the Foundations steps on unit tests (m8-01-unit-tests) and golden images (m8-02-golden-images). The test wiring is in `tests/unit/CMakeLists.txt`; golden tests live in `targets/sim/tests/` and render through the same canvas the board uses (`tests/gallery/gallery.c`).

## Requirements

- **Unit test.** Add a Unity test named exactly **`test_project`** for a portable module (a `modules/toolbox` parser, a `modules/config` round trip, a canvas primitive). Register it in `tests/unit/CMakeLists.txt` with `cads_add_unit_test(test_project test_project.c)` and link the module it exercises. Assert a specific, meaningful property — not that the code merely runs.
- **Golden image.** Add or extend a golden-image case in `targets/sim/tests/` for a rendering you care about. Golden tests compare the compositor's real output pixel for pixel against a reference PNG; regenerate references only through the `update_golden` target and only after eyeballing the PNG, because a golden that captured a bug is worse than none.
- Everything here is host-only and needs no board — that is the point of the split.

## Acceptance

The first check confirms `tests/unit/CMakeLists.txt` registers `test_project` and that the full host suite (`CaDS: Host tests`) is green. The second defends what each test proves and how you would read a pixel-diff failure — telling a benign SDL RGB565 rounding diff from a real rendering regression.

## Deliver

One unit test with a precise assertion and one golden case, plus a short note on what each guards and why the display needs the golden.
