//! Tests for step m3-02-enums. Run: `cargo test --test m3-02-enums`
use rust_foundations::m3::m3_02_enums::{Command, first_char, make_move, make_write, safe_div};

mod m3_02_enums {
    use super::*;

    #[test]
    fn make_move_carries_both_coordinates() {
        assert_eq!(make_move(3, -1), Command::Move { x: 3, y: -1 });
        assert_eq!(make_move(0, 0), Command::Move { x: 0, y: 0 });
    }

    #[test]
    fn make_write_owns_its_text() {
        assert_eq!(make_write("hello"), Command::Write(String::from("hello")));
        assert_eq!(make_write(""), Command::Write(String::new()));
    }

    #[test]
    fn first_char_is_optional() {
        assert_eq!(first_char("rust"), Some('r'));
        assert_eq!(first_char("Здравствуйте"), Some('З'));
        assert_eq!(first_char(""), None);
    }

    #[test]
    fn safe_div_never_panics() {
        assert_eq!(safe_div(7, 2), Some(3));
        assert_eq!(safe_div(-7, 2), Some(-3));
        assert_eq!(safe_div(7, 0), None);
    }
}
