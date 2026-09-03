//! Tests for step m1-04-ownership-and-functions. Run: `cargo test --test m1-04-ownership-and-functions`
use rust_foundations::m1::m1_04_ownership_functions::{join_owned, longer_owned, repeat_words};

mod m1_04_ownership_and_functions {
    use super::*;

    #[test]
    fn join_concatenates() {
        assert_eq!(join_owned(String::from("foo"), String::from("bar")), "foobar");
    }

    #[test]
    fn join_with_empty() {
        assert_eq!(join_owned(String::new(), String::from("x")), "x");
        assert_eq!(join_owned(String::from("x"), String::new()), "x");
    }

    #[test]
    fn longer_picks_longer() {
        assert_eq!(longer_owned(String::from("ab"), String::from("abc")), "abc");
        assert_eq!(longer_owned(String::from("abcd"), String::from("abc")), "abcd");
    }

    #[test]
    fn longer_tie_returns_first() {
        assert_eq!(longer_owned(String::from("one"), String::from("two")), "one");
    }

    #[test]
    fn repeat_words_joins_with_spaces() {
        assert_eq!(repeat_words("ho", 3), "ho ho ho");
        assert_eq!(repeat_words("x", 1), "x");
        assert_eq!(repeat_words("x", 0), "");
    }
}
