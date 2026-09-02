---
id: m8-01-unit-tests
title: Unit tests on the host
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
    title: The host test suite passes
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: test-anatomy
    title: Describe a portable-module unit test
    check: { type: question, prompt: { en: "Pick tests/unit/test_str.c. What does a portable-module unit test in this project consist of (framework, entry point, what it links against), and why does the host build, not the board, run almost every test?", de: "Nimm tests/unit/test_str.c. Woraus besteht ein Unit-Test für ein portables Modul in diesem Projekt (Framework, Einsprungpunkt, wogegen er linkt), und warum führt der Host-Build und nicht das Board fast jeden Test aus?" }, rubric: "Names Unity (lib/Unity submodule, cads_unity), a main() with UNITY_BEGIN/RUN_TEST/UNITY_END, one executable per subject registered via cads_add_unit_test with a 60 s timeout, linked against the portable module (cads_toolbox); explains that everything above the HAL is portable C so it runs natively with no board, fast and in CI, while the board gate covers what the host cannot.", bloom: understand }
socratic:
  - { trigger: "task:host-tests-pass:failed", question: { en: "ctest names the failing executable before anything else. Which subject failed, and is it a compile error, an assertion, or a timeout?", de: "ctest nennt zuerst die fehlgeschlagene ausführbare Datei. Welches Subjekt scheiterte, und ist es ein Compile-Fehler, eine Zusicherung oder ein Timeout?" }, hints: [ { en: "Run ctest with --output-on-failure; each test is its own binary, so one failure names its module.", de: "Führe ctest mit --output-on-failure aus; jeder Test ist ein eigenes Binary, ein Fehlschlag nennt also sein Modul." }, { en: "lib/Unity must be a populated submodule - tests/CMakeLists.txt refuses to configure without lib/Unity/src/unity.c.", de: "lib/Unity muss ein gefülltes Submodul sein - tests/CMakeLists.txt verweigert das Konfigurieren ohne lib/Unity/src/unity.c." }, { en: "A test that runs past 60 s is killed as hung by design; look for a loop that waits on something the fake HAL never delivers.", de: "Ein Test, der länger als 60 s läuft, wird absichtlich als hängend abgebrochen; suche eine Schleife, die auf etwas wartet, das die Fake-HAL nie liefert." } ] }
---
## Learning goal

Run the project's host unit-test suite and understand why a firmware whose display bus cannot be read back still tests most of itself on a laptop.

## Where the tests live

`tests/unit/` holds one executable per subject. `tests/unit/CMakeLists.txt` wraps that in a four-line function:

```cmake
function(cads_add_unit_test name)
    add_executable(${name} ${ARGN})
    target_link_libraries(${name} PRIVATE cads_unity cads_flags)
    add_test(NAME ${name} COMMAND ${name})
    set_tests_properties(${name} PROPERTIES TIMEOUT 60)
endfunction()
```

One binary per module means a failure names the module before you read a line of output, and a test that hangs cannot take the suite with it — sixty seconds is the definition of "hung". The framework is **Unity**, vendored as the `lib/Unity` submodule and built as `cads_unity` without the project's own warning flags, because its warnings are not ours to fix.

A test file is plain C: `setUp`/`tearDown`, static test functions full of `TEST_ASSERT_*`, and a `main()` of `UNITY_BEGIN()`, one `RUN_TEST` per case, `UNITY_END()`. Read `tests/unit/test_str.c` — it tests the bounded string helpers the explorer console's parser depends on, including the case where a truncated `b 90` once parsed as an unremarkable zero and turned the backlight off.

## Why the host runs almost everything

The architecture rule from M1 pays off here: everything above the HAL is portable C, so the toolbox, storage, config, canvas and widget code compiles natively. Toolbox tests link `cads_toolbox` directly. The canvas and menu tests compile the subject into the binary alongside `tests/unit/fake_hal.c`, a recording fake HAL, because the host has no panel to blit to. The result is a suite that runs in seconds, with no board, in CI, on every push — and 35 subjects today.

What the host cannot prove is left to the hardware gate from M0: that the clock tree is right, that DMA actually reaches the panel, that the PHY answers. Both halves are required; neither substitutes for the other.

## Running it

The task **CaDS: Host tests** configures the `host` preset and runs `ctest --preset host`, which is exactly what CI runs. Use `--output-on-failure` when something fails; a green run prints one line per subject.

## Your task

Run the host tests and confirm they pass, then describe what a portable-module unit test consists of and why the host is where most testing happens. The next step covers the part of the display that unit tests cannot see.
