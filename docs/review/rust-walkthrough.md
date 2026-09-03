# rust-foundations: two walkthroughs

Two passes over the finished pack, as the operator asked: once as the student
who gets everything right and wants to move, once as the student who misreads,
mistypes and skips lines. The question in both cases is the same - is it at
every point unmistakable what to do next, and is there a way forward when you
are stuck?

The first part of each pass was run for real in `cads-tutor-lab:dev` on
127.0.0.1:8094 (code-server 4.135, rustc 1.98, rust-analyzer 0.3.3033). The
rest is a read-through against the step sources and the workspace. Findings
that were fixed are marked **fixed**, with the commit; findings that are still
open are marked **open**.

## What the live run changed

Three instructions in my own text were wrong, and all three were the kind that
stop a beginner on the first step. They are worth recording because none of
them was visible from reading the material.

| What the step said | What actually happens | Status |
|---|---|---|
| The terminal opens in the workspace folder | It opens in `~/workspace`, one level above the crate, because the lab window is a multi-root workspace with the Rust and the JavaScript folder side by side. The first cargo command answers `could not find Cargo.toml in /home/coder/workspace or any parent directory`. | **fixed**, `0c64231` |
| Press F1 and type `Terminal: Create New Terminal` | F1 opens the palette in *file* mode and remembers the last mode used. Without a leading `>` the answer is `No matching results`. | **fixed**, `0c64231` |
| If cargo cannot find Cargo.toml, cd back to the workspace root | The workspace root is exactly the folder that does not work. | **fixed**, `0c64231` |

Also confirmed live, both of which the operator asked about:

- **Rust syntax highlighting works.** `src/m0/m0_03_first_test.rs` renders with
  keyword, type, string and doc-comment colouring
  (`docs/review/evidence/lab-editor-rust-analyzer.png`).
- **rust-analyzer runs.** The status bar shows `rust-analyzer` and the language
  mode `Rust` on that file.
- A real `cargo test --test m0-03-first-test` on the untouched seed prints
  `1 passed; 2 failed` with both failures naming
  `src/m0/m0_03_first_test.rs:14:5` and `not yet implemented: build the
  greeting with format!` - exactly what step m0-03 tells the student to expect
  (`docs/review/evidence/lab-terminal-first-test.png`).

**Open, and not mine to fix:** the tutor panel shows the *JavaScript* course
when the Rust workspace is opened, and the `Rust – Foundations` node in the
course tree lists JavaScript step titles. Reported to the tutor stream with
evidence in `docs/review/evidence/lab-overview-wrong-course.png`. Until that is
fixed the screenshots cannot be embedded in the steps: every one of them would
show a JavaScript step beside a Rust instruction.

## Pass 1: the student who gets everything right

This student reads accurately, types accurately, and wants to be finished. The
risk for them is not confusion, it is boredom and pointless waiting.

**Where it flows.** M0 to M2 are 20 minutes each and each ends in a green test
run. The `predict` tasks are the only forced pause, and they are cheap: write
two lines, run the example, compare. From M3 the exercise files carry four to
six functions each, which is enough work that the fast student stays engaged
without the step growing a second concept.

**Nothing blocks on repetition.** `recallFrom` is explicitly non-blocking - the
recall card offers one earlier question when a step opens and the student can
ignore it. A fast student loses nothing by skipping it. No step requires a
question to be answered before its test check can run; the tasks are
independent.

**Where a fast student is under-served, and what carries them.** The exercises
are pitched at a first-time Rust reader, so someone who already knows C++ moves
will finish M1 in ten minutes rather than twenty. Three things give them
somewhere to go:

- The `question` tasks are graded against a rubric and most ask for a judgement
  rather than a fact - m1-04 asks them to justify two different parameter
  styles from the caller's point of view, m4-03 asks where a `HashMap`'s
  iteration order would produce an intermittent bug, m6-03 asks for a signature
  `impl Trait` cannot express. These are not answerable from the step text
  alone.
- m5-03's `parse_size` and m6-04's `longest_with_announcement` are deliberately
  harder than their neighbours.
- The final project is open at the top end: `m7-02-review` asks for a critique
  of the student's own code with a 200-character minimum and a three-part
  rubric, and the last section names chapters 13 and 15 as the next thing to
  read.

**One thing a fast student will hit.** They will type `cargo test` on its own to
see everything at once. That used to produce a single compile error from M1 and
no test results at all; it now runs all 30 targets, and both the workspace
README and the step text name `--no-fail-fast` for the whole picture
(**fixed**, `a94642e`).

## Pass 2: the student with a high error rate

This student misreads instructions, mistypes commands, skips lines and
occasionally edits the wrong file. The question is whether every wrong turn has
a visible way back.

**Mistyped command.** The three ways it goes wrong all produce a message the
course recognises:

| Mistake | Message | Caught by |
|---|---|---|
| Terminal in the wrong folder | `could not find Cargo.toml …` | misconception on every executing step, tier-1 hint gives the exact `cd` |
| Wrong step id after `--test` | `no test target named …` and cargo's own `a target with a similar name exists` | misconception on every testSuite step |
| Mistyped cargo subcommand | `no such command: …` with a suggestion | cargo itself |

**Edited the wrong file.** The most likely version is editing `tests/…` instead
of `src/…`. The step text names the file to edit in the task sentence, the
`links` block points at it, and `sources` lists both so the tutor can cite
them. The `todo!()` panic message names the file and line to open, which is the
strongest signal available and is called out explicitly in m0-03.

**Skipped a line of the instructions.** The `Running it` section at the foot of
every executing step repeats the whole path - menu, key, `cd`, command - so a
student who skipped the prose still has it. There are no "as before"
references; each step is complete on its own.

**Stuck on the exercise itself.** Every step carries a `socratic` trigger on its
main task with three hint tiers that escalate on the first, second and third
failure. The tiers are ordered so tier 1 asks a question, tier 2 narrows, and
tier 3 gives the mechanism - `m2-02` ends at "use the method that takes indices
instead of two references", which is the answer without being the code.

**Confused by an error they did not expect.** The `misconceptions` regexes fire
on the real compiler output, so a student who hits E0382 while working on
borrowing gets the ownership hint rather than silence. All of them were
captured from real compiler runs and re-verified on rustc 1.98.

**Where this student is still slowed down, open items:**

- **A wrong prediction costs nothing and teaches nothing** unless the student
  reads the rubric. The `predict` check passes as long as a prediction exists
  and the command behaves; being wrong is recorded but not surfaced beyond the
  panel's side-by-side view. That is the runtime's design, not the pack's, but
  it means a careless student can click through five predictions without
  noticing they were wrong every time.
- **`m1-03-copy-types` no longer fails loudly if the derive is missing.**
  Removing the compile-time bound was necessary so that one unsolved step could
  not break `cargo test` for the whole workspace, but it means the `Copy`
  requirement is now checked by reading the source rather than by the compiler.
  A student who adds `Clone` instead of `Copy` gets a `fileMatches` failure
  rather than a type error, which is a weaker teacher.
- **The final project is long.** `m7-01-wordstat` is estimated at 90 minutes and
  has nine tests plus two command checks. A student with a high error rate will
  spend longer. The step text sequences the work explicitly (normalize, then
  count_words, then report, then the two Display impls, then run) and tells
  them to run the tests after each one, which is the best mitigation available
  short of splitting the step.


## Third pass: against docs/PEDAGOGY-RULES.md

review2's rules arrived after the pack was written, so the pack was measured
against them rather than built to them. `scripts/pedagogy-metrics.py` does the
measuring and ships with the pack.

### What the first measurement found

| Rule | Before | After |
|---|---:|---:|
| Rubrics overlapping the step body above the limit | 19 of 22 | 12 of 22 |
| Rubrics naming what does NOT pass | 4 of 22 | 22 of 22 |
| Question tasks with their own hint ladder | 4 of 22 | 22 of 22 |
| Tasks of any kind with no ladder | 31 of 70 | 9 of 70 |
| Hint tier 3 overlapping the rubric above 30 percent | not measured | 0 of 22 |

The overlap figure was the serious one: a median of 62 percent meant the answer
to a question was in the prose the student had just read. The fix was the one
the rules prescribe - cut the resolving sentence out of the **body**, not just
move it into the rubric. Nine bodies lost the sentence that stated their own
conclusion: m1-03 no longer explains the double free, m2-03 no longer spells
out the reallocation, m6-01 no longer says what an unbounded `T` can do, m6-02
no longer says when the override is chosen, m6-03 lost its rule of thumb,
m5-04 no longer argues why absence is not an error, and m7-02 no longer lists
the three allocation sites its own rubric asks the student to find.

Prompts were rewritten to announce the scope the rubric grades ("two
sentences: X, and Y"). That is deliberately against the 25-word guideline where
the two pull apart, because review2's own round-2 setback was shortening
prompts by hiding the requirement in a rubric the student never sees.

### Where the pack still breaks a rule, and why

**Twelve rubrics remain over the overlap limit, most of them just over.** Nine
are between 40 and 57 percent against limits of 35 or 50. Having read each of
those pairs, the residual overlap is domain vocabulary rather than a leaked
answer: a rubric about `Copy` has to say `Copy`, `String` and `drop`, and so
does the body, and no stop list separates those from the argument. Three are
genuinely still too high and are the honest remainder of this pass:
`m3-01/update-syntax` at 73, `m6-03/impl-vs-generic` at 74 and
`m0-02/panels` at 69 - in each case the body must name the same handful of
types or panel tabs the rubric grades, and shortening the body further would
cost more than the metric gains. Flagged for review2 rather than papered over.

**Nine tasks still have no hint ladder of their own.** All nine are `command`
or `predict` checks whose failure modes are already covered by the step's
`misconceptions`, which fire on the real compiler or cargo output and carry
their own three tiers. A ladder there would duplicate them.

**Every step is over the 600-word guideline** (733 to 1090 words). The operating
path section added about 130 words to each. The team lead ruled explicitly that
operability outranks the word count here; recording it so the decision is
visible rather than silent.

### One rule the pack was already safe on

review2 warned that `extensions/cads-tutor/src/types.ts` knew none of
`command`, `testSuite` or `predict`, and that `loader.ts` silently drops a whole
step whose check type is unknown - 28 of 48 steps in their case, with the
validator reporting PASS. Checked directly: after the merge of the runtime
work, `CHECK_TYPES` in `types.ts` lists all three, and the live container shows
the Rust course as 31 of 31 steps, so nothing is being dropped. Had that not
been true, `testSuite` being this pack's main check would have made the course
almost entirely invisible.

## Verdict

Both passes get through. The fast student is never made to wait for
repetition; the struggling student always has a named next action, and after
the live run the three instructions that would have stranded them on step one
are corrected. Two risks remain, and neither is in the exercises. The tutor panel still opens
the JavaScript course for a Rust workspace and lists JavaScript titles under
the Rust node, which makes the pack unusable in the lab however good the steps
are. And twelve rubrics still overlap their body more than the rules allow,
three of them materially; a student who reads carefully can still shortcut
those three questions.
