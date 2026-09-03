---
id: m3-04-if-let
title: "if let und let ... else"
bloom: apply
objectives: [ "rust-ch06-03-if-let" ]
requires: [ "m3-03-match" ]
estimatedMinutes: 20
scaffold: independent
recallFrom: [ "m3-02-enums" ]
links:
  - { step: "m4-01-vectors" }
  - { file: "src/m3/m3_04_if_let.rs" }
  - { file: "tests/m3-04-if-let.rs" }
  - { url: "https://doc.rust-lang.org/book/ch06-03-if-let.html", title: "The Book, 6.3: Concise Control Flow with if let" }
sources: [ "src/m3/m3_04_if_let.rs", "tests/m3-04-if-let.rs" ]
tasks:
  - id: if-let
    title: "Die vier if-let-Uebungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-04-if-let", expectPass: [ "m3_04_if_let::config_or_default_falls_back_to_three", "m3_04_if_let::count_non_quit_skips_quit", "m3_04_if_let::longest_write_picks_the_longest", "m3_04_if_let::longest_write_keeps_the_first_on_a_tie", "m3_04_if_let::first_move_x_returns_minus_one_without_a_move" ], minPass: 5, timeoutMs: 180000 }
  - id: when
    title: "Du kannst sagen, wann if let dich etwas kostet"
    check: { type: "question", prompt: { en: "if let gives up the exhaustiveness check that match provides. Describe a concrete change to the Command enum after which longest_write would silently do the wrong thing while still compiling, and say what you would do in a real codebase to notice it.", de: "if let gibt die Vollstaendigkeitspruefung auf, die match bietet. Beschreibe eine konkrete Aenderung am Command-Enum, nach der longest_write stillschweigend das Falsche taete und trotzdem uebersetzte, und sage, was du in einer echten Codebasis taetest, um das zu bemerken." }, rubric: "Describes adding a new text-carrying variant (for example WriteLine(String) or Append { text: String }) that longest_write should consider but silently skips, because if let only matches Command::Write and everything else falls through the else. The remedy should be a real one: use a match with named arms where the set of variants matters, add a test that pins the new variant's behaviour, or mark the enum so that a match is forced.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:if-let:failed", question: { en: "Which one fails? For `longest_write` on a tie, does your comparison replace the current best when the lengths are equal?", de: "Welche scheitert? Ersetzt dein Vergleich in `longest_write` bei gleicher Laenge den bisherigen Besten?" }, hints: [ { en: "Use a strict `>` so equal lengths keep the earlier candidate.", de: "Nutze ein striktes `>`, damit gleiche Laengen den frueheren Kandidaten behalten." }, { en: "`matches!(c, Command::Quit)` is the shortest way to ask whether a value has one particular variant.", de: "`matches!(c, Command::Quit)` ist der kuerzeste Weg zu fragen, ob ein Wert eine bestimmte Variante hat." }, { en: "In `first_move_x`, `let ... else` must diverge in its else block: `continue` inside a loop, or `return`.", de: "In `first_move_x` muss der else-Block von `let ... else` divergieren: `continue` in einer Schleife oder `return`." } ] }
misconceptions:
  - { pattern: "`else` clause of `let\\.\\.\\.else` does not diverge", question: { en: "The else block of a let ... else has to leave the enclosing block. What does yours do instead - fall through, or produce a value?", de: "Der else-Block eines let ... else muss den umgebenden Block verlassen. Was tut deiner stattdessen - durchfallen oder einen Wert liefern?" }, hints: [ { en: "`return`, `continue`, `break` and `panic!` all diverge; an ordinary expression does not.", de: "`return`, `continue`, `break` und `panic!` divergieren alle; ein gewoehnlicher Ausdruck nicht." }, { en: "Inside a `for` loop over the commands, `continue` is the natural way out.", de: "In einer `for`-Schleife ueber die Kommandos ist `continue` der natuerliche Ausweg." }, { en: "If you wanted a value rather than an exit, `if let ... else` is the construct you want instead.", de: "Willst du einen Wert statt eines Ausstiegs, ist `if let ... else` das passende Konstrukt." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "An `if let` used as an expression: do both branches produce the same type, and does the else branch produce one at all?", de: "Ein `if let` als Ausdruck: liefern beide Zweige denselben Typ, und liefert der else-Zweig ueberhaupt einen?" }, hints: [ { en: "`if let Some(v) = o { v } else { 3 }` has type `u8`; without the `else` it would have type `()`.", de: "`if let Some(v) = o { v } else { 3 }` hat den Typ `u8`; ohne das `else` haette es den Typ `()`." }, { en: "Inside the branch, `v` is the unwrapped value, not the Option.", de: "Im Zweig ist `v` der ausgepackte Wert, nicht das Option." }, { en: "`longest_write` returns `Option<String>`, so the accumulator has that type from the start.", de: "`longest_write` liefert `Option<String>`, der Akkumulator hat diesen Typ also von Anfang an." } ] }
---
## Lernziel

Waehle zwischen `match`, `if let` und `let ... else` und benenne, was jede Wahl aufgibt.

## Die Zeremonie, die `if let` erspart

```rust
match config {
    Some(v) => v,
    None => 3,
}
```

Zwei Zweige, einer davon ein Platzhalter. `if let` sagt dasselbe:

```rust
if let Some(v) = config { v } else { 3 }
```

Beide Zweige liefern ein `u8`, das Ganze ist also ein Ausdruck. Laesst du das `else` weg, wird der Typ `()` - nuetzlich, wenn du nur einen Seiteneffekt willst, nutzlos, wenn du einen Wert willst.

Clippy bemerkt, dass genau diese Form `config.unwrap_or(3)` ist, und sagt es. Es hat recht, und die Referenzloesung folgt dem Hinweis; erst die lange Form zu schreiben und dann den Vorschlag anzunehmen ist der gedachte Weg, kein Umweg.

## `if let` in einer Schleife

```rust
for c in commands {
    if let Command::Write(text) = c {
        // nur Write kommt hierher; alles andere wird uebersprungen
    }
}
```

Das ist die Form fuer "mit einer Variante etwas tun, den Rest ignorieren". `matches!(c, Command::Quit)` ist die noch kuerzere Form, wenn nur ein Ja oder Nein gebraucht wird - was `count_non_quit` will.

## `let ... else`

Wenn der *gute Fall* weiterlaufen und alles andere aussteigen soll:

```rust
let Command::Move { x, .. } = c else {
    continue;
};
return *x;
```

Die Bindung bleibt fuer den Rest des Blocks sichtbar, es gibt also keine Einrueckung nach rechts. Die Regel ist, dass der `else`-Block **divergieren** muss - `return`, `continue`, `break` oder `panic!`. Ihn mit einem gewoehnlichen Ausdruck zu beenden ist ein Uebersetzungsfehler, der besagt, dass die else-Klausel nicht divergiert. Das `..` im Muster ignoriert die nicht genannten Felder.

## Was du aufgibst

`match` prueft, dass du jede Variante abgedeckt hast. `if let` nicht: alles, was nicht dem Muster entspricht, faellt in das `else` - stillschweigend und dauerhaft. Ergaenze naechstes Jahr eine zweite textfuehrende Variante in `Command`, und `longest_write` uebersetzt weiter, waehrend es sie stillschweigend uebergeht.

Dieser Handel ist in Ordnung, wenn die Menge der Varianten fuer den Code wirklich unerheblich ist - "ist das ein Quit oder nicht". Er ist gefaehrlich, wenn die Korrektheit des Codes von der ganzen Menge abhaengt, und dort sind die zwei zusaetzlichen Zeilen des `match` es wert. Die Frageaufgabe verlangt, dieses Argument konkret zu fuehren.

## Deine Aufgabe

Implementiere die vier Funktionen und beschreibe dann eine Aenderung an `Command`, die `longest_write` stillschweigend brechen wuerde. Modul M4 laesst eigene Typen hinter sich und wendet sich den Sammlungen der Standardbibliothek zu.
