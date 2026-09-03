---
id: m8-01-unit-tests
title: Unit-Tests auf dem Host
bloom: apply
objectives: [cz.quality.unit-tests]
requires: [m7-05-pa7-network-eval]
estimatedMinutes: 15
scaffold: worked
links:
  - { file: "tests/unit/CMakeLists.txt", line: 4 }
  - { doc: "docs/how-to/build.md" }
  - { file: "tests/unit/test_str.c", line: 189 }
  - { step: m8-02-golden-images }
sources: [tests/unit/CMakeLists.txt, tests/CMakeLists.txt, tests/unit/test_str.c, docs/how-to/build.md, docs/reference/module-layout.md]
misconceptions:
  - { pattern: "unity.c|lib/Unity", question: { en: "The test framework itself is missing. Is it a dependency you install, or one that lives inside this repository?", de: "Das Test-Framework selbst fehlt. Ist es eine Abhängigkeit, die man installiert, oder eine, die in diesem Repository liegt?" }, hints: [ { en: "Unity is vendored as a git submodule, so a fresh clone without submodules has an empty directory where it should be.", de: "Unity ist als Git-Submodul eingebunden, ein frischer Clone ohne Submodule hat dort also ein leeres Verzeichnis." }, { en: "tests/CMakeLists.txt refuses to configure at all when the submodule source file is absent, on purpose.", de: "tests/CMakeLists.txt verweigert das Konfigurieren ganz, wenn die Quelldatei des Submoduls fehlt - mit Absicht." }, { en: "Initialise the submodules once and re-run the host tests task; nothing in the test code needs changing.", de: "Initialisiere die Submodule einmal und führ den Host-Test-Task erneut aus; am Testcode ist nichts zu ändern." } ] }
tasks:
  - id: host-tests-pass
    title: Die Host-Testsuite besteht
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: apply }
  - id: count-subjects
    title: Sage die Zahl der Testsubjekte voraus
    check: { type: predict, prompt: { en: "One executable per subject is the rule here. Predict how many test subjects tests/unit/CMakeLists.txt registers today.", de: "Eine ausführbare Datei je Subjekt ist hier die Regel. Sage voraus, wie viele Testsubjekte tests/unit/CMakeLists.txt heute registriert." }, then: { type: command, cwd: ".", command: "grep -c cads_add_unit_test tests/unit/CMakeLists.txt", expectExitCode: 0 }, rubric: "Der Vergleich zeigt die Zahl der cads_add_unit_test-Aufrufe in tests/unit/CMakeLists.txt. Bestanden, wenn die Antwort nach dem Vergleich begründet, warum diese Zahl so hoch ist: eine ausführbare Datei je Subjekt statt einer Sammelbinärdatei, damit ein Fehlschlag sein Modul nennt, bevor eine Zeile Ausgabe gelesen wird, und ein hängender Test die Suite nicht mitreißt. Eine geratene Zahl mit dieser Begründung besteht; die richtige Zahl ohne Begründung nicht.", bloom: apply }
  - id: register-a-test
    title: Wie ein neues Subjekt in die Suite kommt
    check: { type: question, prompt: { en: "Which lines must you add so that a new test subject actually runs under ctest?", de: "Welche Zeilen musst du ergänzen, damit ein neues Testsubjekt wirklich unter ctest läuft?" }, rubric: "Zwei CMake-Zeilen und eine C-Seite. In tests/unit/CMakeLists.txt ein cads_add_unit_test(test_name test_name.c) und daneben ein target_link_libraries(test_name PRIVATE <das geprüfte Modul>) - die Hilfsfunktion linkt nur Unity und die Warnflags, das Subjekt musst du selbst dazulinken. Dazu in der Testdatei ein main() mit UNITY_BEGIN(), je Fall ein RUN_TEST und UNITY_END(); ein definierter, aber nicht in main() aufgerufener Fall besteht leer. Nennt zusätzlich die Neukonfiguration, bevor ctest den neuen Namen kennt. Wer nur die erste CMake-Zeile nennt, besteht nicht.", bloom: apply }
socratic:
  - { trigger: "task:host-tests-pass:failed", question: { en: "ctest names the failing executable before anything else. Which subject failed, and is it a compile error, an assertion, or a timeout?", de: "ctest nennt zuerst die fehlgeschlagene ausführbare Datei. Welches Subjekt scheiterte, und ist es ein Compile-Fehler, eine Zusicherung oder ein Timeout?" }, hints: [ { en: "Run ctest with --output-on-failure; each test is its own binary, so one failure names its module.", de: "Führe ctest mit --output-on-failure aus; jeder Test ist ein eigenes Binary, ein Fehlschlag nennt also sein Modul." }, { en: "A test that runs past sixty seconds is killed as hung by design; look for a loop waiting on something the fake HAL never delivers.", de: "Ein Test, der länger als sechzig Sekunden läuft, wird absichtlich als hängend abgebrochen; suche eine Schleife, die auf etwas wartet, das die Fake-HAL nie liefert." }, { en: "If the configure step itself fails before any test runs, the problem is a missing dependency of the test tree, not a test.", de: "Scheitert schon das Konfigurieren, bevor ein Test läuft, ist eine fehlende Abhängigkeit des Testbaums das Problem, kein Test." } ] }
  - { trigger: "task:count-subjects:stuck", question: { en: "Every subject is registered by exactly one call. What is that call named, and what would counting it give you?", de: "Jedes Subjekt wird durch genau einen Aufruf registriert. Wie heißt dieser Aufruf, und was ergäbe es, ihn zu zählen?" }, hints: [ { en: "The helper function is defined at the top of tests/unit/CMakeLists.txt and used once per test binary.", de: "Die Hilfsfunktion steht am Kopf von tests/unit/CMakeLists.txt und wird je Test-Binary einmal benutzt." }, { en: "Scroll the file and note the groups: toolbox, storage, firmware layers, ethernet, config, security, marauder.", de: "Blättere durch die Datei und beachte die Gruppen: toolbox, storage, Firmware-Schichten, Ethernet, config, security, marauder." }, { en: "Guess an order of magnitude and write it down - the comparison is what the task is for.", de: "Rate eine Größenordnung und schreib sie hin - für den Vergleich ist die Aufgabe da." } ] }
  - { trigger: "question:register-a-test:weak", question: { en: "A test binary needs a source, a framework and a subject to exercise. Which of the three does the helper function supply for you?", de: "Ein Test-Binary braucht eine Quelle, ein Framework und ein Subjekt, das es prüft. Welches der drei liefert dir die Hilfsfunktion?" }, hints: [ { en: "Read the four-line function above and list what it already links; whatever is missing you have to add yourself.", de: "Lies die vierzeilige Funktion oben und liste auf, was sie schon linkt; was fehlt, musst du selbst ergänzen." }, { en: "Look at any neighbouring registration in the file: each one is a pair of lines, not a single one.", de: "Sieh dir eine benachbarte Registrierung in der Datei an: jede besteht aus einem Zeilenpaar, nicht aus einer Zeile." }, { en: "Your answer needs the C side too - a case that is defined but never run passes vacuously.", de: "Deine Antwort braucht auch die C-Seite - ein Fall, der definiert, aber nie ausgeführt wird, besteht leer." } ] }
---
## Lernziel

Führe die Host-Unit-Testsuite des Projekts aus und verstehe, warum eine Firmware, deren Displaybus nicht zurückgelesen werden kann, sich dennoch größtenteils auf einem Laptop testet.

## Wo die Tests liegen

`tests/unit/` enthält eine ausführbare Datei je Subjekt. `tests/unit/CMakeLists.txt` kapselt das in eine vierzeilige Funktion:

```cmake
function(cads_add_unit_test name)
    add_executable(${name} ${ARGN})
    target_link_libraries(${name} PRIVATE cads_unity cads_flags)
    add_test(NAME ${name} COMMAND ${name})
    set_tests_properties(${name} PROPERTIES TIMEOUT 60)
endfunction()
```

Ein Binary je Modul bedeutet: ein Fehlschlag nennt das Modul, bevor du eine Zeile Ausgabe liest, und ein hängender Test kann die Suite nicht mitreißen — sechzig Sekunden sind die Definition von „hängt". Das Framework ist **Unity**, als Submodul `lib/Unity` eingebunden und als `cads_unity` ohne die projekteigenen Warnflags gebaut, weil seine Warnungen nicht unsere sind.

Eine Testdatei ist schlichtes C: `setUp`/`tearDown`, statische Testfunktionen voller `TEST_ASSERT_*` und ein `main()` aus `UNITY_BEGIN()`, einem `RUN_TEST` je Fall, `UNITY_END()`. Lies `tests/unit/test_str.c` — es testet die begrenzten String-Helfer, von denen der Parser der Explorer-Konsole abhängt, einschließlich des Falls, in dem ein abgeschnittenes `b 90` einst als unauffällige Null geparst wurde und die Hintergrundbeleuchtung abschaltete.

## Warum der Host fast alles ausführt

Die Architekturregel aus M1 zahlt sich hier aus: alles oberhalb der HAL ist portables C, also kompilieren Toolbox, Storage, Config, Canvas und Widget-Code nativ. Toolbox-Tests linken direkt gegen `cads_toolbox`. Die Canvas- und Menü-Tests kompilieren das Subjekt zusammen mit `tests/unit/fake_hal.c`, einer aufzeichnenden Fake-HAL, in das Binary, weil der Host kein Panel zum Blitten hat. Das Ergebnis ist eine Suite, die in Sekunden läuft, ohne Board, in CI, bei jedem Push. Wie viele Subjekte darin heute registriert sind, sagst du in der zweiten Aufgabe erst voraus und zählst es dann nach.

Was der Host nicht beweisen kann, bleibt dem Hardware-Gate aus M0 überlassen: dass der Takt stimmt, dass DMA das Panel tatsächlich erreicht, dass die PHY antwortet. Beide Hälften sind nötig; keine ersetzt die andere.

## Ausführen

Der Task **CaDS: Host tests** konfiguriert das Preset `host` und führt `ctest --preset host` aus — genau das, was CI tut. Nutze `--output-on-failure`, wenn etwas scheitert; ein grüner Lauf druckt eine Zeile je Subjekt.

## Deine Aufgabe

Führe die Host-Tests aus und bestätige, dass sie bestehen. Sage dann die Zahl der Testsubjekte voraus und zähle nach. Beantworte zuletzt, welche Zeilen ein neues Subjekt braucht, damit ctest es wirklich ausführt — im letzten Step dieses Moduls schreibst du genau das. Der nächste Step behandelt den Teil des Displays, den Unit-Tests nicht sehen können.
