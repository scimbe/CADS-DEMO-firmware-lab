//! m3-03-match: what does this program print, and in which order?
//! Run with `cargo run --example m3_match_option`.

#[derive(Debug)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(String),
}

fn value_in_cents(coin: &Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("State quarter from {state}!");
            25
        }
    }
}

#[allow(clippy::manual_map)] // Listing 6-5, spelled out on purpose
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}

fn main() {
    let coins = vec![
        Coin::Penny,
        Coin::Dime,
        Coin::Quarter(String::from("Alaska")),
        Coin::Nickel,
    ];

    let mut total = 0u32;
    for coin in &coins {
        total += value_in_cents(coin) as u32;
    }
    println!("total = {total}");

    println!("{:?}", plus_one(Some(5)));
    println!("{:?}", plus_one(None));

    let dice = 9;
    let action = match dice {
        3 => String::from("fancy hat"),
        7 => String::from("lose hat"),
        other => format!("move {other}"),
    };
    println!("{action}");
}
