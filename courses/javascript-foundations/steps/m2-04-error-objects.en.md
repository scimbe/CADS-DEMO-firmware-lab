---
id: m2-04-error-objects
title: Error objects and an error class of your own
bloom: apply
objectives: [js.errors.custom-class, javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m2-03-try-catch-finally]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m2-03-try-catch-finally, m1-02-types-typeof]
links:
  - { step: m2-03-try-catch-finally }
  - { step: m3-01-for-and-while }
  - { file: "src/m2/validation.js" }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes", title: "MDN: Using classes" }
sources: [src/m2/validation.js, test/m2-04-error-objects.test.js, src/m2/safe-parse.js]
tasks:
  - id: validation
    title: Both validation tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m2-04 ValidationError is an Error with name, message and field", "m2-04 validateUser throws ValidationError naming the bad field"], minPass: 2 }
  - id: worth-a-class
    title: Justify the class
    check: { type: question, prompt: { en: "What can a caller do with your error that a thrown string would not allow? Two sentences.", de: "Was kann ein Aufrufer mit deinem Fehler tun, was eine geworfene Zeichenkette nicht erlaubt? Zwei Sätze." }, rubric: "Names a reaction that depends on the type being recognisable, and a use of the extra field that reading the message could not replace. Does not pass: an answer that only says it is cleaner or more professional, or one that names only the message text as the gain.", bloom: evaluate, minChars: 50 }
socratic:
  - trigger: "task:validation:failed"
    question: { en: "Does the thrown value survive a type check, and does it carry the extra detail the test reads?", de: "Übersteht der geworfene Wert eine Typprüfung, und trägt er das zusätzliche Detail, das der Test liest?" }
    hints: [ { en: "Read the two assertions separately: one is about what the value is, the other about what it knows.", de: "Lies die beiden Assertions getrennt: eine handelt davon, was der Wert ist, die andere davon, was er weiß." }, { en: "A class only joins the built-in family if it says so in its header; check yours against the test's check.", de: "Eine Klasse gehört nur zur eingebauten Familie, wenn ihr Kopf das sagt; vergleich deinen mit der Prüfung des Tests." }, { en: "One statement in a derived constructor has to come before any assignment, and the error text says which.", de: "Eine Anweisung in einem abgeleiteten Konstruktor muss vor jeder Zuweisung stehen, und der Fehlertext sagt welche." } ]
  - trigger: "task:worth-a-class:failed"
    question: { en: "Would your answer still hold if the caller could only read the message text?", de: "Gilt deine Antwort noch, wenn der Aufrufer nur den Meldungstext lesen könnte?" }
    hints: [ { en: "Write the catch block a caller would need for each of the two designs and compare their length.", de: "Schreib den catch-Block, den ein Aufrufer für jeden der zwei Entwürfe bräuchte, und vergleich die Länge." }, { en: "One design lets a caller separate this failure from every other before looking at any text.", de: "Ein Entwurf lässt einen Aufrufer diesen Fehlschlag von allen anderen trennen, bevor er Text ansieht." }, { en: "The extra field exists for the program, not the reader, so ask what the program would otherwise have to parse.", de: "Das Zusatzfeld ist für das Programm, nicht für den Leser; frag, was das Programm sonst zerlegen müsste." } ]
misconceptions:
  - pattern: "Must call super constructor"
    question: { en: "A derived constructor has one rule about the order of its statements. Which one?", de: "Ein abgeleiteter Konstruktor hat eine Regel über die Reihenfolge seiner Anweisungen. Welche?" }
    hints: [ { en: "In a class that extends another, this does not exist until super(...) has run.", de: "In einer Klasse, die eine andere erweitert, existiert this erst, wenn super(...) gelaufen ist." }, { en: "super(message) passes the message up to Error, which sets .message and captures the stack.", de: "super(message) reicht die Meldung an Error weiter, das .message setzt und den Stack aufzeichnet." }, { en: "One call has to come before any assignment; everything the test reads is set after it.", de: "Ein Aufruf muss vor jeder Zuweisung stehen; alles, was der Test liest, wird danach gesetzt." } ]
  - pattern: "not a ValidationError|instanceof"
    question: { en: "The thrown value did not pass an instanceof check. Is it an Error subclass, or something simpler?", de: "Der geworfene Wert hat eine instanceof-Prüfung nicht bestanden. Ist es eine Error-Unterklasse oder etwas Einfacheres?" }
    hints: [ { en: "throw accepts any value, including a string - but then nothing about it is an Error.", de: "throw akzeptiert jeden Wert, auch eine Zeichenkette - dann ist daran aber nichts ein Error." }, { en: "instanceof follows the prototype chain, so extends Error is what puts Error on it.", de: "instanceof folgt der Prototypenkette; extends Error setzt Error überhaupt erst darauf." }, { en: "Throw an instance: throw new ValidationError(\"name must be a non-empty string\", \"name\");", de: "Wirf eine Instanz: throw new ValidationError(\"name must be a non-empty string\", \"name\");" } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Design the error your caller needs: an object that identifies itself, carries the detail that caused it, and can be told apart from every other failure.

## Why an Error, and not a string

`throw` accepts any value. `throw "invalid"` is legal JavaScript - and a bad idea. An `Error` object carries three things a bare string does not:

- **`message`** - the human-readable text every `catch` block expects at `error.message`.
- **`name`** - the class of failure, printed in front of the message.
- **`stack`** - where it happened, captured when the object is constructed.

MDN's [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) chapter shows the standard error types - `TypeError`, `RangeError`, `SyntaxError` and the rest. You have met three of them already in [M1](step:m1-01-let-const) and [M2](step:m2-03-try-catch-finally), and each time the *name* told you what kind of mistake it was before you read the message.

## Your own class

When your failure is not one of the built-in kinds, make a subclass. The syntax is on MDN's [Using classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes) page, reproduced under this course's `sources/`:

```js
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
```

Three rules are doing the work:

1. **`extends Error`** is what makes `err instanceof Error` true. Without it, callers that check for an `Error` will not recognise your object.
2. **`super(message)` comes first.** In a derived constructor, `this` does not exist until `super` has run; touching it earlier is a `>ReferenceError: Must call super constructor …`.
3. **`this.field`** is the point of the whole exercise. The message is for a human; `field` is for the program. A caller can highlight the right input box without parsing English.

Callers then choose their reaction by type:

```js
try {
  validateUser(input);
} catch (error) {
  if (error instanceof ValidationError) showFieldError(error.field, error.message);
  else throw error;                    // not ours - let it travel on
}
```

That last line matters: catching an error you cannot handle and swallowing it is how bugs disappear.

## The exercise

Open [`src/m2/validation.js`](file:src/m2/validation.js) and write both pieces:

1. `ValidationError`, exported, extending `Error`, with `name`, `message` and `field`.
2. `validateUser(user)`, which throws a `ValidationError` when `user.name` is not a non-empty string (field `"name"`) or `user.age` is not a number between 0 and 150 (field `"age"`), and returns the user unchanged otherwise.

Remember [M1](step:m1-03-coercion-nan) here: `typeof age === "number"` is true for `NaN` as well, so a range check alone is not enough.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m2-04-error-objects.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m2-04-error-objects.test.js
```

Both green. This is the first step where you wrote a type rather than fixed a line, and the question task asks you to defend it. Then on to [M3](step:m3-01-for-and-while) and loops.
