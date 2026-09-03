//! Tests for step m1-03-copy-types. Run: `cargo test --test m1-03-copy-types`
use rust_foundations::m1::m1_03_copy_types::{Point, mirror, sum_twice};

mod m1_03_copy_types {
    use super::*;

    #[test]
    fn sum_twice_doubles() {
        assert_eq!(sum_twice(21), 42);
    }

    // Whether `Point` is `Copy` is a compile-time fact, and a test that asserted
    // it with a `T: Copy` bound would stop this whole file from compiling until
    // you added the derive - taking every other step's tests down with it. The
    // step checks the derive by reading the source instead, and `mirror` below
    // is what proves the semantics: it uses `p` twice without cloning, which
    // only your own file can be made to compile.

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
