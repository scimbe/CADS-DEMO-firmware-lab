//! Reference solution for m4-02-strings.

pub fn shout(s: &str) -> String {
    format!("{}!", s.to_uppercase())
}

pub fn join_with(parts: &[&str], sep: &str) -> String {
    parts.join(sep)
}

pub fn char_count(s: &str) -> usize {
    s.chars().count()
}

pub fn byte_len(s: &str) -> usize {
    s.len()
}

/// Taking characters, not bytes: `&s[..n]` would panic in the middle of a
/// multi-byte character.
pub fn first_n_chars(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}
