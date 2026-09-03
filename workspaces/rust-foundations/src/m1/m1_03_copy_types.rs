//! m1-03-copy-types: stack-only data is copied, not moved.

/// A 2-D point. All fields are `i32`, so the whole struct could be `Copy` –
/// but it is not, until you say so with `#[derive(Clone, Copy)]`.
#[derive(Debug, PartialEq)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

/// `i32` is `Copy`: `y = x` copies the bits and `x` stays usable.
pub fn sum_twice(x: i32) -> i32 {
    let y = x;
    x + y
}

/// Returns the point itself and its mirror image across the y axis
/// (x negated). Both values are built from `p`, so `p` must be usable
/// twice – which is only true for a `Copy` type.
pub fn mirror(p: Point) -> (Point, Point) {
    todo!()
}
