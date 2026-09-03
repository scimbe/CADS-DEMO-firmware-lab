//! Tests for step m3-04-if-let. Run: `cargo test --test m3-04-if-let`
use rust_foundations::m3::m3_02_enums::Command;
use rust_foundations::m3::m3_04_if_let::{
    config_or_default, count_non_quit, first_move_x, longest_write,
};

mod m3_04_if_let {
    use super::*;

    fn sample() -> Vec<Command> {
        vec![
            Command::Write(String::from("hi")),
            Command::Quit,
            Command::Move { x: 42, y: 0 },
            Command::Write(String::from("longer text")),
            Command::Move { x: -7, y: 1 },
        ]
    }

    #[test]
    fn config_or_default_falls_back_to_three() {
        assert_eq!(config_or_default(Some(9)), 9);
        assert_eq!(config_or_default(None), 3);
    }

    #[test]
    fn count_non_quit_skips_quit() {
        assert_eq!(count_non_quit(&sample()), 4);
        assert_eq!(count_non_quit(&[Command::Quit]), 0);
        assert_eq!(count_non_quit(&[]), 0);
    }

    #[test]
    fn longest_write_picks_the_longest() {
        assert_eq!(longest_write(&sample()), Some(String::from("longer text")));
        assert_eq!(longest_write(&[Command::Quit]), None);
    }

    #[test]
    fn longest_write_keeps_the_first_on_a_tie() {
        let commands = vec![
            Command::Write(String::from("aa")),
            Command::Write(String::from("bb")),
        ];
        assert_eq!(longest_write(&commands), Some(String::from("aa")));
    }

    #[test]
    fn first_move_x_returns_minus_one_without_a_move() {
        assert_eq!(first_move_x(&sample()), 42);
        assert_eq!(first_move_x(&[Command::Quit]), -1);
    }
}
