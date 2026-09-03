// Reference solution for m0-05-compiler-errors.
//
// Three E0308 diagnostics, three one-word fixes:
//   1. `let name: String = "Ada";`  – a literal is a `&str`, not a `String`.
//   2. `let age: u32 = "36";`       – "36" is text, 36 is a number.
//   3. `describe(name, …)`          – with `name` a `String`, the parameter
//      `&str` did not match; declaring `name` as `&str` fixes this one too.

fn describe(name: &str, age: u32, height_cm: u32) -> String {
    let metres = height_cm / 100;
    let rest = height_cm % 100;
    format!("{name} is {age} years old and {metres} metre {rest} tall.")
}

fn main() {
    let name: &str = "Ada";
    let age: u32 = 36;
    let height_cm = 162;

    println!("{}", describe(name, age, height_cm));
}
