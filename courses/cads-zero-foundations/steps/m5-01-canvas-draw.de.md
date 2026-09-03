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
    check: { type: command, cwd: ".", command: "grep -nE 'cads_canvas_fill_rect\\([^;]*CadsColorMagenta' gui/cads_splash.c", expectExitCode: 0, bloom: apply }
  - id: builds
    title: Die Firmware baut weiterhin
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
  - id: staging-banks
    title: Sage voraus, wie viele Staging-Bänke der Flush benutzt
    check: { type: predict, prompt: { en: "cads_canvas_flush() converts the damaged region to RGB565 in bands and pushes each band over DMA. Predict how many staging banks it uses today, and what that implies about the blit.", de: "cads_canvas_flush() wandelt die beschädigte Region in Bändern nach RGB565 und schiebt jedes Band per DMA hinaus. Sage voraus, wie viele Staging-Bänke es heute benutzt, und was daraus für das Blit folgt." }, then: { type: command, cwd: ".", command: "grep -nE 'cads_stage|CADS_STAGE_ROWS|second bank' gui/canvas.c", expectExitCode: 0 }, rubric: "Der Vergleich zeigt genau eine Bank, cads_stage[CADS_STAGE_PIXELS], und den Kommentar, der die zweite ausdrücklich verwirft. Bestanden, wenn die Antwort nach dem Vergleich die Kopplung benennt: eine zweite Bank lohnt nur, wenn Band N+1 expandiert werden kann, während Band N noch per DMA läuft; cads_hal_display_blit() wartet aber vor der Rückkehr auf den Bus, also war die Bank ohnehin frei. Wer zwei Bänke vorhersagte und danach den Grund für die eine benennt, besteht.", bloom: apply }
socratic:
  - { trigger: "task:magenta-rect:failed", question: { en: "The pattern function already draws eleven palette slots. What does it draw one of them with, and where in the function is there room for a twelfth?", de: "Die Musterfunktion zeichnet schon elf Palettenslots. Womit zeichnet sie einen davon, und wo in der Funktion wäre noch Platz für einen zwölften?" }, hints: [ { en: "The test pattern lives in cads_test_pattern_draw() in gui/cads_splash.c; the palette enum is in gui/canvas.h.", de: "Das Testmuster liegt in cads_test_pattern_draw() in gui/cads_splash.c; das Paletten-Enum steht in gui/canvas.h." }, { en: "The call you need already appears several times in that same function - only with a different slot as its last argument.", de: "Der Aufruf, den du brauchst, steht in derselben Funktion schon mehrfach - nur mit einem anderen Slot als letztem Argument." }, { en: "The check requires the slot name to appear as an argument of a fill_rect call, not merely somewhere in the file - a comment does not count.", de: "Der Check verlangt, dass der Slotname als Argument eines fill_rect-Aufrufs auftaucht, nicht bloß irgendwo in der Datei - ein Kommentar zählt nicht." } ] }
  - { trigger: "task:builds:failed", question: { en: "Read the first error, not the last. Is the toolchain complaining about a name, a type, or a missing file?", de: "Lies den ersten Fehler, nicht den letzten. Beschwert sich die Toolchain über einen Namen, einen Typ oder eine fehlende Datei?" }, hints: [ { en: "One error usually causes a dozen follow-ups; only the first one is about your change.", de: "Ein Fehler erzeugt meist ein Dutzend Folgefehler; nur der erste betrifft deine Änderung." }, { en: "fill_rect takes x, y, width, height and a colour slot - five arguments, all unsigned.", de: "fill_rect nimmt x, y, Breite, Höhe und einen Farbslot - fünf Argumente, alle vorzeichenlos." }, { en: "If the message names a symbol rather than a syntax problem, look at the misconception hint above about declarations versus definitions.", de: "Nennt die Meldung ein Symbol statt eines Syntaxproblems, sieh dir den Fehlkonzept-Hinweis oben zu Deklaration gegen Definition an." } ] }
  - { trigger: "task:staging-banks:stuck", question: { en: "A second staging bank only pays for itself under one condition. What would the blit have to do for that condition to hold?", de: "Eine zweite Staging-Bank lohnt sich nur unter einer Bedingung. Was müsste das Blit tun, damit diese Bedingung gilt?" }, hints: [ { en: "Look at the comment block at the top of gui/canvas.c - it argues the decision out loud.", de: "Sieh dir den Kommentarblock am Kopf von gui/canvas.c an - er führt die Entscheidung ausdrücklich vor." }, { en: "The relevant question is whether cads_hal_display_blit() returns before the transfer is finished or after it.", de: "Die entscheidende Frage ist, ob cads_hal_display_blit() vor dem Ende der Übertragung zurückkehrt oder danach." }, { en: "core/cads_hal.h declares cads_hal_display_busy(); ask yourself who would ever call it, and you have the condition.", de: "core/cads_hal.h deklariert cads_hal_display_busy(); frag dich, wer das je aufrufen würde, und du hast die Bedingung." } ] }
---
## Lernziel

Zeichne auf dem Canvas so, wie es jede App dieser Firmware tut, und erkenne, warum jeder Zeichenaufruf zugleich *Damage* aufzeichnet, damit nur das Geänderte das Panel erreicht.

## Die Fläche: 480×320 mit 4 Bit pro Pixel

Ein Truecolor-RGB565-Framebuffer für dieses Panel wäre 300 KB groß; der Baustein hat 192 KB DMA-fähiges SRAM. Das Canvas (`gui/canvas.h`) ist deshalb **indiziert mit 4 bpp**: zwei Pixel pro Byte, 75 KB insgesamt, gegen eine **Palette mit sechzehn Farben**. Farben sind nie rohe Zahlen — sie sind `cads_color_t`-Slots mit Namen:

| Slot | Name | Farbe |
|---|---|---|
| 2 | `CadsColorBrand` | `#204C86` |
| 3 | `CadsColorBrandLight` | `#B5C4D8` |
| 4 | `CadsColorAccent` | `#9CB33B` |
| 8–10 | `CadsColorRed / Amber / Teal` | |
| 13 | `CadsColorMagenta` | |
| 15 | `CadsColorBackground` | `#101418` |

Die vollständige Liste steht im Enum in `gui/canvas.h`; die Tabelle hier ist ein Auszug. `cads_canvas_set_palette()` färbt beim nächsten Flush jedes Pixel eines Slots um; darum ist ein Theme eine Tabelle und kein Neuzeichnen. Die Palette ist vorab byte-vertauscht als Big-Endian-RGB565 abgelegt, sodass die Umrechnung pro Pixel ein Nachschlagen und ein Speichern ist.

## Die Zeichen-API

```c
cads_canvas_clear(CadsColorBackground);
cads_canvas_fill_rect(0, 0, CADS_CANVAS_WIDTH, 40, CadsColorBrand);
cads_canvas_draw_text(12, 8, &cads_font16, "CaDS Zero", CadsColorWhite);
cads_canvas_flush();   /* überträgt nur, was sich geändert hat */
```

`cads_canvas_draw_text()` setzt die **Oberkante der Zeilenbox** auf `y`, nicht die Grundlinie, und liefert die Stiftposition zurück, damit Läufe in verschiedenen Farben aneinanderreihen. Clipping verschachtelt sich über `cads_canvas_push_clip()` / `pop_clip()`, acht Ebenen tief.

## Damage, und warum es nicht optional ist

Jeder Zeichenaufruf erweitert eine einzige Bounding-Box. `cads_canvas_flush()` wandelt genau diesen Bereich in Bändern von 16 Zeilen nach RGB565, schiebt jedes Band per DMA hinaus und gibt die übertragene Pixelzahl zurück. Ein Vollbild kostet auf diesem Bus etwa 448 ms; ein 40×40-Update 4,7 ms. Dieser Faktor 95 ist der Unterschied zwischen einer benutzbaren Oberfläche und einer, die mit 2 fps neu zeichnet. Widgets, die den Puffer direkt beschreiben, müssen `cads_canvas_damage()` selbst aufrufen.

Wie viele Bänder gleichzeitig unterwegs sein können, ist eine eigene Frage — und eine, die der Kommentarblock am Kopf von `gui/canvas.c` ausdrücklich beantwortet, samt der Zahl, die die Entscheidung gekostet hätte. Dazu gehört eine HAL-Funktion, die es gibt und die niemand aufruft: `cads_hal_display_busy()` in `core/cads_hal.h`. Die dritte Aufgabe dieses Steps schickt dich genau dorthin.

Zwei Grenzen im Kopf behalten: kein Alpha, kein Blending (ein indizierter Puffer kann Teildeckung nicht ausdrücken), und das Canvas ist **nicht threadsicher** — eine Task besitzt das Display, abgesichert durch einen Mutex (`apps/bringup/tasks.c`).

## Deine Aufgabe

`cads_test_pattern_draw()` in `gui/cads_splash.c` (auf dem Panel erreichbar über **Settings → Test pattern**) zeichnet einen Markenbalken, sechzehn Palettenfelder, vier Eckmarken und zwei Diagonalen. Es nutzt elf der sechzehn Slots — `CadsColorMagenta` gehört nicht dazu. Zeichne innerhalb dieser Funktion mit `cads_canvas_fill_rect(...)` einen kleinen Block in diesem Slot (die leere untere Hälfte bietet sich an), baue neu, flashe und öffne das Testmuster, um ihn zu sehen.

Der erste Check verlangt den Slotnamen als Argument eines `fill_rect`-Aufrufs — ein Kommentar besteht ihn nicht. Danach kommt die Vorhersage zu den Staging-Bänken.
