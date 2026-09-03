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
    check: { type: question, prompt: { en: "The same tick function worked as t.tick() and failed as a detached reference. Explain what decides the value of this in a normal function, why a module makes the failing case a TypeError rather than a silent global, and name two fixes other than the closure you used.", de: "Dieselbe tick-Funktion funktionierte als t.tick() und scheiterte als losgelöste Referenz. Erkläre, was den Wert von this in einer normalen Funktion bestimmt, warum ein Modul den scheiternden Fall zu einem TypeError statt zu einer stillen globalen Variable macht, und nenne zwei Korrekturen außer der von dir benutzten Closure." }, rubric: "States that in a normal function this is set by the call site - the object before the dot - so a detached reference has no receiver; that module code is strict mode, where this is undefined instead of the global object, which is why the failure is TypeError: Cannot read properties of undefined rather than a silently created global; and names alternatives such as fn.bind(t), calling it as t.tick(), or wrapping it in an arrow function that closes over t.", bloom: analyze, minChars: 120 }
socratic:
  - { trigger: "task:ticker:failed", question: { en: "Which of the three tests fails - the method call, the detached call, or the independence of two tickers?", de: "Welcher der drei Tests schlägt fehl - der Methodenaufruf, der losgelöste Aufruf oder die Unabhängigkeit zweier Zähler?" }, hints: [ { en: "A method that uses this only works when it is called with a receiver in front of the dot.", de: "Eine Methode, die this benutzt, funktioniert nur, wenn sie mit einem Empfänger vor dem Punkt aufgerufen wird." }, { en: "An arrow function inside an object literal does not help: it has no this of its own and the enclosing module scope has none either.", de: "Eine Pfeilfunktion im Objektliteral hilft nicht: sie hat kein eigenes this, und der umgebende Modulbereich hat auch keines." }, { en: "Keep the count in a closure inside makeTicker and expose it through a getter; then tick never mentions this at all.", de: "Halte den Zähler in einer Closure innerhalb von makeTicker und mach ihn über einen Getter sichtbar; dann erwähnt tick this überhaupt nicht mehr." } ] }
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "this was undefined at the moment of the call. What was in front of the dot when the function ran?", de: "this war im Moment des Aufrufs undefined. Was stand beim Ausführen der Funktion vor dem Punkt?" }
    hints: [ { en: "In a normal function this is decided by the call site, not by where the function was written.", de: "In einer normalen Funktion entscheidet die Aufrufstelle über this, nicht der Ort, an dem die Funktion geschrieben wurde." }, { en: "Passing t.tick as a value drops the receiver; the function is called with nothing in front of the dot.", de: "t.tick als Wert weiterzugeben verliert den Empfänger; die Funktion wird ohne etwas vor dem Punkt aufgerufen." }, { en: "Modules are strict mode, so this is undefined rather than the global object - which is why you get an error instead of a silent global.", de: "Module sind Strict Mode, this ist deshalb undefined statt des globalen Objekts - darum bekommst du einen Fehler statt einer stillen globalen Variable." } ]
  - pattern: "1 !== 2|0 !== 1"
    question: { en: "The count did not advance, or advanced on the wrong object. Where is the state kept?", de: "Der Zähler ist nicht weitergelaufen, oder auf dem falschen Objekt. Wo wird der Zustand gehalten?" }
    hints: [ { en: "A getter must report the same variable that tick increments.", de: "Ein Getter muss dieselbe Variable melden, die tick hochzählt." }, { en: "count: 0 as a plain property is still readable and writable from outside; a closure variable is not.", de: "count: 0 als einfache Eigenschaft bleibt von außen les- und schreibbar; eine Closure-Variable nicht." }, { en: "makeTicker must create fresh state on every call, exactly as makeCounter did in m4-03.", de: "makeTicker muss bei jedem Aufruf frischen Zustand erzeugen, genau wie makeCounter in m4-03." } ]
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

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-04-arrow-and-this.test.js
```

Drei grün. Die Frage-Aufgabe will die Regel, den Grund für die Form des Fehlers und zwei nicht benutzte Alternativen. Damit ist M4 abgeschlossen; in [M5](step:m5-01-objects) geht es um die Daten, mit denen diese Funktionen arbeiten.
