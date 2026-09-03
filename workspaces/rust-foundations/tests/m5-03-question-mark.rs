//! Tests for step m5-03-question-mark.
//! Run: `cargo test --test m5-03-question-mark`
use rust_foundations::m5::m5_03_question_mark::{double_parsed, parse_all, parse_size, sum_lines};

mod m5_03_question_mark {
    use super::*;

    #[test]
    fn double_parsed_doubles() {
        assert_eq!(double_parsed("21"), Ok(42));
        assert!(double_parsed("x").is_err());
        assert_eq!(
            double_parsed("x").unwrap_err().to_string(),
            "invalid digit found in string"
        );
    }

    #[test]
    fn parse_all_keeps_order() {
        assert_eq!(parse_all(&["1", "2", "3"]), Ok(vec![1, 2, 3]));
        assert_eq!(parse_all(&[]), Ok(vec![]));
        assert!(parse_all(&["1", "nope", "3"]).is_err());
    }

    #[test]
    fn sum_lines_ignores_blank_lines() {
        assert_eq!(sum_lines("1\n2\n\n3\n"), Ok(6));
        assert_eq!(sum_lines("  10  \n-4"), Ok(6));
        assert_eq!(sum_lines(""), Ok(0));
        assert!(sum_lines("1\ntwo").is_err());
    }

    #[test]
    fn parse_size_separates_the_two_failures() {
        assert_eq!(parse_size("800x600"), Ok((800, 600)));
        assert_eq!(parse_size("800*600"), Err(None));
        match parse_size("800xtall") {
            Err(Some(e)) => assert_eq!(e.to_string(), "invalid digit found in string"),
            other => panic!("expected Err(Some(_)), got {other:?}"),
        }
    }
}
