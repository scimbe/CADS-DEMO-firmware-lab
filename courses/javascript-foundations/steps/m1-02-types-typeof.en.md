---
id: m1-02-types-typeof
title: Types and what typeof will not tell you
bloom: apply
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-01-let-const]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m1-01-let-const]
links:
  - { step: m1-01-let-const }
  - { step: m1-03-coercion-nan }
  - { file: "src/m1/describe.js", line: 8 }
  - { file: "examples/m1-typeof.js" }
sources: [src/m1/describe.js, test/m1-02-types-typeof.test.js, examples/m1-typeof.js]
tasks:
  - id: guess-typeof
    title: Predict all eight typeof results, then run the example
    check: { type: predict, prompt: { en: "examples/m1-typeof.js prints typeof for eight values, among them null, an array, a function and a BigInt. Write down all eight answers before running it.", de: "examples/m1-typeof.js gibt typeof für acht Werte aus, darunter null, ein Array, eine Funktion und ein BigInt. Schreib alle acht Antworten auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m1-typeof.js", expectExitCode: 0, expectStdout: "bigint" }, rubric: "Compares prediction and output and names the two results that surprise almost everyone: typeof null is object (a bug preserved for backwards compatibility) and typeof an array is also object, so typeof alone cannot distinguish them.", bloom: evaluate }
  - id: type-name
    title: Both typeName tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m1-02 typeName reports primitives via typeof", "m1-02 typeName distinguishes null and arrays from objects"], minPass: 2 }
socratic:
  - { trigger: "task:type-name:failed", question: { en: "Which value is still reported as object when it should have its own name?", de: "Welcher Wert wird noch als object gemeldet, obwohl er einen eigenen Namen bekommen soll?" }, hints: [ { en: "typeof cannot help here; both null and arrays answer object.", de: "typeof hilft hier nicht; sowohl null als auch Arrays antworten mit object." }, { en: "Test for null with a strict comparison, value === null, before anything else.", de: "Prüfe auf null mit einem strikten Vergleich, value === null, noch vor allem anderen." }, { en: "Arrays have their own test: Array.isArray(value).", de: "Arrays haben ihren eigenen Test: Array.isArray(value)." } ] }
misconceptions:
  - pattern: "object..!== ..null"
    question: { en: "typeof answered object for a value that is not an object at all. Which one is it, and which check catches it?", de: "typeof hat object für einen Wert geantwortet, der gar kein Objekt ist. Welcher ist es, und welche Prüfung fängt ihn?" }
    hints: [ { en: "typeof null has been object since 1995 and cannot be changed without breaking the web.", de: "typeof null ist seit 1995 object und kann nicht geändert werden, ohne das Web zu brechen." }, { en: "Order matters: check null first, then arrays, then fall back to typeof.", de: "Die Reihenfolge zählt: erst null, dann Arrays, dann typeof als Rückfall." }, { en: "return value === null ? \"null\" : Array.isArray(value) ? \"array\" : typeof value;", de: "return value === null ? \"null\" : Array.isArray(value) ? \"array\" : typeof value;" } ]
---
## Learning goal

Name the value types JavaScript actually has, use `typeof` for what it is good at, and reach for a different check where `typeof` cannot help.

## The types, once

MDN's [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) chapter lists seven primitive types plus objects:

| Type | Example | `typeof` says |
|---|---|---|
| number | `42`, `4.5`, `NaN` | `"number"` |
| string | `"42"` | `"string"` |
| boolean | `true` | `"boolean"` |
| undefined | a variable declared and not assigned | `"undefined"` |
| null | `null` | **`"object"`** |
| bigint | `9007199254740993n` | `"bigint"` |
| symbol | `Symbol("id")` | `"symbol"` |
| object | `{}`, `[]`, a function | `"object"`, `"function"` |

Two rows are traps. `typeof null` answers `"object"` - a bug from the first implementation in 1995 that can no longer be fixed without breaking existing web pages. And an array is an object, so `typeof [1, 2]` is `"object"` too: `typeof` cannot tell an array from a plain object.

A third detail worth knowing early: **JavaScript has one number type**. `1` and `1.5` are both doubles; there is no separate integer type. That is why `0.1 + 0.2` is not exactly `0.3`, and why very large whole numbers need `bigint`.

## Predict first

Open [`examples/m1-typeof.js`](file:examples/m1-typeof.js), write down all eight answers, then run it:

```bash
node examples/m1-typeof.js
```

Count how many of the eight you got right. The two you probably did not are exactly the ones the exercise is about.

## The exercise

Open [`src/m1/describe.js`](file:src/m1/describe.js). `typeName(value)` should answer with a readable name: `"null"` for `null`, `"array"` for arrays, and otherwise whatever `typeof` says. Right now it returns `typeof value` and nothing else, so the first test passes and the second does not.

Add the two checks `typeof` cannot make, in this order:

1. `value === null` - a strict comparison, because `null` is a value, not a type.
2. `Array.isArray(value)` - the standard way to ask, and the only reliable one.

Order matters: `Array.isArray(null)` is `false`, but a `typeof`-first branch would already have answered `"object"` and left the function.

## How you know it worked

```bash
node --test test/m1-02-types-typeof.test.js
```

Both tests green, and you can say why `typeof` needed help. Next, [what happens when types meet](step:m1-03-coercion-nan).
