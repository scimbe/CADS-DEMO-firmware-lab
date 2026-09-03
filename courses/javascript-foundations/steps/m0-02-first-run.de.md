---
id: m0-02-first-run
title: Dein erster Lauf
bloom: remember
objectives: [javascript-web-javascript-guide-introduction, js.tooling.node-test]
requires: [m0-01-using-the-ide]
estimatedMinutes: 10
scaffold: worked
recallFrom: [m0-01-using-the-ide]
links:
  - { step: m0-01-using-the-ide }
  - { step: m0-03-read-a-test }
  - { doc: "README.md" }
  - { file: "src/m0/hello.js", line: 6 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction", title: "MDN: Introduction" }
sources: [README.md, package.json, src/m0/hello.js, test/m0-02-first-run.test.js]
tasks:
  - id: greet
    title: Der erste Test ist grün
    check: { type: testSuite, runner: node-test, expectPass: ["m0-02 greet returns the greeting"], minPass: 1 }
  - id: what-i-see
    title: Sag, was du vor dir hast
    check: { type: question, prompt: { en: "Before you changed anything, the test for this step failed. In your own words: what did the failure message tell you, which single file did it point at, and how will you know the step is finished?", de: "Bevor du etwas geändert hast, ist der Test dieses Steps fehlgeschlagen. In deinen eigenen Worten: was hat dir die Fehlermeldung gesagt, auf welche einzelne Datei hat sie gezeigt, und woran wirst du merken, dass der Step fertig ist?" }, rubric: "Names the deliberate error thrown by greet ('TODO: return the greeting'), identifies src/m0/hello.js as the file to edit (the test file itself is not to be changed), and states the success criterion as the test turning green, i.e. node --test reporting pass for 'm0-02 greet returns the greeting'.", bloom: remember, minChars: 40 }
socratic:
  - { trigger: "task:greet:failed", question: { en: "Read the failure once more. Is it still the TODO error thrown on purpose, or is it now a comparison between two strings?", de: "Lies den Fehlschlag noch einmal. Ist es noch der absichtlich geworfene TODO-Fehler, oder inzwischen ein Vergleich zweier Zeichenketten?" }, hints: [ { en: "The throw statement in src/m0/hello.js has to go; a return statement takes its place.", de: "Die throw-Anweisung in src/m0/hello.js muss weg; an ihre Stelle kommt eine return-Anweisung." }, { en: "The test compares the exact string 'Hello, JavaScript!' - comma, space, exclamation mark included.", de: "Der Test vergleicht die exakte Zeichenkette 'Hello, JavaScript!' - Komma, Leerzeichen und Ausrufezeichen inklusive." }, { en: "Working line: return \"Hello, JavaScript!\";", de: "Fertige Zeile: return \"Hello, JavaScript!\";" } ] }
misconceptions:
  - pattern: "TODO: return the greeting"
    question: { en: "That is the error the exercise ships with. Which file is it thrown from, and what should stand there instead of throw?", de: "Das ist der Fehler, mit dem die Übung ausgeliefert wird. Aus welcher Datei wird er geworfen, und was sollte statt throw dort stehen?" }
    hints: [ { en: "The stack trace names the file and the line: src/m0/hello.js, inside greet.", de: "Der Stacktrace nennt Datei und Zeile: src/m0/hello.js, innerhalb von greet." }, { en: "A function that should hand back a value uses return, not throw.", de: "Eine Funktion, die einen Wert zurückgeben soll, benutzt return, nicht throw." }, { en: "Replace the whole throw line with return \"Hello, JavaScript!\";", de: "Ersetze die gesamte throw-Zeile durch return \"Hello, JavaScript!\";" } ]
  - pattern: "command not found"
    question: { en: "The shell could not find the program you typed. Was it node, or was it something else?", de: "Die Shell konnte das getippte Programm nicht finden. War es node, oder etwas anderes?" }
    hints: [ { en: "Type the command again slowly: node --version, all lower case, two dashes.", de: "Tippe den Befehl noch einmal langsam: node --version, alles klein, zwei Bindestriche." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." }, { en: "If node itself is missing, the lab image is not the one this course expects; say so in Ask the tutor.", de: "Fehlt node selbst, ist das Lab-Image nicht das von diesem Kurs erwartete; melde das über Frag den Tutor." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Führe JavaScript mit `node` aus, bring einen fehlschlagenden Test zum Bestehen und wisse genau, woran du erkennst, dass ein Step fertig ist.

## Was du vor dir hast

Der Editor zeigt einen Ordner, `javascript-foundations`. Darin liegen vier Dinge, und du brauchst alle vier in jedem Step dieses Kurses:

- `src/` - die **Übungen**. Nur hier änderst du Code.
- `test/` - die **Prüfungen**. Eine Datei je Step. Du liest sie; du änderst sie nicht.
- `examples/` - kurze Skripte zum Ausführen und Nachdenken.
- `README.md` - wie du alles startest.

Es gibt keinen Build-Schritt, kein `npm install`, kein Framework. JavaScript wird in diesem Kurs von einem einzigen Programm ausgeführt, `node`, und das ist bereits installiert. Die MDN-[Introduction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction) sagt es nüchtern: JavaScript ist eine Sprache mit kleiner Standardbibliothek, alles Weitere kommt von der Umgebung, die sie ausführt - einem Browser, oder hier eben Node.

## Was du zuerst tust

Öffne ein Terminal (**Terminal > New Terminal**) und frag Node, wer es ist:

```bash
node --version
```

Du solltest `v22.` oder höher sehen. Das ist die erste Prüfung dieses Steps.

Jetzt lässt du den Test dieses Steps laufen und liest, was zurückkommt:

```bash
node --test test/m0-02-first-run.test.js
```

Er schlägt fehl, mit Absicht:

```
✖ m0-02 greet returns the greeting
  Error: TODO: return the greeting
      at greet (file:///.../src/m0/hello.js:7:9)
```

Diese Meldung leistet drei Dinge auf einmal. Sie nennt den fehlgeschlagenen Test, sie nennt den Fehler, und der Stacktrace nennt **Datei und Zeile, aus der der Fehler kam**: `src/m0/hello.js`, innerhalb von `greet`. Jeder Fehlschlag in diesem Kurs nennt dir diese drei Dinge.

## Die Aufgabe

Öffne [`src/m0/hello.js`](file:src/m0/hello.js). Darin steht eine Funktion:

```js
export function greet() {
  throw new Error("TODO: return the greeting");
}
```

`throw` ist die Art, wie JavaScript sagt: „Das kann ich nicht." Die Übung wird mit dieser Zeile ausgeliefert, damit das Allererste, was du siehst, ein echter Fehler ist und keine leere Datei. Ersetze sie so, dass die Funktion stattdessen einen Wert zurückgibt:

```js
export function greet() {
  return "Hello, JavaScript!";
}
```

Die Zeichenkette muss exakt stimmen - der Test vergleicht Zeichen für Zeichen.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m0-02-first-run.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Lass denselben Befehl noch einmal laufen:

```bash
node --test test/m0-02-first-run.test.js
```

```
✔ m0-02 greet returns the greeting
ℹ pass 1
ℹ fail 0
```

Ein Haken und `fail 0`. Das ist die Ziellinie für jeden Step dieses Kurses: die Testdatei des Steps ist grün. Tests späterer Steps schlagen weiter fehl, bis du dort ankommst - das ist so gewollt und kein Fehler, den du verursacht hast.

Wenn beide Prüfungen oben abgehakt sind, beantworte die dritte Aufgabe in eigenen Worten und geh weiter zum [richtigen Lesen eines Tests](step:m0-03-read-a-test).
