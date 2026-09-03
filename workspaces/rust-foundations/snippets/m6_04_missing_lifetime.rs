// m6-04-lifetimes: predict - does this compile, and how many errors?
//
// Read-only twin of repair/m6_04_missing_lifetime.rs. You predict against this
// copy and repair the other one, so the prediction check keeps showing the
// original diagnostic after you have fixed the repair file.
// (ch. 10.3 "Lifetime Annotations in Function Signatures" and "in Struct
// Definitions")

struct Excerpt {
    part: &str,
}

fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first = novel.split('.').next().expect("no full stop found");
    let excerpt = Excerpt { part: first };
    println!("{}", excerpt.part);
    println!("{}", longest("hello", "hi"));
}
