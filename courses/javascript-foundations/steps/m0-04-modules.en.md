---
id: m0-04-modules
title: Modules, exports and imports
bloom: apply
objectives: [js.modules.esm]
requires: [m0-03-read-a-test]
estimatedMinutes: 12
scaffold: faded
links:
  - { step: m0-03-read-a-test }
  - { step: m0-05-predict-output }
  - { file: "src/m0/math-utils.js" }
  - { file: "package.json", line: 6 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules", title: "MDN: JavaScript modules" }
sources: [src/m0/math-utils.js, test/m0-04-modules.test.js, package.json]
tasks:
  - id: exports
    title: The module exports what the test imports
    check: { type: testSuite, runner: node-test, expectPass: ["m0-04 named exports square and cube", "m0-04 default export is the meta object"], minPass: 2 }
  - id: named-vs-default
    title: Named export or default export
    check: { type: question, prompt: { en: "Why does a mistyped named import fail before any of your code runs? Two sentences.", de: "Warum scheitert ein vertippter benannter Import, bevor dein Code läuft? Zwei Sätze." }, rubric: "States that an ES module's imports are resolved when the module graph is linked, before any module body is evaluated, so a name that is imported but never exported is a load-time SyntaxError. Contrasts that with a value that would only turn out to be undefined at call time. Does not pass: 'because it is a typo', or an answer that describes the fix without saying when the failure happens.", bloom: understand, minChars: 50 }
socratic:
  - trigger: "task:exports:failed"
    question: { en: "Is the function missing from the file, or only the keyword in front of it?", de: "Fehlt die Funktion in der Datei, oder nur das Schlüsselwort davor?" }
    hints: [ { en: "The message quotes one name in single quotes; search the other file for exactly that name.", de: "Die Meldung zitiert einen Namen in einfachen Anführungszeichen; such genau diesen Namen in der anderen Datei." }, { en: "Read the import line in the test: the names in braces and the name before them are asked for differently.", de: "Lies die import-Zeile im Test: die Namen in Klammern und der Name davor werden unterschiedlich verlangt." }, { en: "A declared function stays private to its module, and a module has at most one nameless export.", de: "Eine deklarierte Funktion bleibt modulprivat, und ein Modul hat höchstens einen namenlosen Export." } ]
  - trigger: "task:named-vs-default:failed"
    question: { en: "Did any test result appear at all, or did the run stop before the first test?", de: "Erschien überhaupt ein Testergebnis, oder stoppte der Lauf vor dem ersten Test?" }
    hints: [ { en: "Compare this failure with the ones from earlier steps: those named a test, this one named a module.", de: "Vergleich diesen Fehlschlag mit denen früherer Steps: die nannten einen Test, dieser ein Modul." }, { en: "Look at the error class in front of the message and ask which phase of a run produces that class.", de: "Sieh dir die Fehlerklasse vor der Meldung an und frag, welche Phase eines Laufs diese Klasse erzeugt." }, { en: "Work out from the output which of the two came first here, and what that ordering rules out.", de: "Leite aus der Ausgabe ab, was hier zuerst kam, und was diese Reihenfolge ausschließt." } ]
misconceptions:
  - pattern: "does not provide an export named"
    question: { en: "Node refused to link the two files before running a single line. Which name did it want, and does that name exist in the other file at all?", de: "Node hat die beiden Dateien nicht verbunden, bevor eine einzige Zeile lief. Welchen Namen wollte es, und gibt es diesen Namen in der anderen Datei überhaupt?" }
    hints: [ { en: "The message quotes the exact name in single quotes; search for it in src/m0/math-utils.js.", de: "Die Meldung zitiert den genauen Namen in einfachen Anführungszeichen; suche ihn in src/m0/math-utils.js." }, { en: "A function that is merely declared is private to its module until export is added.", de: "Eine nur deklarierte Funktion ist modulprivat, bis export hinzukommt." }, { en: "Named imports must match the exported name character for character; only the default import may be renamed freely.", de: "Benannte Importe müssen den exportierten Namen zeichengenau treffen; nur der Default-Import darf frei benannt werden." } ]
  - pattern: "does not provide an export named 'default'"
    question: { en: "Node read this file as an old-style script. What in package.json decides that?", de: "Node hat diese Datei als Skript alten Stils gelesen. Was in package.json entscheidet darüber?" }
    hints: [ { en: "package.json in this workspace sets \"type\": \"module\" - check that you are running from the workspace folder.", de: "Die package.json dieses Workspace setzt \"type\": \"module\" - prüfe, ob du aus dem Workspace-Ordner heraus startest." }, { en: "A file outside this folder without that setting would need the .mjs extension instead.", de: "Eine Datei außerhalb dieses Ordners ohne diese Einstellung bräuchte stattdessen die Endung .mjs." }, { en: "cd into javascript-foundations and run node --test from there.", de: "Wechsle mit cd nach javascript-foundations und starte node --test von dort." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "A relative path here always ends in the file suffix; leaving it off fails identically.", de: "Ein relativer Pfad endet hier immer auf die Dateiendung; sie weglassen scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Split code across files the way this whole course does: export what other files need, import it by name, and read the error Node gives you when the two sides disagree.

## Why this file is a module

[`package.json`](file:package.json) contains one line that decides how every `.js` file here is read:

```json
"type": "module"
```

With it, every file in this workspace is an **ES module**: it has its own scope, `import` and `export` work, and nothing leaks into a shared global namespace. That is why `test/…` can say `import { summarize } from "../src/m0/summary.js"` and get exactly that function.

Two details that surprise newcomers, both of them deliberate in the standard:

- **The file extension is required.** `"../src/m0/summary.js"`, not `"../src/m0/summary"`.
- **Imports are resolved before anything runs.** Node links the module graph first and evaluates afterwards. A name that is imported but never exported is therefore a load-time failure, not a value that turns out to be `undefined` later.

## The failure you get to see

Run this step's test before changing anything:

```bash
node --test test/m0-04-modules.test.js
```

```
SyntaxError: The requested module '../src/m0/math-utils.js' does not provide an export named 'cube'
```

No test ran at all. There is no tick, no cross next to a test name, just a refusal to load. That is the signature of a linking problem, and it is worth recognising: when you see a `SyntaxError` about an export, stop looking for logic bugs.

## The exercise

Open [`src/m0/math-utils.js`](file:src/m0/math-utils.js). It declares `square`, `cube` and an object `meta`, and exports none of them. Look at what the test asks for:

```js
import meta, { square, cube } from "../src/m0/math-utils.js";
```

That single line asks for two things at once.

- `{ square, cube }` are **named imports**. The braces mean "these exact names". They must match the exported names character for character.
- `meta` before the brace is the **default import**. A module has at most one default export, and the importing side may call it whatever it likes - the name `meta` here is a choice, not a requirement.

Add the exports. Named exports can be written in front of each declaration or collected in one list at the end; both are equivalent:

```js
export function square(x) { … }        // or, at the end of the file:
export { square, cube };
```

and mark the object as the default:

```js
export default meta;
```

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m0-04-modules.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m0-04-modules.test.js
```

Both tests green. Now the question task: being able to say why a mistyped named import fails *before* your code runs is what separates a linking error from a logic error for the rest of this course. Then go on to [predicting output](step:m0-05-predict-output).
