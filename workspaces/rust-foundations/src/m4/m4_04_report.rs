//! m4-04-collections-report: the three collections working together.

use std::collections::HashMap;

/// Groups the words by their first character.
///
/// `group_by_initial(&["ant", "bee", "arc"])` maps `'a'` to
/// `["ant", "arc"]` and `'b'` to `["bee"]`. Within a group the original
/// order is kept. Words that are empty are skipped.
pub fn group_by_initial(words: &[&str]) -> HashMap<char, Vec<String>> {
    todo!()
}

/// The `n` most frequent entries of `counts`, most frequent first.
///
/// Ties are broken by the word, alphabetically ascending, so the result is
/// reproducible even though a `HashMap` has no order of its own. Returns
/// fewer than `n` entries when the map is smaller.
pub fn top_n(counts: &HashMap<String, usize>, n: usize) -> Vec<(String, usize)> {
    todo!()
}

/// One line per group, sorted by initial:
/// `"a: ant, arc"`, `"b: bee"`, joined with `'\n'`.
pub fn format_groups(groups: &HashMap<char, Vec<String>>) -> String {
    todo!()
}
