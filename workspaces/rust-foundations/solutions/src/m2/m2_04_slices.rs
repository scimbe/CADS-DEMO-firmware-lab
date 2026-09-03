//! Reference solution for m2-04-slices.

/// Returns the first word of `s`.
pub fn first_word(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[..i],
        None => s,
    }
}

/// Returns the last word of `s`.
pub fn last_word(s: &str) -> &str {
    match s.rfind(' ') {
        Some(i) => &s[i + 1..],
        None => s,
    }
}

/// Returns the sum of all elements of the slice.
pub fn sum(xs: &[i32]) -> i32 {
    let mut total = 0;
    for x in xs {
        total += *x;
    }
    total
}

/// Returns the slice without its first element.
pub fn tail(xs: &[i32]) -> &[i32] {
    if xs.is_empty() { xs } else { &xs[1..] }
}
