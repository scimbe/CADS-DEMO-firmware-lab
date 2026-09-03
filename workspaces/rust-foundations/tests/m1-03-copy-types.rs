//! Tests for step m1-03-copy-types. Run: `cargo test --test m1-03-copy-types`
use rust_foundations::m1::m1_03_copy_types::{Point, mirror, sum_twice};

mod m1_03_copy_types {
    use super::*;

    fn assert_is_copy<T: Copy>() {}

    #[test]
    fn sum_twice_doubles() {
        assert_eq!(sum_twice(21), 42);
    }

    #[test]
    fn point_is_copy() {
        // Only compiles once Point implements Copy.
        assert_is_copy::<Point>();
        let p = Point { x: 1, y: 2 };
        let q = p;
        assert_eq!(p, q);
    }

    #[test]
    fn mirror_negates_x() {
        let (orig, mirrored) = mirror(Point { x: 2, y: 3 });
        assert_eq!(orig, Point { x: 2, y: 3 });
        assert_eq!(mirrored, Point { x: -2, y: 3 });
    }

    #[test]
    fn mirror_of_origin_is_origin() {
        let (orig, mirrored) = mirror(Point { x: 0, y: 0 });
        assert_eq!(orig, mirrored);
    }
}
