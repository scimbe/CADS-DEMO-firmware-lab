---
id: m2-02-truthy-falsy
title: Truthy, falsy and the defaults that eat your values
bloom: analyze
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m2-01-if-switch]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-01-if-switch, m1-03-coercion-nan]
links:
  - { step: m2-01-if-switch }
  - { step: m2-03-try-catch-finally }
  - { file: "src/m2/settings.js", line: 8 }
  - { step: m5-02-optional-chaining }
sources: [src/m2/settings.js, test/m2-02-truthy-falsy.test.js]
tasks:
  - id: defaults
    title: Both defaults tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m2-02 withDefaults fills in missing properties", "m2-02 withDefaults keeps falsy values the caller passed on purpose"], minPass: 2 }
  - id: which-question
    title: Missing, or falsy
    check: { type: question, prompt: { en: "A caller passes 0. Which question did the old code ask, and which one did it mean? Two sentences.", de: "Ein Aufrufer übergibt 0. Welche Frage stellte der alte Code, und welche meinte er? Zwei Sätze." }, rubric: "Separates the test the old line performed from the test it was meant to perform, and names an operator matching the intended one. Does not pass: listing which values count as empty, or naming a replacement without stating both tests.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:defaults:failed"
    question: { en: "Which of the three properties is still replaced although the caller supplied it?", de: "Welche der drei Eigenschaften wird noch ersetzt, obwohl der Aufrufer sie übergab?" }
    hints: [ { en: "Run the second assertion alone; it passes the three values a truthiness test cannot see.", de: "Lass die zweite Assertion allein laufen; sie übergibt die drei Werte, die eine Truthiness-Prüfung nicht sieht." }, { en: "For each of the three lines, ask what it does when the property is present and empty.", de: "Frag für jede der drei Zeilen, was sie tut, wenn die Eigenschaft vorhanden und leer ist." }, { en: "One of the three lines cannot produce a false result at all, whatever the caller passes.", de: "Eine der drei Zeilen kann überhaupt kein false liefern, was der Aufrufer auch übergibt." } ]
  - trigger: "task:which-question:failed"
    question: { en: "Are you naming two different questions, or one question and its fix?", de: "Nennst du zwei verschiedene Fragen, oder eine Frage und ihre Korrektur?" }
    hints: [ { en: "Write down what each of the two questions answers for the value zero.", de: "Schreib auf, was jede der beiden Fragen für den Wert null antwortet." }, { en: "Only two values in the language mean that nobody supplied anything; the empty ones are a longer list.", de: "Nur zwei Werte der Sprache bedeuten, dass niemand etwas übergeben hat; die leeren sind eine längere Liste." }, { en: "The operator you want is the one whose list is exactly those two.", de: "Der gesuchte Operator ist der, dessen Liste genau diese beiden ist." } ]
misconceptions:
  - pattern: "8080 !== 0|'untitled' !== ''|true !== false"
    question: { en: "A default replaced a value the caller actually passed. Which operator made that decision, and what does it consider empty?", de: "Ein Standardwert hat einen Wert ersetzt, den der Aufrufer wirklich übergeben hat. Welcher Operator hat das entschieden, und was hält er für leer?" }
    hints: [ { en: "|| and a ternary on truthiness both treat 0, \"\" and false as absent.", de: "|| und ein Ternär auf Truthiness behandeln 0, \"\" und false beide als nicht vorhanden." }, { en: "?? is the nullish coalescing operator: it falls back only for null and undefined.", de: "?? ist der Nullish-Coalescing-Operator: er greift nur bei null und undefined." }, { en: "One operator falls back for exactly the two values that mean absent, and for nothing else.", de: "Ein Operator greift für genau die zwei Werte, die Abwesenheit bedeuten, und für nichts sonst." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Tell "this value is empty" apart from "this value was never given", and pick the operator that asks the question you actually mean.

## The eight falsy values

Anywhere JavaScript needs a boolean - an `if` condition, `||`, `&&`, a ternary - it converts the value it was given. MDN's [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) chapter lists the values that convert to `false`:

```
false    0    -0    0n    ""    null    undefined    NaN
```

Everything else is truthy. Including things people expect to be falsy: `"0"`, `"false"`, `[]` and `{}` are all truthy, because they are a non-empty string, a non-empty string, an object and an object.

## Why `||` is the wrong default operator

The classic default idiom is:

```js
const port = options.port || 8080;
```

It reads as "use the caller's port, or 8080 if they did not give one". What it actually says is "use the caller's port unless it is falsy". A caller who passes `0` - a real, deliberate port number - silently gets 8080. The same applies to a `label` of `""` and a `verbose` flag of `false`. The last one is the worst: `options.verbose || true` can never produce `false` at all.

The operator that asks the intended question is **nullish coalescing**:

```js
const port = options.port ?? 8080;
```

`??` falls back for `null` and `undefined` and for nothing else. `0 ?? 8080` is `0`.

Rule of thumb: use `||` when you genuinely mean "or anything empty", and `??` when you mean "if this was not supplied". For options, defaults and configuration, it is almost always `??`. You will use it again in [M5](step:m5-02-optional-chaining), where it pairs with optional chaining.

## The exercise

Open [`src/m2/settings.js`](file:src/m2/settings.js). `withDefaults(options)` must fill in `port` 8080, `label` `"untitled"` and `verbose` `true` **only when the property is missing**. Three lines, three variants of the same mistake: a ternary on truthiness, an `||`, and an `||` whose default makes the flag unfalsifiable.

The first test already passes: with an empty object, truthiness and nullishness agree. The second test passes `{ port: 0, label: "", verbose: false }` and is the one that matters.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m2-02-truthy-falsy.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Both green. In the question task, say what changed in the *question being asked*, not just which operator you typed. Next, [errors that are thrown on purpose](step:m2-03-try-catch-finally).
