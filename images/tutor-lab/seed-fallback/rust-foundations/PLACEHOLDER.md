# PLACEHOLDER workspace – rust-foundations

This is **not** the real `rust-foundations` starter workspace. The image was built from a
checkout without `workspaces/rust-foundations/` (the Rust course stream was not merged yet),
so `images/tutor-lab/seed-fallback/rust-foundations/` was seeded instead.

It exists so the image, the tutor panel and the smoke test have something to build, test and
open. Rebuild the image from a checkout that contains `workspaces/rust-foundations/` and this
file disappears (the seed script logs `PLACEHOLDER` when it is used).

Layout mirrors the spec (Addendum A4): a Cargo library crate, one integration test per step
under `tests/<step>.rs` (`cargo test --test m0-01-hello`), no reference solutions.
