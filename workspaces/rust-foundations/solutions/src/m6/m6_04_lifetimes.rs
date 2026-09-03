//! Reference solution for m6-04-lifetimes.

use std::fmt::Display;

pub fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if y.len() > x.len() { y } else { x }
}

#[derive(Debug, PartialEq)]
pub struct Excerpt<'a> {
    pub part: &'a str,
}

pub fn first_sentence(text: &str) -> Excerpt<'_> {
    match text.find('.') {
        Some(i) => Excerpt { part: &text[..=i] },
        None => Excerpt { part: text },
    }
}

pub fn longest_with_announcement<'a, T: Display>(
    x: &'a str,
    y: &'a str,
    announcement: T,
) -> (String, &'a str) {
    (format!("Attention please: {announcement}"), longest(x, y))
}

/// One input reference, one output reference: the elision rules already give
/// them the same lifetime, so no annotation is needed.
pub fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(i) => &text[..i],
        None => text,
    }
}
