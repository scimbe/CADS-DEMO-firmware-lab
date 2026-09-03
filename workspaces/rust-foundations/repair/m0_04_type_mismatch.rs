// m0-04-compiler-errors: this file does NOT compile. Read the diagnostic,
// then repair it so that `rustc` accepts the file and the program prints
//
//   Ada is 36 years old and 1 metre 62 tall.
//
// Build and run it with one command (the check does exactly this):
//   mkdir -p target/check && rustc --edition 2024 -o target/check/m0_04 \
//     repair/m0_04_type_mismatch.rs && target/check/m0_04
//
// Change only what the compiler complains about. Keep every variable and
// keep the printed sentence exactly as above.

fn describe(name: &str, age: u32, height_cm: u32) -> String {
    let metres = height_cm / 100;
    let rest = height_cm % 100;
    format!("{name} is {age} years old and {metres} metre {rest} tall.")
}

fn main() {
    let name: String = "Ada";
    let age: u32 = "36";
    let height_cm = 162;

    println!("{}", describe(name, age, height_cm));
}
