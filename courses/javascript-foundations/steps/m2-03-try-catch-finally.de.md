---
id: m2-03-try-catch-finally
title: try, catch, finally und wer den Fehler bekommt
bloom: apply
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m2-02-truthy-falsy]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-02-truthy-falsy, m1-01-let-const]
links:
  - { step: m2-02-truthy-falsy }
  - { step: m2-04-error-objects }
  - { file: "src/m2/safe-parse.js", line: 8 }
  - { file: "examples/m2-finally-order.js" }
sources: [src/m2/safe-parse.js, test/m2-03-try-catch-finally.test.js, examples/m2-finally-order.js]
tasks:
  - id: guess-finally
    title: Sag vorher, was das finally-Beispiel zurückgibt
    check: { type: predict, prompt: { en: "Read examples/m2-finally-order.js. Write down the numbers it prints, in order, and the value it returns.", de: "Lies examples/m2-finally-order.js. Schreib die ausgegebenen Zahlen in Reihenfolge auf und den Rückgabewert." }, then: { type: command, command: "node examples/m2-finally-order.js", expectExitCode: 0, expectStdout: "false" }, rubric: "Sets the predicted order and final value against the printed ones, and names which block had the last word. Does not pass: an answer that reports the output without saying which block decided the value.", bloom: evaluate }
  - id: safe-parse
    title: Beide Fehlerbehandlungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m2-03 safeParse returns the parsed value or the fallback", "m2-03 withCleanup always runs the cleanup, even when work throws"], minPass: 2 }
  - id: catch-or-travel
    title: Fangen oder weiterreisen lassen
    check: { type: question, prompt: { en: "One function catches, the other does not. Give the rule you would use, in one sentence.", de: "Eine Funktion fängt, die andere nicht. Nenne die Regel, nach der du entscheidest, in einem Satz." }, rubric: "A rule that turns on whether the function can still produce a meaningful result despite the failure. Does not pass: a rule based on how likely the error is, or on which version looks tidier, and any rule that would have both functions catch.", bloom: analyze, minChars: 40 }
socratic:
  - trigger: "task:guess-finally:failed"
    question: { en: "What did you predict the function returns, and what did it return?", de: "Was hast du als Rückgabewert vorhergesagt, und was kam zurück?" }
    hints: [ { en: "Three numbers are printed before the result; note the order you expect them in.", de: "Vor dem Ergebnis werden drei Zahlen ausgegeben; notiere die von dir erwartete Reihenfolge." }, { en: "Two blocks in that function both try to return. Work out which one runs last.", de: "Zwei Blöcke dieser Funktion wollen beide zurückgeben. Finde heraus, welcher zuletzt läuft." }, { en: "The block that runs on every way out also gets the last word on the value.", de: "Der Block, der auf jedem Weg hinaus läuft, hat auch das letzte Wort über den Wert." } ]
  - trigger: "task:safe-parse:failed"
    question: { en: "Is the failure in the function that must swallow the error, or the one that must let it through?", de: "Liegt der Fehlschlag in der Funktion, die den Fehler schlucken muss, oder der, die ihn durchlassen muss?" }
    hints: [ { en: "Read each test name: one asks for a fallback, the other for a log entry plus an error that still arrives.", de: "Lies die Testnamen: einer verlangt einen Ersatzwert, der andere einen Logeintrag plus einen ankommenden Fehler." }, { en: "For the second, check which lines still run when the call throws, and which are skipped.", de: "Prüf bei der zweiten, welche Zeilen bei einem Wurf noch laufen und welche übersprungen werden." }, { en: "Only one of the two blocks stops an error travelling; the other runs and lets it pass.", de: "Nur einer der beiden Blöcke hält einen Fehler auf; der andere läuft und lässt ihn weiter." } ]
  - trigger: "task:catch-or-travel:failed"
    question: { en: "Does your rule decide differently for the two functions, or would it treat them the same?", de: "Entscheidet deine Regel für die beiden Funktionen verschieden, oder behandelt sie sie gleich?" }
    hints: [ { en: "Ask of each function whether it can answer its caller sensibly once the failure has happened.", de: "Frag bei jeder Funktion, ob sie ihrem Aufrufer nach dem Fehlschlag noch sinnvoll antworten kann." }, { en: "One of them has a second value it can offer; the other has nothing to put in place of the result.", de: "Eine hat einen zweiten Wert anzubieten; die andere hat nichts, was sie an die Stelle des Ergebnisses setzen könnte." }, { en: "A rule about frequency or tidiness gives the same verdict for both, which is how you know it is the wrong rule.", de: "Eine Regel über Häufigkeit oder Ordentlichkeit urteilt für beide gleich, und genau daran erkennst du die falsche Regel." } ]
misconceptions:
  - pattern: "Unexpected token|Unexpected end of JSON input|is not valid JSON"
    question: { en: "JSON.parse threw and the error left your function. Was the call inside a try block?", de: "JSON.parse hat geworfen und der Fehler hat deine Funktion verlassen. Stand der Aufruf in einem try-Block?" }
    hints: [ { en: "JSON.parse throws a SyntaxError for anything that is not valid JSON, including an empty string.", de: "JSON.parse wirft einen SyntaxError für alles, was kein gültiges JSON ist, auch für eine leere Zeichenkette." }, { en: "Only statements inside the try block are protected; a call before it is not.", de: "Geschützt sind nur Anweisungen innerhalb des try-Blocks; ein Aufruf davor nicht." }, { en: "return the fallback from the catch block, not after the try.", de: "Gib den Ersatzwert aus dem catch-Block zurück, nicht nach dem try." } ]
  - pattern: "cleanup"
    question: { en: "The cleanup entry is missing or in the wrong place. Which block runs whether or not an error happened?", de: "Der cleanup-Eintrag fehlt oder steht an der falschen Stelle. Welcher Block läuft, egal ob ein Fehler auftrat?" }
    hints: [ { en: "A line after the call is skipped when the call throws.", de: "Eine Zeile nach dem Aufruf wird übersprungen, wenn der Aufruf wirft." }, { en: "finally runs on the way out no matter how the block is left - normally, by return, or by an error.", de: "finally läuft beim Verlassen des Blocks in jedem Fall - normal, per return oder durch einen Fehler." }, { en: "Never put a return inside finally: it replaces whatever the function was about to return.", de: "Setz nie ein return in ein finally: es ersetzt das, was die Funktion gerade zurückgeben wollte." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Entscheide bewusst, ob ein Fehler bei deiner Funktion stehen bleibt oder weiterreist, und nutze `finally` für die Arbeit, die in beiden Fällen passieren muss.

## Werfen und fangen

`throw` schickt einen Wert den Aufrufstapel hinauf, bis ihn etwas fängt. `try`/`catch` ist das, was ihn fängt:

```js
try {
  return JSON.parse(text);
} catch (error) {
  return fallback;
}
```

Zwei Dinge lohnen Genauigkeit. Erstens sind nur die Anweisungen **innerhalb** des `try`-Blocks geschützt - ein Aufruf darüber nicht. Zweitens bekommt `catch`, was geworfen wurde. In der Praxis ist das immer ein `Error`-Objekt, und [der nächste Step](step:m2-04-error-objects) erklärt, warum.

## finally läuft auf jedem Weg hinaus

`finally` läuft, wenn der Block verlassen wird, ganz gleich wie: normal, per `return` oder weil ein Fehler weiterreist. Damit ist es der Ort für Aufräumarbeiten - eine Datei schließen, eine Sperre freigeben, festhalten, dass ein Versuch beendet ist.

Die Feinheit ist, was passiert, wenn `finally` selbst etwas zurückgibt. Sag [`examples/m2-finally-order.js`](file:examples/m2-finally-order.js) zuerst vorher, dann führe es aus:

```bash
node examples/m2-finally-order.js
```

Der `catch`-Block entscheidet sich, `true` zurückzugeben; der `finally`-Block gibt danach `false` zurück, und `false` ist das, was der Aufrufer sieht. Ein `return` in `finally` überschreibt den Wert, den die Funktion schon zurückgeben wollte - und würde ebenso einen hinausreisenden Fehler verschlucken. MDN dokumentiert dieses Verhalten, und der praktische Rat folgt daraus: **Aufräumarbeit in `finally`, niemals ein `return`**.

## Das Muster, um das es hier wirklich geht

Es gibt zwei ehrliche Formen, und sie beantworten verschiedene Fragen:

```js
try { … } catch (e) { /* hier behandeln, der Aufrufer erfährt nichts */ }
try { … } finally { /* aufräumen, der Fehler reist weiter */ }
```

Fang einen Fehler nur, wenn deine Funktion wirklich etwas dagegen tun kann. Sonst lass ihn hinaus und räum unterwegs auf.

## Die Aufgabe

Öffne [`src/m2/safe-parse.js`](file:src/m2/safe-parse.js):

- `safeParse(text, fallback)` muss den geparsten Wert zurückgeben oder den Ersatzwert, wenn `JSON.parse` wirft. Das ist die erste Form.
- `withCleanup(work, log)` muss `"cleanup"` an das Log anhängen, egal ob `work()` wirft, und ein Fehler aus `work()` muss den Aufrufer trotzdem erreichen. Das ist die zweite Form - und der Test prüft beide Hälften, ein Abfangen des Fehlers ließe ihn also durchfallen.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m2-03-try-catch-finally.test.js
node examples/m2-finally-order.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-03-try-catch-finally.test.js
```

Beide grün, und deine Vorhersage ist erfasst. Als Nächstes baust du einen Fehler, den zu fangen sich lohnt: [Fehlerobjekte und deine eigene Fehlerklasse](step:m2-04-error-objects).
