//! m4-03-hash-maps: associate keys with values (ch. 8.3).

use std::collections::HashMap;

/// Counts how often each whitespace-separated word occurs in `text`.
/// Words are taken exactly as they appear – no lowercasing, no punctuation
/// stripping; that comes in the final project.
///
/// The book's idiom for this is `*map.entry(word).or_insert(0) += 1`:
/// `entry` hands you the slot for that key whether or not it exists yet.
pub fn word_counts(text: &str) -> HashMap<String, usize> {
    todo!()
}

/// The score of `team`, or `0` when the team is not in the map.
///
/// `get` returns `Option<&u32>` – a reference into the map. `copied()` turns
/// it into an `Option<u32>` so you can hand back a value without borrowing
/// the map any longer.
pub fn score_of(scores: &HashMap<String, u32>, team: &str) -> u32 {
    todo!()
}

/// Adds `points` to `team`'s score, inserting the team with `points` when it
/// is not in the map yet.
pub fn add_score(scores: &mut HashMap<String, u32>, team: &str, points: u32) {
    todo!()
}

/// The team with the highest score, or `None` for an empty map.
/// On a tie, the alphabetically smaller name wins – iteration order over a
/// `HashMap` is arbitrary, so without that rule the result would not be
/// reproducible and the test could not check it.
pub fn best_team(scores: &HashMap<String, u32>) -> Option<String> {
    todo!()
}
