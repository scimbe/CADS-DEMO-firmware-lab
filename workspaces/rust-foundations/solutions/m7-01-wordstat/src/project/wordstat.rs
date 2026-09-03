//! Reference solution for m7-01-wordstat.

use std::collections::HashMap;
use std::fmt;

#[derive(Debug, PartialEq)]
pub struct Report {
    pub total_words: usize,
    pub unique_words: usize,
    pub top: Vec<(String, usize)>,
}

#[derive(Debug)]
pub enum WordstatError {
    Io(std::io::Error),
    NoWords,
}

impl fmt::Display for WordstatError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WordstatError::Io(e) => write!(f, "cannot read file: {e}"),
            WordstatError::NoWords => write!(f, "the file contains no words"),
        }
    }
}

impl std::error::Error for WordstatError {}

impl From<std::io::Error> for WordstatError {
    fn from(e: std::io::Error) -> Self {
        WordstatError::Io(e)
    }
}

impl fmt::Display for Report {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "words: {}", self.total_words)?;
        writeln!(f, "unique: {}", self.unique_words)?;
        for (word, count) in &self.top {
            writeln!(f, "{count:>3}  {word}")?;
        }
        Ok(())
    }
}

pub fn normalize(token: &str) -> Option<String> {
    let trimmed = token.trim_matches(|c: char| !c.is_alphanumeric());
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_lowercase())
    }
}

pub fn count_words(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for token in text.split_whitespace() {
        if let Some(word) = normalize(token) {
            *counts.entry(word).or_insert(0) += 1;
        }
    }
    counts
}

pub fn report(text: &str, top_n: usize) -> Report {
    let counts = count_words(text);
    let total_words = counts.values().sum();
    let unique_words = counts.len();

    let mut entries: Vec<(String, usize)> = counts.into_iter().collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    entries.truncate(top_n);

    Report {
        total_words,
        unique_words,
        top: entries,
    }
}

pub fn run(path: &str, top_n: usize) -> Result<Report, WordstatError> {
    let text = std::fs::read_to_string(path)?;
    let r = report(&text, top_n);
    if r.total_words == 0 {
        return Err(WordstatError::NoWords);
    }
    Ok(r)
}
