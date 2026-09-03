//! Tests for step m4-02-strings. Run: `cargo test --test m4-02-strings`
use rust_foundations::m4::m4_02_strings::{byte_len, char_count, first_n_chars, join_with, shout};

mod m4_02_strings {
    use super::*;

    #[test]
    fn shout_upcases_and_appends() {
        assert_eq!(shout("hi"), "HI!");
        assert_eq!(shout(""), "!");
    }

    #[test]
    fn join_with_separator() {
        assert_eq!(join_with(&["a", "b", "c"], "-"), "a-b-c");
        assert_eq!(join_with(&["only"], ", "), "only");
        assert_eq!(join_with(&[], "-"), "");
    }

    #[test]
    fn chars_and_bytes_differ() {
        assert_eq!(char_count("hello"), 5);
        assert_eq!(byte_len("hello"), 5);
        assert_eq!(char_count("Здравствуйте"), 12);
        assert_eq!(byte_len("Здравствуйте"), 24);
    }

    #[test]
    fn first_n_chars_counts_characters() {
        assert_eq!(first_n_chars("hello", 2), "he");
        assert_eq!(first_n_chars("hello", 99), "hello");
        assert_eq!(first_n_chars("Здравствуйте", 2), "Зд");
        assert_eq!(first_n_chars("Здравствуйте", 0), "");
    }
}
