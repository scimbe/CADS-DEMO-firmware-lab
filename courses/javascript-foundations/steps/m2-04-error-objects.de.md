---
id: m2-04-error-objects
title: Fehlerobjekte und eine eigene Fehlerklasse
bloom: create
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
    title: Beide Validierungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m2-04 ValidationError is an Error with name, message and field", "m2-04 validateUser throws ValidationError naming the bad field"], minPass: 2 }
  - id: worth-a-class
    title: Begründe die Klasse
    check: { type: question, prompt: { en: "You could have written throw new Error(\"name is invalid\"). What does a caller gain from ValidationError with a field property instead, and what would they lose if you had thrown a plain string?", de: "Du hättest throw new Error(\"name is invalid\") schreiben können. Was gewinnt ein Aufrufer stattdessen durch ValidationError mit einer field-Eigenschaft, und was ginge verloren, wenn du eine reine Zeichenkette geworfen hättest?" }, rubric: "Argues that a subclass lets a caller distinguish this failure from every other with instanceof and react selectively; that the field property carries machine-readable detail no message-parsing can safely recover; and that throwing a non-Error loses the stack trace and the name, and breaks every catch block that expects error.message.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:validation:failed", question: { en: "Does the error you throw survive instanceof Error, and does it carry the field the test asks for?", de: "Übersteht der geworfene Fehler ein instanceof Error, und trägt er das Feld, nach dem der Test fragt?" }, hints: [ { en: "class ValidationError extends Error - the extends clause is what makes instanceof work.", de: "class ValidationError extends Error - die extends-Klausel lässt instanceof funktionieren." }, { en: "Call super(message) first; only then may the constructor assign this.name and this.field.", de: "Rufe zuerst super(message) auf; erst danach darf der Konstruktor this.name und this.field setzen." }, { en: "validateUser must reject a name that is not a non-empty string and an age outside 0..150, naming the field in each case.", de: "validateUser muss einen Namen ablehnen, der keine nicht-leere Zeichenkette ist, und ein Alter außerhalb 0..150, und dabei jeweils das Feld nennen." } ] }
misconceptions:
  - pattern: "Must call super constructor"
    question: { en: "A derived constructor has one rule about the order of its statements. Which one?", de: "Ein abgeleiteter Konstruktor hat eine Regel über die Reihenfolge seiner Anweisungen. Welche?" }
    hints: [ { en: "In a class that extends another, this does not exist until super(...) has run.", de: "In einer Klasse, die eine andere erweitert, existiert this erst, wenn super(...) gelaufen ist." }, { en: "super(message) passes the message up to Error, which sets .message and captures the stack.", de: "super(message) reicht die Meldung an Error weiter, das .message setzt und den Stack aufzeichnet." }, { en: "Order: super(message); then this.name = \"ValidationError\"; then this.field = field;", de: "Reihenfolge: super(message); dann this.name = \"ValidationError\"; dann this.field = field;" } ]
  - pattern: "not a ValidationError|instanceof"
    question: { en: "The thrown value did not pass an instanceof check. Is it an Error subclass, or something simpler?", de: "Der geworfene Wert hat eine instanceof-Prüfung nicht bestanden. Ist es eine Error-Unterklasse oder etwas Einfacheres?" }
    hints: [ { en: "throw accepts any value, including a string - but then nothing about it is an Error.", de: "throw akzeptiert jeden Wert, auch eine Zeichenkette - dann ist daran aber nichts ein Error." }, { en: "instanceof follows the prototype chain, so extends Error is what puts Error on it.", de: "instanceof folgt der Prototypenkette; extends Error setzt Error überhaupt erst darauf." }, { en: "Throw an instance: throw new ValidationError(\"name must be a non-empty string\", \"name\");", de: "Wirf eine Instanz: throw new ValidationError(\"name must be a non-empty string\", \"name\");" } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Entwirf den Fehler, den dein Aufrufer braucht: ein Objekt, das sich selbst benennt, das auslösende Detail mitführt und sich von jedem anderen Fehlschlag unterscheiden lässt.

## Warum ein Error und keine Zeichenkette

`throw` akzeptiert jeden Wert. `throw "invalid"` ist gültiges JavaScript - und eine schlechte Idee. Ein `Error`-Objekt trägt drei Dinge, die eine nackte Zeichenkette nicht hat:

- **`message`** - der lesbare Text, den jeder `catch`-Block unter `error.message` erwartet.
- **`name`** - die Fehlerklasse, die vor der Meldung ausgegeben wird.
- **`stack`** - wo es passiert ist, aufgezeichnet beim Erzeugen des Objekts.

MDNs Kapitel [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) zeigt die Standard-Fehlertypen - `TypeError`, `RangeError`, `SyntaxError` und die übrigen. Drei davon sind dir in [M1](step:m1-01-let-const) und [M2](step:m2-03-try-catch-finally) schon begegnet, und jedes Mal hat dir der *Name* die Art des Fehlers gesagt, bevor du die Meldung gelesen hast.

## Deine eigene Klasse

Wenn dein Fehlschlag keiner der eingebauten Arten entspricht, bau eine Unterklasse. Die Syntax steht auf MDNs Seite [Using classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes), die unter `sources/` dieses Kurses mitgeliefert wird:

```js
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
```

Drei Regeln leisten die Arbeit:

1. **`extends Error`** macht `err instanceof Error` wahr. Ohne das erkennen Aufrufer, die auf einen `Error` prüfen, dein Objekt nicht.
2. **`super(message)` kommt zuerst.** In einem abgeleiteten Konstruktor existiert `this` erst, wenn `super` gelaufen ist; ein früherer Zugriff ergibt `ReferenceError: Must call super constructor …`.
3. **`this.field`** ist der eigentliche Zweck der Übung. Die Meldung ist für Menschen; `field` ist für das Programm. Ein Aufrufer kann damit das richtige Eingabefeld markieren, ohne englischen Text zu zerlegen.

Aufrufer wählen ihre Reaktion dann nach dem Typ:

```js
try {
  validateUser(input);
} catch (error) {
  if (error instanceof ValidationError) showFieldError(error.field, error.message);
  else throw error;                    // nicht unserer - weiterreisen lassen
}
```

Die letzte Zeile ist wichtig: einen Fehler zu fangen, den man nicht behandeln kann, und ihn zu verschlucken, ist der Weg, auf dem Bugs verschwinden.

## Die Aufgabe

Öffne [`src/m2/validation.js`](file:src/m2/validation.js) und schreib beide Teile:

1. `ValidationError`, exportiert, `Error` erweiternd, mit `name`, `message` und `field`.
2. `validateUser(user)`, das einen `ValidationError` wirft, wenn `user.name` keine nicht-leere Zeichenkette ist (Feld `"name"`) oder `user.age` keine Zahl zwischen 0 und 150 ist (Feld `"age"`), und das den Benutzer sonst unverändert zurückgibt.

Denk hier an [M1](step:m1-03-coercion-nan): `typeof age === "number"` ist auch für `NaN` wahr, eine Bereichsprüfung allein reicht also nicht.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m2-04-error-objects.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-04-error-objects.test.js
```

Beide grün. Das ist der erste Step, in dem du einen Typ geschrieben und nicht eine Zeile repariert hast, und die Frage-Aufgabe verlangt, ihn zu begründen. Danach geht es zu [M3](step:m3-01-for-and-while) und den Schleifen.
