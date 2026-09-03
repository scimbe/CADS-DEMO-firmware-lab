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
    check: { type: question, prompt: { en: "Name the route you used, where the output appeared, and the file you edited. One sentence each.", de: "Nenne den benutzten Weg, wo die Ausgabe erschien, und die geänderte Datei. Je ein Satz." }, rubric: "Three sentences, one per part. Route: the integrated terminal, the command palette via F1, or Terminal > Run Task. Place: the panel at the bottom of the window. File: src/m0/ready.js. Does not pass: a file under test/ named as the one edited, an answer that names fewer than three parts, or 'the terminal' alone without saying it is the bottom panel.", bloom: understand, minChars: 60 }
socratic:
  - trigger: "task:node-runs:failed"
    question: { en: "Nothing came back. Is a terminal open, and does its prompt end in the exercise folder?", de: "Es kam nichts zurück. Ist ein Terminal offen, und endet sein Prompt auf den Übungsordner?" }
    hints: [ { en: "Terminal > New Terminal opens one at the bottom; F1 then 'Terminal: Create New Terminal' does the same.", de: "Terminal > New Terminal öffnet unten eines; F1 und dann 'Terminal: Create New Terminal' tut dasselbe." }, { en: "Type pwd and read the last part of the path against the folder name in the Explorer title.", de: "Tippe pwd und vergleich den letzten Teil des Pfads mit dem Ordnernamen im Explorer-Titel." }, { en: "A new terminal starts one folder above the exercises, so one cd is needed before any command here.", de: "Ein neues Terminal startet einen Ordner über den Übungen, vor jedem Befehl hier fehlt also ein cd." } ]
  - trigger: "task:ready:failed"
    question: { en: "The test still reads the old value. Which file did the change land in, and is it saved?", de: "Der Test liest weiter den alten Wert. In welcher Datei landete die Änderung, und ist sie gespeichert?" }
    hints: [ { en: "Compare the path in the editor tab with the path in the assertion message.", de: "Vergleich den Pfad im Editor-Tab mit dem Pfad in der Assertion-Meldung." }, { en: "The exercise is the file under src/; the file under test/ is the marking scheme and stays untouched.", de: "Die Übung ist die Datei unter src/; die Datei unter test/ ist das Prüfschema und bleibt unberührt." }, { en: "Node reads from disk, so a tab showing a dot instead of a cross is a change Node cannot see yet.", de: "Node liest von der Platte, ein Tab mit Punkt statt Kreuz ist also eine Änderung, die Node noch nicht sieht." } ]
  - trigger: "task:where-things-are:failed"
    question: { en: "Which of the three parts is missing - the route, the place, or the file?", de: "Welcher der drei Teile fehlt - der Weg, der Ort oder die Datei?" }
    hints: [ { en: "Scroll the terminal back to the command you ran; the route is how you opened that terminal.", de: "Scroll im Terminal zum ausgeführten Befehl zurück; der Weg ist, wie du dieses Terminal geöffnet hast." }, { en: "The place is a named region of the window, not the whole window.", de: "Der Ort ist ein benannter Bereich des Fensters, nicht das ganze Fenster." }, { en: "The assertion message named the file you had to change; it is not the file the message came from.", de: "Die Assertion-Meldung nannte die zu ändernde Datei; es ist nicht die Datei, aus der die Meldung kam." } ]
misconceptions:
  - pattern: "Cannot find module|no such file or directory|MODULE_NOT_FOUND"
    question: { en: "Node looked for the file where you started it. Which folder is the terminal sitting in?", de: "Node hat die Datei dort gesucht, wo du es gestartet hast. In welchem Ordner steht das Terminal?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden." }, { en: "cd javascript-foundations puts you there; ls then shows src, test and examples.", de: "cd javascript-foundations bringt dich dorthin; ls zeigt danach src, test und examples." }, { en: "Every command in this course is written relative to that folder, never to your home directory.", de: "Jeder Befehl dieses Kurses ist relativ zu diesem Ordner geschrieben, nie zum Home-Verzeichnis." } ]
  - pattern: ": not found|command not found"
    question: { en: "The shell could not find the program you typed. Was the whole line typed as written?", de: "Die Shell konnte das getippte Programm nicht finden. Wurde die ganze Zeile so getippt, wie sie dasteht?" }
    hints: [ { en: "node --version: all lower case, one space, two dashes.", de: "node --version: alles klein, ein Leerzeichen, zwei Bindestriche." }, { en: "Use the copy button at the top right of a code block in this panel instead of retyping.", de: "Nutze die Kopier-Schaltfläche rechts oben an einem Codeblock in diesem Panel, statt abzutippen." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." } ]
  - pattern: "Set READY to true"
    question: { en: "The test is still reading false. Was the file saved, and was it the file under src/?", de: "Der Test liest weiterhin false. Wurde die Datei gespeichert, und war es die Datei unter src/?" }
    hints: [ { en: "An unsaved file shows a dot instead of a cross on its editor tab. Ctrl+S (Cmd+S) saves it.", de: "Eine ungespeicherte Datei zeigt auf ihrem Editor-Tab einen Punkt statt eines Kreuzes. Strg+S (Cmd+S) speichert sie." }, { en: "Check the path in the tab: it must be src/m0/ready.js, not test/m0-01-using-the-ide.test.js.", de: "Prüfe den Pfad im Tab: er muss src/m0/ready.js sein, nicht test/m0-01-using-the-ide.test.js." }, { en: "Node reads the file from disk at every run, so an unsaved change cannot be seen.", de: "Node liest die Datei bei jedem Lauf von der Platte, eine ungespeicherte Änderung ist also unsichtbar." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Bedien diesen Editor sicher genug für jeden Step: Terminal öffnen, Befehl ausführen, Ausgabe lesen, die richtige Datei ändern.

## Das tust du zuerst

**1. Terminal öffnen.** Menü **Terminal > New Terminal**, oder **F1** drücken und `Terminal: Create New Terminal` tippen. Es öffnet sich im Panel unten. Prüf, wo es steht:

```bash
pwd
```

Der Pfad muss auf `javascript-foundations` enden. Wenn nicht, führe `cd javascript-foundations` aus.

**2. Einen Befehl ausführen.**

```bash
node --version
```

Er antwortet `v22.` oder höher. Das ist die erste Prüfung dieses Steps.

**3. Den Test dieses Steps ausführen** und den Fehlschlag lesen.

```bash
node --test test/m0-01-using-the-ide.test.js
```

**4. Die im Fehlschlag genannte Datei ändern** - [`src/m0/ready.js`](file:src/m0/ready.js) - von `false` auf `true`, mit **Strg+S** (**Cmd+S** auf dem Mac) speichern und den Befehl erneut ausführen. Die **Pfeil-nach-oben-Taste** holt ihn zurück, ohne ihn abzutippen.

Dateien unter `test/` sind das Prüfschema. Eine davon zu ändern, damit sie besteht, ist der eine Handgriff, der in diesem Kurs nirgends hilft.

## Was auf deinem Bildschirm ist

| Wo | Was es ist | Was du dort tust |
|---|---|---|
| Linker Rand, senkrechte Leiste | Aktivitätsleiste. Das Doktorhut-Symbol ist **CaDS Tutor**. | Tutor öffnen, Step wählen. |
| Links, breite Spalte | Explorer: die Dateien von `javascript-foundations`. | `src/…`-Dateien per Klick öffnen. |
| Mitte | Editor. Ein Tab je geöffneter Datei. | Code schreiben. |
| Unten | Panel: **Terminal**, **Problems**, **Output**. Ein-/ausblenden über **View > Terminal**. | Befehle ausführen, Ausgabe lesen. |

Dieser Step selbst ist das **Tutor-Panel**. Jede Aufgabe dort hat eine Prüf-Schaltfläche; ein Druck darauf führt die Prüfung aus und schreibt das Urteil daneben.

![Das Tutor-Panel neben dem Editor, links der Kursbaum, rechts die Abzeichen und der Text des Steps](tutor-panel-step.png)
*Wo du bist: links der Kursbaum, rechts dieser Step. Die Abzeichen nennen Bloom-Stufe, Art der Anleitung und geschätzte Zeit.*

![Die Aufgabenliste des Panels, die ersten beiden Prüfungen bestanden, je ein grüner Haken daneben](tutor-panel-checks.png)
*Die Aufgabenliste. **Check** führt eine Aufgabe aus, **Show hint** öffnet die Hinweise Stufe für Stufe, und eine `question`-Aufgabe beantwortest du im Textfeld.*

## Drei Wege, etwas auszuführen

Alle drei tun dasselbe; verschiedene Steps nennen verschiedene.

![Das Anwendungsmenü ist auf Terminal geöffnet und zeigt oben New Terminal und weiter unten Run Task](ide-terminal-menu.png)
*Weg 1 und 3: die Menü-Schaltfläche links oben, dann **Terminal**. **New Terminal** öffnet eine Shell; **Run Task…** bietet vorbereitete Befehle, deren Ausgabe unter **Terminal** in einem nach dem Task benannten Tab erscheint.*

![Die Befehlspalette ist geöffnet, darin steht Terminal: Create New Terminal](ide-command-palette.png)
*Weg 2: **F1**. Im Browser besser als Strg+Umschalt+P, das der Browser abfangen kann. Das Feld kommt mit einem `>` - lass es stehen und tippe die ersten Buchstaben.*

## Einen fertigen Befehl von einem laufenden unterscheiden

Während ein Befehl läuft, fehlt der Prompt; am Ende kommt er zurück. `node --test` gibt danach einen Block aus Zählern aus, und einer dieser Zähler ist das Urteil.

![Das integrierte Terminal zeigt einen fehlschlagenden Test: die Assertion-Meldung, die Datei, aus der sie kam, und den Prompt am Ende](ide-test-failing.png)
*Ein fehlgeschlagener Lauf: das Kreuz, die Assertion-Meldung, die Herkunftsdatei und der Prompt wieder da - fertig, nur nicht bestanden.*

![Der Editor zeigt READY auf true geändert und einen Punkt statt eines Kreuzes im Tab ready.js](ide-edit-unsaved.png)
*Ein Punkt im Tab heißt, die Änderung steht nur im Editor. Node liest von der Platte, also vor dem nächsten Lauf speichern.*

![Das Terminal zeigt denselben Test bestanden, mit pass 1 und fail 0](ide-test-passing.png)
*Erfolg: ein grüner Haken, und beide Zähler stehen.*

Die Ausgabe bleibt nach dem Ende im Terminal stehen, scroll also zum Nachlesen hoch. Ein Terminal über das Papierkorb-Symbol zu schließen wirft sie weg - findest du nicht, was ein Befehl ausgab, prüf, ob du auf ein *neues*, leeres Terminal schaust.

![Das Terminal meldet, dass es die Testdatei nicht findet, weil es einen Ordner zu hoch steht](ide-wrong-folder.png)
*`Could not find 'test/…'` heißt falscher Ordner: ein neues Terminal startet in `~/workspace`, eine Ebene über den Übungen.*

## Woran du erkennst, dass es geklappt hat

`node --version` hat geantwortet, und der Test dieses Steps zeigt beide Zähler gesetzt. Beantworte dann die dritte Aufgabe. Eines lohnt sich einmal auszuprobieren, weil die Antwort nicht naheliegt:

```bash
node src/m0/ready.js
```

Eine Übungsdatei direkt auszuführen prüft nichts - Übungsdateien exportieren nur Funktionen, die ein Test aufruft. Jede gibt einen Hinweis aus, der den Befehl nennt, der deine Arbeit wirklich prüft.

Als Nächstes: [deine erste richtige Übung](step:m0-02-first-run).
