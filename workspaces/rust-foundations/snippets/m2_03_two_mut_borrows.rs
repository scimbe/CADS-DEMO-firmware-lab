// m2-03-aliasing-rule: predict - does this compile? (ch. 4.2, "Mutable
// References" - the two-`&mut` example)
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    let r2 = &mut s;

    println!("{r1}, {r2}");
}
