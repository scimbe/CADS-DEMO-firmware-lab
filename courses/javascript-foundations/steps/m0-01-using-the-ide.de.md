---
id: m0-01-using-the-ide
title: Die Oberfläche bedienen
bloom: apply
objectives: [js.tooling.node-test]
requires: []
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-02-first-run }
  - { file: "src/m0/ready.js", line: 13 }
  - { file: "test/m0-01-using-the-ide.test.js" }
  - { doc: "README.md" }
sources: [README.md, src/m0/ready.js, test/m0-01-using-the-ide.test.js, package.json]
tasks:
  - id: node-runs
    title: "Einen Befehl ausführen: node antwortet mit seiner Version"
    check: { type: command, command: "node --version", expectExitCode: 0, expectStdout: "v(2[2-9]|[3-9][0-9])", timeoutMs: 20000, seedMustFail: false }
  - id: ready
    title: "Ausgabe lesen, Datei in src/ ändern, erneut ausführen"
    check: { type: testSuite, runner: node-test, expectPass: ["m0-01 the workspace is ready"], minPass: 1 }
  - id: where-things-are
    title: Sag, wo die Ausgabe erschienen ist
    check: { type: question, prompt: { en: "You ran a command and then changed a file. Say which of the three ways you used to run it, where in the window the output appeared, how you could tell the command had finished, and which file you edited to make the test pass.", de: "Du hast einen Befehl ausgeführt und dann eine Datei geändert. Sag, welchen der drei Wege du zum Ausführen benutzt hast, wo im Fenster die Ausgabe erschien, woran du erkennen konntest, dass der Befehl fertig war, und welche Datei du geändert hast, damit der Test besteht." }, rubric: "Names one of the three routes (the integrated terminal, the command palette via F1, or Terminal > Run Task); locates the output in the panel at the bottom of the window; gives a usable finished-signal such as the prompt reappearing or the summary line with pass and fail counts; and names src/m0/ready.js as the edited file, explicitly not the file under test/.", bloom: understand, minChars: 80 }
socratic:
  - { trigger: "task:node-runs:failed", question: { en: "Is a terminal open at all, and does its prompt end in the folder javascript-foundations?", de: "Ist überhaupt ein Terminal offen, und endet sein Prompt auf den Ordner javascript-foundations?" }, hints: [ { en: "Menu Terminal > New Terminal opens one at the bottom of the window; the keyboard route is F1, then type 'Terminal: Create New Terminal'.", de: "Menü Terminal > New Terminal öffnet eines am unteren Rand; der Tastaturweg ist F1, dann 'Terminal: Create New Terminal' tippen." }, { en: "Type pwd and press Enter. The last part of the path must be javascript-foundations.", de: "Tippe pwd und drücke Enter. Der letzte Teil des Pfads muss javascript-foundations sein." }, { en: "If it is not, run: cd javascript-foundations", de: "Wenn nicht, führe aus: cd javascript-foundations" } ] }
  - { trigger: "task:ready:failed", question: { en: "Which file did you change - the one under src/, or the one under test/?", de: "Welche Datei hast du geändert - die unter src/ oder die unter test/?" }, hints: [ { en: "The exercise lives in src/m0/ready.js. Files under test/ are the marking scheme and are never edited.", de: "Die Übung liegt in src/m0/ready.js. Dateien unter test/ sind das Prüfschema und werden nie bearbeitet." }, { en: "Change false to true on the last line, then save with Ctrl+S (Cmd+S on a Mac).", de: "Ändere in der letzten Zeile false zu true und speichere mit Strg+S (Cmd+S auf dem Mac)." }, { en: "Run the command again in the same terminal - press the Up arrow to bring it back.", de: "Führe den Befehl im selben Terminal erneut aus - mit der Pfeil-nach-oben-Taste holst du ihn zurück." } ] }
misconceptions:
  - pattern: "Cannot find module|no such file or directory|MODULE_NOT_FOUND"
    question: { en: "Node looked for the file where you started it. Which folder is the terminal sitting in?", de: "Node hat die Datei dort gesucht, wo du es gestartet hast. In welchem Ordner steht das Terminal?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden." }, { en: "cd javascript-foundations puts you there; ls then shows src, test and examples.", de: "cd javascript-foundations bringt dich dorthin; ls zeigt danach src, test und examples." }, { en: "Every command in this course is written relative to that folder, never to your home directory.", de: "Jeder Befehl dieses Kurses ist relativ zu diesem Ordner geschrieben, nie zum Home-Verzeichnis." } ]
  - pattern: "command not found"
    question: { en: "The shell could not find the program you typed. Was the whole line typed as written?", de: "Die Shell konnte das getippte Programm nicht finden. Wurde die ganze Zeile so getippt, wie sie dasteht?" }
    hints: [ { en: "node --version: all lower case, one space, two dashes.", de: "node --version: alles klein, ein Leerzeichen, zwei Bindestriche." }, { en: "Use the copy button at the top right of a code block in this panel instead of retyping.", de: "Nutze die Kopier-Schaltfläche rechts oben an einem Codeblock in diesem Panel, statt abzutippen." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." } ]
  - pattern: "Set READY to true"
    question: { en: "The test is still reading false. Was the file saved, and was it the file under src/?", de: "Der Test liest weiterhin false. Wurde die Datei gespeichert, und war es die Datei unter src/?" }
    hints: [ { en: "An unsaved file shows a dot instead of a cross on its editor tab. Ctrl+S (Cmd+S) saves it.", de: "Eine ungespeicherte Datei zeigt auf ihrem Editor-Tab einen Punkt statt eines Kreuzes. Strg+S (Cmd+S) speichert sie." }, { en: "Check the path in the tab: it must be src/m0/ready.js, not test/m0-01-using-the-ide.test.js.", de: "Prüfe den Pfad im Tab: er muss src/m0/ready.js sein, nicht test/m0-01-using-the-ide.test.js." }, { en: "Node reads the file from disk at every run, so an unsaved change cannot be seen.", de: "Node liest die Datei bei jedem Lauf von der Platte, eine ungespeicherte Änderung ist also unsichtbar." } ]
---
## Lernziel

Bedien diesen Editor so sicher, dass du jeden Step dieses Kurses abschließen kannst: ein Terminal öffnen, einen Befehl auf drei Wegen ausführen, die Ausgabe finden, erkennen, wann ein Befehl fertig ist, und die richtige Datei ändern.

## Was auf deinem Bildschirm ist

Das Fenster hat vier Bereiche, und du benutzt alle vier.

| Wo | Was es ist | Was du dort tust |
|---|---|---|
| Linker Rand, senkrechte Leiste | Aktivitätsleiste. Das Doktorhut-Symbol ist **CaDS Tutor**. | Tutor öffnen, Kurs wählen, Step wählen. |
| Links, breite Spalte | Explorer: die Dateien von `javascript-foundations`. | Dateien unter `src/…` per Klick öffnen. |
| Mitte | Editor. Ein Tab je geöffneter Datei. | Code schreiben. |
| Unten | Panel: **Terminal**, **Problems**, **Output**. | Befehle ausführen und lesen, was sie ausgeben. |

Der Step, den du gerade liest, ist das **Tutor-Panel**. Seine Aufgabenliste hat je Aufgabe eine Prüf-Schaltfläche; ein Druck darauf führt die Prüfung aus und zeigt das Ergebnis neben der Aufgabe.

Ist das untere Panel nicht sichtbar, holt es das Menü **View > Terminal** zurück. Beim Ausblenden geht nichts verloren.

## Drei Wege, etwas auszuführen

Alle drei tun dasselbe. Lern alle drei; verschiedene Steps nennen verschiedene.

1. **Das integrierte Terminal.** Menü **Terminal > New Terminal**. Unten öffnet sich eine Shell. Befehl tippen, Enter drücken. Das ist der Standardweg dieses Kurses, weil du den genauen Befehl und seine genaue Ausgabe zusammen siehst.
2. **Die Befehlspalette.** Drück **F1**. Im Browser ist das zuverlässiger als Strg+Umschalt+P, das der Browser selbst abfangen kann. Tipp die ersten Buchstaben des Gewünschten, etwa `Terminal: Create New Terminal`, und drück Enter.
3. **Ein Task.** Menü **Terminal > Run Task…**, dann einen aus der Liste wählen. Ein Task ist ein Befehl, den jemand für dich vorbereitet hat; seine Ausgabe erscheint im Panel unter **Terminal**, in einem nach dem Task benannten Tab.

## Woran du erkennst, dass ein Befehl fertig ist

Zwei Signale, und die lohnen sich jetzt:

- **Der Prompt kommt zurück.** Während ein Befehl läuft, wird kein neuer Prompt ausgegeben. Erscheint die Zeile, die auf `$` (oder `%`) endet, wieder, ist der Befehl fertig.
- **Die Zusammenfassungszeile.** `node --test` endet mit einem Block aus Zählern:

```
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

`fail 0` heißt Erfolg. Alles andere nicht.

Die Ausgabe bleibt nach dem Ende des Befehls im Terminal stehen; scroll nach oben, um sie erneut zu lesen. Ein Terminal über das Papierkorb-Symbol zu schließen wirft diese Ausgabe weg - wenn du nicht findest, was ein Befehl ausgegeben hat, prüfe, ob du auf ein *neues*, leeres Terminal schaust statt auf das, in dem du ihn ausgeführt hast.

## Deine Aufgabe

Mach die vier Handgriffe einmal bewusst.

**1. Terminal öffnen** - Menü **Terminal > New Terminal**, oder **F1** und dann `Terminal: Create New Terminal`. Prüf, wo du bist:

```bash
pwd
```

Der Pfad muss auf `javascript-foundations` enden. Wenn nicht, führe `cd javascript-foundations` aus.

**2. Einen Befehl ausführen** und seine Antwort lesen:

```bash
node --version
```

Er gibt etwas wie `v22.11.0` aus. Das ist die erste Prüfung dieses Steps.

**3. Den Test dieses Steps ausführen** und den Fehlschlag lesen:

```bash
node --test test/m0-01-using-the-ide.test.js
```

```
✖ m0-01 the workspace is ready
  AssertionError: Set READY to true in src/m0/ready.js - do not change this test file.
```

**4. Die richtige Datei ändern.** Öffne [`src/m0/ready.js`](file:src/m0/ready.js) im Explorer, ändere in der letzten Zeile `false` zu `true` und speichere mit **Strg+S** (**Cmd+S** auf dem Mac). Ein ungespeicherter Tab zeigt einen Punkt statt eines Kreuzes - Node liest die Datei von der Platte, eine ungespeicherte Änderung ist für Node also unsichtbar.

Führ danach denselben Befehl erneut aus. Drück im Terminal die **Pfeil-nach-oben-Taste**, um ihn zurückzuholen, statt ihn abzutippen.

Dateien unter `test/` sind das Prüfschema. Eine davon zu ändern, damit sie besteht, ist der eine Handgriff, der dir in diesem Kurs nirgends hilft.

## Woran du erkennst, dass es geklappt hat

`node --version` antwortet, und der Test dieses Steps meldet `pass 1` und `fail 0`. Beantworte danach die dritte Aufgabe in eigenen Worten. Jeder folgende Step nennt dir Menüpfad, Tastenkürzel und Befehl direkt an der Handlung, du musst also nie hierher zurück, um etwas nachzuschlagen - aber hier sind sie alle erklärt.

Als Nächstes: [deine erste richtige Übung](step:m0-02-first-run).
