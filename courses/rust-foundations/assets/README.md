# Screenshots for rust-foundations

Three images, all captured from a real run of this pack in
`ghcr.io/scimbe/cads-tutor-lab:next` (digest `sha256:efb6fa2a…`, code-server
4.135, rustc 1.98.0, rust-analyzer 0.3.3033) on 127.0.0.1:8095.

| File | Used in | Shows |
|---|---|---|
| `palette-new-terminal.png` | `m0-02-workbench` | the command palette with `>Terminal: Create New Terminal` and the matching command selected |
| `terminal-run-a-step.png` | every step with a command or testSuite check | a terminal in the panel, the prompt inside the crate, the command and its real output |
| `editor-and-test-run.png` | `m0-03-first-test` | the exercise file with Rust syntax highlighting, and below it the real failing test run naming that file and line |

## Two things about these images

**The side bar shows the Explorer, not the tutor.** That is deliberate. The
tutor panel currently opens the JavaScript course when the Rust workspace is
opened, and the `Rust – Foundations` node lists JavaScript step titles - still
reproducible in the image above, reported to the tutor stream. An image of the
wrong course beside a Rust instruction would teach the wrong thing more
effectively than no image at all. What each picture shows - terminal, editor,
panel tabs, toolchain - is unaffected by that defect.

**The status bar is cropped off** for the same reason: it carried the name of
the active *JavaScript* step. Cropping cost one piece of evidence, so it is
recorded here instead: on `src/m0/m0_03_first_test.rs` the status bar read
`rust-analyzer` and language mode `Rust`, and the Explorer shows rust-analyzer's
own `RUST DEPENDENCIES` section. Syntax highlighting and language support both
work; see `docs/review/rust-walkthrough.md`.

## When the tutor panel is fixed

Retake all three with the Rust course selected and the tutor panel open, keep
the same file names so the embeds do not move, and add a fourth showing the
task list with a Check button and its result. Then this section can go.
