---
id: m1-01-let-const
title: let, const und die Temporal Dead Zone
bloom: understand
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m0-05-predict-output]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m0-03-read-a-test, m0-04-modules]
links:
  - { step: m0-05-predict-output }
  - { step: m1-02-types-typeof }
  - { file: "src/m1/counter.js", line: 6 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types", title: "MDN: Grammar and types" }
sources: [src/m1/counter.js, test/m1-01-let-const.test.js]
tasks:
  - id: two-bugs
    title: Beide counter-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m1-01 countWords counts the words of a sentence", "m1-01 makeLabel appends the suffix"], minPass: 2 }
  - id: two-errors
    title: Benenne die beiden verschiedenen Fehler
    check: { type: question, prompt: { en: "Before you fixed anything this file produced two different errors: a TypeError about assignment to a constant variable, and a ReferenceError about accessing something before initialisation. Explain what each one means and why the second is NOT the same as using a name that was never declared.", de: "Vor deiner Korrektur erzeugte diese Datei zwei verschiedene Fehler: einen TypeError über die Zuweisung an eine Konstante und einen ReferenceError über den Zugriff vor der Initialisierung. Erkläre, was jeder von beiden bedeutet und warum der zweite NICHT dasselbe ist wie die Benutzung eines nie deklarierten Namens." }, rubric: "Explains that const forbids rebinding (the binding, not the contents of an object it points at), so count = count + 1 is a TypeError; and that a let/const binding exists from the top of its block but cannot be read until its declaration is evaluated - the temporal dead zone - which is why the message says 'Cannot access before initialization' rather than 'is not defined'. Names the contrast: an undeclared name gives ReferenceError: x is not defined.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:two-bugs:failed", question: { en: "Which of the two functions is still failing, and does its error mention a constant or an initialisation?", de: "Welche der beiden Funktionen schlägt noch fehl, und nennt ihr Fehler eine Konstante oder eine Initialisierung?" }, hints: [ { en: "countWords increments a binding declared with const; a counter has to be able to change.", de: "countWords zählt eine mit const deklarierte Bindung hoch; ein Zähler muss sich ändern dürfen." }, { en: "makeLabel reads suffix on the line above the one that defines it. Order matters for const and let.", de: "makeLabel liest suffix eine Zeile über der, die es definiert. Bei const und let zählt die Reihenfolge." }, { en: "Change const count to let count, and move the suffix declaration above the line that uses it.", de: "Ändere const count zu let count und verschiebe die suffix-Deklaration über die Zeile, die sie benutzt." } ] }
misconceptions:
  - pattern: "Assignment to constant variable"
    question: { en: "const means the binding may not be re-assigned. Does this variable need a new value, or a changed object?", de: "const heißt, dass die Bindung nicht neu zugewiesen werden darf. Braucht diese Variable einen neuen Wert oder ein verändertes Objekt?" }
    hints: [ { en: "A loop counter gets a new value on every pass, so it cannot be const.", de: "Ein Schleifenzähler bekommt in jedem Durchlauf einen neuen Wert, kann also nicht const sein." }, { en: "const on an object still allows changing its properties; only rebinding the name is refused.", de: "const auf einem Objekt erlaubt weiterhin das Ändern seiner Eigenschaften; nur das Neubinden des Namens wird verweigert." }, { en: "Use let for anything you assign to more than once, const for everything else.", de: "Nimm let für alles, dem du mehr als einmal zuweist, const für alles andere." } ]
  - pattern: "Cannot access .* before initialization"
    question: { en: "The name exists - Node knows about it - but it may not be read yet. Which line declares it, and which line reads it?", de: "Der Name existiert - Node kennt ihn -, darf aber noch nicht gelesen werden. Welche Zeile deklariert ihn, welche liest ihn?" }
    hints: [ { en: "let and const bindings exist from the start of their block but stay unreadable until their declaration runs.", de: "let- und const-Bindungen existieren ab Blockbeginn, bleiben aber unlesbar, bis ihre Deklaration ausgeführt wird." }, { en: "That gap is called the temporal dead zone; it is why the message is not 'is not defined'.", de: "Diese Lücke heißt Temporal Dead Zone; deshalb lautet die Meldung nicht 'is not defined'." }, { en: "Move the declaration above its first use, or compute the value where it is declared.", de: "Verschiebe die Deklaration über ihre erste Benutzung, oder berechne den Wert dort, wo er deklariert wird." } ]
  - pattern: "is not defined"
    question: { en: "This is the other ReferenceError: the name was never declared anywhere in scope. Is it a typo, or a missing declaration?", de: "Das ist der andere ReferenceError: der Name wurde nirgends im Gültigkeitsbereich deklariert. Tippfehler oder fehlende Deklaration?" }
    hints: [ { en: "Compare the spelling in the failing line with the spelling in the declaration.", de: "Vergleiche die Schreibweise in der fehlschlagenden Zeile mit der in der Deklaration." }, { en: "A name declared inside a block is not visible outside it.", de: "Ein in einem Block deklarierter Name ist außerhalb nicht sichtbar." }, { en: "MDN's Grammar and types chapter calls an undeclared name in a module a ReferenceError, not a silent global.", de: "MDNs Kapitel Grammar and types nennt einen nicht deklarierten Namen im Modul einen ReferenceError, keine stille globale Variable." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Wähle begründet zwischen `let` und `const` und unterscheide die zwei ReferenceErrors von JavaScript: ein Name, den es nicht gibt, und ein Name, den es gibt, der aber noch nicht gelesen werden darf.

## Drei Arten zu deklarieren, zwei davon solltest du benutzen

MDNs Kapitel [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) nennt drei Deklarations-Schlüsselwörter:

| Schlüsselwort | Gültigkeitsbereich | Neu zuweisbar | Wann |
|---|---|---|---|
| `let` | umschließender Block | ja | wenn sich der Wert ändert |
| `const` | umschließender Block | nein | überall sonst - der Standardfall |
| `var` | umschließende Funktion | ja | in diesem Kurs nicht |

`const` betrifft die **Bindung**, nicht den Wert. `const list = []` verbietet `list = etwasAnderes`, aber `list.push(1)` ist erlaubt: der Name zeigt weiterhin auf dasselbe Array. Diese Unterscheidung kommt in [M5](step:m5-03-arrays) zurück, wo das Verändern des Arrays eines Aufrufers zum Fehler wird.

## Die Temporal Dead Zone

Eine `let`- oder `const`-Bindung entsteht am Anfang ihres Blocks, darf aber erst gelesen werden, wenn die deklarierende Zeile gelaufen ist. Dazwischen ist das Lesen ein Fehler. MDN nennt dieses Fenster die **Temporal Dead Zone**, und Node meldet es so:

```
ReferenceError: Cannot access 'x' before initialization
```

Achte darauf, was diese Meldung *nicht* ist:

```
ReferenceError: x is not defined
```

Die erste sagt: „Diesen Namen gibt es hier, aber du bist zu früh." Die zweite sagt: „Diesen Namen gibt es nicht." Zwei verschiedene Probleme, zwei verschiedene Lösungen: Deklaration nach oben verschieben, gegenüber überhaupt deklarieren oder den Tippfehler beheben. Die Meldung zu lesen reicht, um sie zu unterscheiden - genau die Fähigkeit, die [M0](step:m0-03-read-a-test) aufgebaut hat.

## Die Aufgabe

Öffne [`src/m1/counter.js`](file:src/m1/counter.js). Zwei Funktionen, zwei Fehler, je einer pro Sorte:

```js
export function countWords(text) {
  const count = 0;
  for (const word of text.split(" ")) {
    if (word !== "") {
      count = count + 1;      // TypeError: Assignment to constant variable.
    }
  }
  return count;
}

export function makeLabel(prefix) {
  const label = prefix + suffix;   // ReferenceError: Cannot access 'suffix' before initialization
  const suffix = "!";
  return label;
}
```

Lass den Test laufen und lies **beide** Meldungen, bevor du etwas änderst:

```bash
node --test test/m1-01-let-const.test.js
```

Behebe dann jeden Fehler an seiner Ursache. `count` ändert sich bei jedem passenden Wort, ist also keine Konstante. `suffix` wird eine Zeile vor seiner Definition gelesen, also muss die Deklaration umziehen - nicht das Schlüsselwort `const`. Beachte, dass `const word` im Kopf der `for...of`-Schleife völlig korrekt ist: diese Bindung wird in jedem Durchlauf neu erzeugt und nie neu zugewiesen.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m1-01-let-const.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Beide Tests grün. Beantworte danach die Frage-Aufgabe in eigenen Worten. Den Unterschied zwischen den beiden ReferenceErrors zu benennen ist hier mehr wert als die Korrektur selbst - die Temporal Dead Zone begegnet dir in [M4](step:m4-01-declare-and-call) wieder, wo ein ganzes Modul deswegen nicht geladen wird.
