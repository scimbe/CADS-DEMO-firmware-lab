---
id: m3-04-if-let
title: "if let and let ... else"
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
    title: "The four if-let exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-04-if-let", expectPass: [ "m3_04_if_let::config_or_default_falls_back_to_three", "m3_04_if_let::count_non_quit_skips_quit", "m3_04_if_let::longest_write_picks_the_longest", "m3_04_if_let::longest_write_keeps_the_first_on_a_tie", "m3_04_if_let::first_move_x_returns_minus_one_without_a_move" ], minPass: 5, timeoutMs: 180000 }
  - id: when
    title: "You can say when if let costs you something"
    check: { type: "question", prompt: { en: "if let gives up the exhaustiveness check that match provides. Describe a concrete change to the Command enum after which longest_write would silently do the wrong thing while still compiling, and say what you would do in a real codebase to notice it.", de: "if let gibt die Vollständigkeitsprüfung auf, die match bietet. Beschreibe eine konkrete Änderung am Command-Enum, nach der longest_write stillschweigend das Falsche täte und trotzdem übersetzte, und sage, was du in einer echten Codebasis tätest, um das zu bemerken." }, rubric: "Describes adding a new text-carrying variant (for example WriteLine(String) or Append { text: String }) that longest_write should consider but silently skips, because if let only matches Command::Write and everything else falls through the else. The remedy should be a real one: use a match with named arms where the set of variants matters, add a test that pins the new variant's behaviour, or mark the enum so that a match is forced.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:if-let:failed", question: { en: "Which one fails? For `longest_write` on a tie, does your comparison replace the current best when the lengths are equal?", de: "Welche scheitert? Ersetzt dein Vergleich in `longest_write` bei gleicher Länge den bisherigen Besten?" }, hints: [ { en: "Use a strict `>` so equal lengths keep the earlier candidate.", de: "Nutze ein striktes `>`, damit gleiche Längen den früheren Kandidaten behalten." }, { en: "`matches!(c, Command::Quit)` is the shortest way to ask whether a value has one particular variant.", de: "`matches!(c, Command::Quit)` ist der kürzeste Weg zu fragen, ob ein Wert eine bestimmte Variante hat." }, { en: "In `first_move_x`, `let ... else` must diverge in its else block: `continue` inside a loop, or `return`.", de: "In `first_move_x` muss der else-Block von `let ... else` divergieren: `continue` in einer Schleife oder `return`." } ] }
misconceptions:
  - { pattern: "`else` clause of `let\\.\\.\\.else` does not diverge", question: { en: "The else block of a let ... else has to leave the enclosing block. What does yours do instead - fall through, or produce a value?", de: "Der else-Block eines let ... else muss den umgebenden Block verlassen. Was tut deiner stattdessen - durchfallen oder einen Wert liefern?" }, hints: [ { en: "`return`, `continue`, `break` and `panic!` all diverge; an ordinary expression does not.", de: "`return`, `continue`, `break` und `panic!` divergieren alle; ein gewöhnlicher Ausdruck nicht." }, { en: "Inside a `for` loop over the commands, `continue` is the natural way out.", de: "In einer `for`-Schleife über die Kommandos ist `continue` der natürliche Ausweg." }, { en: "If you wanted a value rather than an exit, `if let ... else` is the construct you want instead.", de: "Willst du einen Wert statt eines Ausstiegs, ist `if let ... else` das passende Konstrukt." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "An `if let` used as an expression: do both branches produce the same type, and does the else branch produce one at all?", de: "Ein `if let` als Ausdruck: liefern beide Zweige denselben Typ, und liefert der else-Zweig überhaupt einen?" }, hints: [ { en: "`if let Some(v) = o { v } else { 3 }` has type `u8`; without the `else` it would have type `()`.", de: "`if let Some(v) = o { v } else { 3 }` hat den Typ `u8`; ohne das `else` hätte es den Typ `()`." }, { en: "Inside the branch, `v` is the unwrapped value, not the Option.", de: "Im Zweig ist `v` der ausgepackte Wert, nicht das Option." }, { en: "`longest_write` returns `Option<String>`, so the accumulator has that type from the start.", de: "`longest_write` liefert `Option<String>`, der Akkumulator hat diesen Typ also von Anfang an." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Choose between `match`, `if let` and `let ... else`, and be able to say what each choice gives up.

## The ceremony `if let` removes

```rust
match config {
    Some(v) => v,
    None => 3,
}
```

Two arms, one of which is a placeholder. `if let` says the same thing:

```rust
if let Some(v) = config { v } else { 3 }
```

Both branches produce a `u8`, so the whole thing is an expression. Drop the `else` and the type becomes `()` - useful when you only want a side effect, useless when you want a value.

Clippy will notice that this particular shape is `config.unwrap_or(3)` and say so. It is right, and the reference solution takes its advice; writing the long form first and then accepting the suggestion is the intended path, not a detour.

## `if let` inside a loop

```rust
for c in commands {
    if let Command::Write(text) = c {
        // only Write reaches here; everything else is skipped
    }
}
```

This is the shape for "do something with one variant, ignore the rest". `matches!(c, Command::Quit)` is the even shorter form when you only need a yes or no, which is what `count_non_quit` wants.

## `let ... else`

When the *happy path* should continue and everything else should leave:

```rust
let Command::Move { x, .. } = c else {
    continue;
};
return *x;
```

The binding stays in scope for the rest of the block, so there is no rightward drift. The rule is that the `else` block must **diverge** - `return`, `continue`, `break` or `panic!`. Ending it with an ordinary expression is a compile error saying the else clause does not diverge. The `..` in the pattern ignores the fields you did not name.

## What you give up

`match` checks that you covered every variant. `if let` does not: everything that is not the pattern falls into the `else`, silently and forever. Add a second text-carrying variant to `Command` next year and `longest_write` keeps compiling while quietly ignoring it.

That trade is fine when the set of variants is genuinely irrelevant to the code - "is this a Quit or not". It is dangerous when the code's correctness depends on the whole set, and there the `match` is worth the two extra lines. The question task asks you to make that argument concretely.

## Your task

Implement the four functions, then describe a change to `Command` that would break `longest_write` silently. Module M4 leaves your own types behind for the standard library's collections.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1** (more reliable in a browser than Ctrl+Shift+P), type `Terminal: Create New Terminal` and press Enter. The terminal opens in the panel at the bottom, already in the workspace folder. Then run:

```bash
cargo test --test m3-04-if-let
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 5 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, the terminal is in the wrong folder - `cd` back to the workspace root.
