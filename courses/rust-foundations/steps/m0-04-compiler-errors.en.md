---
id: m0-04-compiler-errors
title: "Read a compiler error and repair the file"
bloom: analyze
objectives: [ "rust-tooling-diagnostics" ]
requires: [ "m0-03-predict-output" ]
estimatedMinutes: 20
scaffold: independent
links:
  - { step: "m1-01-scope-and-move" }
  - { file: "repair/m0_04_type_mismatch.rs" }
  - { file: "README.md" }
  - { url: "https://doc.rust-lang.org/error_codes/E0308.html", title: "rustc error index: E0308" }
sources: [ "repair/m0_04_type_mismatch.rs", "README.md" ]
tasks:
  - id: repair
    title: "The repaired file compiles and prints the sentence"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m0_04 repair/m0_04_type_mismatch.rs && target/check/m0_04", expectExitCode: 0, expectStdout: "Ada is 36 years old and 1 metre 62 tall\\.", timeoutMs: 120000 }
  - id: method
    title: "You can describe how you read the diagnostic"
    check: { type: "question", prompt: { en: "rustc reported three E0308 errors, but you did not need three separate fixes. Explain which parts of one diagnostic - the code, the underlined span, the expected/found pair, the help line - told you what to change, and why fixing one line removed more than one error.", de: "rustc meldete drei E0308-Fehler, du brauchtest aber nicht drei getrennte Korrekturen. Erklaere, welche Teile einer Diagnose - Fehlercode, unterstrichene Stelle, expected/found-Paar, help-Zeile - dir sagten, was zu aendern ist, und warum eine korrigierte Zeile mehr als einen Fehler beseitigt hat." }, rubric: "Explains that the caret marks the expression whose type is wrong and expected/found names both sides, and that declaring name as &str (rather than String) fixed both the literal-assignment error and the argument-type error at the call site, because the second error was a consequence of the first declaration. Mentioning that the help line proposes a concrete edit is a plus; blindly following help without reading expected/found should not earn full credit.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many errors does rustc report now, and is it fewer than before? Which line does the first caret point at?", de: "Wie viele Fehler meldet rustc jetzt, und sind es weniger als zuvor? Auf welche Zeile zeigt das erste Caret?" }, hints: [ { en: "Work top down and rebuild after every single change: later errors are often consequences of the first one.", de: "Arbeite von oben nach unten und baue nach jeder einzelnen Aenderung neu: spaetere Fehler sind oft Folgen des ersten." }, { en: "A literal in double quotes has type `&str`. Either the annotation or the value has to give way - and the function's parameter says which.", de: "Ein Literal in Anfuehrungszeichen hat den Typ `&str`. Entweder die Annotation oder der Wert muss weichen - und der Parameter der Funktion sagt, welcher." }, { en: "Do not change `describe`; it is correct. The three errors are all in `main`, and two of them are the same mistake.", de: "Aendere `describe` nicht; sie ist korrekt. Die drei Fehler stehen alle in `main`, und zwei davon sind derselbe Fehler." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Read the `expected ... found ...` line aloud. Which of the two is the annotation you wrote, and which is what the value actually is?", de: "Lies die Zeile `expected ... found ...` laut. Welches von beidem ist die Annotation, die du geschrieben hast, und welches der tatsaechliche Wert?" }, hints: [ { en: "`expected` is what the surrounding context demands; `found` is what your expression produced.", de: "`expected` ist, was der Kontext verlangt; `found` ist, was dein Ausdruck geliefert hat." }, { en: "The dashes under a second span mark where the expectation came from - usually the type annotation or the parameter list.", de: "Die Striche unter einer zweiten Stelle markieren, woher die Erwartung stammt - meist die Typannotation oder die Parameterliste." }, { en: "rustc's `help:` line proposes a concrete edit; check it against the signature before you accept it.", de: "Die `help:`-Zeile von rustc schlaegt eine konkrete Aenderung vor; pruefe sie an der Signatur, bevor du sie uebernimmst." } ] }
  - { pattern: "error\\[E0425\\]", question: { en: "A name in scope disappeared. Did you rename or delete a variable the rest of the function still uses?", de: "Ein Name im Gueltigkeitsbereich ist verschwunden. Hast du eine Variable umbenannt oder geloescht, die der Rest der Funktion noch nutzt?" }, hints: [ { en: "The task says to keep every variable; deleting one trades an E0308 for an E0425.", de: "Die Aufgabe verlangt, jede Variable zu behalten; eine zu loeschen tauscht ein E0308 gegen ein E0425." }, { en: "`git diff repair/m0_04_type_mismatch.rs` shows exactly what you changed.", de: "`git diff repair/m0_04_type_mismatch.rs` zeigt genau, was du geaendert hast." }, { en: "Restore the original with `git checkout -- repair/m0_04_type_mismatch.rs` and start again, changing only the types.", de: "Stelle das Original mit `git checkout -- repair/m0_04_type_mismatch.rs` wieder her und beginne neu, indem du nur die Typen aenderst." } ] }
---
## Learning goal

Treat a rustc diagnostic as a structured report you can act on, not a wall of text - and repair a file that does not compile without changing anything the compiler did not complain about.

## What a rust diagnostic contains

Every error has four parts, and each answers a different question:

```text
error[E0308]: mismatched types
 --> repair/m0_04_type_mismatch.rs:24:24
   |
24 |     let name: String = "Ada";
   |               ------   ^^^^^ expected `String`, found `&str`
   |               |
   |               expected due to this
   |
help: try using a conversion method
   |
24 |     let name: String = "Ada".to_string();
```

- **`error[E0308]`** is a stable code. `rustc --explain E0308` prints a page about it, and the online error index has the same text.
- **The location** `file:line:column` is where the compiler gave up, which is not always where you made the mistake.
- **The spans.** The carets `^^^^^` mark the offending expression; a second span with dashes, labelled `expected due to this`, marks *why* the compiler expected what it expected. Those two together are the whole diagnosis: something over here forces a type, something over there produces a different one.
- **`help:`** proposes an edit. It is often right and occasionally solves the wrong problem - it can only see the local expression, not your intent.

## The file

`repair/m0_04_type_mismatch.rs` is not part of the cargo package; it is a standalone program that you compile directly. In its current state it produces three E0308 errors. Its `describe` function is correct and must not be touched; all three errors are in `main`.

Compile and run it in one go - exactly what the check does:

```bash
mkdir -p target/check
rustc --edition 2024 -o target/check/m0_04 repair/m0_04_type_mismatch.rs
target/check/m0_04
```

It must print, exactly:

```text
Ada is 36 years old and 1 metre 62 tall.
```

## How to work

Fix **one** error, then recompile. Errors cascade: a wrong declaration on line 24 produces a second complaint at the call site on line 28, and repairing the declaration removes both. Chasing all three at once usually produces a file with three unrelated changes, two of which were unnecessary.

Two constraints keep this honest. Keep every variable - deleting one trades a type error for `E0425: cannot find value`. And keep the printed sentence exactly as above; the check compares it.

## Your task

Repair the file so it compiles and prints the sentence, then explain which parts of the diagnostic you actually used. From here on the errors get more interesting: the next module is about ownership, and its errors are about *when* a value stops being yours.
