//! Reference solution for m1-02-move-vs-clone.

/// Returns two independent copies of `s`.
pub fn duplicate(s: String) -> (String, String) {
    let copy = s.clone();
    (s, copy)
}

/// Returns the string together with its length.
pub fn length_and_back(s: String) -> (String, usize) {
    let len = s.len();
    (s, len)
}

/// Appends `suffix` to `s` and returns the result.
pub fn with_suffix(mut s: String, suffix: &str) -> String {
    s.push_str(suffix);
    s
}
