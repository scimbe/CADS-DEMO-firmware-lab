# javascript-foundations: two walkthroughs

Both passes were run on 2026-09-03 against the real lab image
(`cads-tutor-lab:dev`, **Node 22.23.2**) in a throwaway container on port 8093,
seeded with the current `workspaces/javascript-foundations`. Numbers below are
from those runs, not from a laptop.

## Pass 1: the strong student

Works quickly, reads the failure before editing, does not need repetition, and
wants somewhere to go deeper.

**What was measured.** Each step's reference solution was applied in course
order, and that step's own test file run immediately afterwards.

| | |
|---|---|
| Steps whose test went green as it was reached | 29 of 29 |
| Steps still red after their own solution | 0 |
| Whole suite at the end | 78 tests, 78 pass, 0 fail |

Nothing blocks a fast reader. Three properties carry the pace:

- **Every step is finishable on its own.** `node --test test/<step>.test.js` is
  the whole verification loop, so a strong student never runs the full suite and
  never has to reason about failures belonging to steps they have not reached.
- **Depth is available without detours.** The `question` tasks are where the
  work is for someone who finds the code easy: m1-04 asks them to defend all
  three equality operators, m5-03 to sort the array methods into mutating and
  non-mutating and to say when mutation is right, m6-04 to choose between
  `Promise.all` and `allSettled` and name a case for neither. These are not
  padding; they are the only part of those steps a fast coder cannot skim.
- **The prediction tasks cost twenty seconds and pay when they fail.** A strong
  student is right most of the time. The ones they usually miss - `typeof null`,
  a `return` inside `finally`, the `var` loop capture, the default string sort -
  are exactly the ones worth being wrong about once.

**Nothing to fix for this pass.** The only friction is self-inflicted: skipping
the question tasks makes the course much shorter and much less useful, and the
step text says so at each of them.

## Pass 2: the student with a high error rate

Misreads, mistypes, skips lines, confuses the test file with the source file.
Every failure below was produced for real in the container; the message quoted
is the one the student actually sees.

| # | What they do | What they see | Is it caught? |
|---|---|---|---|
| 1 | Runs the command without changing folder | `Could not find 'test/m0-02-first-run.test.js'` | Yes - misconception trigger on every step, and the screenshot in m0-01 |
| 2 | Mistypes the step id in the path | `Could not find 'test/m0-2-first-run.test.js'` | Yes - same trigger |
| 3 | Mistypes the flag: `node --tests …` | `node: bad option: --tests` | Partly - see finding 3 |
| 4 | Passes a bare folder: `node --test test/` | `throw err;` from the CommonJS loader, before any test runs | Yes - the course never writes it that way |
| 5 | Exports only half of what the test imports | `SyntaxError: The requested module '../src/m0/math-utils.js' does not provide an export named 'cube'` | Yes - m0-04 is built on exactly this failure |
| 6 | Edits the test file instead of the source | The test still fails, now for a different reason | Yes - m0-01 says files under `test/` are the marking scheme, and the assertion message repeats it |
| 7 | Forgets to save | The old result, unchanged | Yes - m0-01 misconception plus the unsaved-dot screenshot |
| 8 | Runs the source file: `node src/m1/counter.js` | **Nothing at all**, exit code 0 | See finding 1 |
| 9 | Runs the whole suite while still on M0 | 74 tests, 8 pass, 66 fail | Yes - every step says later failures are expected |

Nobody is stuck at any point: each failure names a file, and each step states
the command, the finished-signal and the success criterion where the action is.

### Findings and what was changed

**1. Running an exercise file directly prints nothing.** `node src/m1/counter.js`
exits 0 with no output, because the file only exports. A student who does this
can reasonably conclude the code is fine. Mitigated rather than fixed: every
step's "Running this step" section gives the exact command, which is always a
`test/` path, and m0-01 teaches the loop as *run the test*, never *run the file*.
Worth a hint tier of its own if it shows up in real telemetry.

**2. A new terminal does not start in the exercise folder.** In the lab image it
opens in `~/workspace`, one level above, because the seeded workspace is
multi-root. The failure is `Could not find 'test/…'`, **not** `Cannot find
module`, which is what the wrong-folder trigger originally matched - so the
trigger would have stayed silent on the single most likely beginner failure. All
60 step files now match `Could not find '` as well, and the screenshot in m0-01
shows the wrong prompt next to the right one.

**3. A mistyped flag is not matched by any trigger.** `node: bad option: --tests`
is caught by no misconception pattern. Left as is on purpose: the message is
unambiguous, and the step text tells students to copy the command from the panel
rather than retype it. Revisit if telemetry disagrees.

**4. A bare `node --test` was not version-stable.** On Node 26 the runner also
discovers the reference tests under `solutions/`, so the seed suite reported 76
tests and 10 passes; on Node 22, the target runtime, it reports 74 and 8. The
documented command is now `node --test test/*.test.js` everywhere, including the
`npm test` script, and both versions agree: **74 tests, 8 pass, 66 fail** on the
seed, **78 tests, 78 pass, 0 fail** with the reference solutions.

### The eight tests that pass on an untouched workspace

Deliberate, and worth knowing when reading the numbers above. They are the halves
of an exercise that are already correct - `typeName` on primitives, `withDefaults`
on an empty object, `topLabels` ordering before the copy is fixed, the ticker as
long as nobody detaches it. They give a student partial credit and make the
failing assertion the interesting one. Every step's `expectPass` list includes at
least one test that fails on the seed, which the validator's `--solutions` probe
checks: 31 probes, 31 ok.

## What could not be walked through

The tutor panel itself. The image carries `cads-tutor` 0.1.0, which predates
Addendum v1.1 and rejects every step of this pack with `unknown check type
"testSuite"`, so it shows "No courses found". Task check buttons, hint tiers,
the recall card and the module reflection card therefore have not been exercised
against a running extension. Both walkthroughs above ran the same commands the
panel would run, so the checks themselves are verified; what is unverified is the
panel's presentation of them.
