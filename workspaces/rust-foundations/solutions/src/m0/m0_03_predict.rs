//! Reference solution for m0-03-predict-output.

/// Converts degrees Celsius to degrees Fahrenheit: F = C * 9/5 + 32.
pub fn celsius_to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}

/// Converts degrees Fahrenheit to degrees Celsius: C = (F - 32) * 5/9.
pub fn fahrenheit_to_celsius(f: f64) -> f64 {
    (f - 32.0) * 5.0 / 9.0
}
