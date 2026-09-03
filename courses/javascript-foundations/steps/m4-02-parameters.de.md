---
id: m4-02-parameters
title: Standard- und Rest-Parameter
bloom: apply
objectives: [javascript-web-javascript-guide-functions]
requires: [m4-01-declare-and-call]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m4-01-declare-and-call, m2-02-truthy-falsy]
links:
  - { step: m4-01-declare-and-call }
  - { step: m4-03-closures }
  - { file: "src/m4/format.js", line: 9 }
  - { step: m2-02-truthy-falsy }
sources: [src/m4/format.js, test/m4-02-parameters.test.js, src/m2/settings.js]
tasks:
  - id: format
    title: Beide Formatierungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m4-02 joinWords uses the default separator when none is given", "m4-02 describeCall reports count and values from the rest parameter"], minPass: 2 }
  - id: default-trigger
    title: Wann ein Standardwert wirklich greift
    check: { type: question, prompt: { en: "A default parameter fires for exactly one argument value. Which one - and how does that differ from the || default you replaced in m2-02? Say what joinWords(null, \"a\") returns and why.", de: "Ein Standardparameter greift bei genau einem Argumentwert. Bei welchem - und wie unterscheidet sich das von dem ||-Standardwert, den du in m2-02 ersetzt hast? Sag, was joinWords(null, \"a\") liefert und warum." }, rubric: "States that a default parameter applies only when the argument is undefined - including when it is omitted entirely - and not for null, 0, \"\" or false; contrasts that with || which replaces every falsy value and with ?? which also covers null. Concludes that joinWords(null, \"a\") uses null as the separator, giving \"a\" for one word and joining with the string 'null' for more.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:format:failed", question: { en: "Is the separator wrong, or the count of the collected arguments?", de: "Stimmt das Trennzeichen nicht, oder die Anzahl der gesammelten Argumente?" }, hints: [ { en: "A default is written in the parameter list itself: function joinWords(separator = \", \", ...words)", de: "Ein Standardwert steht in der Parameterliste selbst: function joinWords(separator = \", \", ...words)" }, { en: "The rest parameter collects everything after it into a real array, so words.join(separator) does the work.", de: "Der Rest-Parameter sammelt alles Folgende in ein echtes Array, words.join(separator) erledigt also die Arbeit." }, { en: "describeCall is an arrow function and has no arguments object; use its rest parameter args.", de: "describeCall ist eine Pfeilfunktion und hat kein arguments-Objekt; nutze ihren Rest-Parameter args." } ] }
misconceptions:
  - pattern: "arguments is not defined"
    question: { en: "You reached for the arguments object inside an arrow function. What does an arrow function have instead?", de: "Du hast in einer Pfeilfunktion nach dem arguments-Objekt gegriffen. Was hat eine Pfeilfunktion stattdessen?" }
    hints: [ { en: "Arrow functions have no own arguments object - MDN's Functions chapter lists that with no separate this.", de: "Pfeilfunktionen haben kein eigenes arguments-Objekt - MDNs Kapitel Functions führt das zusammen mit 'no separate this' auf." }, { en: "A rest parameter ...args gives a real array, which arguments never was.", de: "Ein Rest-Parameter ...args liefert ein echtes Array, was arguments nie war." }, { en: "Rest parameters work in every function form, so prefer them everywhere.", de: "Rest-Parameter funktionieren in jeder Funktionsform, nimm sie deshalb überall." } ]
  - pattern: "', ' !== undefined|undefined !== "
    question: { en: "The separator came through as undefined. Was a default written for that parameter at all?", de: "Das Trennzeichen kam als undefined an. Wurde für diesen Parameter überhaupt ein Standardwert geschrieben?" }
    hints: [ { en: "A missing argument arrives as undefined; that is exactly what a default parameter reacts to.", de: "Ein fehlendes Argument kommt als undefined an; genau darauf reagiert ein Standardparameter." }, { en: "The test passes undefined explicitly to prove the default is a parameter default, not a check in the body.", de: "Der Test übergibt undefined ausdrücklich, um zu zeigen, dass der Standardwert ein Parameter-Standardwert ist und keine Prüfung im Rumpf." }, { en: "Write it as separator = \", \" in the parameter list.", de: "Schreib es als separator = \", \" in die Parameterliste." } ]
---
## Lernziel

Gib einer Funktion einen sinnvollen Standardwert, ohne den Wert des Aufrufers zu verschlucken, und sammle eine wechselnde Anzahl von Argumenten in ein echtes Array.

## Standardparameter

```js
function joinWords(separator = ", ", ...words) { … }
```

Ein Standardparameter greift bei genau einer Eingabe: **`undefined`**. So kommt ein weggelassenes Argument an, und so kann ein Aufrufer es auch ausdrücklich übergeben - die Tests tun genau das, um zu belegen, dass der Standardwert in der Parameterliste steht und nicht in einem `if` im Rumpf.

Vergleich das mit [m2-02](step:m2-02-truthy-falsy). Drei Mechanismen, drei verschiedene Mengen ersetzter Werte:

| Geschrieben als | Ersetzt |
|---|---|
| `x = default` in der Parameterliste | nur `undefined` |
| `x ?? default` | `undefined` und `null` |
| `x \|\| default` | jeden falsy-Wert, auch `0`, `""`, `false` |

`joinWords(null, "a")` benutzt also **nicht** `", "`. `null` ist nicht `undefined` und wird deshalb als Trennzeichen genommen. Das aussprechen zu können ist die zweite Aufgabe.

Standardwerte werden zur Aufrufzeit von links nach rechts ausgewertet und dürfen sich auf frühere Parameter beziehen: `function f(a, b = a * 2)` ist gültig und berechnet bei jedem Aufruf ein frisches `b`.

## Rest-Parameter

`...words` an letzter Position sammelt jedes weitere Argument in ein **echtes Array**:

```js
describeCall("a", "b", "c")   //  args ist ["a", "b", "c"]
```

Der alte Weg war das `arguments`-Objekt, und MDNs Kapitel [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) erklärt, warum es alt bleiben sollte: `arguments` ist array-ähnlich, aber kein Array, hat also weder `map` noch `filter` noch `join`. Schlimmer: **Pfeilfunktionen haben überhaupt kein `arguments`-Objekt** - ein Zugriff darauf ergibt `ReferenceError: arguments is not defined`. Rest-Parameter funktionieren in jeder Funktionsform.

## Die Aufgabe

Öffne [`src/m4/format.js`](file:src/m4/format.js). Beide Funktionen werfen; schreib sie.

- `joinWords(separator, ...words)` verbindet die Wörter mit dem Trennzeichen, Standard `", "`. `joinWords()` ist `""`.
- `describeCall(...args)` liefert `"3 args: a|b|c"`. Es ist eine Pfeilfunktion, der Rest-Parameter ist also deine einzige Möglichkeit.

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-02-parameters.test.js
```

Beide grün. In der Frage-Aufgabe geht es um den Unterschied zwischen drei Arten von Standardwerten - eine Unterscheidung, die jetzt zum zweiten Mal aufgetaucht ist und über echte Fehler entscheiden wird. Als Nächstes: [Funktionen, die sich erinnern](step:m4-03-closures).
