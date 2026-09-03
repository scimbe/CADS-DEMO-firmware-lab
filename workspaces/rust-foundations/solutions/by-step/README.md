# Reference solutions

Two views of the same code.

**`solutions/src/**` and `solutions/repair/**`** are the *complete* finished
workspace, laid out at exactly the relative paths the workspace uses. This is
what `scripts/validate-courses.py --solutions` overlays onto a scratch copy of
the workspace before it runs the checks:

```bash
python3 scripts/validate-courses.py workspaces/rust-foundations \
  --courses-dir courses --only rust-foundations \
  --solutions workspaces/rust-foundations/solutions
```

Each `command`/`testSuite` check then runs twice: on the bare workspace, where
it must fail, and on the overlaid copy, where it must pass. A check that passes
either way is worthless. The handful that legitimately pass on the bare
workspace - environment probes, `cargo fmt --check`, and the `predict` and
snippet compilations, all of which test a fixed artifact rather than student
code - say so with `seedMustFail: false` in their front matter.

**`solutions/by-step/<step-id>/`** holds the same files split per step, at the
same relative paths. Nothing in the toolchain requires this layout; it is here
so an author can probe one step in isolation while writing it, which is how the
three checks that were not solution-dependent were found. A few directories
carry an earlier step's file as well, so each one is self-sufficient:
`m4-04-collections-report` needs `m4_03_hash_maps.rs` and `m6-03-trait-bounds`
needs `m6_02_traits.rs`. There is no `m7-02-review` directory - that step's
`clippy` check judges the whole workspace, so its solution is the top-level
overlay.

Neither directory is part of the student workspace, and neither may be seeded
into the lab image.
