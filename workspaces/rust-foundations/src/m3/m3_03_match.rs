//! m3-03-match: `match` compares a value against patterns and must cover
//! every case (ch. 6.2).

use crate::m3::m3_02_enums::Command;

/// One line of human-readable text per command:
///
/// | command                     | result                |
/// |-----------------------------|-----------------------|
/// | `Quit`                      | `"quit"`              |
/// | `Move { x: 3, y: -1 }`      | `"move to 3,-1"`      |
/// | `Write("hi")`               | `"write hi"`          |
/// | `ChangeColor(1, 2, 3)`      | `"colour 1/2/3"`      |
///
/// Match on `c` and bind the payload of each variant to a name. Do not add a
/// catch-all arm: without one, adding a fifth variant to `Command` makes this
/// function fail to compile, which is exactly the reminder you want.
pub fn describe(c: &Command) -> String {
    todo!()
}

/// The value inside `o`, or `default` when there is none.
/// A `match` over `Some(v)` and `None` is the whole job.
pub fn value_or(o: Option<i32>, default: i32) -> i32 {
    todo!()
}

/// `Some(n + 1)` for `Some(n)`, and `None` for `None` – the example from the
/// book's "Matching with `Option<T>`".
// Written out as a `match` on purpose - this is Listing 6-5. Clippy
// would rather see `o.map(|n| n + 1)`, and clippy is right about the
// production version; here the long form is the lesson.
#[allow(clippy::manual_map)]
pub fn increment(o: Option<i32>) -> Option<i32> {
    todo!()
}

/// The board-game example from ch. 6.2, in words:
/// a 3 gives `"fancy hat"`, a 7 gives `"lose hat"`, and every other roll
/// gives `"move <roll>"` – for a roll of 12, `"move 12"`.
///
/// The last arm is a catch-all that binds the value; name it `other`, not `_`,
/// because you need the number.
pub fn dice_action(roll: u8) -> String {
    todo!()
}
