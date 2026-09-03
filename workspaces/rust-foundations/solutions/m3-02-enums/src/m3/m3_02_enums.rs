//! Reference solution for m3-02-enums.

#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

pub fn make_move(x: i32, y: i32) -> Command {
    Command::Move { x, y }
}

pub fn make_write(text: &str) -> Command {
    Command::Write(String::from(text))
}

pub fn first_char(s: &str) -> Option<char> {
    s.chars().next()
}

pub fn safe_div(a: i32, b: i32) -> Option<i32> {
    if b == 0 { None } else { Some(a / b) }
}
