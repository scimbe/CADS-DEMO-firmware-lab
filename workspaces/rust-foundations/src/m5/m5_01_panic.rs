//! m5-01-panic-vs-result: a panic ends the program; it is for situations your
//! code has no sensible answer to (ch. 9.1).

/// The element at index `i`.
///
/// Panics when `i` is out of range, with the message
/// `index 5 out of range (len 3)` for `element_at(&[1,2,3], 5)`.
/// Use `panic!` with a formatted message – the default message from `v[i]`
/// does not say what the caller asked for.
pub fn element_at(v: &[i32], i: usize) -> i32 {
    todo!()
}

/// The same lookup without panicking. Two functions, one decision: the caller
/// picks which contract fits.
pub fn element_at_opt(v: &[i32], i: usize) -> Option<i32> {
    todo!()
}

/// Parses a TCP port from a configuration string.
///
/// Panics via `expect` when `s` is not a number that fits in a `u16`, with
/// the message `not a valid port`. `expect` is honest here only because a
/// broken hard-coded configuration is a bug in the program, not an input a
/// user can fix at runtime – the next step handles the case where it is.
pub fn parse_port_or_panic(s: &str) -> u16 {
    todo!()
}

/// The average of the slice.
///
/// Panics with `average of an empty slice` on an empty slice: there is no
/// meaningful number to return, and silently answering `0` would hide the
/// caller's mistake.
pub fn average(v: &[f64]) -> f64 {
    todo!()
}
