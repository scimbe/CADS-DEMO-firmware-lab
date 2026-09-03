//! Tests for step m1-01-scope-and-move. Run: `cargo test --test m1-01-scope-and-move`
use rust_foundations::m1::m1_01_scope::{gives_ownership, takes_ownership};

mod m1_01_scope_and_move {
    use super::*;

    #[test]
    fn takes_ownership_returns_length() {
        let s = String::from("hello");
        assert_eq!(takes_ownership(s), 5);
        // `s` is gone here: using it would be error E0382.
    }

    #[test]
    fn empty_string_has_length_zero() {
        assert_eq!(takes_ownership(String::new()), 0);
    }

    #[test]
    fn gives_ownership_returns_yours() {
        let s = gives_ownership();
        assert_eq!(s, "yours");
    }
}
