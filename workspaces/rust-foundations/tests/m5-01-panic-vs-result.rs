//! Tests for step m5-01-panic-vs-result.
//! Run: `cargo test --test m5-01-panic-vs-result`
use rust_foundations::m5::m5_01_panic::{average, element_at, element_at_opt, parse_port_or_panic};

mod m5_01_panic_vs_result {
    use super::*;

    #[test]
    fn element_at_returns_the_element() {
        assert_eq!(element_at(&[1, 2, 3], 0), 1);
        assert_eq!(element_at(&[1, 2, 3], 2), 3);
    }

    #[test]
    #[should_panic(expected = "index 5 out of range (len 3)")]
    fn element_at_panics_with_a_useful_message() {
        element_at(&[1, 2, 3], 5);
    }

    #[test]
    fn element_at_opt_never_panics() {
        assert_eq!(element_at_opt(&[1, 2, 3], 5), None);
        assert_eq!(element_at_opt(&[1, 2, 3], 1), Some(2));
        assert_eq!(element_at_opt(&[], 0), None);
    }

    #[test]
    fn parse_port_accepts_a_number() {
        assert_eq!(parse_port_or_panic("8080"), 8080);
        assert_eq!(parse_port_or_panic("0"), 0);
    }

    #[test]
    #[should_panic(expected = "not a valid port")]
    fn parse_port_panics_on_text() {
        parse_port_or_panic("http");
    }

    #[test]
    #[should_panic(expected = "not a valid port")]
    fn parse_port_panics_above_the_u16_range() {
        parse_port_or_panic("70000");
    }

    #[test]
    fn average_of_a_non_empty_slice() {
        assert_eq!(average(&[1.0, 2.0, 3.0]), 2.0);
    }

    #[test]
    #[should_panic(expected = "average of an empty slice")]
    fn average_of_nothing_panics() {
        average(&[]);
    }
}
