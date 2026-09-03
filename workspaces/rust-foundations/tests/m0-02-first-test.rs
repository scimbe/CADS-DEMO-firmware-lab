//! Tests for step m0-02-first-test. Run: `cargo test --test m0-02-first-test`
use rust_foundations::m0::m0_02_first_test::{add, greet};

mod m0_02_first_test {
    use super::*;

    #[test]
    fn adds_two_numbers() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
    }

    #[test]
    fn greets_by_name() {
        assert_eq!(greet("Ada"), "Hello, Ada!");
    }

    #[test]
    fn greets_any_name() {
        assert_eq!(greet("Rust"), "Hello, Rust!");
        assert_eq!(greet(""), "Hello, !");
    }
}
