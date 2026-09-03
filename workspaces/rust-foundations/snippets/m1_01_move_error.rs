// m1-01-scope-and-move: predict – does this compile? (The Rust Programming
// Language, ch. 4.1 "Variables and Data Interacting with Move")
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{s1}, world!");
    println!("{s2}, world!");
}
