//! Reference solution for m1-01-scope-and-move.

/// Takes ownership of `s` and returns its length.
pub fn takes_ownership(s: String) -> usize {
    s.len()
}

/// Creates a `String` inside the function and moves it out to the caller.
pub fn gives_ownership() -> String {
    String::from("yours")
}
