---
id: m5-02-optional-chaining
title: Reading through levels that may not exist
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
    title: All four lookup tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m5-02 serverPort reads the configured port", "m5-02 serverPort defaults when a level is missing", "m5-02 serverPort keeps a port of 0", "m5-02 adminEmail returns null instead of throwing"], minPass: 4 }
  - id: chaining-limits
    title: Where optional chaining stops helping
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
---
## Learning goal

Read a value out of a nested structure without assuming the structure is there, and keep a legitimate `0` while still defaulting a missing value.

## The error this step is about

```
TypeError: Cannot read properties of undefined (reading 'port')
```

You have met this message twice already - in [m3-02](step:m3-02-off-by-one) from an index past the end, and in [m4-04](step:m4-04-arrow-and-this) from a lost `this`. Here it comes from a level that is simply absent:

```js
const cfg = {};
cfg.server;         // undefined - fine
cfg.server.port;    // TypeError - you cannot read a property of undefined
```

Reading a missing property is not an error; reading a property **of** a missing value is. The message always names the property being read, so the missing object is the one immediately to its left.

## Optional chaining

`?.` short-circuits the whole chain to `undefined` as soon as the value in front of it is `null` or `undefined`:

```js
cfg?.server?.port      // undefined instead of a TypeError
```

Two details are worth being precise about, and the second task asks for one of them:

- **Each `?.` guards only the access right after it.** In `a?.b.c`, if `a` exists but `b` does not, the `.c` is unguarded and still throws. Every uncertain level needs its own `?.`.
- **It is not free.** A misspelled key now yields `undefined` and then a default, quietly. Optional chaining is right where a value is genuinely optional, and wrong where a missing value means something is broken and you would rather find out.

There is also `?.()` for calling a function that may not exist and `?.[]` for a dynamic key.

## Pairing it with `??`

`?.` produces `undefined` for a missing path; `??` turns that into a default. That combination is precise:

```js
cfg?.server?.port ?? 8080     // 0 stays 0; missing becomes 8080
cfg?.server?.port || 8080     // 0 becomes 8080 - the m2-02 bug again
```

## The exercise

Open [`src/m5/lookup-deep.js`](file:src/m5/lookup-deep.js):

- `serverPort(cfg)` returns the configured port, or 8080 when `server` or `port` is missing - and a configured `0` has to survive.
- `adminEmail(cfg)` returns `cfg.users.admin.email` or `null`. Note that the test wants `null`, not `undefined`.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m5-02-optional-chaining.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m5-02-optional-chaining.test.js
```

Four green. The question task asks where this tool stops helping, which is the part worth remembering. Next: [arrays and who is allowed to change them](step:m5-03-arrays).
