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
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -q TEST_ASSERT tests/unit/test_project.c && grep -q RUN_TEST tests/unit/test_project.c && grep -qE 'cads_add_unit_test\\(test_project' tests/unit/CMakeLists.txt", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -qE '^[[:space:]]*cads_add_golden_test[(][A-Za-z0-9_]*project' targets/sim/tests/CMakeLists.txt && find targets/sim/golden -name '*project*.png' | grep -q .", expectExitCode: 0 } ] }
  - id: test-runs
    title: ctest führt test_project aus und er besteht
    check: { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host && ctest --preset host -R 'test_project|golden_[A-Za-z0-9_]*project' --output-on-failure", expectExitCode: 0, timeoutMs: 600000, bloom: create }
  - id: defend
    title: Verteidige das Lesen eines Pixel-Diffs
    check: { type: question, prompt: { en: "How would you tell an SDL rounding diff from a real rendering regression in your own golden? Three sources of evidence - position, magnitude, history - one sentence each, plus one sentence on what your unit test assures that a golden does not catch, and the other way round.", de: "Wie unterscheidest du in deinem eigenen Golden einen SDL-Rundungsunterschied von einer echten Rendering-Regression? Drei Belegquellen - Lage, Größe, Historie - je ein Satz, plus ein Satz dazu, was dein Unit-Test zusichert, das ein Golden nicht fängt, und umgekehrt." }, rubric: "Nennt drei Belegquellen und verknüpft sie. Erstens die Lage: geglättete Kanten sind Zwischenwerte, an denen eine Farbkonvertierung rundet, flache Palettenflächen kommen unverändert aus der Palette mit sechzehn Farben und können nicht runden. Zweitens die Größe: ein Delta von eins in einem 8-Bit-Kanal ist Rundung, ein deutlich größeres ist ein anderer gezeichneter Wert. Drittens die Historie: ob seit der letzten Regeneration ein renderingrelevanter Commit landete. Sagt außerdem, was der eigene Test zusichert, das ein Golden nicht fängt, und umgekehrt. Eine Antwort mit nur einer der drei Quellen besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:test-substance:failed", question: { en: "Two things are checked: a test that really asserts, and a golden case of yours that ctest can run. Which one is missing?", de: "Zwei Dinge werden geprüft: ein Test, der wirklich zusichert, und ein eigener Golden-Fall, den ctest ausführen kann. Welches fehlt?" }, hints: [ { en: "Is it the unit half or the golden half that is missing? The first sub-check reads tests/unit, the second the golden registration under targets/sim.", de: "Fehlt die Unit-Hälfte oder die Golden-Hälfte? Der erste Teil-Check liest tests/unit, der zweite die Golden-Registrierung unter targets/sim." }, { en: "tests/unit/test_project.c needs at least one TEST_ASSERT and one RUN_TEST, and the registration in tests/unit/CMakeLists.txt is a pair of lines: cads_add_unit_test and a target_link_libraries for the module you exercise.", de: "tests/unit/test_project.c braucht mindestens ein TEST_ASSERT und ein RUN_TEST, und die Registrierung in tests/unit/CMakeLists.txt ist ein Zeilenpaar: cads_add_unit_test und ein target_link_libraries für das geprüfte Modul." }, { en: "The golden half wants a cads_add_golden_test(...) registration whose name carries the token project, plus the reference PNG under targets/sim/golden - and ctest has to run that case and see it pass.", de: "Die Golden-Hälfte will eine cads_add_golden_test(...)-Registrierung, deren Name das Token project trägt, dazu die Referenz-PNG unter targets/sim/golden - und ctest muss diesen Fall ausführen und bestehen sehen." } ] }
  - { trigger: "task:test-runs:failed", question: { en: "Did the build fail, or did ctest run your test and see an assertion fail? The two need different fixes.", de: "Ist der Build gescheitert, oder hat ctest deinen Test ausgeführt und eine Zusicherung scheitern sehen? Die beiden brauchen verschiedene Reparaturen." }, hints: [ { en: "Does ctest report that nothing matched the filter? Then a registration or the reconfigure is missing, and your assertion is not at fault at all.", de: "Meldet ctest, dass nichts zum Filter passt? Dann fehlt eine Registrierung oder die Neukonfiguration, und deine Zusicherung ist gar nicht schuld." }, { en: "Every RUN_TEST must sit in main() between UNITY_BEGIN() and UNITY_END(); a case that is never run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein nie ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line and check it against the header contract before changing the assertion to match the code.", de: "Lies die Expected/Actual-Zeile und prüf sie gegen den Header-Vertrag, bevor du die Zusicherung an den Code anpasst." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two diffs, same pixel count. One sits only on anti-aliased edges, the other inside flat blocks. Which is which, and why?", de: "Zwei Diffs, gleiche Pixelzahl. Der eine liegt nur auf geglätteten Kanten, der andere in flachen Flächen. Welcher ist welcher, und warum?" }, hints: [ { en: "Does your diff sit on anti-aliased edges or inside flat blocks? Only one of the two positions can come from a colour conversion at all.", de: "Liegt dein Diff auf geglätteten Kanten oder in flachen Flächen? Nur eine der beiden Lagen kann überhaupt von einer Farbkonvertierung stammen." }, { en: "The magnitude matters as much as the position: a delta of one is rounding, a larger one is a different value.", de: "Die Größe zählt so viel wie die Lage: ein Delta von eins ist Rundung, ein größeres ein anderer Wert." }, { en: "Name the third source of evidence too: what git says has changed since the reference was made.", de: "Nenne auch die dritte Belegquelle: was git seit der Erzeugung der Referenz als geändert ausweist." } ] }
---
## Ziel

Beweise ein Stück CaDS Zero auf zwei Wegen: einen Unity-Unit-Test für portable Logik und ein Golden Image für etwas, das zeichnet — die einzige Art, ein nur beschreibbares Display zu testen.

## Worauf du aufbaust

**Voraussetzung:** Bearbeite diesen Projekt-Step erst nach den Grundlagen-Steps `m8-01-unit-tests` und `m8-02-golden-images`. Der Tutor kann das nicht erzwingen: `requires:` löst nur Steps desselben Packs auf, und die Sperre in `course.json` verlangt den gesamten Grundlagenkurs — die Reihenfolge innerhalb der Projekte liegt bei dir.

Dieses Projekt setzt die Grundlagen-Steps zu Unit-Tests (m8-01-unit-tests) und Golden Images (m8-02-golden-images) voraus. Die Test-Verdrahtung steht in `tests/unit/CMakeLists.txt`; Golden-Tests liegen in `targets/sim/tests/` und rendern über dasselbe Canvas wie das Board (`tests/gallery/gallery.c`).

## Anforderungen

- **Unit-Test.** Ergänze einen Unity-Test mit genau dem Namen **`test_project`** für ein portables Modul (einen `modules/toolbox`-Parser, eine `modules/config`-Rundreise, ein Canvas-Primitiv). Registriere ihn in `tests/unit/CMakeLists.txt` mit `cads_add_unit_test(test_project test_project.c)` und linke das geprüfte Modul. Sichere eine konkrete, sinnvolle Eigenschaft zu — nicht bloß, dass der Code läuft.
- **Golden Image.** Ergänze oder erweitere einen Golden-Image-Fall in `targets/sim/tests/` für ein Rendering, das dir wichtig ist. Golden-Tests vergleichen die echte Compositor-Ausgabe pixelgenau mit einem Referenz-PNG; regeneriere Referenzen nur über das Ziel `update_golden` und nur nach Sichtprüfung des PNG, denn ein Golden, das einen Fehler festhielt, ist schlimmer als keines.
- Alles hier ist host-only und braucht kein Board — genau das ist der Sinn der Trennung.

## Abnahme

1. **Substanz beider Hälften.** `tests/unit/test_project.c` muss existieren und mindestens ein `TEST_ASSERT` sowie mindestens ein `RUN_TEST` enthalten, und `tests/unit/CMakeLists.txt` muss ihn mit `cads_add_unit_test(test_project ...)` registrieren. Für die Golden-Hälfte verlangt der Check eine Registrierung `cads_add_golden_test(<name> ...)`, deren Name das Token `project` enthält, samt der zugehörigen Referenz-PNG unter `targets/sim/golden/`. Eine bloß angefasste Datei unter `targets/sim` genügt nicht — ein `touch` bestand den alten Check und besteht diesen nicht.
2. **Beide Tests laufen wirklich.** Der Host-Build wird konfiguriert, gebaut, und `ctest` läuft gefiltert auf `test_project` **und** deinen Golden-Fall. Beide müssen ausgeführt werden und bestehen; findet ctest keinen passenden Test, meldet das Test-Preset das als Fehler.
3. **Verteidigung.** Du erklärst, wie du einen Pixel-Diff liest.

## Liefern

Ein Unit-Test mit präziser Zusicherung und ein Golden-Fall, plus eine kurze Notiz, was jeder absichert und warum das Display das Golden braucht.
