//! m6-04-lifetimes: a lifetime annotation does not change how long a value
//! lives; it tells the compiler how the lifetimes of several references
//! relate to each other (ch. 10.3).

use std::fmt::Display;

/// The longer of the two strings; on a tie, `x`.
///
/// The signature says: the returned reference is valid for as long as *both*
/// inputs are. Without `'a` the compiler cannot tell whether the result
/// borrows from `x` or from `y` and rejects the signature with error E0106 –
/// try it in `repair/m6_04_missing_lifetime.rs`.
pub fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    todo!()
}

/// A borrowed piece of a longer text. The `'a` on the struct says an
/// `Excerpt` may not outlive the text it points into.
#[derive(Debug, PartialEq)]
pub struct Excerpt<'a> {
    pub part: &'a str,
}

/// The text up to and including the first `'.'`, or the whole text when it
/// has no full stop. The `'_` in the return type is the anonymous lifetime:
/// the excerpt borrows from `text`, which the elision rules already imply.
pub fn first_sentence(text: &str) -> Excerpt<'_> {
    todo!()
}

/// Like `longest`, but prints an announcement first – the combined example
/// from the end of ch. 10.3, with generics, a trait bound and a lifetime in
/// one signature. Returns the announcement and the winner as a tuple so the
/// test can see both.
pub fn longest_with_announcement<'a, T: Display>(
    x: &'a str,
    y: &'a str,
    announcement: T,
) -> (String, &'a str) {
    todo!()
}

/// The first word of `text`. One input reference, one output reference: the
/// elision rules give this the same lifetime automatically, which is why no
/// annotation is needed here.
pub fn first_word(text: &str) -> &str {
    todo!()
}
