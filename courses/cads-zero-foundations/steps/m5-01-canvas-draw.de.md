---
id: m5-01-canvas-draw
title: Auf dem 4-bpp-Canvas zeichnen
bloom: apply
objectives: [cz.gui.canvas]
requires: [m4-05-stack-sizing]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: m5-02-view-dispatcher }
  - { doc: "docs/reference/canvas.md" }
  - { file: "gui/canvas.h", line: 40 }
  - { file: "gui/canvas.c", line: 18 }
  - { file: "gui/cads_splash.c", line: 65 }
sources: [docs/reference/canvas.md, gui/canvas.h, gui/canvas.c, gui/cads_splash.c, docs/explanation/why-4bpp.md]
misconceptions:
  - { pattern: "undefined reference to", question: { en: "The compiler was happy and the linker was not. What does that tell you about where the name is known and where it is missing?", de: "Der Compiler war zufrieden, der Linker nicht. Was sagt dir das darüber, wo der Name bekannt ist und wo er fehlt?" }, hints: [ { en: "A declaration in a header satisfies the compiler; only a definition in a compiled object satisfies the linker.", de: "Eine Deklaration im Header stellt den Compiler zufrieden; nur eine Definition in einem übersetzten Objekt stellt den Linker zufrieden." }, { en: "Check the spelling of the symbol in the error against the one in gui/canvas.h - a single wrong character produces exactly this message.", de: "Vergleich die Schreibweise des Symbols in der Fehlermeldung mit der in gui/canvas.h - ein einziges falsches Zeichen erzeugt genau diese Meldung." }, { en: "If the spelling is right, the library holding the definition is not linked into this target; that is a CMake question, not a C one.", de: "Stimmt die Schreibweise, ist die Bibliothek mit der Definition nicht in dieses Target gelinkt; das ist eine CMake-Frage, keine C-Frage." } ] }
tasks:
  - id: magenta-rect
    title: Das Testmuster ruft fill_rect mit dem fehlenden Slot auf
    check: { type: command, cwd: ".", command: "cc -E -P -Igui -Icore gui/cads_splash.c | paste -sd ' ' - | grep -qE 'cads_canvas_fill_rect[(][^;]*CadsColorMagenta'", expectExitCode: 0, bloom: apply }
  - id: builds
    title: Die Firmware baut weiterhin
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
  - id: staging-banks
    title: Sage voraus, wie viele Staging-Bänke der Flush benutzt
    check: { type: predict, prompt: { en: "cads_canvas_flush() converts the damaged region to RGB565 in bands and pushes each band over DMA. Predict how many staging banks it uses today, and what that implies about the blit. One number and one sentence on the coupling.", de: "cads_canvas_flush() wandelt die beschädigte Region in Bändern nach RGB565 und schiebt jedes Band per DMA hinaus. Sage voraus, wie viele Staging-Bänke es heute benutzt, und was daraus für das Blit folgt. Eine Zahl und ein Satz zur Kopplung." }, then: { type: command, cwd: ".", command: "grep -nE 'cads_stage|CADS_STAGE_ROWS|second bank' gui/canvas.c", expectExitCode: 0 }, rubric: "Der Vergleich zeigt genau eine Bank, cads_stage[CADS_STAGE_PIXELS], und den Kommentar, der die zweite ausdrücklich verwirft. Bestanden, wenn die Antwort nach dem Vergleich die Kopplung benennt: eine zweite Bank lohnt nur, wenn Band N+1 expandiert werden kann, während Band N noch per DMA läuft; cads_hal_display_blit() wartet aber vor der Rückkehr auf den Bus, also war die Bank ohnehin frei. Wer zwei Bänke vorhersagte und danach den Grund für die eine benennt, besteht.", bloom: apply }
socratic:
  - { trigger: "task:magenta-rect:failed", question: { en: "The pattern function already draws eleven palette slots. What does it draw one of them with, and where in the function is there room for a twelfth?", de: "Die Musterfunktion zeichnet schon elf Palettenslots. Womit zeichnet sie einen davon, und wo in der Funktion wäre noch Platz für einen zwölften?" }, hints: [ { en: "Is your call inside cads_test_pattern_draw() or beside it - and is it inside a comment? The check runs the file through the preprocessor first, and the preprocessor throws comments away.", de: "Steht dein Aufruf in cads_test_pattern_draw() oder daneben - und steht er in einem Kommentar? Der Check gibt die Datei zuerst durch den Präprozessor, und der wirft Kommentare weg." }, { en: "The test pattern lives in cads_test_pattern_draw() in gui/cads_splash.c and the palette enum in gui/canvas.h; the call you need already appears several times in that same function, only with a different slot as its last argument.", de: "Das Testmuster liegt in cads_test_pattern_draw() in gui/cads_splash.c und das Paletten-Enum in gui/canvas.h; der Aufruf, den du brauchst, steht in derselben Funktion schon mehrfach, nur mit einem anderen Slot als letztem Argument." }, { en: "CadsColorMagenta has to stand as an argument of a cads_canvas_fill_rect call that survives preprocessing; the empty lower half of the pattern has room for it.", de: "CadsColorMagenta muss als Argument eines cads_canvas_fill_rect-Aufrufs stehen, der den Präprozessor übersteht; die leere untere Hälfte des Musters bietet Platz dafür." } ] }
  - { trigger: "task:builds:failed", question: { en: "Read the first error, not the last. Is the toolchain complaining about a name, a type, or a missing file?", de: "Lies den ersten Fehler, nicht den letzten. Beschwert sich die Toolchain über einen Namen, einen Typ oder eine fehlende Datei?" }, hints: [ { en: "Does the first message name a name, a type, or a missing file? One error usually causes a dozen follow-ups, and only the first one is about your change.", de: "Nennt die erste Meldung einen Namen, einen Typ oder eine fehlende Datei? Ein Fehler erzeugt meist ein Dutzend Folgefehler, und nur der erste betrifft deine Änderung." }, { en: "fill_rect takes x, y, width, height and a colour slot - five arguments, all unsigned.", de: "fill_rect nimmt x, y, Breite, Höhe und einen Farbslot - fünf Argumente, alle vorzeichenlos." }, { en: "If the message names a symbol rather than a syntax problem, look at the misconception hint above about declarations versus definitions.", de: "Nennt die Meldung ein Symbol statt eines Syntaxproblems, sieh dir den Fehlkonzept-Hinweis oben zu Deklaration gegen Definition an." } ] }
  - { trigger: "task:staging-banks:stuck", question: { en: "A second staging bank only pays for itself under one condition. What would the blit have to do for that condition to hold?", de: "Eine zweite Staging-Bank lohnt sich nur unter einer Bedingung. Was müsste das Blit tun, damit diese Bedingung gilt?" }, hints: [ { en: "Are you predicting two banks because double buffering usually helps? Then ask first whether anything here could even run at the same time.", de: "Sagst du zwei Bänke voraus, weil Doppelpufferung meist hilft? Dann frag zuerst, ob hier überhaupt etwas gleichzeitig laufen könnte." }, { en: "Look at the comment block at the top of gui/canvas.c - it argues the decision out loud, with the number it would have cost.", de: "Sieh dir den Kommentarblock am Kopf von gui/canvas.c an - er führt die Entscheidung ausdrücklich vor, samt der Zahl, die sie gekostet hätte." }, { en: "Whether cads_hal_display_blit() returns before the transfer finishes or after it decides everything; core/cads_hal.h declares cads_hal_display_busy() for the other case.", de: "Ob cads_hal_display_blit() vor dem Ende der Übertragung zurückkehrt oder danach, entscheidet alles; core/cads_hal.h deklariert cads_hal_display_busy() für den anderen Fall." } ] }
---
## Lernziel

Zeichne auf dem Canvas so, wie es jede App dieser Firmware tut, und erkenne, warum jeder Zeichenaufruf zugleich *Damage* aufzeichnet, damit nur das Geänderte das Panel erreicht.

**Konkret:** einen Zeichenaufruf in `gui/cads_splash.c` ergänzen, den Task `CaDS: Build` starten, flashen und das Testmuster auf dem Panel öffnen. Jeder dieser vier Schritte steht unten mit vollem Bedienweg.

## Die Fläche: 480×320 mit 4 Bit pro Pixel

Ein Truecolor-RGB565-Framebuffer für dieses Panel wäre 300 KB groß; der Baustein hat 192 KB DMA-fähiges SRAM. Das Canvas (`gui/canvas.h`) ist deshalb **indiziert mit 4 bpp**: zwei Pixel pro Byte, 75 KB insgesamt, gegen eine **Palette mit sechzehn Farben**. Farben sind nie rohe Zahlen — sie sind `cads_color_t`-Slots mit Namen:

| Slot | Name | Farbe |
|---|---|---|
| 2 | `CadsColorBrand` | `#204C86` |
| 13 | `CadsColorMagenta` | |
| 15 | `CadsColorBackground` | `#101418` |

Die Tabelle hier ist ein Auszug aus dem Enum in `gui/canvas.h`.

## Die Zeichen-API

```c
cads_canvas_clear(CadsColorBackground);
cads_canvas_fill_rect(0, 0, CADS_CANVAS_WIDTH, 40, CadsColorBrand);
cads_canvas_draw_text(12, 8, &cads_font16, "CaDS Zero", CadsColorWhite);
cads_canvas_flush();   /* überträgt nur, was sich geändert hat */
```

`cads_canvas_draw_text()` setzt die **Oberkante der Zeilenbox** auf `y`, nicht die Grundlinie.

## Damage, und warum es nicht optional ist

Jeder Zeichenaufruf erweitert eine einzige Bounding-Box. `cads_canvas_flush()` wandelt genau diesen Bereich in Bändern von 16 Zeilen nach RGB565, und schiebt jedes Band per DMA hinaus. Ein Vollbild kostet auf diesem Bus etwa 448 ms, ein 40×40-Update 4,7 ms. Widgets, die den Puffer direkt beschreiben, rufen `cads_canvas_damage()` selbst auf.

Wie viele Bänder gleichzeitig unterwegs sein können, beantwortet der Kommentarblock am Kopf von `gui/canvas.c` ausdrücklich, samt der Zahl, die die Entscheidung gekostet hätte. Dazu gehört eine HAL-Funktion, die es gibt und die niemand aufruft: `cads_hal_display_busy()` in `core/cads_hal.h`. Die dritte Aufgabe schickt dich dorthin.

## Schritt 1 — die Datei öffnen und den Aufruf ergänzen

Drücke `Strg`/`Cmd`+`P`, tippe `gui/cads_splash.c` und drücke Enter; die Datei öffnet sich als Reiter in der Mitte. Ohne Tastatur: ganz links in der schmalen Symbolleiste das oberste Symbol (der Datei-Explorer), dann im Baum `gui` aufklappen und die Datei anklicken.

`cads_test_pattern_draw()` steht dort ab Zeile 65 und zeichnet einen Markenbalken, sechzehn Palettenfelder, vier Eckmarken und zwei Diagonalen. Es nutzt elf der sechzehn Slots — `CadsColorMagenta` gehört nicht dazu. Ergänze **innerhalb dieser Funktion** einen `cads_canvas_fill_rect(...)`-Aufruf, der einen kleinen Block in diesem Slot zeichnet; die leere untere Hälfte bietet sich an. Fünf Argumente: x, y, Breite, Höhe, Farbslot. Speichern mit `Strg`/`Cmd`+`S`.

Der erste Check schickt die Datei erst durch den C-Präprozessor und sucht den Slotnamen dann als Argument eines `fill_rect`-Aufrufs. Der Präprozessor wirft Kommentare weg — weder ein Zeilen- noch ein Blockkommentar besteht ihn also.

## Schritt 2 — bauen

Starte den Task **`CaDS: Build`**: **`F1`**, dann `Tasks: Run Task` tippen, Enter, dann **`CaDS: Build`** aus der Liste wählen. Ohne Tastatur: das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `Run Task...` → `CaDS: Build`**. Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `Run Task...`.

Unten im Terminal-Bereich öffnet sich ein eigenes Terminal mit dem Namen `CaDS: Build`; darin laufen die Compilerzeilen durch. Beim ersten Mal dauert das etwa eine Minute, danach Sekunden. Fertig ist der Task, wenn keine neuen Zeilen mehr kommen und wieder eine Eingabeaufforderung dasteht. Erfolg erkennst du daran, dass die letzte Zeile die des Build-Werkzeugs ist und keine Compilerfehlermeldung, und dass der Reiter `PROBLEMS` unten leer bleibt.

## Schritt 3 — flashen

Starte den Task **`CaDS: Build + Flash`**: **`F1`**, dann `Tasks: Run Task` tippen, Enter, dann **`CaDS: Build + Flash`** wählen. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Build + Flash`**. Er baut zuerst und flasht dann; das Flashen braucht etwa 15 Sekunden. Erfolg erkennst du in der Statusleiste unten.

![Erfolgreich geflasht: die Statusleiste nennt Bytes und Dauer des letzten Flash](flash-ok.png)

## Schritt 4 — das Testmuster auf dem Panel öffnen

Öffne die Board-Konsole: **`F1`**, dann `CaDS Board: Konsole öffnen` tippen, Enter. Tippe dort `d` und Enter — das startet den App-Baum auf dem Panel, und das Board reagiert ab jetzt nicht mehr auf einzeln getippte Buchstaben.

Navigiert wird von einem Terminal aus. Öffne es mit **☰ → `Terminal` → `New Terminal`**; ist der Terminal-Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu. Arbeitsverzeichnis ist die Projektwurzel:

```bash
python3 scripts/board_key.py ok ok down down down ok
```

Der erste `ok` öffnet vom Desktop aus das Menü, der zweite die oberste Zeile `Settings`, die drei `down` gehen auf die vierte Zeile `Test pattern`, der letzte `ok` öffnet sie. Das Skript druckt je Taste eine Zeile `| sent: <taste>`; das Muster erscheint gleich darauf auf dem Panel. Zurück zum Prompt:

```bash
python3 scripts/board_key.py quit
```

<!-- SHOT: m5-testpattern-magenta | Das Testmuster auf dem Panel, mit dem zusaetzlich gezeichneten Magenta-Block in der unteren Haelfte | HARDWARE -->

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin — zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen. Mitten im Build heißt das sonst: der Build ist abgebrochen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Danach

Prüfe mit dem Knopf **Prüfen** an der Aufgabe unten im Steptext oder mit **Run all checks** oben im Reiter `CaDS Tutor: Auf dem 4-bpp-Canvas zeichnen`.
