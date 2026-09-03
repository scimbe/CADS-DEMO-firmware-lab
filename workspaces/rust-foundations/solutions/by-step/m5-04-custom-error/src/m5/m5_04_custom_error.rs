//! Reference solution for m5-04-custom-error.

use std::fmt;
use std::num::ParseIntError;

#[derive(Debug, PartialEq)]
pub enum ConfigError {
    Syntax(String),
    NotANumber(String),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::Syntax(line) => write!(f, "syntax error in line: {line}"),
            ConfigError::NotANumber(msg) => write!(f, "not a number: {msg}"),
        }
    }
}

impl std::error::Error for ConfigError {}

impl From<ParseIntError> for ConfigError {
    fn from(e: ParseIntError) -> Self {
        ConfigError::NotANumber(e.to_string())
    }
}

pub fn parse_config(text: &str) -> Result<Vec<(String, i64)>, ConfigError> {
    let mut out = Vec::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            return Err(ConfigError::Syntax(String::from(line)));
        };
        // `?` converts the ParseIntError through the From impl above.
        let number: i64 = value.trim().parse()?;
        out.push((String::from(key.trim()), number));
    }
    Ok(out)
}

pub fn config_get(text: &str, key: &str) -> Result<Option<i64>, ConfigError> {
    for (k, v) in parse_config(text)? {
        if k == key {
            return Ok(Some(v));
        }
    }
    Ok(None)
}
