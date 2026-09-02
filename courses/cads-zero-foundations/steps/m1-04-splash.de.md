---
id: m1-04-splash
title: Die Boot-Wortmarke ändern
bloom: apply
objectives: [cz.gui.canvas]
requires: [m1-03-sim-vs-board]
estimatedMinutes: 15
links:
  - { step: m2-01-memory-map }
  - { file: "gui/cads_splash.c", line: 33 }
  - { doc: "docs/reference/canvas.md" }
sources: [gui/cads_splash.c, gui/cads_splash.h, docs/reference/canvas.md, apps/bringup/bringup.c]
tasks:
  - id: edit-wordmark
    title: Die Wortmarke enthält jetzt M1 LAB
    check: { type: fileMatches, file: "gui/cads_splash.c", pattern: "M1 LAB" }
  - id: rebuild
    title: Die Firmware baut mit deiner Änderung
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: splash-linked
    title: Der Splash ist weiterhin Teil des Images
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_splash_draw" }
socratic:
  - { trigger: "task:edit-wordmark:failed", question: { en: "The check looks for the exact token in the C source, not on the panel. Which string literal does cads_splash_draw_mark() hand to cads_canvas_draw_text_aligned(), and did you edit that one?", de: "Der Check sucht das exakte Token im C-Quelltext, nicht auf dem Panel. Welches String-Literal übergibt cads_splash_draw_mark() an cads_canvas_draw_text_aligned(), und hast du genau dieses geändert?" }, hints: [ { en: "Search gui/cads_splash.c for \"Z E R O\".", de: "Suche in gui/cads_splash.c nach \"Z E R O\"." }, { en: "The token must be exactly M1 LAB - one space, capital letters - inside the double quotes.", de: "Das Token muss exakt M1 LAB lauten - ein Leerzeichen, Großbuchstaben - innerhalb der Anführungszeichen." }, { en: "Save the file; the check reads it from disk, and format-on-save will not touch a string literal.", de: "Speichere die Datei; der Check liest sie von der Platte, und Format-on-Save fasst ein String-Literal nicht an." } ] }
---
## Lernziel

Mache deine erste echte Änderung an der Firmware — eine Zeichenkette im Bootbildschirm — und trage sie durch Build und Link auf beiden Seiten der HAL.

## Wo der Splash lebt

`gui/cads_splash.c` ist portabler Code in der Bibliothek `cads_gui`: er zeichnet ins Canvas und spricht nie mit Hardware. `cads_splash_draw_mark()` löscht das Canvas auf `CadsColorBackground`, zeichnet die CaDS-Marke zentriert etwas oberhalb der Mitte, legt eine Akzentlinie in `CadsColorAccent` darunter und setzt dann die Wortmarke:

```c
cads_rect_t title = {0, (int16_t)(rule_y + 12), CADS_CANVAS_WIDTH, 34};
cads_canvas_draw_text_aligned(
    title, CadsAlignCenter, &cads_font24, "Z E R O", CadsColorBrandLight);
```

`cads_canvas_draw_text_aligned()` richtet Text in einem Kasten aus und zentriert ihn vertikal (`docs/reference/canvas.md`). Die Farben sind **Palettenplätze**, keine RGB-Werte — `CadsColorBrandLight` ist Platz 3, das Löwenblau `#B5C4D8`. Weil der Framebuffer 4 bpp indiziert ist, ist ein späterer Themenwechsel eine Tabelle, kein Neuzeichnen.

Zwei Dinge aus dem Header lohnen den Blick. `cads_splash_draw()` zeichnet, **flusht aber nicht**: der Aufrufer entscheidet, wann der Bildschirm einen Vollbild-Transfer wert ist, denn auf diesem Bus kostet der Hunderte Millisekunden. Und `cads_splash_draw_progress()` zeichnet bei jedem Aufruf den ganzen Bildschirm neu, sodass die Boot-Animation keinen separaten Löschschritt braucht.

## Warum das eine gute erste Änderung ist

Die Änderung ist ein einziges String-Literal, aber die Prüfkette dahinter ist die eigentliche Lektion. `fileMatches` beweist, dass sich die Quelle geändert hat. Der Board-Build beweist, dass die Änderung unter der Cross-Toolchain kompiliert und noch in die Speicherzusicherungen des Linkers passt. `symbolInElf` beweist, dass `cads_splash_draw` weiterhin in `cads-zero.elf` gelinkt ist — der Linker läuft mit `--gc-sections`, eine Funktion, die niemand referenziert, verschwände stillschweigend aus dem Image. Genau diese dreistufige Evidenz benutzt du für jede spätere Änderung: Quelle, Build, Image.

Dieselbe Datei baut auch in den Host-Simulator, nach diesem Step zeigen also der Bootbildschirm im SDL-Fenster und auf dem Panel deinen Text aus demselben Objektcode.

## Deine Aufgabe

1. Öffne `gui/cads_splash.c` und finde das Wortmarken-Literal `"Z E R O"` (Zeile 33).
2. Ändere es so, dass die Zeichenkette das exakte Token `M1 LAB` enthält — zum Beispiel `"M1 LAB"`.
3. Speichere und führe **CaDS: Build** aus.

Die drei Checks bestätigen Änderung, Build und Symbol im Image. Flashe es, wenn du den Text auf dem Panel sehen willst. Das nächste Modul geht unter die HAL und schaut, in welchem Speicher dieses Image tatsächlich landet.
