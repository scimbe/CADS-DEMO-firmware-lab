---
id: m5-01-canvas-draw
title: Draw on the 4-bpp canvas
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
    title: The test pattern calls fill_rect with the missing slot
    check: { type: command, cwd: ".", command: "cc -E -P -Igui -Icore gui/cads_splash.c | paste -sd ' ' - | grep -qE 'cads_canvas_fill_rect[(][^;]*CadsColorMagenta'", expectExitCode: 0, bloom: apply }
  - id: builds
    title: The firmware still builds
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
  - id: staging-banks
    title: Predict how many staging banks the flush uses
    check: { type: predict, prompt: { en: "cads_canvas_flush() converts the damaged region to RGB565 in bands and pushes each band over DMA. Predict how many staging banks it uses today, and what that implies about the blit. One number and one sentence on the coupling.", de: "cads_canvas_flush() wandelt die beschädigte Region in Bändern nach RGB565 und schiebt jedes Band per DMA hinaus. Sage voraus, wie viele Staging-Bänke es heute benutzt, und was daraus für das Blit folgt. Eine Zahl und ein Satz zur Kopplung." }, then: { type: command, cwd: ".", command: "grep -nE 'cads_stage|CADS_STAGE_ROWS|second bank' gui/canvas.c", expectExitCode: 0 }, rubric: "The comparison shows exactly one bank, cads_stage[CADS_STAGE_PIXELS], and the comment that explicitly rejects a second. Passes if the answer, after the comparison, names the coupling: a second bank only pays for itself if band N+1 can be expanded while band N is still going out over DMA, but cads_hal_display_blit() waits on the bus before returning, so the bank was free again anyway. Predicting two banks and then naming the reason for one passes.", bloom: apply }
socratic:
  - { trigger: "task:magenta-rect:failed", question: { en: "The pattern function already draws eleven palette slots. What does it draw one of them with, and where in the function is there room for a twelfth?", de: "Die Musterfunktion zeichnet schon elf Palettenslots. Womit zeichnet sie einen davon, und wo in der Funktion wäre noch Platz für einen zwölften?" }, hints: [ { en: "Is your call inside cads_test_pattern_draw() or beside it - and is it inside a comment? The check runs the file through the preprocessor first, and the preprocessor throws comments away.", de: "Steht dein Aufruf in cads_test_pattern_draw() oder daneben - und steht er in einem Kommentar? Der Check gibt die Datei zuerst durch den Präprozessor, und der wirft Kommentare weg." }, { en: "The test pattern lives in cads_test_pattern_draw() in gui/cads_splash.c and the palette enum in gui/canvas.h; the call you need already appears several times in that same function, only with a different slot as its last argument.", de: "Das Testmuster liegt in cads_test_pattern_draw() in gui/cads_splash.c und das Paletten-Enum in gui/canvas.h; der Aufruf, den du brauchst, steht in derselben Funktion schon mehrfach, nur mit einem anderen Slot als letztem Argument." }, { en: "CadsColorMagenta has to stand as an argument of a cads_canvas_fill_rect call that survives preprocessing; the empty lower half of the pattern has room for it.", de: "CadsColorMagenta muss als Argument eines cads_canvas_fill_rect-Aufrufs stehen, der den Präprozessor übersteht; die leere untere Hälfte des Musters bietet Platz dafür." } ] }
  - { trigger: "task:builds:failed", question: { en: "Read the first error, not the last. Is the toolchain complaining about a name, a type, or a missing file?", de: "Lies den ersten Fehler, nicht den letzten. Beschwert sich die Toolchain über einen Namen, einen Typ oder eine fehlende Datei?" }, hints: [ { en: "Does the first message name a name, a type, or a missing file? One error usually causes a dozen follow-ups, and only the first one is about your change.", de: "Nennt die erste Meldung einen Namen, einen Typ oder eine fehlende Datei? Ein Fehler erzeugt meist ein Dutzend Folgefehler, und nur der erste betrifft deine Änderung." }, { en: "fill_rect takes x, y, width, height and a colour slot - five arguments, all unsigned.", de: "fill_rect nimmt x, y, Breite, Höhe und einen Farbslot - fünf Argumente, alle vorzeichenlos." }, { en: "If the message names a symbol rather than a syntax problem, look at the misconception hint above about declarations versus definitions.", de: "Nennt die Meldung ein Symbol statt eines Syntaxproblems, sieh dir den Fehlkonzept-Hinweis oben zu Deklaration gegen Definition an." } ] }
  - { trigger: "task:staging-banks:stuck", question: { en: "A second staging bank only pays for itself under one condition. What would the blit have to do for that condition to hold?", de: "Eine zweite Staging-Bank lohnt sich nur unter einer Bedingung. Was müsste das Blit tun, damit diese Bedingung gilt?" }, hints: [ { en: "Are you predicting two banks because double buffering usually helps? Then ask first whether anything here could even run at the same time.", de: "Sagst du zwei Bänke voraus, weil Doppelpufferung meist hilft? Dann frag zuerst, ob hier überhaupt etwas gleichzeitig laufen könnte." }, { en: "Look at the comment block at the top of gui/canvas.c - it argues the decision out loud, with the number it would have cost.", de: "Sieh dir den Kommentarblock am Kopf von gui/canvas.c an - er führt die Entscheidung ausdrücklich vor, samt der Zahl, die sie gekostet hätte." }, { en: "Whether cads_hal_display_blit() returns before the transfer finishes or after it decides everything; core/cads_hal.h declares cads_hal_display_busy() for the other case.", de: "Ob cads_hal_display_blit() vor dem Ende der Übertragung zurückkehrt oder danach, entscheidet alles; core/cads_hal.h deklariert cads_hal_display_busy() für den anderen Fall." } ] }
---
## Learning goal

Draw on the canvas the way every app in this firmware does, and see why every drawing call also records *damage* so only what changed reaches the panel.

## The surface: 480×320 at 4 bits per pixel

A truecolour RGB565 framebuffer for this panel is 300 KB; the part has 192 KB of DMA-capable SRAM. So the canvas (`gui/canvas.h`) is **indexed at 4 bpp**: two pixels per byte, 75 KB total, against a **sixteen-colour palette**. Colours are never raw numbers — they are `cads_color_t` slots with names:

| Slot | Name | Colour |
|---|---|---|
| 2 | `CadsColorBrand` | `#204C86` |
| 3 | `CadsColorBrandLight` | `#B5C4D8` |
| 4 | `CadsColorAccent` | `#9CB33B` |
| 8–10 | `CadsColorRed / Amber / Teal` | |
| 13 | `CadsColorMagenta` | |
| 15 | `CadsColorBackground` | `#101418` |

The full list is the enum in `gui/canvas.h`; the table here is an extract. `cads_canvas_set_palette()` re-tints every pixel in a slot at the next flush, which is what makes a theme one table rather than a repaint. The palette is stored pre-byte-swapped to big-endian RGB565, so per-pixel conversion is a lookup and a store.

## The drawing API

```c
cads_canvas_clear(CadsColorBackground);
cads_canvas_fill_rect(0, 0, CADS_CANVAS_WIDTH, 40, CadsColorBrand);
cads_canvas_draw_text(12, 8, &cads_font16, "CaDS Zero", CadsColorWhite);
cads_canvas_flush();   /* pushes only what changed */
```

`cads_canvas_draw_text()` places the **top of the line box** at `y`, not the baseline, and returns the pen position so runs in different colours chain. Clipping nests via `cads_canvas_push_clip()` / `pop_clip()`, eight levels deep.

## Damage, and why it is not optional

Every drawing call extends one bounding box. `cads_canvas_flush()` converts exactly that region to RGB565 in 16-row bands, pushes each band out over DMA, and returns the pixel count transferred. A full screen costs about 448 ms on this bus; a 40×40 update costs 4.7 ms. That factor of 95 is the difference between a usable UI and one that repaints at 2 fps. Widgets that write the buffer directly must call `cads_canvas_damage()` themselves.

How many bands can be in flight at once is a separate question — and one the comment block at the top of `gui/canvas.c` answers out loud, including the number that decision would have cost. Part of the answer is a HAL function that exists and that nobody calls: `cads_hal_display_busy()` in `core/cads_hal.h`. The third task of this step sends you exactly there.

Two limits to keep in mind: no alpha or blending (an indexed buffer cannot express partial coverage), and the canvas is **not thread safe** — one task owns the display, guarded by a mutex (`apps/bringup/tasks.c`).

## Your task

`cads_test_pattern_draw()` in `gui/cads_splash.c` (reachable on the panel via **Settings → Test pattern**) draws a brand header, sixteen palette swatches, four corner markers and two diagonals. It uses eleven of the sixteen slots — `CadsColorMagenta` is not among them. Draw a small block in that slot with `cads_canvas_fill_rect(...)` inside that function (the empty lower half is a good place), rebuild, flash, and open the test pattern to see it.

The first check runs `gui/cads_splash.c` through the C preprocessor and only then looks for the slot name as an argument of a `fill_rect` call. The preprocessor throws comments away — so neither a line comment nor a block comment passes it. Then comes the prediction about the staging banks.
