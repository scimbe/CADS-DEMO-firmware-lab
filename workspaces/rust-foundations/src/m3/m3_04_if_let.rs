//! m3-04-if-let: `if let` and `let ... else` handle one pattern and ignore
//! the rest, without the `_ => ()` arm a `match` would force (ch. 6.3).

use crate::m3::m3_02_enums::Command;

/// The configured value, or `3` when nothing is configured.
/// Written with `if let Some(v) = config { v } else { 3 }` – or, shorter,
/// with the method `Option` already has for this.
pub fn config_or_default(config: Option<u8>) -> u8 {
    todo!()
}

/// How many of the commands are *not* `Command::Quit`.
pub fn count_non_quit(commands: &[Command]) -> usize {
    todo!()
}

/// The longest text of all `Command::Write` commands, or `None` when the
/// slice contains no `Write`. On a tie, the first one wins.
///
/// `if let Command::Write(text) = c` inside the loop keeps every other
/// variant out of your way.
pub fn longest_write(commands: &[Command]) -> Option<String> {
    todo!()
}

/// The `x` coordinate of the first `Command::Move`, or `-1` when there is
/// none. A good place for `let ... else`: bind on the happy path, return
/// early otherwise.
pub fn first_move_x(commands: &[Command]) -> i32 {
    todo!()
}
