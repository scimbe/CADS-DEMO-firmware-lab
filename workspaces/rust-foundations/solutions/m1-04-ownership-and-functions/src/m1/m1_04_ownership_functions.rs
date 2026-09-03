//! Reference solution for m1-04-ownership-and-functions.

/// Consumes `a` and `b` and returns their concatenation.
pub fn join_owned(a: String, b: String) -> String {
    let mut out = a;
    out.push_str(&b);
    out
}

/// Returns the longer of the two strings; on a tie, `a`.
pub fn longer_owned(a: String, b: String) -> String {
    if b.len() > a.len() { b } else { a }
}

/// Builds `n` copies of `word` separated by single spaces.
pub fn repeat_words(word: &str, n: usize) -> String {
    let mut out = String::new();
    for i in 0..n {
        if i > 0 {
            out.push(' ');
        }
        out.push_str(word);
    }
    out
}
