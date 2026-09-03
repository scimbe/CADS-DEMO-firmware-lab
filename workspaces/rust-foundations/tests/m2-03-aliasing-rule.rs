//! Tests for step m2-03-aliasing-rule. Run: `cargo test --test m2-03-aliasing-rule`
use rust_foundations::m2::m2_03_aliasing::{double_all_and_sum, first_then_push, longest_len_then_clear};

mod m2_03_aliasing_rule {
    use super::*;

    #[test]
    fn first_then_push_returns_first_and_pushes() {
        let mut v = vec![10, 20];
        assert_eq!(first_then_push(&mut v, 30), 10);
        assert_eq!(v, vec![10, 20, 30]);
    }

    #[test]
    fn longest_len_then_clear_works() {
        let mut words = vec![String::from("a"), String::from("three"), String::from("bb")];
        assert_eq!(longest_len_then_clear(&mut words), 5);
        assert!(words.is_empty());
    }

    #[test]
    fn longest_len_of_empty_is_zero() {
        let mut words: Vec<String> = Vec::new();
        assert_eq!(longest_len_then_clear(&mut words), 0);
    }

    #[test]
    fn double_all_and_sum_mutates_and_sums() {
        let mut v = [1, 2, 3];
        assert_eq!(double_all_and_sum(&mut v), 12);
        assert_eq!(v, [2, 4, 6]);
    }
}
