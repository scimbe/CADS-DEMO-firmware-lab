//! m7-01-wordstat: everything from M1–M6 in one tool.
//!
//! `wordstat <file> [n]` reads a text file and prints how many words it
//! contains, how many of them are distinct, and the `n` most frequent ones.
//!
//! Your job is this module; `src/bin/wordstat.rs` is the thin binary that
//! calls it and is already written.

use std::collections::HashMap;
use std::fmt;

/// What `wordstat` found in one text.
#[derive(Debug, PartialEq)]
pub struct Report {
    pub total_words: usize,
    pub unique_words: usize,
    /// The most frequent words, most frequent first; ties broken
    /// alphabetically so the output is reproducible.
    pub top: Vec<(String, usize)>,
}

/// Everything that can go wrong.
#[derive(Debug)]
pub enum WordstatError {
    /// The file could not be read; carries the underlying I/O error.
    Io(std::io::Error),
    /// The file was read but holds no words at all.
    NoWords,
}

impl fmt::Display for WordstatError {
    /// `Io(e)` prints `cannot read file: <e>`; `NoWords` prints
    /// `the file contains no words`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

impl std::error::Error for WordstatError {}

impl From<std::io::Error> for WordstatError {
    fn from(e: std::io::Error) -> Self {
        todo!()
    }
}

impl fmt::Display for Report {
    /// Exactly this shape, with a trailing newline after every line:
    ///
    /// ```text
    /// words: 9
    /// unique: 7
    ///   3  the
    ///   2  fox
    /// ```
    ///
    /// The count is right-aligned in a field of width 3, then two spaces,
    /// then the word. `write!` / `writeln!` into `f` is how you build this.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

/// Reduces one raw token to the word it contains: lower case, with leading
/// and trailing characters that are not alphanumeric removed.
///
/// `normalize("Fox,")` is `Some("fox")`, `normalize("--")` is `None`,
/// `normalize("don't")` is `Some("don't")` – the apostrophe is inside, so it
/// stays.
pub fn normalize(token: &str) -> Option<String> {
    todo!()
}

/// Counts the normalized words of `text`, splitting on whitespace.
pub fn count_words(text: &str) -> HashMap<String, usize> {
    todo!()
}

/// Builds the report. `top_n` limits the `top` list; a `top_n` of 0 gives an
/// empty list. `total_words` counts every occurrence, `unique_words` counts
/// distinct words.
pub fn report(text: &str, top_n: usize) -> Report {
    todo!()
}

/// Reads the file at `path` and reports on it. A file without a single word
/// is `WordstatError::NoWords`; an unreadable file is `WordstatError::Io`,
/// which `?` produces for you through the `From` impl above.
pub fn run(path: &str, top_n: usize) -> Result<Report, WordstatError> {
    todo!()
}
