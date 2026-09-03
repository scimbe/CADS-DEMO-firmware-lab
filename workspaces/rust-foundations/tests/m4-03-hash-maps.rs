//! Tests for step m4-03-hash-maps. Run: `cargo test --test m4-03-hash-maps`
use rust_foundations::m4::m4_03_hash_maps::{add_score, best_team, score_of, word_counts};
use std::collections::HashMap;

mod m4_03_hash_maps {
    use super::*;

    #[test]
    fn word_counts_counts_occurrences() {
        let counts = word_counts("the fox the dog the");
        assert_eq!(counts.get("the"), Some(&3));
        assert_eq!(counts.get("fox"), Some(&1));
        assert_eq!(counts.get("cat"), None);
        assert_eq!(counts.len(), 3);
    }

    #[test]
    fn word_counts_of_empty_text() {
        assert!(word_counts("").is_empty());
        assert!(word_counts("   \n  ").is_empty());
    }

    #[test]
    fn score_of_defaults_to_zero() {
        let mut scores = HashMap::new();
        scores.insert(String::from("Blue"), 10);
        assert_eq!(score_of(&scores, "Blue"), 10);
        assert_eq!(score_of(&scores, "Yellow"), 0);
    }

    #[test]
    fn add_score_inserts_and_accumulates() {
        let mut scores: HashMap<String, u32> = HashMap::new();
        add_score(&mut scores, "Blue", 10);
        add_score(&mut scores, "Blue", 5);
        add_score(&mut scores, "Yellow", 50);
        assert_eq!(score_of(&scores, "Blue"), 15);
        assert_eq!(score_of(&scores, "Yellow"), 50);
    }

    #[test]
    fn best_team_breaks_ties_alphabetically() {
        let mut scores: HashMap<String, u32> = HashMap::new();
        assert_eq!(best_team(&scores), None);
        add_score(&mut scores, "Yellow", 30);
        add_score(&mut scores, "Blue", 30);
        add_score(&mut scores, "Red", 10);
        assert_eq!(best_team(&scores), Some(String::from("Blue")));
        add_score(&mut scores, "Red", 100);
        assert_eq!(best_team(&scores), Some(String::from("Red")));
    }
}
