// m6-04-lifetimes: this file does NOT compile. The compiler cannot tell
// whether the returned reference borrows from `x` or from `y`, and says so
// with error E0106.
//
// Repair both signatures by adding the lifetime annotations they need. Do not
// change the bodies, do not return `String`, and do not clone anything.
//
// Build and run it with one command (the check does exactly this):
//   mkdir -p target/check && rustc --edition 2024 -o target/check/m6_04 \
//     repair/m6_04_missing_lifetime.rs && target/check/m6_04

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
