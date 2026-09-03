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
    check: { type: predict, prompt: { en: "examples/m2-finally-order.js has a try that throws, a catch that returns true, and a finally that returns false. Write down every number printed and the final value, in order.", de: "examples/m2-finally-order.js hat ein try, das wirft, ein catch, das true zurückgibt, und ein finally, das false zurückgibt. Schreib jede ausgegebene Zahl und den Endwert der Reihe nach auf." }, then: { type: command, command: "node examples/m2-finally-order.js", expectExitCode: 0, expectStdout: "false" }, rubric: "Recognises that finally runs after catch has already decided to return, and that a return inside finally replaces the value catch was about to return, so the printed order is 0, 1, 3 and the result is false, not true.", bloom: evaluate }
  - id: safe-parse
    title: Beide Fehlerbehandlungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m2-03 safeParse returns the parsed value or the fallback", "m2-03 withCleanup always runs the cleanup, even when work throws"], minPass: 2 }
socratic:
  - { trigger: "task:safe-parse:failed", question: { en: "Is the failure in the function that must swallow an error, or in the one that must let it through?", de: "Liegt der Fehlschlag in der Funktion, die einen Fehler schlucken muss, oder in der, die ihn durchlassen muss?" }, hints: [ { en: "safeParse needs a try around JSON.parse and a catch that returns the fallback.", de: "safeParse braucht ein try um JSON.parse und ein catch, das den Ersatzwert zurückgibt." }, { en: "withCleanup must push 'cleanup' even when work() throws - that is what finally is for.", de: "withCleanup muss 'cleanup' auch dann anhängen, wenn work() wirft - genau dafür gibt es finally." }, { en: "Do not catch in withCleanup: try { … } finally { … } with no catch runs the cleanup and still lets the error out.", de: "Fang in withCleanup nichts ab: try { … } finally { … } ohne catch führt die Aufräumarbeit aus und lässt den Fehler trotzdem hinaus." } ] }
misconceptions:
  - pattern: "Unexpected token|Unexpected end of JSON input|is not valid JSON"
    question: { en: "JSON.parse threw and the error left your function. Was the call inside a try block?", de: "JSON.parse hat geworfen und der Fehler hat deine Funktion verlassen. Stand der Aufruf in einem try-Block?" }
    hints: [ { en: "JSON.parse throws a SyntaxError for anything that is not valid JSON, including an empty string.", de: "JSON.parse wirft einen SyntaxError für alles, was kein gültiges JSON ist, auch für eine leere Zeichenkette." }, { en: "Only statements inside the try block are protected; a call before it is not.", de: "Geschützt sind nur Anweisungen innerhalb des try-Blocks; ein Aufruf davor nicht." }, { en: "return the fallback from the catch block, not after the try.", de: "Gib den Ersatzwert aus dem catch-Block zurück, nicht nach dem try." } ]
  - pattern: "cleanup"
    question: { en: "The cleanup entry is missing or in the wrong place. Which block runs whether or not an error happened?", de: "Der cleanup-Eintrag fehlt oder steht an der falschen Stelle. Welcher Block läuft, egal ob ein Fehler auftrat?" }
    hints: [ { en: "A line after the call is skipped when the call throws.", de: "Eine Zeile nach dem Aufruf wird übersprungen, wenn der Aufruf wirft." }, { en: "finally runs on the way out no matter how the block is left - normally, by return, or by an error.", de: "finally läuft beim Verlassen des Blocks in jedem Fall - normal, per return oder durch einen Fehler." }, { en: "Never put a return inside finally: it replaces whatever the function was about to return.", de: "Setz nie ein return in ein finally: es ersetzt das, was die Funktion gerade zurückgeben wollte." } ]
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

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-03-try-catch-finally.test.js
```

Beide grün, und deine Vorhersage ist erfasst. Als Nächstes baust du einen Fehler, den zu fangen sich lohnt: [Fehlerobjekte und deine eigene Fehlerklasse](step:m2-04-error-objects).
