---
id: p4-unit-test-golden
title: "Projekt: ein Unit-Test und ein Golden Image"
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
    title: Der Test sichert wirklich zu und ein Golden-Fall ist dazugekommen
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -q TEST_ASSERT tests/unit/test_project.c && grep -q RUN_TEST tests/unit/test_project.c && grep -qE 'cads_add_unit_test\\(test_project' tests/unit/CMakeLists.txt", expectExitCode: 0 }, { type: command, cwd: ".", command: "git status --porcelain -- targets/sim | grep -q .", expectExitCode: 0 } ] }
  - id: test-runs
    title: ctest führt test_project aus und er besteht
    check: { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host && ctest --preset host -R test_project --output-on-failure", expectExitCode: 0, timeoutMs: 600000, bloom: create }
  - id: defend
    title: Verteidige das Lesen eines Pixel-Diffs
    check: { type: question, prompt: { en: "How would you tell an SDL rounding diff from a real rendering regression in your own golden?", de: "Wie unterscheidest du in deinem eigenen Golden einen SDL-Rundungsunterschied von einer echten Rendering-Regression?" }, rubric: "Nennt drei Belegquellen und verknüpft sie. Erstens die Lage: geglättete Kanten sind Zwischenwerte, an denen eine Farbkonvertierung rundet, flache Palettenflächen kommen unverändert aus der Palette mit sechzehn Farben und können nicht runden. Zweitens die Größe: ein Delta von eins in einem 8-Bit-Kanal ist Rundung, ein deutlich größeres ist ein anderer gezeichneter Wert. Drittens die Historie: ob seit der letzten Regeneration ein renderingrelevanter Commit landete. Sagt außerdem, was der eigene Test zusichert, das ein Golden nicht fängt, und umgekehrt. Eine Antwort mit nur einer der drei Quellen besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:test-substance:failed", question: { en: "Two things are checked: a test that really asserts, and a change under targets/sim. Which one is missing?", de: "Zwei Dinge werden geprüft: ein Test, der wirklich zusichert, und eine Änderung unter targets/sim. Welches fehlt?" }, hints: [ { en: "The file has to be tests/unit/test_project.c and contain at least one TEST_ASSERT and at least one RUN_TEST.", de: "Die Datei muss tests/unit/test_project.c heißen und mindestens ein TEST_ASSERT und mindestens ein RUN_TEST enthalten." }, { en: "The registration in tests/unit/CMakeLists.txt is a pair of lines: cads_add_unit_test and a target_link_libraries for the module you exercise.", de: "Die Registrierung in tests/unit/CMakeLists.txt ist ein Zeilenpaar: cads_add_unit_test und ein target_link_libraries für das geprüfte Modul." }, { en: "The golden half needs something new or changed under targets/sim - a scene, a reference PNG, or the CMake case that registers it.", de: "Die Golden-Hälfte braucht etwas Neues oder Geändertes unter targets/sim - eine Szene, eine Referenz-PNG oder den CMake-Fall, der sie registriert." } ] }
  - { trigger: "task:test-runs:failed", question: { en: "Did the build fail, or did ctest run your test and see an assertion fail? The two need different fixes.", de: "Ist der Build gescheitert, oder hat ctest deinen Test ausgeführt und eine Zusicherung scheitern sehen? Die beiden brauchen verschiedene Reparaturen." }, hints: [ { en: "If ctest reports that no tests were found, the registration or the reconfigure is the problem, not the assertion.", de: "Meldet ctest, dass keine Tests gefunden wurden, ist die Registrierung oder die Neukonfiguration das Problem, nicht die Zusicherung." }, { en: "Every RUN_TEST must sit in main() between UNITY_BEGIN() and UNITY_END(); a case that is never run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein nie ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line and check it against the header contract before changing the assertion to match the code.", de: "Lies die Expected/Actual-Zeile und prüf sie gegen den Header-Vertrag, bevor du die Zusicherung an den Code anpasst." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two diffs, same pixel count. One sits only on anti-aliased edges, the other inside flat blocks. Which is which, and why?", de: "Zwei Diffs, gleiche Pixelzahl. Der eine liegt nur auf geglätteten Kanten, der andere in flachen Flächen. Welcher ist welcher, und warum?" }, hints: [ { en: "Flat regions come straight out of the sixteen-colour palette, so a conversion has nothing there to round.", de: "Flache Flächen kommen direkt aus der Palette mit sechzehn Farben, eine Konvertierung hat dort also nichts zu runden." }, { en: "The magnitude matters as much as the position: a delta of one is rounding, a larger one is a different value.", de: "Die Größe zählt so viel wie die Lage: ein Delta von eins ist Rundung, ein größeres ein anderer Wert." }, { en: "Name the third source of evidence too: what git says has changed since the reference was made.", de: "Nenne auch die dritte Belegquelle: was git seit der Erzeugung der Referenz als geändert ausweist." } ] }
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

1. **Substanz beider Hälften.** `tests/unit/test_project.c` muss existieren und mindestens ein `TEST_ASSERT` sowie mindestens ein `RUN_TEST` enthalten, und `tests/unit/CMakeLists.txt` muss ihn mit `cads_add_unit_test(test_project ...)` registrieren. Für die Golden-Hälfte muss unter `targets/sim` etwas von dir liegen — eine neue Szene, eine Referenz-PNG oder der CMake-Fall, der sie registriert.
2. **Der Test läuft wirklich.** Der Host-Build wird konfiguriert, gebaut, und `ctest` wird auf genau diesen Namen gefiltert. Eine auskommentierte Registrierung fällt hier durch, weil ctest dann gar keinen passenden Test findet.
3. **Verteidigung.** Du erklärst, wie du einen Pixel-Diff liest.

## Liefern

Ein Unit-Test mit präziser Zusicherung und ein Golden-Fall, plus eine kurze Notiz, was jeder absichert und warum das Display das Golden braucht.
