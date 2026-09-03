//! m3-02-enums: an enum names a fixed set of alternatives, and each variant
//! may carry its own data (ch. 6.1).

/// A command sent to a drawing program. Each variant carries exactly the data
/// that command needs – nothing more, and no "unused" fields for the other
/// cases, which is what a struct with an extra kind field would force on you.
#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    /// Stop the program. No payload.
    Quit,
    /// Move the cursor to an absolute position. Named fields, like a struct.
    Move { x: i32, y: i32 },
    /// Write text at the cursor. One unnamed field.
    Write(String),
    /// Set the pen colour as red, green, blue. Three unnamed fields.
    ChangeColor(i32, i32, i32),
}

/// Builds a `Command::Move` for the given coordinates.
pub fn make_move(x: i32, y: i32) -> Command {
    todo!()
}

/// Builds a `Command::Write` that owns a copy of `text`.
/// `text` is a `&str`, the variant needs a `String`.
pub fn make_write(text: &str) -> Command {
    todo!()
}

/// The first character of `s`, or `None` for the empty string.
///
/// `Option<T>` is an ordinary enum from the standard library with the two
/// variants `Some(T)` and `None`. It is how Rust expresses "there may be no
/// value here" without a null pointer.
pub fn first_char(s: &str) -> Option<char> {
    todo!()
}

/// `a / b` as integer division, or `None` when `b` is zero. Returning an
/// `Option` moves the decision "what happens on division by zero" to the
/// caller instead of panicking here.
pub fn safe_div(a: i32, b: i32) -> Option<i32> {
    todo!()
}
