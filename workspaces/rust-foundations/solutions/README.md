# Reference solutions

One directory per step, holding the files that step's checks need, at the
same relative path they have in the workspace:

```
solutions/<step-id>/src/<module>/<file>.rs
solutions/<step-id>/repair/<file>.rs
```

`scripts/validate-courses.py --solutions workspaces/rust-foundations/solutions`
copies a step's directory over a clean copy of the workspace and runs that
step's checks: they must pass with the solution and fail without it. A check
that passes either way is worthless and the validator says so.

A few directories carry a copy of an earlier step's solution as well
(`m4-04-collections-report` needs `m4_03_hash_maps.rs`,
`m6-03-trait-bounds` needs `m6_02_traits.rs`), because their tests build on
that code. Each directory is therefore self-sufficient.

This directory is **not** part of the student workspace and must not be
seeded into the lab image.
