//! Reference solution for m0-03-first-test.

/// Returns the sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Returns `"Hello, <name>!"` – for `greet("Ada")` that is `"Hello, Ada!"`.
pub fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}
