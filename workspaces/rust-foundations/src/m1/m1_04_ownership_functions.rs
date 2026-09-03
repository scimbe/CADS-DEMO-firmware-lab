//! m1-04-ownership-and-functions: moving values in and out of functions.

/// Consumes `a` and `b` and returns their concatenation `a + b` in a
/// single `String`. Do not clone – the caller has given both away.
pub fn join_owned(a: String, b: String) -> String {
    todo!()
}

/// Returns the longer of the two strings; on a tie, `a`. The other string is
/// dropped when the function returns.
pub fn longer_owned(a: String, b: String) -> String {
    todo!()
}

/// Builds `n` copies of `word` separated by single spaces, e.g.
/// `repeat_words("ho", 3)` is `"ho ho ho"`. `repeat_words("x", 0)` is `""`.
pub fn repeat_words(word: &str, n: usize) -> String {
    todo!()
}
