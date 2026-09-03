//! m5-03-question-mark: `?` returns the error to the caller and unwraps the
//! success value, so the happy path stays readable (ch. 9.2).

use std::num::ParseIntError;

/// Parses `s` as an `i32` and returns twice the value.
/// One line: `Ok(s.parse::<i32>()? * 2)`.
pub fn double_parsed(s: &str) -> Result<i32, ParseIntError> {
    todo!()
}

/// Parses every item, keeping the order. The first bad item ends the function
/// and its error becomes the function's error.
pub fn parse_all(items: &[&str]) -> Result<Vec<i32>, ParseIntError> {
    todo!()
}

/// Sums one number per line. Blank lines and surrounding whitespace are
/// ignored; anything else is a parse error.
///
/// `sum_lines("1\n2\n\n3\n")` is `Ok(6)`.
pub fn sum_lines(text: &str) -> Result<i64, ParseIntError> {
    todo!()
}

/// The two numbers of a `"<a>x<b>"` size string, e.g. `"800x600"`.
/// A missing `x` is reported as `Err(None)`; a part that is not a number is
/// reported as `Err(Some(e))` with the parse error.
///
/// `?` only works when the error types line up. Here they do not, so this
/// function shows the honest alternative: `ok_or`/`map_err` at the boundary.
pub fn parse_size(s: &str) -> Result<(u32, u32), Option<ParseIntError>> {
    todo!()
}
