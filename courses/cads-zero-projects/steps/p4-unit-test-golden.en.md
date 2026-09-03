---
id: p4-unit-test-golden
title: "Project: a unit test and a golden image"
bloom: create
objectives: [cz.quality.golden]
requires: []
estimatedMinutes: 90
scaffold: independent
links:
  - { file: "tests/unit/CMakeLists.txt" }
  - { file: "targets/sim/tests/CMakeLists.txt" }
  - { doc: "docs/reference/canvas.md" }
sources: [tests/unit/CMakeLists.txt, targets/sim/tests/CMakeLists.txt, tests/gallery/gallery.c, targets/sim/golden/README.md]
misconceptions:
  - { pattern: "No tests were found", question: { en: "ctest matched nothing by that name. Was the test registered, or only written?", de: "ctest hat unter diesem Namen nichts gefunden. Wurde der Test registriert oder nur geschrieben?" }, hints: [ { en: "A source file alone is invisible to ctest; registration happens in tests/unit/CMakeLists.txt.", de: "Eine Quelldatei allein ist für ctest unsichtbar; die Registrierung geschieht in tests/unit/CMakeLists.txt." }, { en: "After adding the registration the build directory has to be reconfigured before ctest knows the name.", de: "Nach dem Ergänzen der Registrierung muss das Build-Verzeichnis neu konfiguriert werden, bevor ctest den Namen kennt." }, { en: "The name in the registration, the file name and the name ctest filters on all have to be the same token.", de: "Der Name in der Registrierung, der Dateiname und der Name, nach dem ctest filtert, müssen derselbe Token sein." } ] }
tasks:
  - id: test-substance
    title: The test really asserts and a golden case was added
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -q TEST_ASSERT tests/unit/test_project.c && grep -q RUN_TEST tests/unit/test_project.c && grep -qE 'cads_add_unit_test\\(test_project' tests/unit/CMakeLists.txt", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -qE '^[[:space:]]*cads_add_golden_test[(][A-Za-z0-9_]*project' targets/sim/tests/CMakeLists.txt && find targets/sim/golden -name '*project*.png' | grep -q .", expectExitCode: 0 } ] }
  - id: test-runs
    title: ctest runs test_project and it passes
    check: { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host && ctest --preset host -R 'test_project|golden_[A-Za-z0-9_]*project' --output-on-failure", expectExitCode: 0, timeoutMs: 600000, bloom: create }
  - id: defend
    title: Defend how you read a pixel diff
    check: { type: question, prompt: { en: "How would you tell an SDL rounding diff from a real rendering regression in your own golden? Three sources of evidence - position, magnitude, history - one sentence each, plus one sentence on what your unit test assures that a golden does not catch, and the other way round.", de: "Wie unterscheidest du in deinem eigenen Golden einen SDL-Rundungsunterschied von einer echten Rendering-Regression? Drei Belegquellen - Lage, Größe, Historie - je ein Satz, plus ein Satz dazu, was dein Unit-Test zusichert, das ein Golden nicht fängt, und umgekehrt." }, rubric: "Names three sources of evidence and connects them. First the location: anti-aliased edges are intermediate values where a colour conversion rounds, while flat palette regions come unchanged out of the sixteen-colour palette and cannot round. Second the magnitude: a delta of one in an 8-bit channel is rounding, a markedly larger one is a different value drawn. Third the history: whether a rendering-relevant commit landed since the last regeneration. Also says what your unit test asserts that a golden would not catch, and vice versa. An answer with only one of the three sources does not pass.", bloom: create }
socratic:
  - { trigger: "task:test-substance:failed", question: { en: "Two things are checked: a test that really asserts, and a golden case of yours that ctest can run. Which one is missing?", de: "Zwei Dinge werden geprüft: ein Test, der wirklich zusichert, und ein eigener Golden-Fall, den ctest ausführen kann. Welches fehlt?" }, hints: [ { en: "Is it the unit half or the golden half that is missing? The first sub-check reads tests/unit, the second the golden registration under targets/sim.", de: "Fehlt die Unit-Hälfte oder die Golden-Hälfte? Der erste Teil-Check liest tests/unit, der zweite die Golden-Registrierung unter targets/sim." }, { en: "tests/unit/test_project.c needs at least one TEST_ASSERT and one RUN_TEST, and the registration in tests/unit/CMakeLists.txt is a pair of lines: cads_add_unit_test and a target_link_libraries for the module you exercise.", de: "tests/unit/test_project.c braucht mindestens ein TEST_ASSERT und ein RUN_TEST, und die Registrierung in tests/unit/CMakeLists.txt ist ein Zeilenpaar: cads_add_unit_test und ein target_link_libraries für das geprüfte Modul." }, { en: "The golden half wants a cads_add_golden_test(...) registration whose name carries the token project, plus the reference PNG under targets/sim/golden - and ctest has to run that case and see it pass.", de: "Die Golden-Hälfte will eine cads_add_golden_test(...)-Registrierung, deren Name das Token project trägt, dazu die Referenz-PNG unter targets/sim/golden - und ctest muss diesen Fall ausführen und bestehen sehen." } ] }
  - { trigger: "task:test-runs:failed", question: { en: "Did the build fail, or did ctest run your test and see an assertion fail? The two need different fixes.", de: "Ist der Build gescheitert, oder hat ctest deinen Test ausgeführt und eine Zusicherung scheitern sehen? Die beiden brauchen verschiedene Reparaturen." }, hints: [ { en: "Does ctest report that nothing matched the filter? Then a registration or the reconfigure is missing, and your assertion is not at fault at all.", de: "Meldet ctest, dass nichts zum Filter passt? Dann fehlt eine Registrierung oder die Neukonfiguration, und deine Zusicherung ist gar nicht schuld." }, { en: "Every RUN_TEST must sit in main() between UNITY_BEGIN() and UNITY_END(); a case that is never run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein nie ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line and check it against the header contract before changing the assertion to match the code.", de: "Lies die Expected/Actual-Zeile und prüf sie gegen den Header-Vertrag, bevor du die Zusicherung an den Code anpasst." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two diffs, same pixel count. One sits only on anti-aliased edges, the other inside flat blocks. Which is which, and why?", de: "Zwei Diffs, gleiche Pixelzahl. Der eine liegt nur auf geglätteten Kanten, der andere in flachen Flächen. Welcher ist welcher, und warum?" }, hints: [ { en: "Does your diff sit on anti-aliased edges or inside flat blocks? Only one of the two positions can come from a colour conversion at all.", de: "Liegt dein Diff auf geglätteten Kanten oder in flachen Flächen? Nur eine der beiden Lagen kann überhaupt von einer Farbkonvertierung stammen." }, { en: "The magnitude matters as much as the position: a delta of one is rounding, a larger one is a different value.", de: "Die Größe zählt so viel wie die Lage: ein Delta von eins ist Rundung, ein größeres ein anderer Wert." }, { en: "Name the third source of evidence too: what git says has changed since the reference was made.", de: "Nenne auch die dritte Belegquelle: was git seit der Erzeugung der Referenz als geändert ausweist." } ] }
---
## Goal

Prove a piece of CaDS Zero two ways: a Unity unit test for portable logic, and a golden image for something that draws — the only way to test a write-only display.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m8-01-unit-tests` and `m8-02-golden-images`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

This project assumes the Foundations steps on unit tests (m8-01-unit-tests) and golden images (m8-02-golden-images). The test wiring is in `tests/unit/CMakeLists.txt`; golden tests live in `targets/sim/tests/` and render through the same canvas the board uses (`tests/gallery/gallery.c`).

## Requirements

- **Unit test.** Add a Unity test named exactly **`test_project`** for a portable module (a `modules/toolbox` parser, a `modules/config` round trip, a canvas primitive). Register it in `tests/unit/CMakeLists.txt` with `cads_add_unit_test(test_project test_project.c)` and link the module it exercises. Assert a specific, meaningful property — not that the code merely runs.
- **Golden image.** Add or extend a golden-image case in `targets/sim/tests/` for a rendering you care about. Golden tests compare the compositor's real output pixel for pixel against a reference PNG; regenerate references only through the `update_golden` target and only after eyeballing the PNG, because a golden that captured a bug is worse than none.
- Everything here is host-only and needs no board — that is the point of the split.

## Acceptance

1. **Substance in both halves.** `tests/unit/test_project.c` must exist and contain at least one `TEST_ASSERT` and at least one `RUN_TEST`, and `tests/unit/CMakeLists.txt` must register it with `cads_add_unit_test(test_project ...)`. For the golden half the check requires a `cads_add_golden_test(<name> ...)` registration whose name carries the token `project`, together with its reference PNG under `targets/sim/golden/`. A merely touched file under `targets/sim` is not enough — a `touch` passed the old check and does not pass this one.
2. **Both tests really run.** The host build is configured and built, and `ctest` runs filtered on `test_project` **and** your golden case. Both must execute and pass; if ctest finds no matching test, the test preset reports that as an error.
3. **Defence.** You explain how you read a pixel diff.

## Deliver

One unit test with a precise assertion and one golden case, plus a short note on what each guards and why the display needs the golden.
