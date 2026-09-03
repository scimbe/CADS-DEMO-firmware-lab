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

## How you know it worked

```bash
node --test test/m1-04-equality.test.js
```

Both tests green. The question task asks you to defend all three choices - that judgement, not the syntax, is what M1 was building towards. With values understood, [M2](step:m2-01-if-switch) turns to the decisions a program makes with them.
