//! m4-01-vectors: a growable list of values of one type, stored next to each
//! other on the heap (ch. 8.1).

/// `[1, 2, …, n]` as a `Vec<i32>`; the empty vector for `n <= 0`.
pub fn build_range(n: i32) -> Vec<i32> {
    todo!()
}

/// The sum of all elements. Note the parameter type `&[i32]`: a slice, not
/// `&Vec<i32>`. It accepts both, so the function is usable in more places.
pub fn sum_all(v: &[i32]) -> i32 {
    todo!()
}

/// The element at index `i`, or `None` when the index is past the end.
///
/// `v[i]` panics on an out-of-range index; `v.get(i)` returns an `Option`.
/// This function must not panic – pick the right one.
pub fn get_at(v: &[i32], i: usize) -> Option<i32> {
    todo!()
}

/// Doubles every element in place. Iterate with `for x in v.iter_mut()`
/// (or `for x in &mut *v`) and write through the mutable reference with `*x`.
#[allow(clippy::ptr_arg)] // `&mut Vec` is the point of the exercise
pub fn double_in_place(v: &mut Vec<i32>) {
    todo!()
}

/// A new vector holding only the even elements, in their original order.
pub fn evens(v: &[i32]) -> Vec<i32> {
    todo!()
}
