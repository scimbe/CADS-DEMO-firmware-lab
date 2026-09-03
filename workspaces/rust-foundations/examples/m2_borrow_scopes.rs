//! m2-03-aliasing-rule: what does this program print? Note where each borrow
//! ends (ch. 4.2 "Mutable References" – the r1/r2/r3 example, but ordered so
//! that it compiles).
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{r1} and {r2}");
    // r1 and r2 are not used after this point

    let r3 = &mut s;
    r3.push_str(" world");
    println!("{r3}");

    println!("{s}");
}
