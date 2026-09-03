---
id: m5-02-optional-chaining
title: Durch Ebenen lesen, die es vielleicht nicht gibt
bloom: apply
objectives: [javascript-web-javascript-guide-working-with-objects]
requires: [m5-01-objects]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m5-01-objects, m2-02-truthy-falsy]
links:
  - { step: m5-01-objects }
  - { step: m5-03-arrays }
  - { file: "src/m5/lookup-deep.js", line: 8 }
  - { step: m2-02-truthy-falsy }
sources: [src/m5/lookup-deep.js, test/m5-02-optional-chaining.test.js, src/m2/settings.js]
tasks:
  - id: lookup-deep
    title: Alle vier Lookup-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m5-02 serverPort reads the configured port", "m5-02 serverPort defaults when a level is missing", "m5-02 serverPort keeps a port of 0", "m5-02 adminEmail returns null instead of throwing"], minPass: 4 }
  - id: chaining-limits
    title: Wo Optional Chaining aufhört zu helfen
    check: { type: question, prompt: { en: "cfg?.server?.port ?? 8080 handles a missing server and a missing port. Name a case it does NOT handle - where you would still get a TypeError or a wrong answer - and say what you would write instead there.", de: "cfg?.server?.port ?? 8080 behandelt einen fehlenden server und einen fehlenden port. Nenne einen Fall, den es NICHT behandelt - wo du weiterhin einen TypeError oder eine falsche Antwort bekämst - und sag, was du dort stattdessen schreiben würdest." }, rubric: "Names at least one real limit: ?. only guards the access immediately after it, so a?.b.c still throws when b is missing; it does not help when an intermediate value is a non-null non-object; and it silently turns a structural mistake such as a misspelled key into a default, which hides bugs. Suggests validating the shape once at the boundary, or checking explicitly where a missing value is not expected.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:lookup-deep:failed", question: { en: "Does it still throw on a missing level, or does it now replace a port of 0?", de: "Wirft es noch bei einer fehlenden Ebene, oder ersetzt es jetzt einen Port 0?" }, hints: [ { en: "cfg.server.port throws as soon as server is missing; cfg?.server?.port yields undefined instead.", de: "cfg.server.port wirft, sobald server fehlt; cfg?.server?.port liefert stattdessen undefined." }, { en: "|| would also replace a port of 0, which the third test forbids. Use ?? as in m2-02.", de: "|| würde auch einen Port 0 ersetzen, was der dritte Test verbietet. Nutze ?? wie in m2-02." }, { en: "adminEmail must answer null, not undefined: end it with ?? null.", de: "adminEmail muss null liefern, nicht undefined: schließ es mit ?? null ab." } ] }
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "One level of the path was missing. Which one, and is the guard placed before or after it?", de: "Eine Ebene des Pfads fehlte. Welche, und steht die Absicherung davor oder dahinter?" }
    hints: [ { en: "The message names the property that was being read; the missing object is the one to its left.", de: "Die Meldung nennt die gelesene Eigenschaft; das fehlende Objekt steht links davon." }, { en: "?. guards only the access that immediately follows it, so every uncertain level needs its own.", de: "?. sichert nur den unmittelbar folgenden Zugriff ab, jede unsichere Ebene braucht also ihr eigenes." }, { en: "cfg?.users?.admin?.email guards all three levels.", de: "cfg?.users?.admin?.email sichert alle drei Ebenen ab." } ]
  - pattern: "8080 !== 0"
    question: { en: "A configured port of 0 was replaced by the default. Which operator did that?", de: "Ein konfigurierter Port 0 wurde durch den Standardwert ersetzt. Welcher Operator war das?" }
    hints: [ { en: "0 is falsy, so || replaces it - the same trap as m2-02.", de: "0 ist falsy, || ersetzt es also - dieselbe Falle wie in m2-02." }, { en: "?? falls back only for null and undefined.", de: "?? greift nur bei null und undefined." }, { en: "cfg?.server?.port ?? 8080", de: "cfg?.server?.port ?? 8080" } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Lies einen Wert aus einer verschachtelten Struktur, ohne vorauszusetzen, dass die Struktur da ist, und behalte eine berechtigte `0`, während ein fehlender Wert trotzdem einen Standardwert bekommt.

## Der Fehler, um den es hier geht

```
TypeError: Cannot read properties of undefined (reading 'port')
```

Diese Meldung ist dir schon zweimal begegnet - in [m3-02](step:m3-02-off-by-one) durch einen Index hinter dem Ende und in [m4-04](step:m4-04-arrow-and-this) durch ein verlorenes `this`. Hier kommt sie von einer schlicht fehlenden Ebene:

```js
const cfg = {};
cfg.server;         // undefined - in Ordnung
cfg.server.port;    // TypeError - eine Eigenschaft von undefined ist nicht lesbar
```

Eine fehlende Eigenschaft zu lesen ist kein Fehler; eine Eigenschaft **von** einem fehlenden Wert zu lesen schon. Die Meldung nennt immer die gelesene Eigenschaft, das fehlende Objekt steht also unmittelbar links davon.

## Optional Chaining

`?.` bricht die ganze Kette zu `undefined` ab, sobald der Wert davor `null` oder `undefined` ist:

```js
cfg?.server?.port      // undefined statt eines TypeError
```

Zwei Details verdienen Genauigkeit, und die zweite Aufgabe fragt nach einem davon:

- **Jedes `?.` sichert nur den unmittelbar folgenden Zugriff ab.** In `a?.b.c` wirft das `.c` weiterhin, wenn `a` existiert, `b` aber nicht. Jede unsichere Ebene braucht ihr eigenes `?.`.
- **Es ist nicht umsonst.** Ein vertippter Schlüssel liefert jetzt `undefined` und danach still einen Standardwert. Optional Chaining ist richtig, wo ein Wert wirklich optional ist, und falsch, wo ein fehlender Wert bedeutet, dass etwas kaputt ist und du es lieber erfahren würdest.

Es gibt außerdem `?.()` für den Aufruf einer möglicherweise fehlenden Funktion und `?.[]` für einen dynamischen Schlüssel.

## Zusammen mit `??`

`?.` liefert `undefined` für einen fehlenden Pfad; `??` macht daraus einen Standardwert. Diese Kombination ist präzise:

```js
cfg?.server?.port ?? 8080     // 0 bleibt 0; fehlend wird 8080
cfg?.server?.port || 8080     // 0 wird 8080 - wieder der Fehler aus m2-02
```

## Die Aufgabe

Öffne [`src/m5/lookup-deep.js`](file:src/m5/lookup-deep.js):

- `serverPort(cfg)` liefert den konfigurierten Port oder 8080, wenn `server` oder `port` fehlt - und eine konfigurierte `0` muss überleben.
- `adminEmail(cfg)` liefert `cfg.users.admin.email` oder `null`. Beachte, dass der Test `null` will, nicht `undefined`.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m5-02-optional-chaining.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m5-02-optional-chaining.test.js
```

Vier grün. Die Frage-Aufgabe fragt, wo dieses Werkzeug aufhört zu helfen, und das ist der merkenswerte Teil. Als Nächstes: [Arrays und wer sie verändern darf](step:m5-03-arrays).
