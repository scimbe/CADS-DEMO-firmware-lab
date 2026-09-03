---
id: m1-01-let-const
title: let, const and the temporal dead zone
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
    title: Both counter tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m1-01 countWords counts the words of a sentence", "m1-01 makeLabel appends the suffix"], minPass: 2 }
  - id: two-errors
    title: Name the two different errors
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
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Choose between `let` and `const` for a reason, and tell the two ReferenceErrors of JavaScript apart: a name that does not exist, and a name that exists but may not be read yet.

## Three ways to declare, two you should use

MDN's [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) chapter lists three declaration keywords:

| Keyword | Scope | Re-assignable | Use it |
|---|---|---|---|
| `let` | the enclosing block | yes | when the value changes |
| `const` | the enclosing block | no | everywhere else - the default |
| `var` | the enclosing function | yes | not in this course |

`const` is about the **binding**, not the value. `const list = []` forbids `list = somethingElse`, but `list.push(1)` is fine: the name still points at the same array. That distinction returns in [M5](step:m5-03-arrays), where mutating a caller's array becomes a bug.

## The temporal dead zone

A `let` or `const` binding comes into existence at the top of its block, but it cannot be read until the line that declares it has run. In between, reading it is an error. MDN calls that window the **temporal dead zone**, and Node reports it like this:

```
ReferenceError: Cannot access 'x' before initialization
```

Note what that message is *not*:

```
ReferenceError: x is not defined
```

The first says "this name exists here, but you are too early". The second says "there is no such name". Two different problems, two different fixes: move the declaration up, versus declare it at all or fix the typo. Reading the message is enough to tell them apart - which is exactly the skill [M0](step:m0-03-read-a-test) started building.

## The exercise

Open [`src/m1/counter.js`](file:src/m1/counter.js). Two functions, two bugs, one of each kind:

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

Run the test and read **both** messages before you edit anything:

```bash
node --test test/m1-01-let-const.test.js
```

Then fix each one at its cause. `count` changes on every matching word, so it is not a constant. `suffix` is read one line before it is defined, so the declaration has to move - not the `const` keyword. Notice that `const word` inside the `for...of` head is perfectly correct: that binding is created fresh on each pass and never re-assigned.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m1-01-let-const.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

Both tests green. Then answer the question task in your own words. Naming the difference between the two ReferenceErrors is worth more here than the fix itself - you will meet the temporal dead zone again in [M4](step:m4-01-declare-and-call), where a whole module refuses to load because of it.
