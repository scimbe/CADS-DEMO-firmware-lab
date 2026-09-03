// Reference solution for m6-04-lifetimes (the repair file).
//
// Both signatures needed a named lifetime. `Excerpt` gets one because it
// holds a reference; `longest` gets one because the compiler cannot otherwise
// tell whether the result borrows from `x` or from `y`.

struct Excerpt<'a> {
    part: &'a str,
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first = novel.split('.').next().expect("no full stop found");
    let excerpt = Excerpt { part: first };
    println!("{}", excerpt.part);
    println!("{}", longest("hello", "hi"));
}
