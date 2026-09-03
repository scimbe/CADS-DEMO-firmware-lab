//! Reference solution for m3-04-if-let.

use crate::m3::m3_02_enums::Command;

/// `if let Some(v) = config { v } else { 3 }` is the spelled-out version and
/// works; clippy then points at `Option::unwrap_or`, which says the same
/// thing in one call. Taking clippy up on it is the point of the exercise.
pub fn config_or_default(config: Option<u8>) -> u8 {
    config.unwrap_or(3)
}

pub fn count_non_quit(commands: &[Command]) -> usize {
    let mut n = 0;
    for c in commands {
        if !matches!(c, Command::Quit) {
            n += 1;
        }
    }
    n
}

pub fn longest_write(commands: &[Command]) -> Option<String> {
    let mut best: Option<String> = None;
    for c in commands {
        if let Command::Write(text) = c {
            let longer = match &best {
                Some(current) => text.len() > current.len(),
                None => true,
            };
            if longer {
                best = Some(text.clone());
            }
        }
    }
    best
}

pub fn first_move_x(commands: &[Command]) -> i32 {
    for c in commands {
        let Command::Move { x, .. } = c else {
            continue;
        };
        return *x;
    }
    -1
}
