//! Tests for step m3-03-match. Run: `cargo test --test m3-03-match`
use rust_foundations::m3::m3_02_enums::Command;
use rust_foundations::m3::m3_03_match::{describe, dice_action, increment, value_or};

mod m3_03_match {
    use super::*;

    #[test]
    fn describe_every_variant() {
        assert_eq!(describe(&Command::Quit), "quit");
        assert_eq!(describe(&Command::Move { x: 3, y: -1 }), "move to 3,-1");
        assert_eq!(describe(&Command::Write(String::from("hi"))), "write hi");
        assert_eq!(describe(&Command::ChangeColor(1, 2, 3)), "colour 1/2/3");
    }

    #[test]
    fn value_or_uses_the_default_only_for_none() {
        assert_eq!(value_or(Some(5), 0), 5);
        assert_eq!(value_or(None, 0), 0);
        assert_eq!(value_or(Some(0), 9), 0);
    }

    #[test]
    fn increment_keeps_the_shape() {
        assert_eq!(increment(Some(5)), Some(6));
        assert_eq!(increment(None), None);
    }

    #[test]
    fn dice_action_has_a_catch_all() {
        assert_eq!(dice_action(3), "fancy hat");
        assert_eq!(dice_action(7), "lose hat");
        assert_eq!(dice_action(9), "move 9");
        assert_eq!(dice_action(12), "move 12");
    }
}
