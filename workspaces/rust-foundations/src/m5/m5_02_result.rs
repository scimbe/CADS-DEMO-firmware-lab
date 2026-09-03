//! m5-02-result: `Result<T, E>` makes failure part of the return type, so the
//! caller cannot forget about it (ch. 9.2).

/// Parses a TCP port. `Ok(port)` on success, otherwise `Err` with the message
/// `"'<input>' is not a valid port"` – for input `"http"` that is
/// `"'http' is not a valid port"`.
///
/// `s.parse::<u16>()` already returns a `Result`; turn its error into your
/// message with `map_err`, or match on it.
pub fn parse_port(s: &str) -> Result<u16, String> {
    todo!()
}

/// Integer division. `Err("division by zero")` when `b` is zero.
pub fn checked_div(a: i32, b: i32) -> Result<i32, String> {
    todo!()
}

/// The first line of `text`, without its newline.
/// `Err("empty input")` when `text` is empty.
pub fn first_line(text: &str) -> Result<&str, String> {
    todo!()
}

/// Parses every entry and sums them, stopping at the first bad entry:
/// `sum_ports(&["80", "443"])` is `Ok(523)`, and `sum_ports(&["80", "x"])` is
/// `Err("'x' is not a valid port")`.
///
/// Reuse `parse_port` and handle its `Result` with a `match` inside the loop –
/// the next step replaces that `match` with a single character.
///
/// Clippy's `question_mark` lint proposes that single character already. It is
/// right about finished code and wrong about this exercise, whose subject is
/// the long form, so the lint is switched off here on purpose.
#[allow(clippy::question_mark)]
pub fn sum_ports(entries: &[&str]) -> Result<u32, String> {
    todo!()
}
