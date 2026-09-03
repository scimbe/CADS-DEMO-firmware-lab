// Step m0-02 (PLACEHOLDER): `cargo test --test m0-02-ownership`
use rust_foundations::take_and_return;

#[test]
fn value_comes_back_unchanged() {
    let s = String::from("moved");
    let s = take_and_return(s);
    assert_eq!(s, "moved");
}
