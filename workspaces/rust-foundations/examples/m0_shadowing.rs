//! m0-04-predict-output: what does this program print?
//! Run with `cargo run --example m0_shadowing`.
fn main() {
    let x = 5;
    let x = x + 1;
    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {x}");
    }
    println!("The value of x is: {x}");

    let spaces = "   ";
    let spaces = spaces.len();
    println!("spaces = {spaces}");

    let quotient = 7 / 2;
    let remainder = 7 % 2;
    println!("7 / 2 = {quotient}, 7 % 2 = {remainder}");
}
