//! m0-02-first-test: read a test, then make it pass.
//!
//! `add` is complete and shows the shape of a function: parameters with
//! types, a return type after `->`, and the last expression (no `;`) as the
//! return value. `greet` is yours.

/// Returns the sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Returns `"Hello, <name>!"` – for `greet("Ada")` that is `"Hello, Ada!"`.
pub fn greet(name: &str) -> String {
    todo!("build the greeting with format!")
}
