---
id: m1-04-splash
title: Change the boot wordmark
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
    title: The drawing call now hands over M1 LAB
    check: { type: command, cwd: ".", command: "cc -E -P -Igui -Icore gui/cads_splash.c | paste -sd ' ' - | grep -qE 'cads_font24,[^;]*M1 LAB[^;]*CadsColor'", expectExitCode: 0 }
  - id: rebuild
    title: The firmware builds with your change
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: splash-linked
    title: The splash is still part of the image
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_splash_draw" }
misconceptions:
  - { pattern: "missing terminating", question: { en: "The compiler complains about a string that never ends. How many quote characters are in the line you edited?", de: "Der Compiler beklagt eine Zeichenkette, die nicht zu Ende ist. Wie viele Anführungszeichen stehen jetzt in der Zeile, die du geändert hast?" }, hints: [ { en: "When a literal is replaced, one of its two quotes is easily lost. The error then sits in the very line you touched.", de: "Beim Ersetzen eines Literals geht leicht eines der beiden Anführungszeichen verloren. Der Fehler steht dann in genau der Zeile, die du angefasst hast." }, { en: "Open gui/cads_splash.c with Ctrl/Cmd+P and jump to the line from the message with Ctrl/Cmd+G; the editor colours everything after an unclosed quote as text.", de: "Öffne gui/cads_splash.c mit Strg/Cmd+P und spring mit Strg/Cmd+G auf die Zeile aus der Meldung; der Editor färbt alles nach einem offenen Anführungszeichen als Text ein." }, { en: "A C string literal opens and closes with the same straight quote, and both must sit in one line. Typographic quotes pasted from a text editor do not count.", de: "Ein C-String-Literal öffnet und schließt mit demselben geraden Anführungszeichen, und beide müssen in einer Zeile stehen. Typografische Anführungszeichen aus einer Textverarbeitung zählen nicht." } ] }
  - { pattern: "error: expected", question: { en: "The error names a character it expected. Is your new text still inside the call, with everything around it untouched?", de: "Der Fehler nennt ein Zeichen, das er erwartet hat. Steht dein neuer Text noch vollständig im Aufruf, mit allem drumherum unangetastet?" }, hints: [ { en: "Usually the word itself is not wrong; a comma, a bracket or the semicolon of the call went missing with it.", de: "Meistens ist nicht das Wort falsch, sondern ein Komma, eine Klammer oder das Semikolon des Aufrufs ist mit verschwunden." }, { en: "Open gui/cads_splash.c and compare the line with the code block in this step, argument by argument, from left to right.", de: "Öffne gui/cads_splash.c und vergleich die Zeile mit dem Codeblock in diesem Step, Argument für Argument, von links nach rechts." }, { en: "The call takes five arguments in a fixed order; only the fourth is meant to change, everything else stays as it is.", de: "Der Aufruf hat fünf Argumente in fester Reihenfolge; nur das vierte soll sich ändern, alles andere bleibt, wie es ist." } ] }
  - { pattern: "ELF not found", question: { en: "This check reads a file only one of the two builds writes. Which preset writes into build/itsboard?", de: "Dieser Check liest eine Datei, die nur einer der beiden Builds schreibt. Welches Preset schreibt nach build/itsboard?" }, hints: [ { en: "Usually the symbol is not missing: the ELF itself is, because the board build has not run yet or stopped earlier.", de: "Meistens fehlt nicht das Symbol, sondern die ELF selbst — der Board-Build lief noch nicht oder brach vorher ab." }, { en: "Start the board build from Terminal, Run Build Task... (Ctrl/Cmd+Shift+B), or press Check on the task The firmware builds with your change.", de: "Starte den Board-Build über Terminal, Run Build Task... (Strg/Cmd+Shift+B), oder drücke Prüfen bei der Aufgabe Die Firmware baut mit deiner Änderung." }, { en: "The host build writes into build/host and produces no ELF for the Arm core; only the itsboard preset creates build/itsboard/cads-zero.elf.", de: "Der Host-Build schreibt nach build/host und erzeugt keine ELF für den Arm-Kern; nur das Preset itsboard legt build/itsboard/cads-zero.elf an." } ] }
socratic:
  - { trigger: "task:edit-wordmark:failed", question: { en: "The check wants the token inside the argument list of the drawing call. Is your text there, or beside it?", de: "Der Check verlangt das Token in der Argumentliste des Zeichenaufrufs. Steht dein Text dort — oder daneben?" }, hints: [ { en: "Have you saved - and is your text really inside the call rather than in a comment? The check runs the file through the preprocessor first, and the preprocessor throws comments away.", de: "Hast du gespeichert - und steht dein Text wirklich im Aufruf und nicht in einem Kommentar? Der Check gibt die Datei zuerst durch den Präprozessor, und der wirft Kommentare weg." }, { en: "Open gui/cads_splash.c with Ctrl/Cmd+P and search with Ctrl/Cmd+F for cads_font24; that call is what the check sees after the preprocessor has run.", de: "Öffne gui/cads_splash.c mit Strg/Cmd+P und such mit Strg/Cmd+F nach cads_font24; genau diesen Aufruf sieht der Check nach dem Präprozessorlauf." }, { en: "The token has to read exactly M1 LAB — capitals, exactly one space — and stand between the font argument and the colour argument.", de: "Das Token muss exakt M1 LAB lauten — Großbuchstaben, genau ein Leerzeichen — und zwischen dem Font-Argument und dem Farbargument stehen." } ] }
  - { trigger: "task:rebuild:failed", question: { en: "A build looks for source errors first and for room in memory last. Which of the two stages does yours stop at?", de: "Ein Build sucht zuerst Fehler im Quelltext und ganz zuletzt Platz im Speicher. Bei welcher der beiden Stufen bleibt deiner stehen?" }, hints: [ { en: "Does the first red line name the file you edited? After a change to one string literal the change itself is almost always the cause, not the environment — the same build ran in m0-03.", de: "Nennt die erste rote Zeile die Datei, die du geändert hast? Nach einer Änderung an einem einzigen String-Literal ist fast immer die Änderung selbst schuld, nicht die Umgebung — derselbe Build lief in m0-03 durch." }, { en: "The task's terminal opens at the bottom of the window; scroll in it to the FIRST red line. It names a file and a line number, and Ctrl/Cmd+G takes you there.", de: "Das Terminal des Tasks klappt unten im Fenster auf; scroll darin zur ERSTEN roten Zeile. Sie nennt Datei und Zeilennummer, und mit Strg/Cmd+G springst du dorthin." }, { en: "Compiler errors name a file and a line; linker errors name a section, a region or a symbol. A longer string moves bytes but cannot cause a compiler error.", de: "Compilerfehler nennen Datei und Zeile; Linkerfehler nennen Sektion, Bereich oder Symbol. Ein längerer Text verschiebt Bytes, kann aber keinen Compilerfehler auslösen." } ] }
  - { trigger: "task:splash-linked:failed", question: { en: "The check reads one symbol out of the ELF. Is the symbol missing, or is the ELF missing?", de: "Der Check liest ein Symbol aus der ELF. Fehlt das Symbol — oder fehlt die ELF?" }, hints: [ { en: "Is the symbol missing, or the ELF? Usually the splash has not vanished — the ELF is older than your change, or was never produced at all.", de: "Fehlt das Symbol oder die ELF? Meistens ist nicht der Splash verschwunden — die ELF ist älter als deine Änderung oder gar nicht erst entstanden." }, { en: "Check in the explorer (Ctrl/Cmd+Shift+E) whether build/itsboard/cads-zero.elf exists, and otherwise run the previous task once more.", de: "Sieh im Explorer (Strg/Cmd+Shift+E) nach, ob build/itsboard/cads-zero.elf existiert, und lass sonst die vorige Aufgabe noch einmal laufen." }, { en: "With --gc-sections the linker drops every function nobody calls. If cads_splash_draw really is gone, its one caller in apps/bringup/explorer.c is the place to look.", de: "Mit --gc-sections wirft der Linker jede Funktion weg, die niemand aufruft. Ist cads_splash_draw wirklich fort, ist sein einziger Aufrufer in apps/bringup/explorer.c die Stelle zum Nachsehen." } ] }
---
## Learning goal

Make your first real change to the firmware — one string in the boot screen — and carry it through build and link on both sides of the HAL.

## Where the splash lives

Open `gui/cads_splash.c` with `Ctrl`/`Cmd`+`P` and by typing the file name; the line in question is line 33, reachable with `Ctrl`/`Cmd`+`G`.

The file is portable code in the `cads_gui` library: it draws into the canvas and never talks to hardware. `cads_splash_draw_mark()` clears the canvas to `CadsColorBackground`, draws the CaDS mark centred slightly above the middle, lays an accent rule in `CadsColorAccent` under it, and then places the wordmark:

```c
cads_rect_t title = {0, (int16_t)(rule_y + 12), CADS_CANVAS_WIDTH, 34};
cads_canvas_draw_text_aligned(
    title, CadsAlignCenter, &cads_font24, "Z E R O", CadsColorBrandLight);
```

The text `"Z E R O"` in that line is a **string literal** — a run of characters written out in the source that becomes bytes in the program when it is compiled. That fourth argument is exactly what you are about to change; the other four stay untouched.

`cads_canvas_draw_text_aligned()` aligns text within a box and centres it vertically (`docs/reference/canvas.md`). The colours are **palette slots**, not RGB values — `CadsColorBrandLight` is slot 3, the lion blue `#B5C4D8`. The framebuffer is **4 bpp indexed**: four bits per pixel, so sixteen possible values, and each value is not a colour itself but the number of a slot in a **palette** — a sixteen-entry table that says what colour the slot currently has. That is why changing a theme later is one table, not a repaint.

Two things the header documents are worth noticing. `cads_splash_draw()` draws but **does not flush**: the caller decides when the screen is worth a full-screen transfer. How expensive that is stands in the descriptor from `m1-02` — at the 342 000 pixels per second measured there, a full screen costs roughly 448 ms. And `cads_splash_draw_progress()` redraws the whole screen each call, so the boot animation needs no separate erase step.

## Why this is a good first edit

The change is one string literal, but the check chain behind it is the real lesson — and it is the same three-stage evidence you will use for every later change: source, build, image.

1. **Source.** The first check runs `gui/cads_splash.c` through the C preprocessor and only then looks for the token inside the argument list of the drawing call, between the font argument and the colour argument. The preprocessor throws comments away — a commented-out call carrying the same word therefore does not pass it; only text that is actually drawn.
2. **Build.** The board build proves the change compiles under the cross toolchain and still fits the linker's memory assertions.
3. **Image.** `symbolInElf` proves `cads_splash_draw` is still linked into `cads-zero.elf`. That is not ceremony here: the linker runs with **`--gc-sections`** — an option that, at the very end, throws every function and data constant back out of the image that nothing calls or uses any more. A function nobody references would therefore disappear silently, leaving an image with no splash in it and not one tool complaining.

The same file also builds into the host simulator, so after this step the boot screen in the SDL window and on the panel show your text from the same object code.

## Your task

1. Open `gui/cads_splash.c` (`Ctrl`/`Cmd`+`P`, type the file name) and go to line 33.
2. Replace the fourth argument `"Z E R O"` in the drawing call so that the string handed over contains the exact token `M1 LAB` — for instance `"M1 LAB"`. Leave the comma, the brackets and the other four arguments alone.
3. Save the file (`Ctrl`/`Cmd`+`S`) and press **Check** on each of the three tasks at the bottom of this panel; the second one starts the board build itself.

Flash the result if you want to see the text on the panel. The next module goes below the HAL to see what memory this image actually lands in.
