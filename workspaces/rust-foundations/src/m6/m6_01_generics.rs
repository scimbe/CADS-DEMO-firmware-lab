//! m6-01-generics: one function, many types (ch. 10.1).

/// The largest element of `list`.
///
/// The bound `T: PartialOrd` is what makes `>` legal inside the body: a
/// generic parameter with no bound supports nothing at all. Returning `&T`
/// rather than `T` avoids requiring `Copy` – you hand back a reference into
/// the caller's slice.
///
/// Panics on an empty slice.
pub fn largest<T: PartialOrd>(list: &[T]) -> &T {
    todo!()
}

/// Two values of the same type.
#[derive(Debug, Clone, PartialEq)]
pub struct Pair<T> {
    pub first: T,
    pub second: T,
}

/// A pair with the two values exchanged.
pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    todo!()
}

/// The first element as an owned value, or `None` for an empty slice.
/// `Clone` is needed because the slice keeps its element – you take a copy.
pub fn first_of<T: Clone>(list: &[T]) -> Option<T> {
    todo!()
}

/// Two values of *different* types – one generic parameter per type.
#[derive(Debug, Clone, PartialEq)]
pub struct Labelled<L, V> {
    pub label: L,
    pub value: V,
}

/// Builds a `Labelled` from its two parts.
pub fn label<L, V>(label: L, value: V) -> Labelled<L, V> {
    todo!()
}
