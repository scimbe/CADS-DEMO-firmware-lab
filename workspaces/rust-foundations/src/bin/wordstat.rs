//! The `wordstat` command-line tool.
//!
//! Usage: `cargo run --bin wordstat -- <file> [n]`
//!
//! This file is complete. The work happens in
//! `src/project/wordstat.rs`, which you implement in step m7-01-wordstat.
use rust_foundations::project::wordstat;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let Some(path) = args.get(1) else {
        eprintln!("usage: wordstat <file> [n]");
        return ExitCode::from(2);
    };
    let top_n: usize = match args.get(2) {
        None => 5,
        Some(n) => match n.parse() {
            Ok(v) => v,
            Err(_) => {
                eprintln!("wordstat: '{n}' is not a number");
                return ExitCode::from(2);
            }
        },
    };

    match wordstat::run(path, top_n) {
        Ok(report) => {
            print!("{report}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("wordstat: {e}");
            ExitCode::FAILURE
        }
    }
}
