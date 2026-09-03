//! m6-02-traits: a trait names behaviour that different types can share
//! (ch. 10.2).

/// Anything that can be summarised in one line.
pub trait Summary {
    /// Who wrote it, e.g. `"@horse_ebooks"` or `"Iceburgh"`.
    fn author(&self) -> String;

    /// One-line summary. The default implementation is what a type gets when
    /// it does not write its own – it may call the other methods of the trait.
    /// Leave this default as it is; `Tweet` relies on it.
    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.author())
    }
}

/// A news article.
pub struct Article {
    pub headline: String,
    pub author: String,
    pub content: String,
}

/// A short message.
pub struct Tweet {
    pub username: String,
    pub content: String,
}

impl Summary for Article {
    /// The author's name as stored.
    fn author(&self) -> String {
        todo!()
    }

    /// Overrides the default: `"<headline>, by <author>"`.
    fn summarize(&self) -> String {
        todo!()
    }
}

impl Summary for Tweet {
    /// `"@<username>"`.
    fn author(&self) -> String {
        todo!()
    }

    // No `summarize` here on purpose: `Tweet` uses the trait's default, so
    // `Tweet { username: "horse_ebooks", .. }.summarize()` is
    // "(Read more from @horse_ebooks...)".
}
