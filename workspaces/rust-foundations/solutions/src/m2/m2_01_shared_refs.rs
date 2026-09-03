//! Reference solution for m2-01-shared-references.

/// Returns the length of `s` without taking ownership.
// `&String` on purpose: this is Listing 4-5 of the book verbatim, and
// `count_char` below shows why `&str` is the better parameter type.
#[allow(clippy::ptr_arg)]
pub fn calculate_length(s: &String) -> usize {
    s.len()
}

/// Counts how often the character `needle` occurs in `haystack`.
pub fn count_char(haystack: &str, needle: char) -> usize {
    haystack.chars().filter(|c| *c == needle).count()
}

/// Returns `true` if both strings have the same length.
pub fn same_length(a: &str, b: &str) -> bool {
    a.len() == b.len()
}
