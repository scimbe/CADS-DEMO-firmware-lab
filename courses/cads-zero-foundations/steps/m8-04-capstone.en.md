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
    title: Your change is under tests/unit
    check: { type: command, cwd: ".", command: "git status --porcelain -- tests/unit | grep -q .", expectExitCode: 0, bloom: create }
  - id: tests-green
    title: The suite passes with your test
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: create }
  - id: self-review
    title: Self-review of the assertion
    check: { type: question, prompt: { en: "Which documented behaviour does your new case assert that no existing case covered?", de: "Welches dokumentierte Verhalten sichert dein neuer Fall zu, das kein vorhandener Fall abdeckte?" }, rubric: "Names exactly three things: the function together with its input, the promised return value, and the promised side effect - for instance that cads_str_to_uint returns false and leaves *value untouched on a 0x prefix with no digits after it, or that end points at the first non-digit so a command loop can read several arguments from one line. And says how you established that no existing case already covers it. A case that repeats an existing assertion does not pass this task, however green it is.", bloom: create }
socratic:
  - { trigger: "task:tests-touched:failed", question: { en: "The check looks for a change under tests/unit. Did your edit land somewhere else, or has it already been committed away?", de: "Der Check sucht eine Änderung unter tests/unit. Ist deine Änderung woanders gelandet, oder schon wegkommittiert?" }, hints: [ { en: "Both routes from the step text touch tests/unit: a new case in an existing file, or a new file plus its registration.", de: "Beide Wege aus dem Steptext berühren tests/unit: ein neuer Fall in einer vorhandenen Datei oder eine neue Datei samt Registrierung." }, { en: "A brand new file must be visible to git; an untracked file counts, a file outside the directory does not.", de: "Eine ganz neue Datei muss für git sichtbar sein; eine nicht verfolgte Datei zählt, eine Datei außerhalb des Verzeichnisses nicht." }, { en: "This check only sees that you changed the tests, not that the change is good - the other two tasks are for that.", de: "Dieser Check sieht nur, dass du die Tests geändert hast, nicht dass die Änderung gut ist - dafür sind die beiden anderen Aufgaben da." } ] }
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your test - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein Test - und falls ja, kompilierte er nicht, scheiterte eine Zusicherung oder wurde er nie registriert?" }, hints: [ { en: "A new subject needs both a registration and a link line in tests/unit/CMakeLists.txt, then a reconfigure.", de: "Ein neues Subjekt braucht sowohl eine Registrierung als auch eine Link-Zeile in tests/unit/CMakeLists.txt, dann eine Neukonfiguration." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the expected/actual line before changing the assertion: the header documents what the parsers do on failure, and it is not what most people guess.", de: "Lies die Expected/Actual-Zeile, bevor du die Zusicherung änderst: der Header dokumentiert, was die Parser im Fehlerfall tun, und das ist nicht, was die meisten raten." } ] }
  - { trigger: "question:self-review:weak", question: { en: "Point at the sentence in the header that documents the behaviour, then at the existing test file. What is in the first and not in the second?", de: "Zeig auf den Satz im Header, der das Verhalten dokumentiert, und dann auf die vorhandene Testdatei. Was steht im ersten und nicht in der zweiten?" }, hints: [ { en: "A contract has edges: an empty input, a prefix without digits, a value one past the maximum, an unusual leading character.", de: "Ein Vertrag hat Ränder: eine leere Eingabe, ein Präfix ohne Ziffern, ein Wert eins über dem Maximum, ein ungewöhnliches führendes Zeichen." }, { en: "Name the assertion, not the feeling - which function, which input, which promised return value and which promised side effect.", de: "Nenne die Zusicherung, nicht das Gefühl - welche Funktion, welche Eingabe, welcher versprochene Rückgabewert und welche versprochene Nebenwirkung." }, { en: "A test that only re-checks a case the suite already has is honest work but does not answer this question.", de: "Ein Test, der nur einen Fall nachprüft, den die Suite schon hat, ist ehrliche Arbeit, beantwortet diese Frage aber nicht." } ] }
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
