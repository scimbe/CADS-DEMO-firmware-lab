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

Deliver one small change that would survive the review you performed in the previous step: a new host unit test for a portable module, registered in the build, passing under ctest, and described the way the agent workflow expects.

## The change

Pick a portable toolbox function whose contract is documented in its header and add a test case for a behaviour the existing suite does not assert. `modules/toolbox/include/cads/toolbox/str.h` is a good subject: its parsers `cads_str_to_uint`, `cads_str_to_int` and `cads_str_to_hex` promise to return `false` and leave `*value` untouched when no digit was consumed or the value does not fit, and to set `end` to the first non-digit so a command loop can read several arguments from one line. `tests/unit/test_str.c` already covers much of this; look for an edge that is documented but unasserted — a `0x` prefix with no digits after it, a value one past `UINT32_MAX`, leading tabs versus spaces.

Two ways to land it, both reviewable:

1. **A new case in the existing file.** Add a `static void test_...(void)` to `tests/unit/test_str.c` and a matching `RUN_TEST` in `main()`. Smallest diff, no CMake change.
2. **A new subject.** Create `tests/unit/test_<name>.c` with its own `main()`, then register it in `tests/unit/CMakeLists.txt` exactly like its neighbours:

```cmake
cads_add_unit_test(test_<name> test_<name>.c)
target_link_libraries(test_<name> PRIVATE cads_toolbox)
```

Either way, the rule from M8-01 applies: one executable per subject, sixty-second timeout, Unity assertions, nothing that needs a board.

## Proving it, the way CI does

Run **CaDS: Host tests**. ctest must list your test and end green. Then run **CaDS: Build** once more: a host-only test adds no object to the firmware image, so the size report and `__cads_heap_size` — the symbol `scripts/check_ram_budget.py` reads to gate the 48 KB floor with its 256-byte margin — are unchanged. Say so in your review; a reviewer should not have to infer it.

## Describing it

`docs/how-to/agent-workflow.md` says what a reviewable PR contains: the change and nothing unrelated; tests where the logic allows; `docs/ROADMAP.md` updated; a bench note only if a hardware path changed (yours did not); the new size report only if memory usage changed (yours did not). Write that summary as if you were opening the PR — title in the `[M<n>] ...` form, a body that names the file, the contract tested, and the two green runs.

## Your task

Add the test — the first check only looks that something of yours is under `tests/unit`, the second that the suite stays green with it. Then answer which documented promise your case newly covers. Finally write the PR-shaped summary per `docs/how-to/agent-workflow.md`: a title in the `[M<n>] ...` form, a body naming the file, the contract tested and the two green runs, and the sentence about the untouched RAM budget. This closes the foundations course; the projects course builds on exactly this discipline at larger scale.
