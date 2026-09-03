//! Tests for step m6-04-lifetimes. Run: `cargo test --test m6-04-lifetimes`
use rust_foundations::m6::m6_04_lifetimes::{
    Excerpt, first_sentence, first_word, longest, longest_with_announcement,
};

mod m6_04_lifetimes {
    use super::*;

    #[test]
    fn longest_picks_the_longer_string() {
        assert_eq!(longest("hello", "hi"), "hello");
        assert_eq!(longest("hi", "hello"), "hello");
        assert_eq!(longest("ab", "cd"), "ab");
    }

    #[test]
    fn longest_borrows_from_both_inputs() {
        // The result may be used only while BOTH inputs are alive - that is
        // what the shared `'a` in the signature says. Listing 10-24 of the
        // book moves this `assert` out of the inner scope and no longer
        // compiles, for exactly that reason.
        let a = String::from("long string is long");
        {
            let b = String::from("short");
            let result = longest(a.as_str(), b.as_str());
            assert_eq!(result, "long string is long");
        }
        assert_eq!(a, "long string is long");
    }

    #[test]
    fn first_sentence_keeps_the_full_stop() {
        let novel = String::from("Call me Ishmael. Some years ago...");
        assert_eq!(
            first_sentence(&novel),
            Excerpt {
                part: "Call me Ishmael."
            }
        );
        assert_eq!(
            first_sentence("no full stop"),
            Excerpt {
                part: "no full stop"
            }
        );
        assert_eq!(first_sentence(""), Excerpt { part: "" });
    }

    #[test]
    fn announcement_is_returned_alongside_the_winner() {
        let (announced, winner) = longest_with_announcement("hello", "hi", 42);
        assert_eq!(announced, "Attention please: 42");
        assert_eq!(winner, "hello");
        let (announced, winner) = longest_with_announcement("a", "bb", "today");
        assert_eq!(announced, "Attention please: today");
        assert_eq!(winner, "bb");
    }

    #[test]
    fn first_word_needs_no_annotation() {
        assert_eq!(first_word("hello world"), "hello");
        assert_eq!(first_word("single"), "single");
        assert_eq!(first_word(""), "");
    }
}
