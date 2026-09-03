//! Tests for step m6-03-trait-bounds.
//! Run: `cargo test --test m6-03-trait-bounds`
use rust_foundations::m6::m6_02_traits::{Article, Tweet};
use rust_foundations::m6::m6_03_bounds::{describe_pair, longest_summary, notify, summarize_all};

mod m6_03_trait_bounds {
    use super::*;

    fn tweets() -> Vec<Tweet> {
        vec![
            Tweet {
                username: String::from("a"),
                content: String::new(),
            },
            Tweet {
                username: String::from("longer_name"),
                content: String::new(),
            },
        ]
    }

    #[test]
    fn notify_accepts_any_summary() {
        let t = Tweet {
            username: String::from("bob"),
            content: String::new(),
        };
        assert_eq!(notify(&t), "Breaking! (Read more from @bob...)");
        let a = Article {
            headline: String::from("H"),
            author: String::from("A"),
            content: String::new(),
        };
        assert_eq!(notify(&a), "Breaking! H, by A");
    }

    #[test]
    fn summarize_all_joins_with_newlines() {
        assert_eq!(
            summarize_all(&tweets()),
            "(Read more from @a...)\n(Read more from @longer_name...)"
        );
        assert_eq!(summarize_all::<Tweet>(&[]), "");
    }

    #[test]
    fn longest_summary_picks_the_longest() {
        assert_eq!(
            longest_summary(&tweets()),
            Some(String::from("(Read more from @longer_name...)"))
        );
        assert_eq!(longest_summary::<Tweet>(&[]), None);
    }

    #[test]
    fn describe_pair_needs_two_bounds() {
        assert_eq!(describe_pair(3, 7), "7 beats 3");
        assert_eq!(describe_pair(7, 3), "7 beats 3");
        assert_eq!(describe_pair(5, 5), "5 ties 5");
        assert_eq!(describe_pair("apple", "pear"), "pear beats apple");
    }
}
