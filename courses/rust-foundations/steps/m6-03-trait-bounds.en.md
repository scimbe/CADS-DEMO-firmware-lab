---
id: m6-03-trait-bounds
title: "Trait bounds: asking for exactly what you need"
bloom: apply
objectives: [ "rust-ch10-02-traits" ]
requires: [ "m6-02-traits" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m6-02-traits", "m6-01-generics" ]
links:
  - { step: "m6-04-lifetimes" }
  - { file: "src/m6/m6_03_bounds.rs" }
  - { file: "tests/m6-03-trait-bounds.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits as Parameters" }
sources: [ "src/m6/m6_03_bounds.rs", "tests/m6-03-trait-bounds.rs", "src/m6/m6_02_traits.rs" ]
tasks:
  - id: bounds
    title: "The four bounded functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-03-trait-bounds", expectPass: [ "m6_03_trait_bounds::notify_accepts_any_summary", "m6_03_trait_bounds::summarize_all_joins_with_newlines", "m6_03_trait_bounds::longest_summary_picks_the_longest", "m6_03_trait_bounds::describe_pair_needs_two_bounds" ], minPass: 4, timeoutMs: 180000 }
  - id: impl-vs-generic
    title: "You can say when &impl Trait is not enough"
    check: { type: "question", prompt: { en: "notify takes &impl Summary and summarize_all takes <T: Summary>. Name a signature that can only be written with the explicit generic form and not with impl Trait, and explain what the explicit form guarantees that the short form does not.", de: "notify nimmt &impl Summary, summarize_all nimmt <T: Summary>. Nenne eine Signatur, die sich nur mit der ausdrücklichen generischen Form schreiben lässt und nicht mit impl Trait, und erkläre, was die ausdrückliche Form zusichert, was die Kurzform nicht zusichert." }, rubric: "Names a case where the same type parameter must appear more than once - two parameters of the same type such as fn compare<T: Summary>(a: &T, b: &T), a slice &[T] as in summarize_all, or a return type tied to the argument - and explains that impl Trait introduces a fresh anonymous parameter per use, so two impl Trait arguments may be different types, while <T> forces them to be the same and can be named with a turbofish. Does not pass: naming a signature that impl Trait can in fact express, or arguing from readability rather than from the parameter appearing more than once.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:impl-vs-generic:failed", question: { en: "Write a signature with two &impl Summary parameters. Must the two arguments be the same type?", de: "Schreibe eine Signatur mit zwei &impl Summary-Parametern. Müssen die beiden Argumente denselben Typ haben?" }, hints: [ { en: "Each `impl Trait` in a parameter list introduces its own anonymous parameter, so two of them are two independent types.", de: "Jedes `impl Trait` in einer Parameterliste führt seinen eigenen anonymen Parameter ein; zwei davon sind also zwei unabhängige Typen." }, { en: "Now find a place in this file where the same type has to appear twice - a slice is the shortest example.", de: "Finde nun eine Stelle in dieser Datei, an der derselbe Typ zweimal auftreten muss - ein Slice ist das kürzeste Beispiel." }, { en: "The test also calls one function with an explicit type after the name; ask whether an anonymous parameter could be named that way.", de: "Der Test ruft eine Funktion auch mit einem ausdrücklichen Typ hinter dem Namen auf; frage, ob ein anonymer Parameter so benannt werden könnte." } ] }
  - { trigger: "task:bounds:failed", question: { en: "Which one fails? For `describe_pair`, check the equality case - does your code reach the tie branch when a and b compare equal?", de: "Welche scheitert? Prüfe bei `describe_pair` den Gleichheitsfall - erreicht dein Code den Gleichstandszweig, wenn a und b gleich sind?" }, hints: [ { en: "Three branches: `a > b`, `b > a`, and everything else is the tie. Two branches cannot express it.", de: "Drei Zweige: `a > b`, `b > a`, und alles Übrige ist der Gleichstand. Mit zwei Zweigen ist das nicht ausdrückbar." }, { en: "`summarize_all` joins with `\\n` and gives the empty string for an empty slice - collecting into a `Vec<String>` and calling `join` does both.", de: "`summarize_all` verbindet mit `\\n` und liefert bei leerem Slice die leere Zeichenkette - in einen `Vec<String>` zu sammeln und `join` aufzurufen erledigt beides." }, { en: "`longest_summary` compares the summaries, not the items, and keeps the earlier one on a tie.", de: "`longest_summary` vergleicht die Zusammenfassungen, nicht die Elemente, und behält bei Gleichstand die frühere." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\]: `.*` doesn't implement `std::fmt::Display`", question: { en: "You are printing a value whose type has no Display. Is the bound missing from the signature, or is Debug what you actually want here?", de: "Du gibst einen Wert aus, dessen Typ kein Display hat. Fehlt die Schranke in der Signatur, oder willst du hier eigentlich Debug?" }, hints: [ { en: "`{}` needs `Display`; `{:?}` needs `Debug`. The bound in the signature has to match the placeholder you used.", de: "`{}` braucht `Display`, `{:?}` braucht `Debug`. Die Schranke in der Signatur muss zum verwendeten Platzhalter passen." }, { en: "Two bounds are joined with `+`: `T: Display + PartialOrd`.", de: "Zwei Schranken werden mit `+` verbunden: `T: Display + PartialOrd`." }, { en: "`describe_pair` prints and compares, so it needs both.", de: "`describe_pair` gibt aus und vergleicht, braucht also beide." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot pin down a generic parameter. Is it a call on an empty collection, where nothing tells it what T is?", de: "Der Compiler kann einen generischen Parameter nicht festlegen. Ist es ein Aufruf auf einer leeren Sammlung, bei dem nichts sagt, was T ist?" }, hints: [ { en: "`summarize_all(&[])` gives no element to infer from; the test writes `summarize_all::<Tweet>(&[])` for that reason.", de: "`summarize_all(&[])` bietet kein Element zum Herleiten; der Test schreibt deshalb `summarize_all::<Tweet>(&[])`." }, { en: "The turbofish `::<Type>` names the parameter explicitly at the call site.", de: "Der Turbofish `::<Type>` benennt den Parameter an der Aufrufstelle ausdrücklich." }, { en: "This is one thing `impl Trait` cannot do: an anonymous parameter has no name to give.", de: "Das ist eines, was `impl Trait` nicht kann: ein anonymer Parameter hat keinen Namen, den man angeben könnte." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Write the three forms of a trait bound, combine two bounds, and choose the form that says what you mean.

## Three spellings, one idea

```rust
pub fn notify(item: &impl Summary) -> String { … }

pub fn summarize_all<T: Summary>(items: &[T]) -> String { … }

pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{ … }
```

All three say "any type that implements `Summary`". `impl Trait` is sugar for the second; the `where` clause is the second moved below the signature, which is where long lists of bounds belong before they push the return type off the line.

## What `impl Trait` cannot do

`&impl Summary` introduces a **fresh anonymous parameter each time it appears**. So this:

```rust
fn compare(a: &impl Summary, b: &impl Summary)
```

accepts an `Article` and a `Tweet` together. If you need both arguments to be the *same* type, you must name it:

```rust
fn compare<T: Summary>(a: &T, b: &T)
```

The same applies to a slice: `&[T]` needs the name, so `summarize_all` and `longest_summary` cannot use the short form at all. And an anonymous parameter has no name to give at the call site, so `summarize_all::<Tweet>(&[])` - which the test needs, because an empty slice gives the compiler nothing to infer from - is only possible with the explicit form.

Rule of thumb: use `impl Trait` for a single argument used once; name the parameter as soon as it appears more than once.

## Combining bounds

```rust
pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String
```

`+` means "and". The body prints, which needs `Display`, and compares, which needs `PartialOrd`. Ask for exactly what the body uses: an unnecessary bound turns away callers for no benefit, and a missing one is `error[E0277]`.

Note that `{}` needs `Display` while `{:?}` needs `Debug` - two different traits, and the bound has to match the placeholder you wrote.

## The static-dispatch guarantee

Every form here is monomorphised: the compiler generates one copy per concrete type, resolves the calls at compile time and can inline them. There is no vtable and no runtime lookup. (`&dyn Summary` is the other choice, with one copy of the code and a runtime lookup - outside this course's grounded material, but worth knowing the name of.)

## Your task

Implement the four functions - watching the three-way comparison in `describe_pair`, where the equality case needs its own branch - then name a signature that `impl Trait` cannot express. One step left before the project: lifetimes.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m6-03-trait-bounds
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 4 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
