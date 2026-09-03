//! PLACEHOLDER starter crate for the CaDS Tutor `rust-foundations` course
//! (see PLACEHOLDER.md). Each course step gets its own module here and an
//! integration test under `tests/<step>.rs`.

/// Step m0-01: a first function with a test.
pub fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

/// Step m0-02: ownership warm-up – takes the String by value and gives it back.
pub fn take_and_return(s: String) -> String {
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_formats_name() {
        assert_eq!(greet("Ferris"), "Hello, Ferris!");
    }
}
