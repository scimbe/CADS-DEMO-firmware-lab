---
id: m0-04-modules
title: Module, Exporte und Importe
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
    title: Das Modul exportiert, was der Test importiert
    check: { type: testSuite, runner: node-test, expectPass: ["m0-04 named exports square and cube", "m0-04 default export is the meta object"], minPass: 2 }
  - id: named-vs-default
    title: Benannter Export oder Default-Export
    check: { type: question, prompt: { en: "This file has two named exports and one default export. What does the import side have to write differently for each kind, and why does a typo in a named import fail before any of your code runs?", de: "Diese Datei hat zwei benannte Exporte und einen Default-Export. Was muss die Import-Seite bei jeder Art anders schreiben, und warum scheitert ein Tippfehler bei einem benannten Import, bevor irgendein Code von dir läuft?" }, rubric: "Distinguishes named imports in braces (matching the exported name exactly) from a default import written without braces and freely nameable; explains that ES module bindings are resolved when the module graph is linked, before evaluation, so a missing named export is a SyntaxError at load time rather than an undefined value at call time.", bloom: understand, minChars: 60 }
socratic:
  - { trigger: "task:exports:failed", question: { en: "The error names one export the module does not provide. Is the function missing, or only the word export in front of it?", de: "Der Fehler nennt genau einen Export, den das Modul nicht liefert. Fehlt die Funktion, oder nur das Wort export davor?" }, hints: [ { en: "Both functions exist at the bottom of src/m0/math-utils.js; nothing carries the keyword export yet.", de: "Beide Funktionen stehen unten in src/m0/math-utils.js; noch trägt keine das Schlüsselwort export." }, { en: "You can write export in front of each declaration, or list them once: export { square, cube };", de: "Du kannst export vor jede Deklaration schreiben oder sie einmal auflisten: export { square, cube };" }, { en: "The object meta is the default export: export default meta;", de: "Das Objekt meta ist der Default-Export: export default meta;" } ] }
misconceptions:
  - pattern: "does not provide an export named"
    question: { en: "Node refused to link the two files before running a single line. Which name did it want, and does that name exist in the other file at all?", de: "Node hat die beiden Dateien nicht verbunden, bevor eine einzige Zeile lief. Welchen Namen wollte es, und gibt es diesen Namen in der anderen Datei überhaupt?" }
    hints: [ { en: "The message quotes the exact name in single quotes; search for it in src/m0/math-utils.js.", de: "Die Meldung zitiert den genauen Namen in einfachen Anführungszeichen; suche ihn in src/m0/math-utils.js." }, { en: "A function that is merely declared is private to its module until export is added.", de: "Eine nur deklarierte Funktion ist modulprivat, bis export hinzukommt." }, { en: "Named imports must match the exported name character for character; only the default import may be renamed freely.", de: "Benannte Importe müssen den exportierten Namen zeichengenau treffen; nur der Default-Import darf frei benannt werden." } ]
  - pattern: "does not provide an export named 'default'"
    question: { en: "Node read this file as an old-style script. What in package.json decides that?", de: "Node hat diese Datei als Skript alten Stils gelesen. Was in package.json entscheidet darüber?" }
    hints: [ { en: "package.json in this workspace sets \"type\": \"module\" - check that you are running from the workspace folder.", de: "Die package.json dieses Workspace setzt \"type\": \"module\" - prüfe, ob du aus dem Workspace-Ordner heraus startest." }, { en: "A file outside this folder without that setting would need the .mjs extension instead.", de: "Eine Datei außerhalb dieses Ordners ohne diese Einstellung bräuchte stattdessen die Endung .mjs." }, { en: "cd into javascript-foundations and run node --test from there.", de: "Wechsle mit cd nach javascript-foundations und starte node --test von dort." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Verteile Code auf Dateien, so wie dieser ganze Kurs es tut: exportiere, was andere Dateien brauchen, importiere es namentlich, und lies den Fehler, den Node dir gibt, wenn beide Seiten nicht zusammenpassen.

## Warum diese Datei ein Modul ist

In [`package.json`](file:package.json) steht eine Zeile, die entscheidet, wie hier jede `.js`-Datei gelesen wird:

```json
"type": "module"
```

Damit ist jede Datei dieses Workspace ein **ES-Modul**: sie hat ihren eigenen Gültigkeitsbereich, `import` und `export` funktionieren, und nichts läuft in einen gemeinsamen globalen Namensraum über. Deshalb kann `test/…` schreiben `import { summarize } from "../src/m0/summary.js"` und genau diese Funktion bekommen.

Zwei Details überraschen Einsteiger, beide sind so im Standard gewollt:

- **Die Dateiendung ist Pflicht.** `"../src/m0/summary.js"`, nicht `"../src/m0/summary"`.
- **Importe werden aufgelöst, bevor irgendetwas läuft.** Node verbindet zuerst den Modulgraphen und wertet erst danach aus. Ein Name, der importiert, aber nie exportiert wird, ist deshalb ein Fehler beim Laden und kein Wert, der sich später als `undefined` herausstellt.

## Der Fehlschlag, den du sehen sollst

Lass den Test dieses Steps laufen, bevor du etwas änderst:

```bash
node --test test/m0-04-modules.test.js
```

```
SyntaxError: The requested module '../src/m0/math-utils.js' does not provide an export named 'cube'
```

Kein einziger Test lief. Es gibt keinen Haken, kein Kreuz neben einem Testnamen, nur eine Weigerung zu laden. Das ist die Signatur eines Verbindungsproblems, und es lohnt sich, sie zu erkennen: wenn du einen `SyntaxError` über einen Export siehst, hör auf, nach Logikfehlern zu suchen.

## Die Aufgabe

Öffne [`src/m0/math-utils.js`](file:src/m0/math-utils.js). Die Datei deklariert `square`, `cube` und ein Objekt `meta` und exportiert nichts davon. Sieh dir an, was der Test verlangt:

```js
import meta, { square, cube } from "../src/m0/math-utils.js";
```

Diese eine Zeile verlangt zwei Dinge auf einmal.

- `{ square, cube }` sind **benannte Importe**. Die geschweiften Klammern bedeuten „genau diese Namen". Sie müssen den exportierten Namen zeichengenau treffen.
- `meta` vor der Klammer ist der **Default-Import**. Ein Modul hat höchstens einen Default-Export, und die importierende Seite darf ihn nennen, wie sie will - der Name `meta` ist hier eine Wahl, keine Vorgabe.

Ergänze die Exporte. Benannte Exporte kannst du vor jede Deklaration schreiben oder am Ende in einer Liste sammeln; beides ist gleichwertig:

```js
export function square(x) { … }        // oder, am Dateiende:
export { square, cube };
```

und markiere das Objekt als Default:

```js
export default meta;
```

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m0-04-modules.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m0-04-modules.test.js
```

Beide Tests grün. Jetzt die Frage-Aufgabe: sagen zu können, warum ein vertippter benannter Import scheitert, *bevor* dein Code läuft, unterscheidet für den Rest dieses Kurses einen Verbindungsfehler von einem Logikfehler. Danach geht es weiter mit dem [Vorhersagen von Ausgaben](step:m0-05-predict-output).
