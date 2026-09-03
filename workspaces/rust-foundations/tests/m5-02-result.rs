//! Tests for step m5-02-result. Run: `cargo test --test m5-02-result`
use rust_foundations::m5::m5_02_result::{checked_div, first_line, parse_port, sum_ports};

mod m5_02_result {
    use super::*;

    #[test]
    fn parse_port_reports_the_input() {
        assert_eq!(parse_port("8080"), Ok(8080));
        assert_eq!(
            parse_port("http"),
            Err(String::from("'http' is not a valid port"))
        );
        assert_eq!(
            parse_port("70000"),
            Err(String::from("'70000' is not a valid port"))
        );
        assert_eq!(parse_port(""), Err(String::from("'' is not a valid port")));
    }

    #[test]
    fn checked_div_guards_zero() {
        assert_eq!(checked_div(7, 2), Ok(3));
        assert_eq!(checked_div(7, 0), Err(String::from("division by zero")));
    }

    #[test]
    fn first_line_without_newline() {
        assert_eq!(first_line("a\nb\n"), Ok("a"));
        assert_eq!(first_line("only"), Ok("only"));
        assert_eq!(first_line(""), Err(String::from("empty input")));
    }

    #[test]
    fn sum_ports_stops_at_the_first_error() {
        assert_eq!(sum_ports(&["80", "443"]), Ok(523));
        assert_eq!(sum_ports(&[]), Ok(0));
        assert_eq!(
            sum_ports(&["80", "x", "y"]),
            Err(String::from("'x' is not a valid port"))
        );
    }
}
