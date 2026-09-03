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

## Pass 3: the tutor panel itself

Run once the lab image was rebuilt with the v1.1 runtime. The pack loads clean:

```
INFO /opt/cads-tutor/courses/javascript-foundations: loaded course
  "javascript-foundations" v1.0.0 (31 steps, image)
courses: javascript-foundations, rust-foundations; 0 error(s)
```

No warnings against this pack, and the panel renders the step end to end: badges
for Bloom level, scaffold and time, the tables and code blocks, the embedded
screenshots, the `file:` and `step:` links, the task list, "Ask the tutor", and
Back/Next. Pressing **Check** really runs the checks:

| Task | Verdict in the panel |
|---|---|
| `node --version` (`command`) | passed, "exited with 0" |
| the step's test (`testSuite`), exercise not yet done | failed, and hint 1 of 3 opened by itself |
| the same test after the exercise is done | passed, "10 test(s) passed" |

Editor support was checked at the same time and is in good order. JavaScript
syntax highlighting works, and because the image sets
`js/ts.implicitProjectConfig.checkJs`, the editor names both bugs of m1-01 in the
**Problems** panel with red underlines - `Cannot assign to 'count' because it is
a constant` (ts2588) and `Block-scoped variable 'suffix' used before its
declaration` (ts2448). That is complementary rather than a spoiler: the step is
about reading Node's runtime message, and m1-01 now points at the editor's
wording and asks the student to compare the two. The screenshot is embedded there.

### Four defects found, none of them in this pack

**1. The runtime reports a failing test as a missing one.** With the exercise not
yet done, the panel says:

> expected test "m0-01 the workspace is ready" to pass, but no test of that name ran

The test did run and failed. Feeding the exact TAP bytes from the same container
to the validator's twin parser gives the correct verdict, `but it failed`, for
both the bare and the single-file command, so the divergence is on the
TypeScript side (`extensions/cads-tutor/src/checks/testParsers.ts`, which is
meant to stay in step with the validator). It matters for beginners: the first
thing a student sees before doing the exercise is a message claiming their test
does not exist.

**2. The course tree shows one pack's step titles under another pack.** Expanding
"Rust – Foundations" lists this course's M1 steps - "let, const and the temporal
dead zone", "Types and what typeof will not tell you" and the next two - with
their JavaScript `requires:` ids, while the Rust pack's real titles are "Scope,
owner, move" and so on. Confirmed in the accessibility tree, so it is data and
not a repaint artifact. The JavaScript steps sit at tree level 3 under a module
node; the mislabelled Rust ones sit at level 2 with no module node.

**3. The platform content pack is not in the image.**

```
[platform:javascript-foundations] content pack "javascript" not loadable from
  …/extensions/cads.cads-tutor-0.1.0/dist/content-packs/javascript:
  ENOENT … sources.json
```

Grounding falls back to 209 chunks from this pack's own `sources/`, so "Ask the
tutor" would answer from the three MDN pages shipped here and not from the seven
guide chapters the pack was calibrated against. No language model is configured
on this deployment either, so `question` checks correctly fall back to manual
confirmation.

**4. The module reflection card never appears.** Walking M0 through to five of
five in the panel - every check run, every question answered and confirmed -
produced the recall card twice, at the head of m0-02 and again at m0-01 of the
next module, and recorded both under `recall` in `session.json`. Finishing the
module produced no reflection card and no `reflection` key in the session,
although the progress view lists `reflection: not yet` for every module, so the
field exists and nothing ever sets it. Addendum A3 says the panel shows the card
when the last step of a module is completed, and R7.6 says a reflection the
course text promises has to exist; `course.json` carries prompts for all eight
modules. Nothing in the pack needs changing.

All four are runtime or image issues and have been reported. Nothing in them
requires a change to this course pack.
