//! m6-03-trait-bounds: constrain a generic parameter to the behaviour the
//! body actually needs (ch. 10.2, "Traits as Parameters").

use crate::m6::m6_02_traits::Summary;
use std::fmt::Display;

/// `"Breaking! <summary>"` for any summarisable item.
/// `&impl Summary` is the short form of a bound on an anonymous parameter.
pub fn notify(item: &impl Summary) -> String {
    todo!()
}

/// The summaries of every item, one per line, in order.
/// Written with the explicit form `<T: Summary>`, which the short form above
/// is sugar for.
pub fn summarize_all<T: Summary>(items: &[T]) -> String {
    todo!()
}

/// The longest summary in the slice, or `None` when it is empty.
/// On a tie the earlier item wins. The bound goes in a `where` clause here,
/// which is where longer lists of bounds belong.
pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{
    todo!()
}

/// `"<larger> beats <smaller>"`, e.g. `describe_pair(3, 7)` is `"7 beats 3"`.
/// On equality: `"<a> ties <b>"`.
///
/// Two bounds joined with `+`: the body compares (`PartialOrd`) and prints
/// (`Display`), so it needs both.
pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String {
    todo!()
}
