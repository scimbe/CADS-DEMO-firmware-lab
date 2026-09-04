---
id: m8-01-unit-tests
title: Unit tests on the host
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
    title: The host test suite passes
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: apply }
  - id: count-subjects
    title: Predict the number of test subjects
    check: { type: predict, prompt: { en: "One executable per subject is the rule here. Predict how many test subjects tests/unit/CMakeLists.txt registers today.", de: "Eine ausführbare Datei je Subjekt ist hier die Regel. Sage voraus, wie viele Testsubjekte tests/unit/CMakeLists.txt heute registriert." }, then: { type: command, cwd: ".", command: "grep -c cads_add_unit_test tests/unit/CMakeLists.txt", expectExitCode: 0 }, rubric: "The comparison shows the number of cads_add_unit_test calls in tests/unit/CMakeLists.txt. Passes if the answer, after the comparison, argues why that number is so high: one executable per subject rather than one omnibus binary, so a failure names its module before you read a line of output, and a hanging test cannot take the suite with it. A guessed number with that reasoning passes; the right number without reasoning does not.", bloom: apply }
  - id: register-a-test
    title: How a new subject enters the suite
    check: { type: question, prompt: { en: "Which lines must you add so that a new test subject actually runs under ctest?", de: "Welche Zeilen musst du ergänzen, damit ein neues Testsubjekt wirklich unter ctest läuft?" }, rubric: "Two CMake lines and a C side. In tests/unit/CMakeLists.txt a cads_add_unit_test(test_name test_name.c) and next to it a target_link_libraries(test_name PRIVATE <the module under test>) - the helper links only Unity and the warning flags, so the subject is yours to link. Plus, in the test file, a main() with UNITY_BEGIN(), one RUN_TEST per case and UNITY_END(); a case that is defined but not called from main() passes vacuously. Also names the reconfigure before ctest knows the new name. Naming only the first CMake line does not pass.", bloom: apply }
socratic:
  - { trigger: "task:host-tests-pass:failed", question: { en: "ctest names the failing executable before anything else. Which subject failed, and is it a compile error, an assertion, or a timeout?", de: "ctest nennt zuerst die fehlgeschlagene ausführbare Datei. Welches Subjekt scheiterte, und ist es ein Compile-Fehler, eine Zusicherung oder ein Timeout?" }, hints: [ { en: "Run ctest with --output-on-failure; each test is its own binary, so one failure names its module.", de: "Führe ctest mit --output-on-failure aus; jeder Test ist ein eigenes Binary, ein Fehlschlag nennt also sein Modul." }, { en: "A test that runs past sixty seconds is killed as hung by design; look for a loop waiting on something the fake HAL never delivers.", de: "Ein Test, der länger als sechzig Sekunden läuft, wird absichtlich als hängend abgebrochen; suche eine Schleife, die auf etwas wartet, das die Fake-HAL nie liefert." }, { en: "If the configure step itself fails before any test runs, the problem is a missing dependency of the test tree, not a test.", de: "Scheitert schon das Konfigurieren, bevor ein Test läuft, ist eine fehlende Abhängigkeit des Testbaums das Problem, kein Test." } ] }
  - { trigger: "task:count-subjects:stuck", question: { en: "Every subject is registered by exactly one call. What is that call named, and what would counting it give you?", de: "Jedes Subjekt wird durch genau einen Aufruf registriert. Wie heißt dieser Aufruf, und was ergäbe es, ihn zu zählen?" }, hints: [ { en: "The helper function is defined at the top of tests/unit/CMakeLists.txt and used once per test binary.", de: "Die Hilfsfunktion steht am Kopf von tests/unit/CMakeLists.txt und wird je Test-Binary einmal benutzt." }, { en: "Scroll the file and note the groups: toolbox, storage, firmware layers, ethernet, config, security, marauder.", de: "Blättere durch die Datei und beachte die Gruppen: toolbox, storage, Firmware-Schichten, Ethernet, config, security, marauder." }, { en: "Guess an order of magnitude and write it down - the comparison is what the task is for.", de: "Rate eine Größenordnung und schreib sie hin - für den Vergleich ist die Aufgabe da." } ] }
  - { trigger: "question:register-a-test:weak", question: { en: "A test binary needs a source, a framework and a subject to exercise. Which of the three does the helper function supply for you?", de: "Ein Test-Binary braucht eine Quelle, ein Framework und ein Subjekt, das es prüft. Welches der drei liefert dir die Hilfsfunktion?" }, hints: [ { en: "Read the four-line function above and list what it already links; whatever is missing you have to add yourself.", de: "Lies die vierzeilige Funktion oben und liste auf, was sie schon linkt; was fehlt, musst du selbst ergänzen." }, { en: "Look at any neighbouring registration in the file: each one is a pair of lines, not a single one.", de: "Sieh dir eine benachbarte Registrierung in der Datei an: jede besteht aus einem Zeilenpaar, nicht aus einer Zeile." }, { en: "Your answer needs the C side too - a case that is defined but never run passes vacuously.", de: "Deine Antwort braucht auch die C-Seite - ein Fall, der definiert, aber nie ausgeführt wird, besteht leer." } ] }
---

## Learning goal

Run the project's host unit-test suite and understand why a firmware whose display bus cannot be read back still tests most of itself on a laptop.

**The first move:** start the task `CaDS: Host tests`. The next section gives the path, click by click.

## Starting the task

The user interface is in English while this course text is not, so the menu item is called `Run Task...`.

Press **`F1`**, type `Tasks: Run Task`, Enter, then pick **`CaDS: Host tests`** from the list. Without the keyboard: the three-line symbol (**☰**) at the very top left, then **`Terminal` → `Run Task...` → `CaDS: Host tests`**. (`Ctrl`/`Cmd`+`Shift`+`P` opens the palette too, but a browser often swallows it; `F1` is the reliable way.)

A terminal of its own opens in the terminal area at the bottom, named `CaDS: Host tests`. If that area is folded away, `Ctrl`/`Cmd`+`J` opens it and closes it again; it carries the tabs `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`.

**What you see:** first CMake configuring the `host` preset, then the compiler, then one line per test subject. **How long:** about half a minute. **Done** when no new lines appear and a prompt is back. **Success** is ctest's closing line:

```
100% tests passed, 0 tests failed out of 35
```

The task runs exactly this command, the same one CI runs:

```
cmake --preset host && cmake --build build/host && ctest --test-dir build/host --output-on-failure -E '^golden_'
```

The `-E '^golden_'` excludes the golden-image scenes. Those have their own task, `CaDS: Golden images (informativ)`, and belong to the next step.

<!-- SHOT: m8-ctest-run | Terminal-Bereich unten, Terminal mit dem Namen CaDS: Host tests, die letzten Zeilen von ctest mit 100% tests passed -->

## Three operating mistakes that happen right here

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

## Where the tests live

Open `tests/unit/CMakeLists.txt`: `Ctrl`/`Cmd`+`P`, type the path, Enter. Or use the topmost symbol in the bar on the far left (the file explorer) and click through the tree.

`tests/unit/` holds one executable per subject. The file wraps that in a four-line function:

```cmake
function(cads_add_unit_test name)
    add_executable(${name} ${ARGN})
    target_link_libraries(${name} PRIVATE cads_unity cads_flags)
    add_test(NAME ${name} COMMAND ${name})
    set_tests_properties(${name} PROPERTIES TIMEOUT 60)
endfunction()
```

One binary per module means a failure names the module before you read a line of output, and a test that hangs cannot take the suite with it — sixty seconds is the definition of "hung". The framework is **Unity**, vendored as the `lib/Unity` submodule and built as `cads_unity` without the project's own warning flags, because its warnings are not ours to fix.

A test file is plain C: `setUp`/`tearDown`, static test functions full of `TEST_ASSERT_*`, and a `main()` of `UNITY_BEGIN()`, one `RUN_TEST` per case, `UNITY_END()`. Open `tests/unit/test_str.c` with `Ctrl`/`Cmd`+`P` — it tests the bounded string helpers the explorer console's parser depends on, including the case where a truncated `b 90` once parsed as an unremarkable zero and turned the backlight off.

## Why the host runs almost everything

Everything above the HAL is portable C, so the toolbox, storage, config, canvas and widget code compiles natively. Toolbox tests link `cads_toolbox` directly. The canvas and menu tests compile the subject into the binary alongside `tests/unit/fake_hal.c`, a recording fake HAL, because the host has no panel to blit to. The result is a suite that runs in seconds, with no board, in CI, on every push.

What the host cannot prove — that the clock tree is right, that DMA reaches the panel, that the PHY answers — is left to the hardware gate. Both halves are required; neither substitutes for the other.

## Your task

Three tasks, each with its own **Prüfen** button at the bottom of the step text; the **Run all checks** button at the top of the `CaDS Tutor: Unit tests on the host` tab checks all of them at once. If one stays red, the **Hinweis anzeigen** button on that task helps.

1. **The suite runs.** Start `CaDS: Host tests` as described above: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Host tests`**, or **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**.
2. **Count the subjects.** First predict the number of registered test subjects and write it down. The comparison then runs this command itself:

```
grep -c cads_add_unit_test tests/unit/CMakeLists.txt
```

   To check by hand, open a terminal with **☰ → `Terminal` → `New Terminal`** — the working directory is the project root — and type the same command. It answers with a single number, immediately.
3. **A new subject.** Answer which lines a new subject needs for ctest to actually run it. In the last step of this module you write exactly that.

The next step covers the part of the display that unit tests cannot see.
