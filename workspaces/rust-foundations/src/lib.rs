//! rust-foundations – exercises for the CaDS Tutor course `rust-foundations`.
//!
//! One module per course module (M0–M6) plus `project` for the final CLI tool;
//! one file per step. The tests in `tests/<step-id>.rs` are complete – you only
//! edit files under `src/` (and, in two steps, under `repair/`).
//!
//! Run a single step:      `cargo test --test <step-id>`
//! Run everything:         `cargo test`
//!
//! Unsolved exercises are `todo!()` stubs whose parameters are unused, which
//! would bury the messages that matter under dozens of `unused variable`
//! warnings. The allow below silences exactly that one class; every other
//! warning still reaches you.
#![allow(unused_variables)]

pub mod m0;
pub mod m1;
pub mod m2;
pub mod m3;
pub mod m4;
pub mod m5;
pub mod m6;
pub mod project;
