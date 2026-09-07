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
    check: { type: "question", prompt: { en: "notify takes &impl Summary and summarize_all takes <T: Summary>. Name a signature that can only be written with the explicit generic form and not with impl Trait, and explain what the explicit form guarantees that the short form does not.", de: "notify nimmt &impl Summary, summarize_all nimmt <T: Summary>. Nenne eine Signatur, die sich nur mit der ausdrücklichen generischen Form schreiben lässt und nicht mit impl Trait, und erkläre, was die ausdrückliche Form zusichert, was die Kurzform nicht zusichert." }, rubric: "Judged on the answer. All three criteria must be met: (1) it writes out a signature in which one named type parameter stands in two places - two arguments of one type, a slice, or a result tied to an argument; (2) it justifies that from the anonymity of the short form: two occurrences of it need not denote the same type; (3) it states the guarantee that follows, one single type across those places, nameable at the point where the function is used. Does not pass: a signature the short form can in fact write; an argument from readability or from length; the turbofish mentioned with no signature that requires it.", recallPrompt: { en: "One function takes &impl Trait, another takes <T: Trait>. Name a signature only the named form can write, and say what it guarantees that the short form does not.", de: "Eine Funktion nimmt &impl Trait, eine andere <T: Trait>. Nenne eine Signatur, die nur die benannte Form schreiben kann, und sage, was sie zusichert, was die Kurzform nicht zusichert." }, bloom: "analyze", minChars: 70 }
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

Read alongside `m6-01-generics` and `m6-02-traits`: the type parameter from the one and the trait from the other meet in the bound.

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

`&impl Summary` introduces a **fresh anonymous parameter each time it appears**. Two things follow, and both stand here only as facts: two occurrences in one parameter list are two independent types, and an anonymous parameter carries no name that could be given anywhere.

That is all you need in order to work out for yourself which signatures the short form cannot write. This step's question asks for exactly one of them; two of the three functions above are such cases, and what those two have in common is the answer.

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

::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::

The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m6-03-trait-bounds" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *The four bounded functions pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
