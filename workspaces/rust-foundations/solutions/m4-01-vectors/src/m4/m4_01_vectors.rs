//! Reference solution for m4-01-vectors.

pub fn build_range(n: i32) -> Vec<i32> {
    let mut v = Vec::new();
    for i in 1..=n {
        v.push(i);
    }
    v
}

pub fn sum_all(v: &[i32]) -> i32 {
    let mut total = 0;
    for x in v {
        total += *x;
    }
    total
}

/// `get` returns an `Option`; `v[i]` would panic.
pub fn get_at(v: &[i32], i: usize) -> Option<i32> {
    v.get(i).copied()
}

#[allow(clippy::ptr_arg)] // `&mut Vec` is the point of the exercise
pub fn double_in_place(v: &mut Vec<i32>) {
    for x in v.iter_mut() {
        *x *= 2;
    }
}

pub fn evens(v: &[i32]) -> Vec<i32> {
    let mut out = Vec::new();
    for x in v {
        if x % 2 == 0 {
            out.push(*x);
        }
    }
    out
}
