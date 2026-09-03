//! m5-04-custom-error: one error type for your module, and a `From`
//! implementation so `?` converts foreign errors into it (ch. 9.2, "A
//! Shortcut for Propagating Errors").

use std::fmt;
use std::num::ParseIntError;

/// Everything that can go wrong while reading a `key = value` configuration.
#[derive(Debug, PartialEq)]
pub enum ConfigError {
    /// A non-empty line without a `=`; carries the offending line.
    Syntax(String),
    /// A value that is not an integer; carries the message from the parser,
    /// e.g. `invalid digit found in string`.
    NotANumber(String),
}

impl fmt::Display for ConfigError {
    /// `Syntax("a b")` prints `syntax error in line: a b`,
    /// `NotANumber("invalid digit found in string")` prints
    /// `not a number: invalid digit found in string`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

/// With `Display` and `Debug` in place, `ConfigError` is a standard error and
/// fits into `Box<dyn Error>`. This impl needs no body.
impl std::error::Error for ConfigError {}

impl From<ParseIntError> for ConfigError {
    /// Turns a parse error into `ConfigError::NotANumber` carrying the
    /// parser's own message (`e.to_string()`). This is what lets `?` convert
    /// automatically inside a function returning `Result<_, ConfigError>`.
    fn from(e: ParseIntError) -> Self {
        todo!()
    }
}

/// Parses lines of the form `key = value` into pairs.
///
/// Blank lines are skipped, whitespace around key and value is trimmed. A
/// non-empty line without `=` is a `ConfigError::Syntax` carrying the trimmed
/// line; a value that does not parse becomes `ConfigError::NotANumber` – and
/// that conversion should happen through `?` and your `From` impl, not
/// through a hand-written `map_err`.
pub fn parse_config(text: &str) -> Result<Vec<(String, i64)>, ConfigError> {
    todo!()
}

/// Looks up one key. Returns `Ok(None)` when the key is absent – "not there"
/// is not an error here, only a broken file is.
pub fn config_get(text: &str, key: &str) -> Result<Option<i64>, ConfigError> {
    todo!()
}
