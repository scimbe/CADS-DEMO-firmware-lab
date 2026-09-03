//! Tests for step m0-03-predict-output. Run: `cargo test --test m0-03-predict-output`
use rust_foundations::m0::m0_03_predict::{celsius_to_fahrenheit, fahrenheit_to_celsius};

mod m0_03_predict_output {
    use super::*;

    #[test]
    fn boiling_point() {
        assert_eq!(celsius_to_fahrenheit(100.0), 212.0);
    }

    #[test]
    fn freezing_point() {
        assert_eq!(celsius_to_fahrenheit(0.0), 32.0);
        assert_eq!(fahrenheit_to_celsius(32.0), 0.0);
    }

    #[test]
    fn minus_forty_is_the_same_in_both() {
        assert_eq!(celsius_to_fahrenheit(-40.0), -40.0);
        assert_eq!(fahrenheit_to_celsius(-40.0), -40.0);
    }
}
