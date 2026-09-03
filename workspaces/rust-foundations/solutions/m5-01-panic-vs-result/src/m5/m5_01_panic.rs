//! Reference solution for m5-01-panic-vs-result.

pub fn element_at(v: &[i32], i: usize) -> i32 {
    if i >= v.len() {
        panic!("index {i} out of range (len {})", v.len());
    }
    v[i]
}

pub fn element_at_opt(v: &[i32], i: usize) -> Option<i32> {
    v.get(i).copied()
}

pub fn parse_port_or_panic(s: &str) -> u16 {
    s.parse::<u16>().expect("not a valid port")
}

pub fn average(v: &[f64]) -> f64 {
    if v.is_empty() {
        panic!("average of an empty slice");
    }
    let mut sum = 0.0;
    for x in v {
        sum += *x;
    }
    sum / v.len() as f64
}
