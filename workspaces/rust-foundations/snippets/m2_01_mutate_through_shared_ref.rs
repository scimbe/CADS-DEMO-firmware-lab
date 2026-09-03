// m2-01-shared-references: predict – does this compile? (Listing 4-6 in
// The Rust Programming Language, ch. 4.2)
fn main() {
    let s = String::from("hello");

    change(&s);
}

fn change(some_string: &String) {
    some_string.push_str(", world");
}
