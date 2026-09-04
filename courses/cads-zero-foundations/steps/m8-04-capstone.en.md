---
id: m8-04-capstone
title: Capstone - a reviewable change with a passing test
bloom: create
objectives: [cz.quality.capstone]
requires: [m8-03-clean-room-pr]
estimatedMinutes: 30
scaffold: independent
links:
  - { doc: "docs/how-to/agent-workflow.md" }
  - { file: "tests/unit/CMakeLists.txt", line: 23 }
  - { file: "modules/toolbox/include/cads/toolbox/str.h", line: 60 }
  - { step: m8-03-clean-room-pr }
sources: [docs/how-to/agent-workflow.md, tests/unit/CMakeLists.txt, tests/unit/test_str.c, modules/toolbox/include/cads/toolbox/str.h, scripts/check_ram_budget.py]
tasks:
  - id: tests-touched
    title: Your change under tests/unit adds a run case with an assertion
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "( git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/' ) | grep -qE '^[+][^/*]*RUN_TEST[(]'", expectExitCode: 0 }, { type: command, cwd: ".", command: "( git diff -U0 -- tests/unit; git ls-files --others --exclude-standard -- tests/unit | xargs -r sed 's/^/+/' ) | grep -qE '^[+][^/*]*TEST_ASSERT'", expectExitCode: 0 } ] }
  - id: tests-green
    title: The suite passes with your test
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: self-review
    title: Self-review of the assertion
    check: { type: question, prompt: { en: "Which documented behaviour does your new case assert that no existing case covered? Three items - the function with its input, the promised return value, the promised side effect - plus one sentence on how you checked that no existing case covers it already.", de: "Welches dokumentierte Verhalten sichert dein neuer Fall zu, das kein vorhandener Fall abdeckte? Drei Angaben - die Funktion samt Eingabe, der versprochene Rückgabewert, die versprochene Nebenwirkung - plus ein Satz dazu, woran du geprüft hast, dass kein vorhandener Fall das schon abdeckt." }, rubric: "Names exactly three things: the function together with its input, the promised return value, and the promised side effect - for instance that cads_str_to_uint returns false and leaves *value untouched on a 0x prefix with no digits after it, or that end points at the first non-digit so a command loop can read several arguments from one line. And says how you established that no existing case already covers it. A case that repeats an existing assertion does not pass this task, however green it is.", bloom: create }
socratic:
  - { trigger: "task:tests-touched:failed", question: { en: "The check looks for added lines under tests/unit. Did your edit land somewhere else, or has it already been committed away?", de: "Der Check sucht hinzugefügte Zeilen unter tests/unit. Ist deine Änderung woanders gelandet, oder schon wegkommittiert?" }, hints: [ { en: "Does your change really add a case that runs, or did you only create a file? The check reads the added lines, not the file list.", de: "Fügt deine Änderung wirklich einen ausgeführten Fall hinzu, oder hast du nur eine Datei angelegt? Der Check liest die hinzugefügten Zeilen, nicht die Dateiliste." }, { en: "Both routes from the step text count: a new case in an existing file, or a new, still untracked file under tests/unit. Run git diff -- tests/unit to see what the check sees.", de: "Beide Wege aus dem Steptext zählen: ein neuer Fall in einer vorhandenen Datei oder eine neue, noch nicht verfolgte Datei unter tests/unit. Führ git diff -- tests/unit aus, um zu sehen, was der Check sieht." }, { en: "Only lines on which RUN_TEST( and TEST_ASSERT are real code count; a commented-out line does not, and neither does an empty file.", de: "Gezählt werden nur Zeilen, auf denen RUN_TEST( und TEST_ASSERT wirklich Code sind; eine auskommentierte Zeile zählt nicht, eine leere Datei auch nicht." } ] }
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your test - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein Test - und falls ja, kompilierte er nicht, scheiterte eine Zusicherung oder wurde er nie registriert?" }, hints: [ { en: "Is it your subject that is red, or another one? A new subject needs a registration and a link line in tests/unit/CMakeLists.txt, then a reconfigure, before ctest knows it at all.", de: "Ist dein Subjekt rot oder ein anderes? Ein neues Subjekt braucht eine Registrierung und eine Link-Zeile in tests/unit/CMakeLists.txt, dann eine Neukonfiguration, bevor ctest es überhaupt kennt." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line before changing the assertion: the header documents what the parsers do on failure, and it is not what most people guess.", de: "Lies die Expected/Actual-Zeile, bevor du die Zusicherung änderst: der Header dokumentiert, was die Parser im Fehlerfall tun, und das ist nicht, was die meisten raten." } ] }
  - { trigger: "question:self-review:weak", question: { en: "Point at the sentence in the header that documents the behaviour, then at the existing test file. What is in the first and not in the second?", de: "Zeig auf den Satz im Header, der das Verhalten dokumentiert, und dann auf die vorhandene Testdatei. Was steht im ersten und nicht in der zweiten?" }, hints: [ { en: "Are you asserting an edge of the contract or the normal case? A contract has edges: an empty input, a prefix without digits, a value one past the maximum.", de: "Sicherst du einen Rand des Vertrags zu oder den Normalfall? Ein Vertrag hat Ränder: eine leere Eingabe, ein Präfix ohne Ziffern, ein Wert eins über dem Maximum." }, { en: "Read the sentence in the header that documents the behaviour, and put tests/unit/test_str.c beside it; what stands in the first and not in the second is your case.", de: "Lies den Satz im Header, der das Verhalten dokumentiert, und stell tests/unit/test_str.c daneben; was im ersten steht und in der zweiten nicht, ist dein Fall." }, { en: "modules/toolbox/include/cads/toolbox/str.h documents what each parser promises on failure - the return value and what it leaves *value and end at. That contract is where an uncovered edge is found.", de: "modules/toolbox/include/cads/toolbox/str.h dokumentiert, was jeder Parser im Fehlerfall verspricht - den Rückgabewert und den Zustand von *value und end. In diesem Vertrag findet sich ein noch nicht abgedeckter Rand." } ] }
---

## Learning goal

Ship a small change that would survive the review from the previous step: a new host unit test for a portable module, registered in the build, passing under ctest, and described the way the agent workflow expects.

**The first move:** open `modules/toolbox/include/cads/toolbox/str.h` and `tests/unit/test_str.c` side by side. The next section gives the path.

## Where you work

The user interface is in English while this course text is not, so the menu item is called `Run Task...`.

**Opening a file:** `Ctrl`/`Cmd`+`P`, type the path, Enter. Or use the topmost symbol in the bar on the far left (the file explorer) and click through the tree. The three paths for this step:

```
modules/toolbox/include/cads/toolbox/str.h
tests/unit/test_str.c
tests/unit/CMakeLists.txt
```

**Opening a terminal** (for `git diff`, for a command with no task): **☰ → `Terminal` → `New Terminal`**; if the terminal area is folded away, `Ctrl`/`Cmd`+`J` opens and closes it. The working directory is the project root.

**Checking your tasks:** in the step text, the tab in the middle named `CaDS Tutor: Capstone - a reviewable change with a passing test`. Each task at the bottom has a **Prüfen** button and a **Hinweis anzeigen** button; **Run all checks** at the top of the tab checks everything at once.

## The change

Pick a portable toolbox function whose contract is documented in the header, and add a test case for a behaviour the existing suite does not assert. `modules/toolbox/include/cads/toolbox/str.h` is a good subject: its parsers `cads_str_to_uint`, `cads_str_to_int` and `cads_str_to_hex` promise to return `false` and leave `*value` untouched when no digit was consumed or the value does not fit, and to point `end` at the first non-digit character so a command loop can read several arguments from one line. `tests/unit/test_str.c` covers much of that; look for a documented but unasserted edge — a `0x` prefix with no digits after it, a value one past `UINT32_MAX`, leading tabs instead of spaces.

Two routes, both reviewable:

1. **A new case in the existing file.** Add a `static void test_...(void)` to `tests/unit/test_str.c` and a matching `RUN_TEST` in `main()`. Smallest diff, no CMake change.
2. **A new subject.** Create `tests/unit/test_<name>.c` with its own `main()` and register it in `tests/unit/CMakeLists.txt` exactly like its neighbours:

```cmake
cads_add_unit_test(test_<name> test_<name>.c)
target_link_libraries(test_<name> PRIVATE cads_toolbox)
```

Either way: one executable per subject, sixty-second timeout, Unity assertions, nothing that needs a board.

## Proving it the way CI does

**Running the test.** Press **`F1`**, type `Tasks: Run Task`, Enter, then pick **`CaDS: Host tests`** from the list. Without the keyboard: the three-line symbol (**☰**) at the very top left, then **`Terminal` → `Run Task...` → `CaDS: Host tests`**. (`Ctrl`/`Cmd`+`Shift`+`P` opens the palette too, but a browser often swallows it; `F1` is the reliable way.) A terminal named after the task opens at the bottom. You see CMake, the compiler, and one line per subject; it takes about half a minute. **Success:** your test file appears in the list with `Passed`, and the closing line reads `100% tests passed, 0 tests failed out of N`, with an N one larger than before if you added a new subject.

**Building the image.** Then **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Build`**, or **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**. About a minute the first time, seconds after that. A pure host test adds no object to the firmware image, so the size report and `__cads_heap_size` — the symbol `scripts/check_ram_budget.py` reads to guard the 48 KB floor with its 256-byte margin — stay unchanged. You can confirm that with **`F1`** → `Tasks: Run Task` → **`CaDS: RAM budget`**, under a second. Say the result in your review; a reviewer should not have to infer it.

**Seeing what the check sees.** The first check reads the *added lines* under `tests/unit`, not the file list. Open a terminal with **☰ → `Terminal` → `New Terminal`** and run:

```
git diff -- tests/unit
```

If that prints nothing, your change either landed somewhere else or is already committed — in which case the check cannot see it.

<!-- SHOT: m8-capstone-diff | Terminal-Bereich unten, git diff -- tests/unit mit den hinzugefuegten RUN_TEST- und TEST_ASSERT-Zeilen in gruen -->

## Three operating mistakes that happen right here

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it; in the middle of `CaDS: Build` that means the build is aborted and the image incomplete. Use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

## Describing it

`docs/how-to/agent-workflow.md` says what a reviewable PR carries: the change and nothing unrelated; tests where the logic allows them; `docs/ROADMAP.md` updated; a bench note only if a hardware path changed (yours did not); the new size report only if memory use changed (yours did not).

## Your task

1. **Add the test.** The first check looks for added lines under `tests/unit` carrying `RUN_TEST(` and `TEST_ASSERT` — a comment does not count.
2. **Keep the suite green.** Start `CaDS: Host tests` as above: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Host tests`**.
3. **The self-review.** Answer which documented promise your case newly covers.

Finally write the PR-shaped summary per `docs/how-to/agent-workflow.md`: a title of the form `[M<n>] ...`, a body naming the file, the contract tested and the two green runs, and the sentence about the unchanged RAM budget. That completes the foundations course; the projects course builds on exactly this discipline.
