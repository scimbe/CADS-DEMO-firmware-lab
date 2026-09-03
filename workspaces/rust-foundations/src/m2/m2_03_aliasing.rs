//! m2-03-aliasing-rule: either any number of readers, or exactly one writer.

/// Returns the first element of `v` and then pushes `x` onto `v`.
/// `v` is never empty when this is called.
///
/// The obvious `let first = &v[0]; v.push(x); *first` is error E0502: the
/// shared borrow `first` is still alive when `push` needs a mutable one.
pub fn first_then_push(v: &mut Vec<i32>, x: i32) -> i32 {
    todo!()
}

/// Returns the length of the longest word in `words`, then removes all words
/// (`words` is empty afterwards). Returns 0 for an empty list.
pub fn longest_len_then_clear(words: &mut Vec<String>) -> usize {
    todo!()
}

/// Doubles every element and returns the new sum.
pub fn double_all_and_sum(v: &mut [i32]) -> i32 {
    todo!()
}
