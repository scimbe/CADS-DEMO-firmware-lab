//! m1-01-scope-and-move: values have exactly one owner; passing a `String`
//! to a function moves it into the function.

/// Takes ownership of `s` and returns its length. After the call the caller
/// can no longer use the value it passed in – the function owns it now and
/// drops it when it returns.
pub fn takes_ownership(s: String) -> usize {
    todo!()
}

/// Creates a `String` inside the function and moves it out to the caller.
/// The expected value is `"yours"`.
pub fn gives_ownership() -> String {
    todo!()
}
