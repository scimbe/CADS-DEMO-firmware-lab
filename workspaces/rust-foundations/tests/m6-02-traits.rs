//! Tests for step m6-02-traits. Run: `cargo test --test m6-02-traits`
use rust_foundations::m6::m6_02_traits::{Article, Summary, Tweet};

mod m6_02_traits {
    use super::*;

    fn article() -> Article {
        Article {
            headline: String::from("Penguins win the Stanley Cup"),
            author: String::from("Iceburgh"),
            content: String::from("The Pittsburgh Penguins once again..."),
        }
    }

    fn tweet() -> Tweet {
        Tweet {
            username: String::from("horse_ebooks"),
            content: String::from("of course, as you probably already know"),
        }
    }

    #[test]
    fn article_reports_its_author() {
        assert_eq!(article().author(), "Iceburgh");
    }

    #[test]
    fn article_overrides_the_default_summary() {
        assert_eq!(
            article().summarize(),
            "Penguins win the Stanley Cup, by Iceburgh"
        );
    }

    #[test]
    fn tweet_prefixes_the_username() {
        assert_eq!(tweet().author(), "@horse_ebooks");
    }

    #[test]
    fn tweet_uses_the_default_summary() {
        assert_eq!(tweet().summarize(), "(Read more from @horse_ebooks...)");
    }
}
