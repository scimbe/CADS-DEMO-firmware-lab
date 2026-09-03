# Screenshots for rust-foundations

Five images, all captured from a real run of this pack in
`ghcr.io/scimbe/cads-tutor-lab:next` on 127.0.0.1:8096, with the tutor
extension rebuilt from `extensions/cads-tutor` at the commit that fixes the
course-tree and autoOpen defects (tutor3, 9006791). code-server 4.135,
rustc 1.98.0, rust-analyzer 0.3.3033.

| File | Used in | Shows |
|---|---|---|
| `tutor-panel-and-tree.png` | `m0-01-welcome` | the whole window: the course tree with Rust – Foundations and M0–M7, and the step in the panel with its Bloom and scaffold badges |
| `task-check-result.png` | `m0-02-workbench` | the task list after pressing Check: the first task ticked green with `exited with 0`, the second a question with its answer box and Show hint |
| `palette-new-terminal.png` | `m0-02-workbench` | the command palette with `>Terminal: Create New Terminal` and the matching command selected |
| `terminal-run-a-step.png` | every step with a command or testSuite check | a terminal in the panel, the prompt inside the crate, the command and its real output |
| `editor-and-test-run.png` | `m0-03-first-test` | the exercise file with Rust syntax highlighting, and below it the real failing test run naming that file and line |

## What was verified while shooting them

- **The course tree is correct.** One course node, `Rust – Foundations 0/31`,
  with all eight modules and all thirty-one step titles, correctly nested. Zero
  foreign titles - checked programmatically against a pattern of JavaScript
  step names, not by eye.
- **autoOpen picks the right course.** Opening the `rust-foundations` folder
  opens `m0-01-welcome` and hides the JavaScript pack entirely.
- **Rust highlighting and language support work.** The status bar reads
  `rust-analyzer` and language mode `Rust`, and the Explorer carries
  rust-analyzer's own `RUST DEPENDENCIES` section.
- **A Check button runs the real command.** The first task of `m0-01-welcome`
  went green with `exited with 0`.
- **No language model is configured on this deployment.** The panel says so and
  falls back to manual confirmation, so the 22 `question` checks are unmarked
  there and their rubrics ungraded. Expected per SPEC 3.3, but it means the
  rubric work is only exercised where `TUTOR_LLM_BASE_URL` is set.

Nothing is cropped and no image contains a foreign course title, so the earlier
workarounds are gone.

## Adding to these

The three handgrips - open a terminal, `cd` into the crate, run the command -
are identical in every step, which is why one terminal image is shared across
all of them with a caption saying so. Twenty-eight near-identical screenshots
differing in one word would rot on the next UI change and teach nothing extra.
A step earns its own image when what is on screen differs.
