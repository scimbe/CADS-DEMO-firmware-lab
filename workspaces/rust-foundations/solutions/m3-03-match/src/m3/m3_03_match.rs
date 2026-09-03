//! Reference solution for m3-03-match.

use crate::m3::m3_02_enums::Command;

pub fn describe(c: &Command) -> String {
    match c {
        Command::Quit => String::from("quit"),
        Command::Move { x, y } => format!("move to {x},{y}"),
        Command::Write(text) => format!("write {text}"),
        Command::ChangeColor(r, g, b) => format!("colour {r}/{g}/{b}"),
    }
}

pub fn value_or(o: Option<i32>, default: i32) -> i32 {
    match o {
        Some(v) => v,
        None => default,
    }
}

// Written out as a `match` on purpose - this is Listing 6-5. Clippy
// would rather see `o.map(|n| n + 1)`, and clippy is right about the
// production version; here the long form is the lesson.
#[allow(clippy::manual_map)]
pub fn increment(o: Option<i32>) -> Option<i32> {
    match o {
        Some(n) => Some(n + 1),
        None => None,
    }
}

pub fn dice_action(roll: u8) -> String {
    match roll {
        3 => String::from("fancy hat"),
        7 => String::from("lose hat"),
        other => format!("move {other}"),
    }
}
