//! Tests for step m1-02-move-vs-clone. Run: `cargo test --test m1-02-move-vs-clone`
use rust_foundations::m1::m1_02_move_vs_clone::{duplicate, length_and_back, with_suffix};

mod m1_02_move_vs_clone {
    use super::*;

    #[test]
    fn duplicate_returns_two_equal_strings() {
        let (a, b) = duplicate(String::from("hello"));
        assert_eq!(a, "hello");
        assert_eq!(b, "hello");
    }

    #[test]
    fn duplicates_are_independent() {
        let (mut a, b) = duplicate(String::from("hi"));
        a.push_str("!!");
        assert_eq!(a, "hi!!");
        assert_eq!(b, "hi");
    }

    #[test]
    fn length_and_back_returns_ownership() {
        let (s, len) = length_and_back(String::from("hello"));
        assert_eq!(len, 5);
        assert_eq!(s, "hello");
    }

    #[test]
    fn with_suffix_appends() {
        assert_eq!(
            with_suffix(String::from("hello"), ", world"),
            "hello, world"
        );
        assert_eq!(with_suffix(String::new(), ""), "");
    }
}
