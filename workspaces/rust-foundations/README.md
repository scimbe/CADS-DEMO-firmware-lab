# rust-foundations – exercise workspace

The workspace for the CaDS Tutor course **`rust-foundations`**. Open the
tutor (activity bar, "CaDS Tutor"), pick the course, and work through the
steps; every task in the course checks something in this folder.

Nothing here needs the internet or the board. You need `cargo`; everything
else comes with it.

## The one command you need

```bash
cargo test --test m0-03-first-test
```

That runs the tests of a single step. The step id is the file name in
`tests/`, and the tutor prints the exact command for the step you are on. It is
the command every check in the course uses, so what you see in the terminal is
what the tutor sees.

`cargo test` on its own runs every step, including the ones you have not
started. It stops at the first step that fails, which early on is the first
step you have not done yet; `cargo test --no-fail-fast` runs all thirty test
targets and shows the whole picture. Both are useful for orientation and
neither is what a step asks you to run.

## Layout

| Path | What it is |
|---|---|
| `src/m0/ … src/m6/` | The exercises. One file per step; you edit these. |
| `src/project/` | The final project's library code. |
| `src/bin/wordstat.rs` | The final project's command-line front end. Complete – read it, do not change it. |
| `tests/<step-id>.rs` | The tests for one step. Complete. Read them: they are the specification. |
| `examples/*.rs` | Runnable programs for the "predict the output" tasks: `cargo run --example <name>`. |
| `snippets/*.rs` | Programs that deliberately do **not** compile. They are not part of the build; you read them and predict the error. |
| `repair/*.rs` | Broken programs you fix, in two steps. Not part of the build either; the checks call `rustc` on them directly. |
| `samples/fox.txt` | Input for the final project. |
| `Cargo.toml` | The package manifest. |

`target/` holds build output and is ignored by git. Reference solutions live
outside this workspace and are not shipped to students.

## What an unfinished exercise looks like

Every exercise starts as a `todo!()`:

```rust
pub fn greet(name: &str) -> String {
    todo!("build the greeting with format!")
}
```

`todo!()` type-checks as any type, so the crate compiles; the test that calls
it fails at runtime with `not yet implemented`. That is the expected starting
state, not a broken checkout.

The two files under `repair/` are the exception: they do not compile at all,
on purpose. Reading the compiler's diagnostic is the exercise.

## Style

`cargo fmt` formats, `cargo clippy` reviews. Both are clean on a finished
workspace, and the last step of the course checks that. A handful of
functions carry an `#[allow(clippy::…)]` with a comment explaining why the
book's spelling is kept over clippy's advice.
