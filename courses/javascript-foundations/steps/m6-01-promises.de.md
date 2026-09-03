---
id: m6-01-promises
title: Promises und was ein ausstehender Wert ist
bloom: understand
objectives: [js.async.promises]
requires: [m5-04-transformations]
estimatedMinutes: 20
scaffold: worked
recallFrom: [m4-03-closures, m5-04-transformations]
links:
  - { step: m5-04-transformations }
  - { step: m6-02-async-await }
  - { file: "src/m6/delay.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises", title: "MDN: Using promises" }
sources: [src/m6/delay.js, test/m6-01-promises.test.js, src/m4/counter-factory.js]
tasks:
  - id: delay
    title: Alle drei Promise-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m6-01 wait returns a Promise that resolves with the delay", "m6-01 wait really waits", "m6-01 loadTwice chains and collects both values"], minPass: 3 }
  - id: what-is-pending
    title: Was die Funktion zurückgibt, bevor die Arbeit fertig ist
    check: { type: question, prompt: { en: "wait(20) returns immediately, long before 20 milliseconds have passed. Describe what the caller is holding at that moment, what the three states of a promise are, and why the value inside it cannot simply be read out synchronously.", de: "wait(20) kehrt sofort zurück, lange bevor 20 Millisekunden vergangen sind. Beschreibe, was der Aufrufer in diesem Moment in der Hand hält, welche drei Zustände ein Promise hat, und warum der Wert darin nicht einfach synchron ausgelesen werden kann." }, rubric: "States that the caller holds a Promise object that is pending, and names the three states pending, fulfilled and rejected; explains that the value arrives later, so it can only be reached through a callback registered with .then (or await), because reading it synchronously would mean blocking the single thread that would have to run the work.", bloom: understand, minChars: 100 }
socratic:
  - { trigger: "task:delay:failed", question: { en: "Does your function return a Promise at all, or does it return the value it computed?", de: "Liefert deine Funktion überhaupt ein Promise, oder liefert sie den berechneten Wert?" }, hints: [ { en: "new Promise((resolve) => …) hands you a resolve function; call it when the work is done.", de: "new Promise((resolve) => …) gibt dir eine resolve-Funktion; ruf sie auf, wenn die Arbeit fertig ist." }, { en: "setTimeout(() => resolve(ms), ms) is the whole body of wait.", de: "setTimeout(() => resolve(ms), ms) ist der ganze Rumpf von wait." }, { en: "loadTwice must return the chain itself: wait(ms).then(…) - a then callback that returns a promise is waited for.", de: "loadTwice muss die Kette selbst zurückgeben: wait(ms).then(…) - ein then-Callback, der ein Promise liefert, wird abgewartet." } ] }
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise turned up where a value was expected. Was the chain returned, or was its result used directly?", de: "Ein Promise ist dort aufgetaucht, wo ein Wert erwartet wurde. Wurde die Kette zurückgegeben, oder wurde ihr Ergebnis direkt benutzt?" }
    hints: [ { en: "A promise is a container for a value that is not there yet; printing it shows the container.", de: "Ein Promise ist ein Behälter für einen noch nicht vorhandenen Wert; ausgeben zeigt den Behälter." }, { en: "The value is reachable only inside .then(value => …) or after await.", de: "Der Wert ist nur innerhalb von .then(value => …) oder nach await erreichbar." }, { en: "Return the chain from your function so the caller can wait for it too.", de: "Gib die Kette aus deiner Funktion zurück, damit der Aufrufer ebenfalls darauf warten kann." } ]
  - pattern: "settled too early|is not a function"
    question: { en: "Either nothing waited, or something that is not a promise was chained. What exactly did the function hand back?", de: "Entweder hat nichts gewartet, oder es wurde an etwas gekettet, das kein Promise ist. Was genau hat die Funktion zurückgegeben?" }
    hints: [ { en: "setTimeout itself returns a timer handle, not a promise.", de: "setTimeout selbst liefert eine Timer-Kennung, kein Promise." }, { en: "Wrap it: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));", de: "Umschließe es: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));" }, { en: ".then only exists on a promise, so chaining on anything else fails with 'is not a function'.", de: ".then gibt es nur auf einem Promise, das Ketten an etwas anderes scheitert also mit 'is not a function'." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Lies ein Promise als einen Wert, der noch nicht angekommen ist, erzeuge eines und häng Arbeit daran an, ohne so zu tun, als wäre das Ergebnis sofort verfügbar.

## Warum das Ergebnis nicht einfach zurückgegeben wird

JavaScript führt deinen Code auf einem Thread aus. Eine Funktion, die auf einen Timer, eine Datei oder eine Netzwerkantwort blockierend wartet, würde alles andere anhalten. Funktionen, die Zeit brauchen, kehren deshalb **sofort** zurück, mit einem Objekt, das das spätere Ergebnis vertritt.

MDNs [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) - unter `sources/` dieses Kurses mitgeliefert - beschreibt dieses Objekt mit drei Zuständen:

- **pending** - die Arbeit ist nicht fertig
- **fulfilled** - sie endete mit einem Wert
- **rejected** - sie scheiterte mit einem Grund

Ein Promise beginnt pending und geht genau einmal in einen der beiden anderen Zustände über. Zurück geht es nie.

## Eines erzeugen

```js
export function wait(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}
```

Die an `new Promise` übergebene Funktion läuft sofort und bekommt `resolve` (und `reject`, das in [m6-03](step:m6-03-async-errors) benutzt wird). Der Aufruf `resolve(value)` besiegelt das Promise. Beachte, dass das eine Closure aus [M4](step:m4-03-closures) ist: `resolve` ist aus dem Timer-Callback heraus noch erreichbar, lange nachdem `wait` selbst zurückgekehrt ist.

`new Promise` brauchst du selten. Es dient dazu, eine ältere Callback-Schnittstelle einzupacken - wie `setTimeout` -, und genau das tut diese Übung.

## Den Wert lesen

Den Wert gibt es nur innerhalb eines Callbacks:

```js
wait(5).then((value) => console.log(value));   // 5, später
console.log(wait(5));                          // Promise { <pending> }
```

`Promise { <pending> }` dort, wo du einen Wert erwartet hast, ist das Erkennungszeichen eines fehlenden `.then` oder eines fehlenden `await`, und es begegnet dir in [m6-02](step:m6-02-async-await) wieder.

`.then` liefert ein neues Promise, Aufrufe lassen sich also verketten. Die Regel, die das Verketten trägt: **liefert ein `then`-Callback ein Promise, wartet die Kette darauf**, bevor sie weitergeht. So kann `loadTwice` zweimal warten.

## Die Aufgabe

Öffne [`src/m6/delay.js`](file:src/m6/delay.js). Beide Funktionen werfen.

- `wait(ms)` liefert ein Promise, das nach `ms` Millisekunden mit `ms` besiegelt wird.
- `loadTwice(ms)` liefert ein Promise auf `[ms, ms]`, gebaut durch zweimaliges Verketten von `.then` an `wait(ms)`. Nimm hier kein `async`/`await` - das ist [der nächste Step](step:m6-02-async-await), und es zuerst mit `.then` zu tun lässt den nächsten Step wie eine Vereinfachung wirken statt wie Zauberei.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m6-01-promises.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m6-01-promises.test.js
```

Drei grün, einschließlich des Tests, der prüft, dass `wait(20)` wirklich mindestens 15 Millisekunden gebraucht hat.
