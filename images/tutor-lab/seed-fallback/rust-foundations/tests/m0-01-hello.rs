// Step m0-01 (PLACEHOLDER): `cargo test --test m0-01-hello`
use rust_foundations::greet;

#[test]
fn greets_by_name() {
    assert_eq!(greet("CaDS"), "Hello, CaDS!");
}

#[test]
fn greets_empty_name() {
    assert_eq!(greet(""), "Hello, !");
}
