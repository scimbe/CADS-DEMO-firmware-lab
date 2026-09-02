---
id: m8-01-unit-tests
title: Unit-Tests auf dem Host
bloom: apply
objectives: [cz.quality.unit-tests]
requires: [m7-05-pa7-network-eval]
estimatedMinutes: 15
links:
  - { file: "tests/unit/CMakeLists.txt", line: 4 }
  - { doc: "docs/how-to/build.md" }
  - { file: "tests/unit/test_str.c", line: 189 }
  - { step: m8-02-golden-images }
sources: [tests/unit/CMakeLists.txt, tests/CMakeLists.txt, tests/unit/test_str.c, docs/how-to/build.md, docs/reference/module-layout.md]
tasks:
  - id: host-tests-pass
    title: Die Host-Testsuite besteht
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: test-anatomy
    title: Beschreibe einen Unit-Test für ein portables Modul
    check: { type: question, prompt: { en: "Pick tests/unit/test_str.c. What does a portable-module unit test in this project consist of (framework, entry point, what it links against), and why does the host build, not the board, run almost every test?", de: "Nimm tests/unit/test_str.c. Woraus besteht ein Unit-Test für ein portables Modul in diesem Projekt (Framework, Einsprungpunkt, wogegen er linkt), und warum führt der Host-Build und nicht das Board fast jeden Test aus?" }, rubric: "Nennt Unity (Submodul lib/Unity, cads_unity), ein main() mit UNITY_BEGIN/RUN_TEST/UNITY_END, eine ausführbare Datei je Subjekt über cads_add_unit_test mit 60-s-Timeout, gelinkt gegen das portable Modul (cads_toolbox); erklärt, dass alles oberhalb der HAL portables C ist und daher nativ, schnell und in CI ohne Board läuft, während das Board-Gate abdeckt, was der Host nicht kann.", bloom: understand }
socratic:
  - { trigger: "task:host-tests-pass:failed", question: { en: "ctest names the failing executable before anything else. Which subject failed, and is it a compile error, an assertion, or a timeout?", de: "ctest nennt zuerst die fehlgeschlagene ausführbare Datei. Welches Subjekt scheiterte, und ist es ein Compile-Fehler, eine Zusicherung oder ein Timeout?" }, hints: [ { en: "Run ctest with --output-on-failure; each test is its own binary, so one failure names its module.", de: "Führe ctest mit --output-on-failure aus; jeder Test ist ein eigenes Binary, ein Fehlschlag nennt also sein Modul." }, { en: "lib/Unity must be a populated submodule - tests/CMakeLists.txt refuses to configure without lib/Unity/src/unity.c.", de: "lib/Unity muss ein gefülltes Submodul sein - tests/CMakeLists.txt verweigert das Konfigurieren ohne lib/Unity/src/unity.c." }, { en: "A test that runs past 60 s is killed as hung by design; look for a loop that waits on something the fake HAL never delivers.", de: "Ein Test, der länger als 60 s läuft, wird absichtlich als hängend abgebrochen; suche eine Schleife, die auf etwas wartet, das die Fake-HAL nie liefert." } ] }
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

Die Architekturregel aus M1 zahlt sich hier aus: alles oberhalb der HAL ist portables C, also kompilieren Toolbox, Storage, Config, Canvas und Widget-Code nativ. Toolbox-Tests linken direkt gegen `cads_toolbox`. Die Canvas- und Menü-Tests kompilieren das Subjekt zusammen mit `tests/unit/fake_hal.c`, einer aufzeichnenden Fake-HAL, in das Binary, weil der Host kein Panel zum Blitten hat. Das Ergebnis ist eine Suite, die in Sekunden läuft, ohne Board, in CI, bei jedem Push — heute mit 35 Subjekten.

Was der Host nicht beweisen kann, bleibt dem Hardware-Gate aus M0 überlassen: dass der Takt stimmt, dass DMA das Panel tatsächlich erreicht, dass die PHY antwortet. Beide Hälften sind nötig; keine ersetzt die andere.

## Ausführen

Der Task **CaDS: Host tests** konfiguriert das Preset `host` und führt `ctest --preset host` aus — genau das, was CI tut. Nutze `--output-on-failure`, wenn etwas scheitert; ein grüner Lauf druckt eine Zeile je Subjekt.

## Deine Aufgabe

Führe die Host-Tests aus und bestätige, dass sie bestehen; beschreibe dann, woraus ein Unit-Test für ein portables Modul besteht und warum das meiste Testen auf dem Host geschieht. Der nächste Step behandelt den Teil des Displays, den Unit-Tests nicht sehen können.
