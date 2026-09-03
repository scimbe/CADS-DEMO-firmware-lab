//! m2-01-shared-references: borrow a value instead of taking it.

/// Returns the length of `s` without taking ownership (Listing 4-6 in the
/// book). The caller keeps its `String`.
pub fn calculate_length(s: &String) -> usize {
    todo!()
}

/// Counts how often the character `needle` occurs in `haystack`.
/// `&str` is the more general parameter type: it accepts both `&String`
/// and string literals.
pub fn count_char(haystack: &str, needle: char) -> usize {
    todo!()
}

/// Returns `true` if both strings have the same length. Neither is moved.
pub fn same_length(a: &str, b: &str) -> bool {
    todo!()
}
