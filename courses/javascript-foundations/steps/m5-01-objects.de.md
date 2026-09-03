---
id: m5-01-objects
title: Objekte, Referenzen und Kopien
bloom: apply
objectives: [javascript-web-javascript-guide-working-with-objects]
requires: [m4-04-arrow-and-this]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m4-04-arrow-and-this, m1-04-equality]
links:
  - { step: m4-04-arrow-and-this }
  - { step: m5-02-optional-chaining }
  - { file: "src/m5/config.js", line: 10 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects", title: "MDN: Working with objects" }
sources: [src/m5/config.js, test/m5-01-objects.test.js, src/m3/iterate.js]
tasks:
  - id: settings
    title: Alle drei Settings-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m5-01 readSettings copies the fields", "m5-01 readSettings copies the tags instead of sharing them", "m5-01 listEntries renders key=value in insertion order"], minPass: 3 }
  - id: shared-or-copied
    title: Was wirklich kopiert wurde
    check: { type: question, prompt: { en: "The first test passed while the second failed, using the same function. Explain what a property holding an array actually stores, why copying the object did not copy the array, and what 'shallow copy' means in that sentence.", de: "Der erste Test bestand, während der zweite mit derselben Funktion fehlschlug. Erkläre, was eine Eigenschaft, die ein Array hält, tatsächlich speichert, warum das Kopieren des Objekts das Array nicht mitkopiert hat, und was 'flache Kopie' in diesem Satz bedeutet." }, rubric: "States that an object property holds a reference, not the array itself, so copying the property copies the reference and both objects then point at one array; defines a shallow copy as one level deep, which leaves nested objects and arrays shared; and names a fix such as spreading the array into a new one.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:settings:failed", question: { en: "Is the failure about the shared array, or about the key=value strings?", de: "Geht es beim Fehlschlag um das geteilte Array oder um die key=value-Zeichenketten?" }, hints: [ { en: "The test pushes onto the result's tags and then checks that the input is unchanged.", de: "Der Test hängt an die tags des Ergebnisses an und prüft danach, dass die Eingabe unverändert ist." }, { en: "[...raw.tags] builds a new array with the same elements.", de: "[...raw.tags] baut ein neues Array mit denselben Elementen." }, { en: "Object.entries(obj) gives [key, value] pairs in insertion order; map them into strings.", de: "Object.entries(obj) liefert [key, value]-Paare in Einfügereihenfolge; wandle sie per map in Zeichenketten um." } ] }
misconceptions:
  - pattern: "'a',\\s*'b'|deep-equal"
    question: { en: "The caller's data changed although you only touched the result. What do the two objects have in common?", de: "Die Daten des Aufrufers haben sich geändert, obwohl du nur das Ergebnis angefasst hast. Was haben die beiden Objekte gemeinsam?" }
    hints: [ { en: "Copying a property that holds an array copies the reference, not the elements.", de: "Eine Eigenschaft zu kopieren, die ein Array hält, kopiert die Referenz, nicht die Elemente." }, { en: "Both objects now name one array, so a push through either is visible through both.", de: "Beide Objekte benennen jetzt ein Array, ein push über eines ist also über beide sichtbar." }, { en: "Spread the array to break the link: tags: [...raw.tags]", de: "Spreize das Array, um die Verbindung zu lösen: tags: [...raw.tags]" } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Lies ein Objekt als eine Menge benannter Referenzen und wisse genau, wie viel von einer Struktur eine Kopie tatsächlich kopiert.

## Objekte halten Referenzen

Eine Objekteigenschaft hält einen Wert. Ist dieser Wert ein Array oder ein anderes Objekt, wird eine **Referenz** darauf gespeichert, nicht die Sache selbst. Zwei Eigenschaften können deshalb dasselbe Array benennen:

```js
const raw = { tags: ["a"] };
const copy = { tags: raw.tags };   // ein Array, zwei Namen
copy.tags.push("b");
raw.tags;                          // ["a", "b"]
```

An diesem Code ist als solchem nichts falsch - manchmal will man genau das teilen. Der Fehler ist das *versehentliche* Teilen, wenn eine Funktion etwas zurückgeben sollte, das der Aufrufer frei verändern darf.

Das ist dieselbe Identitätsregel wie in [m1-04](step:m1-04-equality): `{a:1} === {a:1}` ist `false`, weil das zwei Objekte sind, und `raw.tags === copy.tags` ist `true`, weil das eines ist.

## Flache Kopie

Die Spread-Form kopiert ein Objekt **eine Ebene tief**:

```js
const copy = { ...raw };           // neues Objekt, dieselben verschachtelten Referenzen
const copy2 = { ...raw, tags: [...raw.tags] };   // verschachteltes Array mitkopiert
```

„Flach" heißt genau das: die oberste Ebene ist neu, alles darunter ist geteilt. Für ein Settings-Objekt mit einem Array genügt es, dieses Array mitzuspreizen. Für beliebig tiefe Strukturen erzeugt `structuredClone(raw)` eine vollständige Kopie.

## Eigenschaften auslesen

MDNs Kapitel [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects) behandelt die drei Standardwege, die eigenen aufzählbaren Eigenschaften eines Objekts zu durchlaufen, alle in Einfügereihenfolge:

```js
Object.keys(obj)      // ["host", "port"]
Object.values(obj)    // ["localhost", 3000]
Object.entries(obj)   // [["host", "localhost"], ["port", 3000]]
```

Sie sind der direkte Ersatz für das abgesicherte `for...in` aus [m3-03](step:m3-03-for-of-and-in): keine geerbten Eigenschaften, keine `Object.hasOwn`-Absicherung, keine Index-Zeichenketten.

`Object.entries(obj).map(([key, value]) => …)` zerlegt jedes Paar in der Parameterliste - dieselbe Destrukturierung, die du in [M5](step:m5-04-transformations) durchgehend benutzt.

## Die Aufgabe

Öffne [`src/m5/config.js`](file:src/m5/config.js):

- `readSettings(raw)` kopiert `host`, `port` und `tags`, gibt aber das Array des Aufrufers zurück. Der erste Test besteht, der zweite nicht. Kopiere das Array.
- `listEntries(obj)` wirft; bau `["key=value", …]` in Einfügereihenfolge.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m5-01-objects.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m5-01-objects.test.js
```

Drei grün. Als Nächstes: [durch Ebenen lesen, die es vielleicht nicht gibt](step:m5-02-optional-chaining).
