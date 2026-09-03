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
    check: { type: question, prompt: { en: "A caller passes port 0, label \"\" and verbose false. The old code replaced all three with defaults. Explain the difference between asking 'is this value truthy' and asking 'was this value supplied', and name the operator that asks the second question.", de: "Ein Aufrufer übergibt port 0, label \"\" und verbose false. Der alte Code hat alle drei durch Standardwerte ersetzt. Erkläre den Unterschied zwischen der Frage 'ist dieser Wert truthy' und der Frage 'wurde dieser Wert übergeben', und nenne den Operator, der die zweite Frage stellt." }, rubric: "Lists the falsy values (false, 0, -0, 0n, \"\", null, undefined, NaN) and states that || replaces every one of them, whereas ?? replaces only null and undefined, so ?? (or an explicit undefined check) is the right tool for defaulting an option a caller may legitimately set to 0, \"\" or false.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:defaults:failed", question: { en: "Which of the three properties is still being replaced when the caller supplied it on purpose?", de: "Welche der drei Eigenschaften wird noch ersetzt, obwohl der Aufrufer sie absichtlich übergeben hat?" }, hints: [ { en: "0, the empty string and false are all falsy, so a truthiness test cannot see that they were supplied.", de: "0, die leere Zeichenkette und false sind alle falsy, eine Truthiness-Prüfung kann also nicht sehen, dass sie übergeben wurden." }, { en: "?? falls back only for null and undefined, which is exactly the question being asked here.", de: "?? greift nur bei null und undefined, und genau das ist hier die Frage." }, { en: "verbose has a second problem: value || true can never be false. Use ?? there too.", de: "verbose hat ein zweites Problem: value || true kann nie false sein. Nutze auch dort ??." } ] }
misconceptions:
  - pattern: "8080 !== 0|'untitled' !== ''|true !== false"
    question: { en: "A default replaced a value the caller actually passed. Which operator made that decision, and what does it consider empty?", de: "Ein Standardwert hat einen Wert ersetzt, den der Aufrufer wirklich übergeben hat. Welcher Operator hat das entschieden, und was hält er für leer?" }
    hints: [ { en: "|| and a ternary on truthiness both treat 0, \"\" and false as absent.", de: "|| und ein Ternär auf Truthiness behandeln 0, \"\" und false beide als nicht vorhanden." }, { en: "?? is the nullish coalescing operator: it falls back only for null and undefined.", de: "?? ist der Nullish-Coalescing-Operator: er greift nur bei null und undefined." }, { en: "options.port ?? 8080 keeps a port of 0 and still defaults a missing one.", de: "options.port ?? 8080 behält einen Port 0 und setzt einen fehlenden trotzdem." } ]
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

## How you know it worked

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Both green. In the question task, say what changed in the *question being asked*, not just which operator you typed. Next, [errors that are thrown on purpose](step:m2-03-try-catch-finally).
