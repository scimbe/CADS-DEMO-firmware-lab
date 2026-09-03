---
id: m8-04-capstone
title: Capstone – a reviewable change with a passing test
bloom: create
objectives: [cz.quality.capstone]
requires: [m8-03-clean-room-pr]
estimatedMinutes: 30
links:
  - { doc: "docs/how-to/agent-workflow.md" }
  - { file: "tests/unit/CMakeLists.txt", line: 23 }
  - { file: "modules/toolbox/include/cads/toolbox/str.h", line: 60 }
  - { step: m8-03-clean-room-pr }
sources: [docs/how-to/agent-workflow.md, tests/unit/CMakeLists.txt, tests/unit/test_str.c, modules/toolbox/include/cads/toolbox/str.h, scripts/check_ram_budget.py]
tasks:
  - id: tests-green
    title: Your new test is in the suite and the suite passes
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: self-review
    title: Self-review in the shape of a PR description
    check: { type: question, prompt: { en: "Write the self-review a reviewer would read first: what exactly changed and where, what your new test proves that the existing tests did not, how you confirmed both targets still build, and why the RAM budget is unaffected.", de: "Schreibe das Selbst-Review, das ein Reviewer zuerst liest: was genau sich wo geändert hat, was dein neuer Test beweist, den die vorhandenen nicht bewiesen, wie du bestätigt hast, dass beide Targets noch bauen, und warum das RAM-Budget unberührt ist." }, rubric: "Names the test file and the CMake registration line added; states a concrete behaviour the new case asserts (e.g. a parser boundary of cads_str_to_uint/cads_str_to_hex, or a truncation contract) that no existing case covered; reports that CaDS: Host tests (ctest) and CaDS: Build (itsboard) both succeed; explains that a host-only test adds no code or data to the firmware image, so __cads_heap_size and the check_ram_budget.py margin are unchanged; keeps the change limited to the test and its registration.", bloom: create }
  - id: pr-summary
    title: Assemble the PR-shaped summary per the agent workflow
    check: { type: manual }
socratic:
  - { trigger: "task:tests-green:failed", question: { en: "ctest prints the failing subject's name first. Is it your new binary - and if so, did it fail to compile, fail an assertion, or never get registered?", de: "ctest druckt zuerst den Namen des scheiternden Subjekts. Ist es dein neues Binary - und falls ja, kompilierte es nicht, scheiterte eine Zusicherung oder wurde es nie registriert?" }, hints: [ { en: "A new test needs both the .c file and a cads_add_unit_test + target_link_libraries pair in tests/unit/CMakeLists.txt, then a reconfigure.", de: "Ein neuer Test braucht sowohl die .c-Datei als auch ein Paar cads_add_unit_test + target_link_libraries in tests/unit/CMakeLists.txt, dann eine Neukonfiguration." }, { en: "Every RUN_TEST must appear in main() between UNITY_BEGIN() and UNITY_END(); a case that is defined but not run passes vacuously.", de: "Jedes RUN_TEST muss in main() zwischen UNITY_BEGIN() und UNITY_END() stehen; ein definierter, aber nicht ausgeführter Fall besteht leer." }, { en: "Read the assertion's expected/actual line: the str parsers deliberately return false and leave *value untouched on no digit or overflow - assert on that contract, not a guessed zero.", de: "Lies die Expected/Actual-Zeile der Zusicherung: die str-Parser geben absichtlich false zurück und lassen *value bei fehlender Ziffer oder Überlauf unverändert - prüfe diesen Vertrag, nicht eine geratene Null." } ] }
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

Add the test, make the suite pass, write the self-review answering the four questions in the check, and assemble the PR-shaped summary. This closes the foundations course; the projects course builds on exactly this discipline at larger scale.
