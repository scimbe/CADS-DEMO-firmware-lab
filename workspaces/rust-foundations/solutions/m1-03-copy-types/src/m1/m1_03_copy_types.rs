//! Reference solution for m1-03-copy-types.

/// A 2-D point. `Copy` is what lets `p` be used twice in `mirror`.
#[derive(Debug, PartialEq, Clone, Copy)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

/// `i32` is `Copy`: `y = x` copies the bits and `x` stays usable.
pub fn sum_twice(x: i32) -> i32 {
    let y = x;
    x + y
}

/// Returns the point itself and its mirror image across the y axis.
pub fn mirror(p: Point) -> (Point, Point) {
    (p, Point { x: -p.x, y: p.y })
}
