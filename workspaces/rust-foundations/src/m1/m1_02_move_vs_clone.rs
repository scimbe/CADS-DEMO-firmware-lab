//! m1-02-move-vs-clone: a `String` moves; `clone` makes a deep copy.

/// Returns two independent copies of `s` – the caller wants to keep using
/// both. Hint: `(s, s)` is a use after move; the compiler will tell you so.
pub fn duplicate(s: String) -> (String, String) {
    todo!()
}

/// Returns the string together with its length, so the caller gets the
/// ownership back (Listing 4-5 in the book).
pub fn length_and_back(s: String) -> (String, usize) {
    todo!()
}

/// Appends `suffix` to `s` and returns the result. `s` is taken by value on
/// purpose: the caller gives the string away and gets the new one back.
pub fn with_suffix(s: String, suffix: &str) -> String {
    todo!()
}
