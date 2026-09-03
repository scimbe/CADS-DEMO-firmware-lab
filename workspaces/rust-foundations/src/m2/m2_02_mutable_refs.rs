//! m2-02-mutable-references: change a value you do not own.

/// Appends `", world"` to `s` (Listing 4-7 in the book – the mutable version
/// of `change`).
pub fn change(s: &mut String) {
    todo!()
}

/// Appends `suffix` twice.
pub fn append_twice(s: &mut String, suffix: &str) {
    todo!()
}

/// Swaps the first and the last element of `v`. Empty and single-element
/// vectors stay unchanged. Hint: taking two `&mut` into the same vector at
/// once is error E0499 – there is a method on `Vec` for exactly this job,
/// or you can copy through a temporary (`i32` is `Copy`).
pub fn swap_ends(v: &mut Vec<i32>) {
    todo!()
}
