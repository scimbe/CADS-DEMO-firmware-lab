//! Reference solution for m6-03-trait-bounds.

use crate::m6::m6_02_traits::Summary;
use std::fmt::Display;

pub fn notify(item: &impl Summary) -> String {
    format!("Breaking! {}", item.summarize())
}

pub fn summarize_all<T: Summary>(items: &[T]) -> String {
    let mut lines = Vec::new();
    for item in items {
        lines.push(item.summarize());
    }
    lines.join("\n")
}

pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{
    let mut best: Option<String> = None;
    for item in items {
        let s = item.summarize();
        let longer = match &best {
            Some(current) => s.len() > current.len(),
            None => true,
        };
        if longer {
            best = Some(s);
        }
    }
    best
}

pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String {
    if a > b {
        format!("{a} beats {b}")
    } else if b > a {
        format!("{b} beats {a}")
    } else {
        format!("{a} ties {b}")
    }
}
