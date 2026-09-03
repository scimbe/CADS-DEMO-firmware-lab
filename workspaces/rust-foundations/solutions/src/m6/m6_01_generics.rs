//! Reference solution for m6-01-generics.

pub fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

#[derive(Debug, Clone, PartialEq)]
pub struct Pair<T> {
    pub first: T,
    pub second: T,
}

pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    Pair {
        first: p.second,
        second: p.first,
    }
}

pub fn first_of<T: Clone>(list: &[T]) -> Option<T> {
    list.first().cloned()
}

#[derive(Debug, Clone, PartialEq)]
pub struct Labelled<L, V> {
    pub label: L,
    pub value: V,
}

pub fn label<L, V>(label: L, value: V) -> Labelled<L, V> {
    Labelled { label, value }
}
