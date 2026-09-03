//! Reference solution for m3-01-structs.

#[derive(Debug, Clone, PartialEq)]
pub struct Rectangle {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Student {
    pub name: String,
    pub matriculation: u32,
    pub active: bool,
}

/// Field init shorthand: the parameters already carry the field names.
pub fn new_rectangle(width: u32, height: u32) -> Rectangle {
    Rectangle { width, height }
}

pub fn area(r: &Rectangle) -> u32 {
    r.width * r.height
}

pub fn square(side: u32) -> Rectangle {
    Rectangle {
        width: side,
        height: side,
    }
}

/// Struct update syntax: `height` comes from `..*r`. That only compiles
/// because `u32` is `Copy`; with a `String` field this would be E0507.
pub fn widened(r: &Rectangle, factor: u32) -> Rectangle {
    Rectangle {
        width: r.width * factor,
        ..*r
    }
}

pub fn enrol(name: String, matriculation: u32) -> Student {
    Student {
        name,
        matriculation,
        active: true,
    }
}

/// `..s` moves the remaining fields – including the `String` – out of `s`,
/// so `s` is consumed here.
pub fn deactivate(s: Student) -> Student {
    Student { active: false, ..s }
}
