//! Tests for step m6-01-generics. Run: `cargo test --test m6-01-generics`
use rust_foundations::m6::m6_01_generics::{Labelled, Pair, first_of, label, largest, swap};

mod m6_01_generics {
    use super::*;

    #[test]
    fn largest_works_for_numbers_and_chars() {
        assert_eq!(*largest(&[34, 50, 25, 100, 65]), 100);
        assert_eq!(*largest(&['y', 'm', 'a', 'q']), 'y');
        assert_eq!(*largest(&[1.5, -2.0, 0.25]), 1.5);
        assert_eq!(*largest(&[7]), 7);
    }

    #[test]
    fn largest_returns_a_reference_into_the_slice() {
        let words = vec![String::from("ant"), String::from("zebra")];
        assert_eq!(largest(&words), "zebra");
        // The slice still owns its strings:
        assert_eq!(words.len(), 2);
    }

    #[test]
    fn swap_exchanges_both_values() {
        let p = Pair {
            first: 1,
            second: 2,
        };
        assert_eq!(
            swap(p),
            Pair {
                first: 2,
                second: 1
            }
        );
        let s = Pair {
            first: String::from("a"),
            second: String::from("b"),
        };
        assert_eq!(
            swap(s),
            Pair {
                first: String::from("b"),
                second: String::from("a")
            }
        );
    }

    #[test]
    fn first_of_clones() {
        assert_eq!(first_of(&[10, 20]), Some(10));
        assert_eq!(first_of::<i32>(&[]), None);
        assert_eq!(first_of(&[String::from("x")]), Some(String::from("x")));
    }

    #[test]
    fn label_mixes_two_type_parameters() {
        assert_eq!(
            label("port", 8080),
            Labelled {
                label: "port",
                value: 8080
            }
        );
        assert_eq!(
            label(1u8, String::from("one")),
            Labelled {
                label: 1u8,
                value: String::from("one")
            }
        );
    }
}
