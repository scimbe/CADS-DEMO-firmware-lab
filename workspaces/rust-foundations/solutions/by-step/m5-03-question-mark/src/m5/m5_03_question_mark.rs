//! Reference solution for m5-03-question-mark.

use std::num::ParseIntError;

pub fn double_parsed(s: &str) -> Result<i32, ParseIntError> {
    Ok(s.parse::<i32>()? * 2)
}

pub fn parse_all(items: &[&str]) -> Result<Vec<i32>, ParseIntError> {
    let mut out = Vec::new();
    for item in items {
        out.push(item.parse::<i32>()?);
    }
    Ok(out)
}

pub fn sum_lines(text: &str) -> Result<i64, ParseIntError> {
    let mut total = 0i64;
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        total += line.parse::<i64>()?;
    }
    Ok(total)
}

/// Two different failures, two different error values – `?` alone cannot
/// bridge them, so the boundary is spelled out with `ok_or` and `map_err`.
pub fn parse_size(s: &str) -> Result<(u32, u32), Option<ParseIntError>> {
    let (w, h) = s.split_once('x').ok_or(None)?;
    let width = w.parse::<u32>().map_err(Some)?;
    let height = h.parse::<u32>().map_err(Some)?;
    Ok((width, height))
}
