//! Tests for step m2-02-mutable-references. Run: `cargo test --test m2-02-mutable-references`
use rust_foundations::m2::m2_02_mutable_refs::{append_twice, change, swap_ends};

mod m2_02_mutable_references {
    use super::*;

    #[test]
    fn change_appends_world() {
        let mut s = String::from("hello");
        change(&mut s);
        assert_eq!(s, "hello, world");
    }

    #[test]
    fn append_twice_appends_twice() {
        let mut s = String::from("ab");
        append_twice(&mut s, "cd");
        assert_eq!(s, "abcdcd");
    }

    #[test]
    fn swap_ends_swaps() {
        let mut v = vec![1, 2, 3, 4];
        swap_ends(&mut v);
        assert_eq!(v, vec![4, 2, 3, 1]);
    }

    #[test]
    fn swap_ends_short_vectors() {
        let mut empty: Vec<i32> = Vec::new();
        swap_ends(&mut empty);
        assert!(empty.is_empty());
        let mut one = vec![7];
        swap_ends(&mut one);
        assert_eq!(one, vec![7]);
    }
}
