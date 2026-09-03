---
id: m1-03-coercion-nan
title: Coercion, + and the value that equals nothing
bloom: analyze
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-02-types-typeof]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m1-02-types-typeof, m0-03-read-a-test]
links:
  - { step: m1-02-types-typeof }
  - { step: m1-04-equality }
  - { file: "src/m1/numbers.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types", title: "MDN: Grammar and types" }
sources: [src/m1/numbers.js, test/m1-03-coercion-nan.test.js]
tasks:
  - id: numbers
    title: Both number tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m1-03 sumStrings adds numeric strings as numbers", "m1-03 isValidNumber rejects text that converts to NaN"], minPass: 2 }
  - id: why-silent
    title: Why neither bug threw an error
    check: { type: question, prompt: { en: "Both functions were wrong and neither threw. Explain what + did to the strings in sumStrings, and why the comparison n === NaN in isValidNumber can never be true - not even when n really is NaN.", de: "Beide Funktionen waren falsch und keine hat geworfen. Erkläre, was + mit den Zeichenketten in sumStrings gemacht hat, und warum der Vergleich n === NaN in isValidNumber niemals wahr sein kann - auch dann nicht, wenn n wirklich NaN ist." }, rubric: "States that + concatenates as soon as one operand is a string, so 0 + '1' is the string '01' and the result is a string, not a sum; and that NaN is the only value not equal to itself, so any comparison with NaN, including NaN === NaN, is false - which is why Number.isNaN or Number.isFinite is required.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:numbers:failed", question: { en: "Look at the actual value the test printed. Is it a wrong number, or is it not a number at all?", de: "Sieh dir den tatsächlichen Wert an, den der Test ausgegeben hat. Ist es eine falsche Zahl, oder gar keine Zahl?" }, hints: [ { en: "'012' with quotes around it is a string; the loop concatenated instead of adding.", de: "'012' in Anführungszeichen ist eine Zeichenkette; die Schleife hat aneinandergehängt statt addiert." }, { en: "Convert each item before adding it: Number(item), or the unary plus.", de: "Wandle jedes Element vor der Addition um: Number(item), oder das unäre Plus." }, { en: "For the second function, ask Number.isNaN(n) or Number.isFinite(n) instead of comparing with NaN.", de: "Frag bei der zweiten Funktion Number.isNaN(n) oder Number.isFinite(n), statt mit NaN zu vergleichen." } ] }
misconceptions:
  - pattern: "NaN"
    question: { en: "NaN appeared. Which operation produced it, and does the code compare against NaN with an equality operator anywhere?", de: "NaN ist aufgetaucht. Welche Operation hat es erzeugt, und vergleicht der Code irgendwo mit einem Gleichheitsoperator gegen NaN?" }
    hints: [ { en: "NaN comes from an arithmetic operation on something that is not a number, for example Number('abc').", de: "NaN entsteht aus einer Rechenoperation auf etwas, das keine Zahl ist, zum Beispiel Number('abc')." }, { en: "NaN is the only JavaScript value that is not equal to itself, so === against it is always false.", de: "NaN ist der einzige JavaScript-Wert, der sich selbst ungleich ist, also ist === dagegen immer falsch." }, { en: "Use Number.isNaN(x) to detect it, or Number.isFinite(x) to accept only real numbers.", de: "Nutze Number.isNaN(x), um es zu erkennen, oder Number.isFinite(x), um nur echte Zahlen zu akzeptieren." } ]
  - pattern: "'[0-9]+' !== [0-9]+"
    question: { en: "The two sides differ only by quotation marks. What turned your number into a string?", de: "Die beiden Seiten unterscheiden sich nur durch Anführungszeichen. Was hat deine Zahl in eine Zeichenkette verwandelt?" }
    hints: [ { en: "In JavaScript + means addition only when both operands are numbers; otherwise it joins strings.", de: "In JavaScript bedeutet + nur dann Addition, wenn beide Operanden Zahlen sind; sonst hängt es Zeichenketten aneinander." }, { en: "Once one side is a string the whole expression becomes a string, and it stays one for the rest of the loop.", de: "Sobald eine Seite eine Zeichenkette ist, wird der ganze Ausdruck eine Zeichenkette - und bleibt es für den Rest der Schleife." }, { en: "Convert explicitly with Number(...) before you add.", de: "Wandle vor dem Addieren ausdrücklich mit Number(...) um." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Learning goal

Predict what `+` does to mixed types, recognise `NaN` when a program does not crash but quietly produces nonsense, and test for it correctly.

## `+` is two operators

Every other arithmetic operator converts its operands to numbers. `+` does not: if **either** side is a string, `+` joins strings instead.

```js
"1" + 2      // "12"   - concatenation
"1" - 2      // -1     - subtraction, so "1" was converted
0 + "1"      // "01"   - and now the result is a string
```

This is why a loop that starts with `let total = 0` and adds string items produces `"0123"` and not `6`. Nothing throws. The function returns a value of the wrong type, and the failure surfaces somewhere else - possibly much later. MDN's [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) chapter states the conversion rules; the practical rule is shorter: **convert explicitly before you compute**, with `Number(x)` or `parseFloat(x)`.

`Number("")` is `0` and `Number(" ")` is `0` as well, which surprises people converting user input. `parseInt("12px")` is `12`, while `Number("12px")` is `NaN`. Pick the one whose behaviour you actually want.

## NaN is not a number, and not equal to itself

`NaN` means "not a number", and it is what you get from an arithmetic operation that has no meaningful numeric answer: `Number("abc")`, `0 / 0`, `Math.sqrt(-1)`.

Its defining property is the one that catches everybody:

```js
NaN === NaN     // false
NaN == NaN      // false
```

`NaN` is the only value in JavaScript that is not equal to itself. Any comparison against it is `false`, so a check written as `if (n === NaN)` never fires, no matter what `n` is. The working tests are:

- `Number.isNaN(n)` - true exactly for `NaN`
- `Number.isFinite(n)` - true for real numbers, false for `NaN` and both infinities

Prefer the `Number.` versions. The bare global `isNaN` converts its argument first, so `isNaN("abc")` is `true` even though `"abc"` is a string, not `NaN`.

## The exercise

Open [`src/m1/numbers.js`](file:src/m1/numbers.js). Two functions, both wrong, neither throwing:

- `sumStrings(["1", "2", "3"])` must return the number `6`. It currently returns the string `"0123"`. Convert each item before adding it.
- `isValidNumber("abc")` must return `false`. It compares `n === NaN`, which is never true, so it answers `true` for everything. Ask the right question instead.

Run the test first and look at the **actual** values it prints. Quotation marks around a result are the tell: a string got where a number belonged.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m1-03-coercion-nan.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m1-03-coercion-nan.test.js
```

Both green. Then explain, in the question task, why neither bug produced an error. That is the whole point of this step: some bugs shout, and these two whisper. [Equality](step:m1-04-equality) is next, and it is the same story one level up.
