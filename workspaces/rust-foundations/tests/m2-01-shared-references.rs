//! Tests for step m2-01-shared-references. Run: `cargo test --test m2-01-shared-references`
use rust_foundations::m2::m2_01_shared_refs::{calculate_length, count_char, same_length};

mod m2_01_shared_references {
    use super::*;

    #[test]
    fn calculate_length_borrows() {
        let s1 = String::from("hello");
        let len = calculate_length(&s1);
        assert_eq!(len, 5);
        // s1 is still usable: it was only borrowed.
        assert_eq!(s1, "hello");
    }

    #[test]
    fn count_char_counts() {
        assert_eq!(count_char("banana", 'a'), 3);
        assert_eq!(count_char("banana", 'z'), 0);
        let owned = String::from("mississippi");
        assert_eq!(count_char(&owned, 's'), 4);
    }

    #[test]
    fn same_length_compares_lengths() {
        assert!(same_length("abc", "xyz"));
        assert!(!same_length("ab", "xyz"));
    }
}
