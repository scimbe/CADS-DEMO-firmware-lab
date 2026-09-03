//! m4-02-strings: what does this program print? Two of the numbers differ
//! from what a "one character is one byte" mental model predicts.
//! Run with `cargo run --example m4_string_bytes`.
fn main() {
    let ascii = String::from("hello");
    let cyrillic = String::from("Здравствуйте");
    let devanagari = String::from("नमस्ते");

    for s in [&ascii, &cyrillic, &devanagari] {
        println!("{s}: {} bytes, {} chars", s.len(), s.chars().count());
    }

    let hello = &cyrillic[0..4];
    println!("first 4 bytes as text: {hello}");

    let mut joined = String::from("tic");
    joined.push_str("-tac");
    joined.push('-');
    joined += "toe";
    println!("{joined} ({} bytes)", joined.len());
}
