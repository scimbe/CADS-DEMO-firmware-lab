---
id: m6-02-traits
title: "Traits: gemeinsames Verhalten mit Namen"
bloom: apply
objectives: [ "rust-ch10-02-traits" ]
requires: [ "m6-01-generics" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m6-01-generics", "m5-04-custom-error" ]
links:
  - { step: "m6-03-trait-bounds" }
  - { file: "src/m6/m6_02_traits.rs" }
  - { file: "tests/m6-02-traits.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits: Defining Shared Behavior" }
sources: [ "src/m6/m6_02_traits.rs", "tests/m6-02-traits.rs", "src/m5/m5_04_custom_error.rs" ]
tasks:
  - id: traits
    title: "Article überschreibt, Tweet nutzt die Vorgabe"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-02-traits", expectPass: [ "m6_02_traits::article_reports_its_author", "m6_02_traits::article_overrides_the_default_summary", "m6_02_traits::tweet_prefixes_the_username", "m6_02_traits::tweet_uses_the_default_summary" ], minPass: 4, timeoutMs: 180000 }
  - id: default-method
    title: "Du kannst die Vorgabemethode erklären"
    check: { type: "question", prompt: { en: "Tweet implements only author() yet Summary::summarize() works on it, and Article's own summarize() never calls the default. Explain how the compiler decides which body runs, and what the default method's call to self.author() means for a type that has not been written yet.", de: "Tweet implementiert nur author(), und dennoch funktioniert Summary::summarize() darauf, während Articles eigenes summarize() die Vorgabe nie aufruft. Erkläre, wie der Compiler entscheidet, welcher Rumpf läuft, und was der Aufruf self.author() in der Vorgabemethode für einen noch nicht geschriebenen Typ bedeutet." }, rubric: "States that an impl block's method replaces the trait's default for that type, and that a type providing no body gets the default - the choice is made per type at compile time, statically, not by any runtime lookup. The second half should note that the default calls the required method through the trait, so it works for any future implementor that supplies author(), which is what makes a default method a reusable behaviour rather than a copy.", bloom: "understand", minChars: 70 }
socratic:
  - { trigger: "task:traits:failed", question: { en: "Which one fails? Did you add a summarize() to Tweet - and if so, what happens to the default the test expects?", de: "Welche scheitert? Hast du ein summarize() zu Tweet hinzugefügt - und was geschieht dann mit der Vorgabe, die der Test erwartet?" }, hints: [ { en: "`Tweet` must implement only `author`; adding `summarize` would override exactly the default the test checks.", de: "`Tweet` darf nur `author` implementieren; ein `summarize` überschriebe genau die Vorgabe, die der Test prüft." }, { en: "`Tweet::author` returns `format!(\"@{}\", self.username)`, with the at sign in the method, not in the field.", de: "`Tweet::author` liefert `format!(\"@{}\", self.username)`, mit dem At-Zeichen in der Methode und nicht im Feld." }, { en: "`Article::summarize` is `format!(\"{}, by {}\", self.headline, self.author)` - the comma and the word `by` are part of the expected string.", de: "`Article::summarize` ist `format!(\"{}, by {}\", self.headline, self.author)` - Komma und das Wort `by` gehören zur erwarteten Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0046\\]: not all trait items implemented", question: { en: "The impl block is missing a method the trait requires. Which one, and does the trait offer a default for it or not?", de: "Dem impl-Block fehlt eine vom Trait geforderte Methode. Welche, und bietet das Trait dafür eine Vorgabe an oder nicht?" }, hints: [ { en: "A trait method with a body is optional to implement; one without a body is required.", de: "Eine Trait-Methode mit Rumpf ist optional zu implementieren; eine ohne Rumpf ist verpflichtend." }, { en: "`author` has no default here, so every implementor must supply it.", de: "`author` hat hier keine Vorgabe, jeder Implementierer muss sie also liefern." }, { en: "The diagnostic lists the missing items by name and shows their signatures.", de: "Die Diagnose listet die fehlenden Elemente namentlich auf und zeigt ihre Signaturen." } ] }
  - { pattern: "error\\[E0599\\]: no method named `\\w+` found", question: { en: "A method exists on the trait but not, apparently, on your value. Is the trait in scope at the call site?", de: "Eine Methode gibt es am Trait, aber offenbar nicht an deinem Wert. Ist das Trait an der Aufrufstelle sichtbar?" }, hints: [ { en: "A trait's methods are callable only where the trait itself is imported: `use ...::Summary;`.", de: "Die Methoden eines Traits sind nur dort aufrufbar, wo das Trait selbst importiert ist: `use ...::Summary;`." }, { en: "The test file imports `Summary` for exactly this reason; your own code needs the same import.", de: "Die Testdatei importiert `Summary` genau deshalb; dein eigener Code braucht denselben Import." }, { en: "Check the spelling against the trait: the compiler suggests near matches when there is one.", de: "Prüfe die Schreibweise gegen das Trait: der Compiler schlägt ähnliche Namen vor, wenn es welche gibt." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Definiere ein Trait, implementiere es für zwei Typen und nutze eine Vorgabemethode, sodass einer davon gar keinen Code braucht.

## Ein Trait ist eine benannte Menge von Methoden

```rust
pub trait Summary {
    fn author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.author())
    }
}
```

`author` hat keinen Rumpf: jeder Implementierer muss einen liefern. `summarize` hat einen Rumpf: Implementierer dürfen ihn übernehmen. Das ist die ganze Unterscheidung, und es ist die Trait-Definitionshälfte von Kapitel 10.2.

Du hast Traits bereits benutzt, ohne eines zu definieren. `Display` in m5-04 ist ein Trait, und `impl fmt::Display for ConfigError` zu schreiben ist dieselbe Handlung wie die folgende. Ebenso `Debug`, das `derive` für dich schreibt, und `PartialOrd`, das m6-01 als Schranke nutzte.

## Implementieren

```rust
impl Summary for Article {
    fn author(&self) -> String { self.author.clone() }
    fn summarize(&self) -> String { format!("{}, by {}", self.headline, self.author) }
}

impl Summary for Tweet {
    fn author(&self) -> String { format!("@{}", self.username) }
}
```

`Article` überschreibt `summarize`; `Tweet` nicht und erbt die Fassung des Traits. Die Wahl fällt je Typ zur Übersetzungszeit - die Methode des impl-Blocks ersetzt schlicht die Vorgabe für diesen Typ. Zur Laufzeit wird nichts nachgeschlagen.

Lässt du `author` weg, erhältst du `error[E0046]: not all trait items implemented`. Lässt du `summarize` weg, geschieht nichts, denn es gibt eine Vorgabe.

## Warum eine Vorgabemethode mehr wert ist als eine Kopie

Die Vorgabe ruft `self.author()` auf - eine Methode, die das Trait *fordert*. Genau das macht sie wiederverwendbar: sie funktioniert für jeden Typ, den irgendwer künftig implementiert, solange er `author` liefert. Eine kopierte Hilfsfunktion täte das nicht; sie müsste je Typ erneut geschrieben werden.

## Die Sichtbarkeitsregel

Die Methoden eines Traits sind nur dort aufrufbar, wo das Trait sichtbar ist:

```rust
use rust_foundations::m6::m6_02_traits::{Summary, Tweet};
```

Ohne das `use Summary` ist `tweet.summarize()` ein `error[E0599]: no method named summarize found`, obwohl die Implementierung existiert. Die Testdatei importiert es genau deswegen.

Es gibt außerdem eine Kohärenzregel: du darfst ein Trait für einen Typ nur implementieren, wenn dir das Trait oder der Typ gehört. Deshalb kann niemand außer der Standardbibliothek `Display` für `Vec<T>` implementieren, und deshalb kann der Compiler garantieren, dass es nie mehr als eine Implementierung zur Auswahl gibt.

## Deine Aufgabe

Implementiere `Summary` für beide Typen - und denke daran, dass `Tweet` `summarize` *nicht* definieren darf - und erkläre dann, wie der Compiler zwischen Vorgabe und Überschreibung wählt. Der nächste Step nutzt diese Traits als Schranken.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
cargo test --test m6-02-traits
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
