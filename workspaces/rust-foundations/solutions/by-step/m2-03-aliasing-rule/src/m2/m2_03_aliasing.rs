//! Reference solution for m2-03-aliasing-rule.

/// Returns the first element of `v` and then pushes `x` onto `v`.
///
/// Copying the value out ends the shared borrow before `push` needs the
/// mutable one, so E0502 never arises.
pub fn first_then_push(v: &mut Vec<i32>, x: i32) -> i32 {
    let first = v[0];
    v.push(x);
    first
}

/// Returns the length of the longest word, then clears the list.
pub fn longest_len_then_clear(words: &mut Vec<String>) -> usize {
    let mut longest = 0;
    for w in words.iter() {
        if w.len() > longest {
            longest = w.len();
        }
    }
    words.clear();
    longest
}

/// Doubles every element and returns the new sum.
pub fn double_all_and_sum(v: &mut [i32]) -> i32 {
    let mut sum = 0;
    for x in v.iter_mut() {
        *x *= 2;
        sum += *x;
    }
    sum
}
