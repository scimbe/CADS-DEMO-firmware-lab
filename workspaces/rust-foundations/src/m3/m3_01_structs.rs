//! m3-01-structs: a struct groups values that belong together and gives each
//! one a name (The Rust Programming Language, ch. 5.1).

/// A rectangle in whole pixels. `derive` asks the compiler to generate the
/// three trait implementations the tests need: printing with `{:?}`,
/// duplication with `.clone()`, and comparison with `==`.
#[derive(Debug, Clone, PartialEq)]
pub struct Rectangle {
    pub width: u32,
    pub height: u32,
}

/// A student record. `name` is an owned `String`, so the struct owns its text
/// and stays valid as long as the struct does.
#[derive(Debug, Clone, PartialEq)]
pub struct Student {
    pub name: String,
    pub matriculation: u32,
    pub active: bool,
}

/// Builds a `Rectangle` from a width and a height.
///
/// The parameters are already named `width` and `height`, so the *field init
/// shorthand* applies: write `Rectangle { width, height }`, not
/// `Rectangle { width: width, height: height }`.
pub fn new_rectangle(width: u32, height: u32) -> Rectangle {
    todo!("build a Rectangle with the field init shorthand")
}

/// Area of the rectangle. Takes a shared reference: the caller keeps its
/// rectangle and can call this again.
pub fn area(r: &Rectangle) -> u32 {
    todo!()
}

/// A square of the given side length – a rectangle whose width and height
/// are equal.
pub fn square(side: u32) -> Rectangle {
    todo!()
}

/// Scales width and height by `factor`, leaving everything else as it was.
///
/// Write this with the *struct update syntax*: name the fields you change,
/// then `..*r` for the rest. That only compiles because the remaining fields
/// are `Copy`; a `String` field could not be taken out of a reference like
/// this (that is error E0507).
pub fn scaled(r: &Rectangle, factor: u32) -> Rectangle {
    todo!("use the struct update syntax: named fields first, then ..*r")
}

/// Enrols a new student under the given name and matriculation number.
/// A freshly enrolled student is `active`.
pub fn enrol(name: String, matriculation: u32) -> Student {
    todo!()
}

/// Returns the same student with `active` set to `false`.
///
/// Take `s` by value and use the struct update syntax `..s`: `name` is a
/// `String` and moves out of `s` into the new record, so `s` itself is gone
/// afterwards. That is the point – there is only ever one owner.
pub fn deactivate(s: Student) -> Student {
    todo!()
}
