//! Tests for step m2-04-slices. Run: `cargo test --test m2-04-slices`
use rust_foundations::m2::m2_04_slices::{first_word, last_word, sum, tail};

mod m2_04_slices {
    use super::*;

    #[test]
    fn first_word_of_sentence() {
        let s = String::from("hello world");
        assert_eq!(first_word(&s), "hello");
        assert_eq!(first_word("hello world"), "hello");
    }

    #[test]
    fn first_word_of_single_word() {
        assert_eq!(first_word("hello"), "hello");
        assert_eq!(first_word(""), "");
    }

    #[test]
    fn last_word_of_sentence() {
        assert_eq!(last_word("the quick fox"), "fox");
        assert_eq!(last_word("fox"), "fox");
    }

    #[test]
    fn sum_and_tail_of_slices() {
        let v = vec![1, 2, 3, 4];
        assert_eq!(sum(&v), 10);
        assert_eq!(sum(&v[1..3]), 5);
        assert_eq!(sum(&[]), 0);
        assert_eq!(tail(&v), &[2, 3, 4]);
        assert_eq!(tail(&[]), &[] as &[i32]);
    }
}
