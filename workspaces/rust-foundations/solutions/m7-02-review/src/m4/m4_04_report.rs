//! Reference solution for m4-04-collections-report.

use std::collections::HashMap;

pub fn group_by_initial(words: &[&str]) -> HashMap<char, Vec<String>> {
    let mut groups: HashMap<char, Vec<String>> = HashMap::new();
    for word in words {
        let Some(initial) = word.chars().next() else {
            continue;
        };
        groups.entry(initial).or_default().push(String::from(*word));
    }
    groups
}

pub fn top_n(counts: &HashMap<String, usize>, n: usize) -> Vec<(String, usize)> {
    let mut entries: Vec<(String, usize)> = counts.iter().map(|(w, c)| (w.clone(), *c)).collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    entries.truncate(n);
    entries
}

pub fn format_groups(groups: &HashMap<char, Vec<String>>) -> String {
    let mut initials: Vec<char> = groups.keys().copied().collect();
    initials.sort();
    let mut lines = Vec::new();
    for initial in initials {
        let words = &groups[&initial];
        lines.push(format!("{initial}: {}", words.join(", ")));
    }
    lines.join("\n")
}
