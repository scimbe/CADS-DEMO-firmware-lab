//! Tests for step m4-04-collections-report.
//! Run: `cargo test --test m4-04-collections-report`
use rust_foundations::m4::m4_03_hash_maps::word_counts;
use rust_foundations::m4::m4_04_report::{format_groups, group_by_initial, top_n};

mod m4_04_collections_report {
    use super::*;

    #[test]
    fn group_by_initial_keeps_input_order() {
        let groups = group_by_initial(&["ant", "bee", "arc", "", "bat"]);
        assert_eq!(groups.len(), 2);
        assert_eq!(
            groups.get(&'a'),
            Some(&vec![String::from("ant"), String::from("arc")])
        );
        assert_eq!(
            groups.get(&'b'),
            Some(&vec![String::from("bee"), String::from("bat")])
        );
    }

    #[test]
    fn top_n_sorts_by_count_then_word() {
        let counts = word_counts("b b a a c");
        assert_eq!(
            top_n(&counts, 3),
            vec![
                (String::from("a"), 2),
                (String::from("b"), 2),
                (String::from("c"), 1)
            ]
        );
        assert_eq!(top_n(&counts, 1), vec![(String::from("a"), 2)]);
        assert_eq!(top_n(&counts, 0), Vec::new());
    }

    #[test]
    fn top_n_returns_what_there_is() {
        let counts = word_counts("only");
        assert_eq!(top_n(&counts, 10), vec![(String::from("only"), 1)]);
    }

    #[test]
    fn format_groups_is_sorted_by_initial() {
        let groups = group_by_initial(&["bee", "ant", "arc"]);
        assert_eq!(format_groups(&groups), "a: ant, arc\nb: bee");
        assert_eq!(format_groups(&group_by_initial(&[])), "");
    }
}
