//! Tests for step m3-01-structs. Run: `cargo test --test m3-01-structs`
use rust_foundations::m3::m3_01_structs::{
    Rectangle, Student, area, deactivate, enrol, new_rectangle, square, widened,
};

mod m3_01_structs {
    use super::*;

    #[test]
    fn new_rectangle_sets_both_fields() {
        let r = new_rectangle(30, 50);
        assert_eq!(r.width, 30);
        assert_eq!(r.height, 50);
        assert_eq!(
            r,
            Rectangle {
                width: 30,
                height: 50
            }
        );
    }

    #[test]
    fn area_multiplies_and_borrows() {
        let r = new_rectangle(30, 50);
        assert_eq!(area(&r), 1500);
        // r was only borrowed, so it is still usable:
        assert_eq!(area(&r), 1500);
        assert_eq!(area(&new_rectangle(0, 7)), 0);
    }

    #[test]
    fn square_has_equal_sides() {
        let s = square(4);
        assert_eq!(s.width, s.height);
        assert_eq!(area(&s), 16);
    }

    #[test]
    fn widened_changes_only_the_width() {
        let r = new_rectangle(3, 4);
        assert_eq!(
            widened(&r, 2),
            Rectangle {
                width: 6,
                height: 4
            }
        );
        assert_eq!(widened(&r, 1), r);
        // r was borrowed, not moved:
        assert_eq!(r.width, 3);
    }

    #[test]
    fn enrol_starts_active() {
        let s = enrol(String::from("Ada"), 4711);
        assert_eq!(
            s,
            Student {
                name: String::from("Ada"),
                matriculation: 4711,
                active: true
            }
        );
    }

    #[test]
    fn deactivate_changes_only_active() {
        let s = enrol(String::from("Grace"), 1906);
        let d = deactivate(s);
        assert_eq!(d.name, "Grace");
        assert_eq!(d.matriculation, 1906);
        assert!(!d.active);
    }
}
