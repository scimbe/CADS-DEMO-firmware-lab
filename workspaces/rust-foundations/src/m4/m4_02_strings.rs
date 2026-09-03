//! m4-02-strings: `String` owns UTF-8 text, `&str` borrows a slice of it –
//! and neither can be indexed by a number (ch. 8.2).

/// `s` in upper case, with an exclamation mark appended:
/// `shout("hi")` is `"HI!"`.
pub fn shout(s: &str) -> String {
    todo!()
}

/// The parts joined by `sep`: `join_with(&["a", "b"], "-")` is `"a-b"`.
/// The empty slice gives the empty string.
pub fn join_with(parts: &[&str], sep: &str) -> String {
    todo!()
}

/// How many *characters* (Unicode scalar values) `s` has.
/// For `"Здравствуйте"` that is 12.
pub fn char_count(s: &str) -> usize {
    todo!()
}

/// How many *bytes* `s` occupies in memory.
/// For `"Здравствуйте"` that is 24 – each of those letters needs two bytes in
/// UTF-8. This is why `s[0]` is not allowed on a `String`: the first byte is
/// not a character.
pub fn byte_len(s: &str) -> usize {
    todo!()
}

/// The first `n` characters of `s`, as an owned `String`. When `s` is shorter
/// than `n`, the whole string. Count characters, not bytes: slicing by a byte
/// index that lands inside a multi-byte character panics at runtime.
pub fn first_n_chars(s: &str, n: usize) -> String {
    todo!()
}
