//! Tests for step m4-01-vectors. Run: `cargo test --test m4-01-vectors`
use rust_foundations::m4::m4_01_vectors::{build_range, double_in_place, evens, get_at, sum_all};

mod m4_01_vectors {
    use super::*;

    #[test]
    fn build_range_counts_from_one() {
        assert_eq!(build_range(4), vec![1, 2, 3, 4]);
        assert_eq!(build_range(1), vec![1]);
        assert_eq!(build_range(0), Vec::<i32>::new());
        assert_eq!(build_range(-3), Vec::<i32>::new());
    }

    #[test]
    fn sum_all_takes_a_slice() {
        let v = vec![1, 2, 3, 4];
        assert_eq!(sum_all(&v), 10);
        assert_eq!(sum_all(&v[1..3]), 5);
        assert_eq!(sum_all(&[]), 0);
    }

    #[test]
    fn get_at_does_not_panic() {
        let v = vec![10, 20, 30];
        assert_eq!(get_at(&v, 0), Some(10));
        assert_eq!(get_at(&v, 2), Some(30));
        assert_eq!(get_at(&v, 3), None);
        assert_eq!(get_at(&v, 100), None);
    }

    #[test]
    fn double_in_place_mutates() {
        let mut v = vec![1, -2, 3];
        double_in_place(&mut v);
        assert_eq!(v, vec![2, -4, 6]);
        let mut empty: Vec<i32> = Vec::new();
        double_in_place(&mut empty);
        assert!(empty.is_empty());
    }

    #[test]
    fn evens_keeps_order() {
        assert_eq!(evens(&[1, 2, 3, 4, 6, 7]), vec![2, 4, 6]);
        assert_eq!(evens(&[0, -2, -3]), vec![0, -2]);
        assert_eq!(evens(&[1, 3]), Vec::<i32>::new());
    }
}
