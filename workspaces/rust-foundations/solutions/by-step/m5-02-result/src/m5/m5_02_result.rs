//! Reference solution for m5-02-result.

pub fn parse_port(s: &str) -> Result<u16, String> {
    s.parse::<u16>()
        .map_err(|_| format!("'{s}' is not a valid port"))
}

pub fn checked_div(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("division by zero"))
    } else {
        Ok(a / b)
    }
}

pub fn first_line(text: &str) -> Result<&str, String> {
    match text.lines().next() {
        Some(line) => Ok(line),
        None => Err(String::from("empty input")),
    }
}

/// The `match` in the loop is what `?` replaces in the next step.
pub fn sum_ports(entries: &[&str]) -> Result<u32, String> {
    let mut total = 0u32;
    for entry in entries {
        match parse_port(entry) {
            Ok(port) => total += u32::from(port),
            Err(e) => return Err(e),
        }
    }
    Ok(total)
}
