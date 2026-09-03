//! Tests for step m5-04-custom-error.
//! Run: `cargo test --test m5-04-custom-error`
use rust_foundations::m5::m5_04_custom_error::{ConfigError, config_get, parse_config};

mod m5_04_custom_error {
    use super::*;

    #[test]
    fn parse_config_reads_pairs() {
        assert_eq!(
            parse_config("width = 800\nheight = 600"),
            Ok(vec![
                (String::from("width"), 800),
                (String::from("height"), 600)
            ])
        );
        assert_eq!(parse_config(""), Ok(vec![]));
        assert_eq!(parse_config("\n\n  \n"), Ok(vec![]));
    }

    #[test]
    fn a_line_without_equals_is_a_syntax_error() {
        assert_eq!(
            parse_config("width 800"),
            Err(ConfigError::Syntax(String::from("width 800")))
        );
    }

    #[test]
    fn the_question_mark_converts_the_parse_error() {
        assert_eq!(
            parse_config("width = wide"),
            Err(ConfigError::NotANumber(String::from(
                "invalid digit found in string"
            )))
        );
    }

    #[test]
    fn display_is_readable() {
        assert_eq!(
            ConfigError::Syntax(String::from("a b")).to_string(),
            "syntax error in line: a b"
        );
        assert_eq!(
            ConfigError::NotANumber(String::from("invalid digit found in string")).to_string(),
            "not a number: invalid digit found in string"
        );
    }

    #[test]
    fn config_error_is_a_std_error() {
        fn boxed(e: ConfigError) -> Box<dyn std::error::Error> {
            Box::new(e)
        }
        let b = boxed(ConfigError::Syntax(String::from("x")));
        assert_eq!(b.to_string(), "syntax error in line: x");
    }

    #[test]
    fn config_get_separates_absent_from_broken() {
        let text = "width = 800\nheight = 600";
        assert_eq!(config_get(text, "height"), Ok(Some(600)));
        assert_eq!(config_get(text, "depth"), Ok(None));
        assert!(config_get("width 800", "width").is_err());
    }
}
