//! m5-01-panic-vs-result: this program panics. Predict which line ends it,
//! what the message says, and what the process exit code is.
//! Run with `cargo run --example m5_unwrap_panic`.
fn main() {
    let v = vec![1, 2, 3];
    println!("v[1] = {}", v[1]);
    println!("v.get(99) = {:?}", v.get(99));

    let port: u16 = "8080".parse().expect("not a valid port");
    println!("port = {port}");

    let bad: u16 = "http".parse().expect("not a valid port");
    println!("this line is never reached: {bad}");
}
