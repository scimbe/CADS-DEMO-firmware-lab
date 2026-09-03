---
id: m4-04-arrow-and-this
title: Pfeilfunktionen und der Verlust von this
bloom: analyze
objectives: [javascript-web-javascript-guide-functions, javascript-web-javascript-guide-working-with-objects]
requires: [m4-03-closures]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m4-03-closures, m2-04-error-objects]
links:
  - { step: m4-03-closures }
  - { step: m5-01-objects }
  - { file: "src/m4/timer.js", line: 11 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions", title: "MDN: Functions" }
sources: [src/m4/timer.js, test/m4-04-arrow-and-this.test.js, src/m4/counter-factory.js]
tasks:
  - id: ticker
    title: Alle drei Ticker-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m4-04 a ticker counts when called as a method", "m4-04 tick survives being detached from its object", "m4-04 two tickers stay independent"], minPass: 3 }
  - id: this-rules
    title: Was den Wert von this bestimmt hat
    check: { type: question, prompt: { en: "The same function worked one way and failed the other. What decides its receiver? Two sentences.", de: "Dieselbe Funktion lief einmal und scheiterte einmal. Was bestimmt ihren Empfänger? Zwei Sätze." }, rubric: "Attributes the receiver to the call site rather than to the place the function was written, accounts for the failing call having none, and says why this deployment reports it rather than inventing a substitute. Does not pass: blaming the shorter syntax, or offering a repair without identifying what supplies the receiver.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:ticker:failed"
    question: { en: "Which of the three fails: the method call, the detached call, or two tickers staying apart?", de: "Welcher der drei scheitert: der Methodenaufruf, der losgelöste, oder zwei getrennte Ticker?" }
    hints: [ { en: "Run the three assertions separately; the first passes on the untouched file and the others do not.", de: "Lass die drei Assertions getrennt laufen; die erste besteht auf der unveränderten Datei, die anderen nicht." }, { en: "Print what the receiver is inside the function for each of the two call styles.", de: "Gib in der Funktion für beide Aufrufarten aus, was der Empfänger ist." }, { en: "A design where the count is not a property of the returned object never needs a receiver at all.", de: "Ein Entwurf, in dem der Zähler keine Eigenschaft des zurückgegebenen Objekts ist, braucht überhaupt keinen Empfänger." } ]
  - trigger: "task:this-rules:failed"
    question: { en: "Does your answer name what the call site supplies, or only which syntax you used?", de: "Nennt deine Antwort, was die Aufrufstelle liefert, oder nur die benutzte Syntax?" }
    hints: [ { en: "Take one function and call it three ways: on the object, detached, and wrapped. Note the receiver each time.", de: "Nimm eine Funktion und ruf sie dreifach auf: am Objekt, losgelöst, eingepackt. Notiere jeweils den Empfänger." }, { en: "Then ask what the language substitutes when nothing was supplied, and how modules change that answer.", de: "Frag dann, was die Sprache einsetzt, wenn nichts geliefert wurde, und wie Module diese Antwort ändern." }, { en: "In older non-strict code the substitute was an object, which turned this failure into a silent one.", de: "In altem Non-Strict-Code war der Ersatz ein Objekt, was diesen Fehlschlag zu einem stillen machte." } ]
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "this was undefined at the moment of the call. What was in front of the dot when the function ran?", de: "this war im Moment des Aufrufs undefined. Was stand beim Ausführen der Funktion vor dem Punkt?" }
    hints: [ { en: "In a normal function this is decided by the call site, not by where the function was written.", de: "In einer normalen Funktion entscheidet die Aufrufstelle über this, nicht der Ort, an dem die Funktion geschrieben wurde." }, { en: "Passing t.tick as a value drops the receiver; the function is called with nothing in front of the dot.", de: "t.tick als Wert weiterzugeben verliert den Empfänger; die Funktion wird ohne etwas vor dem Punkt aufgerufen." }, { en: "Modules are strict mode, so this is undefined rather than the global object - which is why you get an error instead of a silent global.", de: "Module sind Strict Mode, this ist deshalb undefined statt des globalen Objekts - darum bekommst du einen Fehler statt einer stillen globalen Variable." } ]
  - pattern: "4 !== 2|5 !== 1"
    question: { en: "The count did not advance, or advanced on the wrong object. Where is the state kept?", de: "Der Zähler ist nicht weitergelaufen, oder auf dem falschen Objekt. Wo wird der Zustand gehalten?" }
    hints: [ { en: "A getter must report the same variable that tick increments.", de: "Ein Getter muss dieselbe Variable melden, die tick hochzählt." }, { en: "count: 0 as a plain property is still readable and writable from outside; a closure variable is not.", de: "count: 0 als einfache Eigenschaft bleibt von außen les- und schreibbar; eine Closure-Variable nicht." }, { en: "makeTicker must create fresh state on every call, exactly as makeCounter did in m4-03.", de: "makeTicker muss bei jedem Aufruf frischen Zustand erzeugen, genau wie makeCounter in m4-03." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Erkläre, was `this` setzt, erkenne den Fehler, den eine losgelöste Methode erzeugt, und wähle einen Entwurf, in dem die Frage gar nicht erst aufkommt.

## `this` kommt vom Aufruf, nicht vom Code

In einer normalen Funktion ist `this` das, was **im Moment des Aufrufs** vor dem Punkt stand:

```js
const t = { count: 0, tick() { this.count += 1; return this.count; } };

t.tick();            // this ist t
const fn = t.tick;
fn();                // this ist undefined - vor dem Punkt stand nichts
```

`t.tick` zu schreiben, ohne es aufzurufen, nimmt die Funktion aus dem Objekt heraus. Die Funktion ist unverändert; was fehlt, ist der Empfänger. Deshalb verlieren Callbacks ihr `this`: `setTimeout(t.tick, 100)` übergibt die Funktion allein.

Modulcode ist Strict Mode, der scheiternde Aufruf ergibt also:

```
TypeError: Cannot read properties of undefined (reading 'count')
```

In altem Non-Strict-Code wäre `this` still zum globalen Objekt geworden, und `count` wäre dort angelegt worden - ein Fehler ganz ohne Fehlermeldung. Der `TypeError` ist die Verbesserung.

## Pfeilfunktionen haben kein eigenes this

MDNs Kapitel [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) führt das unter „no separate this": eine Pfeilfunktion nimmt `this` aus dem Bereich, in dem sie **geschrieben** wurde. Das macht Pfeile richtig für Callbacks innerhalb einer Methode:

```js
const obj = {
  items: [1, 2],
  total() { return this.items.reduce((sum, n) => sum + n, 0); },  // Pfeil behält this
};
```

und falsch als Methode selbst: ein Pfeil im Objektliteral erbt das `this` des Moduls, und das ist `undefined`. Sagen zu können, in welchem der beiden Fälle du bist, ist die eigentliche Fähigkeit.

## Drei Korrekturen und ein Entwurf

Für eine Methode, die eine Loslösung überstehen muss, gibt es drei Reparaturen - `fn.bind(t)`, der Aufruf als `t.tick()`, oder ein Pfeil, der `t` einfängt. Alle funktionieren, und alle verlangen vom Aufrufer, an etwas zu denken.

Der Entwurf, der die Frage vollständig beseitigt, ist der aus [m4-03](step:m4-03-closures): halte den Zustand in einer Closure, dann taucht `this` nie auf.

```js
export function makeTicker() {
  let count = 0;
  return {
    get count() { return count; },
    tick: () => { count += 1; return count; },
  };
}
```

`get count()` ist ein Getter - eine Eigenschaft, die beim Lesen eine Funktion ausführt. MDN behandelt Getter in [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects), und [M5](step:m5-01-objects) nutzt sie wieder.

## Die Aufgabe

Öffne [`src/m4/timer.js`](file:src/m4/timer.js). Lass zuerst den Test laufen: der Methodenaufruf besteht, der losgelöste wirft. Schreib `makeTicker` so um, dass alle drei Tests bestehen - einschließlich der Unabhängigkeit zweier Ticker. `runTwice` darf sich nicht ändern.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m4-04-arrow-and-this.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-04-arrow-and-this.test.js
```

Drei grün. Die Frage-Aufgabe will die Regel, den Grund für die Form des Fehlers und zwei nicht benutzte Alternativen. Damit ist M4 abgeschlossen; in [M5](step:m5-01-objects) geht es um die Daten, mit denen diese Funktionen arbeiten.
