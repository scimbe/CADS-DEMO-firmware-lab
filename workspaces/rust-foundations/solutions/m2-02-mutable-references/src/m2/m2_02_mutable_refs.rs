//! Reference solution for m2-02-mutable-references.

/// Appends `", world"` to `s`.
pub fn change(s: &mut String) {
    s.push_str(", world");
}

/// Appends `suffix` twice.
pub fn append_twice(s: &mut String, suffix: &str) {
    s.push_str(suffix);
    s.push_str(suffix);
}

/// Swaps the first and the last element of `v`.
///
/// `Vec::swap` takes two indices, not two `&mut` – which is how it sidesteps
/// error E0499.
// `&mut Vec` rather than `&mut [i32]`: the exercise is about the
// mutable reference to the collection itself.
#[allow(clippy::ptr_arg)]
pub fn swap_ends(v: &mut Vec<i32>) {
    if v.len() >= 2 {
        let last = v.len() - 1;
        v.swap(0, last);
    }
}
