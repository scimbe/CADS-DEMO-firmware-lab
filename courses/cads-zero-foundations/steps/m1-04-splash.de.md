---
id: m1-04-splash
title: Die Boot-Wortmarke ändern
bloom: apply
objectives: [cz.gui.canvas]
requires: [m1-03-sim-vs-board]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m1-02-hal-boundary]
links:
  - { step: m2-01-memory-map }
  - { file: "gui/cads_splash.c", line: 33 }
  - { doc: "docs/reference/canvas.md" }
  - { file: "apps/bringup/explorer.c", line: 359 }
sources: [gui/cads_splash.c, gui/cads_splash.h, docs/reference/canvas.md, apps/bringup/bringup.c, apps/bringup/explorer.c]
tasks:
  - id: edit-wordmark
    title: Der Zeichenaufruf übergibt jetzt M1 LAB
    check: { type: command, cwd: ".", command: "grep -nE 'cads_font24, .*M1 LAB.*, CadsColor' gui/cads_splash.c", expectExitCode: 0 }
  - id: rebuild
    title: Die Firmware baut mit deiner Änderung
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: splash-linked
    title: Der Splash ist weiterhin Teil des Images
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_splash_draw" }
misconceptions:
  - { pattern: "missing terminating", question: { en: "The compiler complains about a string that never ends. How many quote characters are in the line you edited?", de: "Der Compiler beklagt eine Zeichenkette, die nicht zu Ende ist. Wie viele Anführungszeichen stehen jetzt in der Zeile, die du geändert hast?" }, hints: [ { en: "When a literal is replaced, one of its two quotes is easily lost. The error then sits in the very line you touched.", de: "Beim Ersetzen eines Literals geht leicht eines der beiden Anführungszeichen verloren. Der Fehler steht dann in genau der Zeile, die du angefasst hast." }, { en: "Open gui/cads_splash.c with Ctrl/Cmd+P and jump to the line from the message with Ctrl/Cmd+G; the editor colours everything after an unclosed quote as text.", de: "Öffne gui/cads_splash.c mit Strg/Cmd+P und spring mit Strg/Cmd+G auf die Zeile aus der Meldung; der Editor färbt alles nach einem offenen Anführungszeichen als Text ein." }, { en: "A C string literal opens and closes with the same straight quote, and both must sit in one line. Typographic quotes pasted from a text editor do not count.", de: "Ein C-String-Literal öffnet und schließt mit demselben geraden Anführungszeichen, und beide müssen in einer Zeile stehen. Typografische Anführungszeichen aus einer Textverarbeitung zählen nicht." } ] }
  - { pattern: "error: expected", question: { en: "The error names a character it expected. Is your new text still inside the call, with everything around it untouched?", de: "Der Fehler nennt ein Zeichen, das er erwartet hat. Steht dein neuer Text noch vollständig im Aufruf, mit allem drumherum unangetastet?" }, hints: [ { en: "Usually the word itself is not wrong; a comma, a bracket or the semicolon of the call went missing with it.", de: "Meistens ist nicht das Wort falsch, sondern ein Komma, eine Klammer oder das Semikolon des Aufrufs ist mit verschwunden." }, { en: "Open gui/cads_splash.c and compare the line with the code block in this step, argument by argument, from left to right.", de: "Öffne gui/cads_splash.c und vergleich die Zeile mit dem Codeblock in diesem Step, Argument für Argument, von links nach rechts." }, { en: "The call takes five arguments in a fixed order; only the fourth is meant to change, everything else stays as it is.", de: "Der Aufruf hat fünf Argumente in fester Reihenfolge; nur das vierte soll sich ändern, alles andere bleibt, wie es ist." } ] }
  - { pattern: "ELF not found", question: { en: "This check reads a file only one of the two builds writes. Which preset writes into build/itsboard?", de: "Dieser Check liest eine Datei, die nur einer der beiden Builds schreibt. Welches Preset schreibt nach build/itsboard?" }, hints: [ { en: "Usually the symbol is not missing: the ELF itself is, because the board build has not run yet or stopped earlier.", de: "Meistens fehlt nicht das Symbol, sondern die ELF selbst — der Board-Build lief noch nicht oder brach vorher ab." }, { en: "Start the board build from Terminal, Run Build Task... (Ctrl/Cmd+Shift+B), or press Check on the task The firmware builds with your change.", de: "Starte den Board-Build über Terminal, Run Build Task... (Strg/Cmd+Shift+B), oder drücke Prüfen bei der Aufgabe Die Firmware baut mit deiner Änderung." }, { en: "The host build writes into build/host and produces no ELF for the Arm core; only the itsboard preset creates build/itsboard/cads-zero.elf.", de: "Der Host-Build schreibt nach build/host und erzeugt keine ELF für den Arm-Kern; nur das Preset itsboard legt build/itsboard/cads-zero.elf an." } ] }
socratic:
  - { trigger: "task:edit-wordmark:failed", question: { en: "The check wants the token inside the argument list of the drawing call. Is your text there, or beside it?", de: "Der Check verlangt das Token in der Argumentliste des Zeichenaufrufs. Steht dein Text dort — oder daneben?" }, hints: [ { en: "The commonest cause is an unsaved file, or the token written into a comment; the check reads the file from disk and looks at the call line only.", de: "Die häufigste Ursache ist eine ungespeicherte Datei oder das Token in einem Kommentar; der Check liest die Datei von der Platte und sieht nur die Aufrufzeile an." }, { en: "Open gui/cads_splash.c with Ctrl/Cmd+P and search with Ctrl/Cmd+F for cads_font24; that hit is the only line the check inspects.", de: "Öffne gui/cads_splash.c mit Strg/Cmd+P und such mit Strg/Cmd+F nach cads_font24; diese Trefferzeile ist die einzige, die der Check ansieht." }, { en: "The token has to read exactly M1 LAB — capitals, exactly one space — and stand between the font argument and the colour argument.", de: "Das Token muss exakt M1 LAB lauten — Großbuchstaben, genau ein Leerzeichen — und zwischen dem Font-Argument und dem Farbargument stehen." } ] }
  - { trigger: "task:rebuild:failed", question: { en: "A build looks for source errors first and for room in memory last. Which of the two stages does yours stop at?", de: "Ein Build sucht zuerst Fehler im Quelltext und ganz zuletzt Platz im Speicher. Bei welcher der beiden Stufen bleibt deiner stehen?" }, hints: [ { en: "After a change to one string literal the change itself is almost always the cause, not the environment — the same build ran in m0-03.", de: "Nach einer Änderung an einem einzigen String-Literal ist fast immer die Änderung selbst schuld, nicht die Umgebung — derselbe Build lief in m0-03 durch." }, { en: "The task's terminal opens at the bottom of the window; scroll in it to the FIRST red line. It names a file and a line number, and Ctrl/Cmd+G takes you there.", de: "Das Terminal des Tasks klappt unten im Fenster auf; scroll darin zur ERSTEN roten Zeile. Sie nennt Datei und Zeilennummer, und mit Strg/Cmd+G springst du dorthin." }, { en: "Compiler errors name a file and a line; linker errors name a section, a region or a symbol. A longer string moves bytes but cannot cause a compiler error.", de: "Compilerfehler nennen Datei und Zeile; Linkerfehler nennen Sektion, Bereich oder Symbol. Ein längerer Text verschiebt Bytes, kann aber keinen Compilerfehler auslösen." } ] }
  - { trigger: "task:splash-linked:failed", question: { en: "The check reads one symbol out of the ELF. Is the symbol missing, or is the ELF missing?", de: "Der Check liest ein Symbol aus der ELF. Fehlt das Symbol — oder fehlt die ELF?" }, hints: [ { en: "Usually the splash has not vanished: the ELF is older than your change, or was never produced at all.", de: "Meistens ist nicht der Splash verschwunden: die ELF ist älter als deine Änderung oder gar nicht erst entstanden." }, { en: "Check in the explorer (Ctrl/Cmd+Shift+E) whether build/itsboard/cads-zero.elf exists, and otherwise run the previous task once more.", de: "Sieh im Explorer (Strg/Cmd+Shift+E) nach, ob build/itsboard/cads-zero.elf existiert, und lass sonst die vorige Aufgabe noch einmal laufen." }, { en: "With --gc-sections the linker drops every function nobody calls. If cads_splash_draw really is gone, its one caller in apps/bringup/explorer.c is the place to look.", de: "Mit --gc-sections wirft der Linker jede Funktion weg, die niemand aufruft. Ist cads_splash_draw wirklich fort, ist sein einziger Aufrufer in apps/bringup/explorer.c die Stelle zum Nachsehen." } ] }
---
## Lernziel

Mache deine erste echte Änderung an der Firmware — eine Zeichenkette im Bootbildschirm — und trage sie durch Build und Link auf beiden Seiten der HAL.

## Wo der Splash lebt

Öffne `gui/cads_splash.c` mit `Strg`/`Cmd`+`P` und dem getippten Dateinamen; die Zeile, um die es geht, ist Zeile 33, erreichbar mit `Strg`/`Cmd`+`G`.

Die Datei ist portabler Code in der Bibliothek `cads_gui`: sie zeichnet ins Canvas und spricht nie mit Hardware. `cads_splash_draw_mark()` löscht das Canvas auf `CadsColorBackground`, zeichnet die CaDS-Marke zentriert etwas oberhalb der Mitte, legt eine Akzentlinie in `CadsColorAccent` darunter und setzt dann die Wortmarke:

```c
cads_rect_t title = {0, (int16_t)(rule_y + 12), CADS_CANVAS_WIDTH, 34};
cads_canvas_draw_text_aligned(
    title, CadsAlignCenter, &cads_font24, "Z E R O", CadsColorBrandLight);
```

Der Text `"Z E R O"` in dieser Zeile ist ein **String-Literal** — eine Zeichenkette, die wörtlich im Quelltext steht und beim Übersetzen zu Bytes im Programm wird. Genau dieses vierte Argument ist das, was du gleich änderst; die vier anderen bleiben unangetastet.

`cads_canvas_draw_text_aligned()` richtet Text in einem Kasten aus und zentriert ihn vertikal (`docs/reference/canvas.md`). Die Farben sind **Palettenplätze**, keine RGB-Werte — `CadsColorBrandLight` ist Platz 3, das Löwenblau `#B5C4D8`. Der Framebuffer ist **4 bpp indiziert**: vier Bit je Bildpunkt, also sechzehn mögliche Werte, und jeder Wert ist nicht selbst eine Farbe, sondern die Nummer eines Platzes in einer **Palette** — einer Tabelle mit sechzehn Einträgen, die erst sagt, welche Farbe der Platz gerade hat. Deshalb ist ein späterer Themenwechsel eine Tabelle, kein Neuzeichnen.

Zwei Dinge aus dem Header lohnen den Blick. `cads_splash_draw()` zeichnet, **flusht aber nicht**: der Aufrufer entscheidet, wann der Bildschirm einen Vollbild-Transfer wert ist. Wie teuer der ist, steht im Descriptor aus `m1-02` — bei den dort gemessenen 342 000 Pixeln je Sekunde kostet ein voller Schirm rund 448 ms. Und `cads_splash_draw_progress()` zeichnet bei jedem Aufruf den ganzen Bildschirm neu, sodass die Boot-Animation keinen separaten Löschschritt braucht.

## Warum das eine gute erste Änderung ist

Die Änderung ist ein einziges String-Literal, aber die Prüfkette dahinter ist die eigentliche Lektion — dieselbe dreistufige Evidenz benutzt du für jede spätere Änderung: Quelle, Build, Image.

1. **Quelle.** Der erste Check sucht das Token nicht irgendwo in der Datei, sondern in der Argumentliste des Zeichenaufrufs, zwischen dem Font- und dem Farbargument. Ein Kommentar mit demselben Wort besteht ihn nicht; nur ein Text, der wirklich gezeichnet wird.
2. **Build.** Der Board-Build beweist, dass die Änderung unter der Cross-Toolchain kompiliert und noch in die Speicherzusicherungen des Linkers passt.
3. **Image.** `symbolInElf` beweist, dass `cads_splash_draw` weiterhin in `cads-zero.elf` gelinkt ist. Das ist hier kein Selbstzweck: der Linker läuft mit **`--gc-sections`** — einer Option, die am Ende jede Funktion und jede Datenkonstante wieder aus dem Image wirft, die von keiner Stelle mehr aufgerufen oder benutzt wird. Eine Funktion, die niemand referenziert, verschwände also stillschweigend, und im Image stünde kein Splash mehr, ohne dass irgendein Werkzeug sich beschwert hätte.

Dieselbe Datei baut auch in den Host-Simulator, nach diesem Step zeigen also der Bootbildschirm im SDL-Fenster und auf dem Panel deinen Text aus demselben Objektcode.

## Deine Aufgabe

1. Öffne `gui/cads_splash.c` (`Strg`/`Cmd`+`P`, Dateinamen tippen) und geh auf Zeile 33.
2. Ersetze im Zeichenaufruf das vierte Argument `"Z E R O"` so, dass die übergebene Zeichenkette das exakte Token `M1 LAB` enthält — zum Beispiel `"M1 LAB"`. Lass Komma, Klammern und die anderen vier Argumente stehen.
3. Speichere die Datei (`Strg`/`Cmd`+`S`) und drücke unten in diesem Panel bei jeder der drei Aufgaben **Prüfen**; die zweite startet den Board-Build selbst.

Flashe das Ergebnis, wenn du den Text auf dem Panel sehen willst. Das nächste Modul geht unter die HAL und schaut, in welchem Speicher dieses Image tatsächlich landet.
