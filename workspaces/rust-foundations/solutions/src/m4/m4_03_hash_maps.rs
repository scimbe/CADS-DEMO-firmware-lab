//! Reference solution for m4-03-hash-maps.

use std::collections::HashMap;

pub fn word_counts(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(String::from(word)).or_insert(0) += 1;
    }
    counts
}

pub fn score_of(scores: &HashMap<String, u32>, team: &str) -> u32 {
    scores.get(team).copied().unwrap_or(0)
}

pub fn add_score(scores: &mut HashMap<String, u32>, team: &str, points: u32) {
    *scores.entry(String::from(team)).or_insert(0) += points;
}

/// Iteration order over a `HashMap` is arbitrary, so the tie-break on the
/// name is what makes the answer reproducible.
pub fn best_team(scores: &HashMap<String, u32>) -> Option<String> {
    let mut best: Option<(&String, u32)> = None;
    for (name, score) in scores {
        let better = match best {
            None => true,
            Some((best_name, best_score)) => {
                *score > best_score || (*score == best_score && name < best_name)
            }
        };
        if better {
            best = Some((name, *score));
        }
    }
    best.map(|(name, _)| name.clone())
}
