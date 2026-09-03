---
id: m5-01-canvas-draw
title: Auf dem 4-bpp-Canvas zeichnen
bloom: apply
objectives: [cz.gui.canvas]
requires: [m4-05-stack-sizing]
estimatedMinutes: 20
links:
  - { step: m5-02-view-dispatcher }
  - { doc: "docs/reference/canvas.md" }
  - { file: "gui/canvas.h", line: 40 }
  - { file: "gui/cads_splash.c", line: 65 }
sources: [docs/reference/canvas.md, gui/canvas.h, gui/cads_splash.c, docs/explanation/why-4bpp.md]
tasks:
  - id: magenta-rect
    title: Füge dem Testmuster ein magentafarbenes Rechteck hinzu
    check: { type: fileMatches, file: "gui/cads_splash.c", pattern: "CadsColorMagenta" }
  - id: builds
    title: Die Firmware baut weiterhin
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: flush-present
    title: Der Flush-Pfad ist eingelinkt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_canvas_flush" }
socratic:
  - { trigger: "task:magenta-rect:failed", question: { en: "Which function draws the palette swatches and corner markers, and which palette slot name have you not used yet?", de: "Welche Funktion zeichnet die Palettenfelder und Eckmarken, und welchen Palettenslot-Namen hast du noch nicht verwendet?" }, hints: [ { en: "The test pattern lives in cads_test_pattern_draw() in gui/cads_splash.c; the palette enum is in gui/canvas.h.", de: "Das Testmuster liegt in cads_test_pattern_draw() in gui/cads_splash.c; das Paletten-Enum steht in gui/canvas.h." }, { en: "Every colour is a cads_color_t slot: CadsColorMagenta is slot 13 and is not drawn by the pattern today.", de: "Jede Farbe ist ein cads_color_t-Slot: CadsColorMagenta ist Slot 13 und wird vom Muster heute nicht gezeichnet." }, { en: "Add one call: cads_canvas_fill_rect(x, y, w, h, CadsColorMagenta); inside cads_test_pattern_draw(), then rebuild.", de: "Füge einen Aufruf ein: cads_canvas_fill_rect(x, y, w, h, CadsColorMagenta); innerhalb von cads_test_pattern_draw(), dann neu bauen." } ] }
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

`cads_canvas_set_palette()` färbt beim nächsten Flush jedes Pixel eines Slots um; darum ist ein Theme eine Tabelle und kein Neuzeichnen. Die Palette ist vorab byte-vertauscht als Big-Endian-RGB565 abgelegt, sodass die Umrechnung pro Pixel ein Nachschlagen und ein Speichern ist.

## Die Zeichen-API

```c
cads_canvas_clear(CadsColorBackground);
cads_canvas_fill_rect(0, 0, CADS_CANVAS_WIDTH, 40, CadsColorBrand);
cads_canvas_draw_text(12, 8, &cads_font16, "CaDS Zero", CadsColorWhite);
cads_canvas_flush();   /* überträgt nur, was sich geändert hat */
```

`cads_canvas_draw_text()` setzt die **Oberkante der Zeilenbox** auf `y`, nicht die Grundlinie, und liefert die Stiftposition zurück, damit Läufe in verschiedenen Farben aneinanderreihen. Clipping verschachtelt sich über `cads_canvas_push_clip()` / `pop_clip()`, acht Ebenen tief.

## Damage, und warum es nicht optional ist

Jeder Zeichenaufruf erweitert eine einzige Bounding-Box. `cads_canvas_flush()` wandelt genau diesen Bereich in 16-Zeilen-Bändern nach RGB565, wechselt dabei zwischen zwei Staging-Puffern, sodass das nächste Band konvertiert wird, während das aktuelle per DMA hinausgeht, und gibt die übertragene Pixelzahl zurück. Ein Vollbild kostet auf diesem Bus etwa 448 ms; ein 40×40-Update 4,7 ms. Dieser Faktor 95 ist der Unterschied zwischen einer benutzbaren Oberfläche und einer, die mit 2 fps neu zeichnet. Widgets, die den Puffer direkt beschreiben, müssen `cads_canvas_damage()` selbst aufrufen.

Zwei Grenzen im Kopf behalten: kein Alpha, kein Blending (ein indizierter Puffer kann Teildeckung nicht ausdrücken), und das Canvas ist **nicht threadsicher** — eine Task besitzt das Display, abgesichert durch einen Mutex (`apps/bringup/tasks.c`).

## Deine Aufgabe

`cads_test_pattern_draw()` in `gui/cads_splash.c` (auf dem Panel erreichbar über **Settings → Test pattern**) zeichnet einen Markenbalken, sechzehn Palettenfelder, vier Eckmarken und zwei Diagonalen. Es nutzt mehrere Slots — aber nicht `CadsColorMagenta`. Füge innerhalb dieser Funktion einen Aufruf `cads_canvas_fill_rect(...)` mit `CadsColorMagenta` ein (ein kleiner Block in der leeren unteren Hälfte bietet sich an), baue neu, flashe und öffne das Testmuster, um ihn zu sehen. Die Checks bestätigen, dass der Aufruf vorhanden ist, der Build gelingt und der Flush-Pfad eingelinkt ist.
