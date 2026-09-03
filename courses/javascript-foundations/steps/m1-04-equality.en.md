---
id: m1-04-equality
title: "== against ===, and the one case === gets wrong"
bloom: analyze
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-03-coercion-nan]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m1-03-coercion-nan]
links:
  - { step: m1-03-coercion-nan }
  - { step: m2-01-if-switch }
  - { file: "src/m1/lookup.js", line: 9 }
  - { file: "test/m1-04-equality.test.js" }
sources: [src/m1/lookup.js, test/m1-04-equality.test.js, src/m1/numbers.js]
tasks:
  - id: lookup
    title: Both lookup tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m1-04 findById compares ids without type conversion", "m1-04 sameValue treats NaN as the same value and never converts types"], minPass: 2 }
  - id: three-operators
    title: Choose between three comparisons
    check: { type: question, prompt: { en: "JavaScript offers ==, === and Object.is. Give one concrete case for each where it is the right choice, and say which of the three you would forbid in a code base and why.", de: "JavaScript bietet ==, === und Object.is. Nenne für jedes einen konkreten Fall, in dem es die richtige Wahl ist, und sag, welches der drei du in einer Codebasis verbieten würdest und warum." }, rubric: "Describes == as converting types before comparing (its only defensible use being x == null to catch null and undefined together), === as comparing type and value without conversion (the default), and Object.is as === except that it treats NaN as equal to itself and distinguishes 0 from -0. Argues for banning == on the grounds that its conversion table is not memorable and its intent is not visible at the call site.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:lookup:failed", question: { en: "Which of the two functions still fails - the one that must NOT convert types, or the one that must recognise NaN?", de: "Welche der beiden Funktionen schlägt noch fehl - die, die NICHT umwandeln darf, oder die, die NaN erkennen muss?" }, hints: [ { en: "findById uses ==, so the string '1' matches the number 1. The test demands that it does not.", de: "findById benutzt ==, deshalb passt die Zeichenkette '1' auf die Zahl 1. Der Test verlangt, dass sie das nicht tut." }, { en: "=== fixes findById, but it cannot fix sameValue: NaN === NaN is false.", de: "=== behebt findById, kann aber sameValue nicht beheben: NaN === NaN ist false." }, { en: "Object.is(a, b) is === plus the NaN case; that is exactly what sameValue needs.", de: "Object.is(a, b) ist === plus den NaN-Fall; genau das braucht sameValue." } ] }
misconceptions:
  - pattern: "sameValue|findById"
    question: { en: "Which comparison is in that line, and does the test want type conversion to happen there or not?", de: "Welcher Vergleich steht in dieser Zeile, und will der Test dort eine Typumwandlung oder nicht?" }
    hints: [ { en: "== converts before comparing, so '1' == 1 is true; === does not convert, so it is false.", de: "== wandelt vor dem Vergleich um, '1' == 1 ist also true; === wandelt nicht um und ist deshalb false." }, { en: "Neither == nor === can report NaN as equal to itself.", de: "Weder == noch === kann NaN als sich selbst gleich melden." }, { en: "Object.is is the third option and the only one that treats NaN as the same value.", de: "Object.is ist die dritte Möglichkeit und die einzige, die NaN als denselben Wert behandelt." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Choose a comparison operator on purpose. Know what `==` converts, why `===` is the default, and the single case where `===` still gives the answer you do not want.

## Three operators, three behaviours

```js
"1" == 1              // true   - == converts, then compares
"1" === 1             // false  - === compares type and value
Object.is("1", 1)     // false  - like ===
```

`==` runs a conversion table before comparing. The table is real, specified and consistent - and almost nobody can recite it. `0 == ""`, `0 == "0"` and `"" == "0"` do not all agree with each other, which is enough reason to leave `==` alone.

`===` compares without converting. It is the default in this course, and it is what `node:assert/strict` uses under the hood - which is why the tests you have been reading are so strict about `"12"` against `12`.

The one defensible use of `==` is the null check:

```js
if (value == null) { … }   // true for null AND undefined, nothing else
```

That single idiom is common and safe. Everything else should be `===`.

## Where `===` is not enough

From [the previous step](step:m1-03-coercion-nan) you know that `NaN === NaN` is `false`. So neither `==` nor `===` can answer "are these the same value?" when the value happens to be `NaN`. That is what `Object.is` is for:

```js
Object.is(NaN, NaN)   // true
NaN === NaN           // false

Object.is(0, -0)      // false
0 === -0              // true
```

`Object.is` is `===` with those two corrections. Use it when you mean *same value* rather than *equal*; use `===` for everything else.

One more thing that catches people, and that returns in [M5](step:m5-01-objects): objects compare by identity, never by content.

```js
{ a: 1 } === { a: 1 }   // false - two different objects
```

Comparing structures is what `assert.deepEqual` does for you in the tests.

## The exercise

Open [`src/m1/lookup.js`](file:src/m1/lookup.js):

- `findById(items, "1")` must **not** find the item whose `id` is the number `1`. The function uses `==`, so it does. Switch the comparison.
- `sameValue(NaN, NaN)` must be `true`, and `sameValue(1, "1")` must be `false`. No equality operator can do both. Use the third option.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m1-04-equality.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m1-04-equality.test.js
```

Both tests green. The question task asks you to defend all three choices - that judgement, not the syntax, is what M1 was building towards. With values understood, [M2](step:m2-01-if-switch) turns to the decisions a program makes with them.
