# Screenshots for rust-foundations

Empty on purpose, and the reason is recorded rather than left to guess.

Four screenshots were captured from a real run of this pack in
`cads-tutor-lab:dev` (code-server 4.135, rustc 1.98, rust-analyzer 0.3.3033)
and are parked in `docs/review/evidence/`:

| Evidence file | Shows |
|---|---|
| `lab-overview-wrong-course.png` | the whole window, activity bar, course tree, tutor panel |
| `lab-command-palette.png` | the palette in command mode, `>Terminal: Create` matching |
| `lab-terminal-first-test.png` | `cd` plus `cargo test --test m0-03-first-test` and its real failure |
| `lab-editor-rust-analyzer.png` | a Rust file with syntax highlighting, rust-analyzer in the status bar |

None of them may be embedded in a step yet. In every one the tutor panel shows
a **JavaScript** step, because the lab image currently auto-opens the wrong
course for a Rust workspace and renders JavaScript step titles under the
`Rust – Foundations` node. Putting those next to a Rust instruction would teach
the wrong thing more effectively than no picture at all. The defect is reported
to the tutor stream; `docs/review/rust-walkthrough.md` has the details.

When it is fixed, retake the four with the Rust course selected, drop them in
here, and embed them with a caption naming the action - not the file. The
steps that earn one are `m0-01-welcome` (the window), `m0-02-workbench` (the
palette and a terminal after `cd`), and `m0-03-first-test` (a real failing test
run beside the file it names). Every later step repeats the same three
handgrips, which the `Running it` section already spells out in words.
