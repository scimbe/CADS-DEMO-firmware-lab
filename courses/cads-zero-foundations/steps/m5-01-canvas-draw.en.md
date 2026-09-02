---
id: m5-01-canvas-draw
title: Draw on the 4-bpp canvas
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
    title: Add a magenta rectangle to the test pattern
    check: { type: fileMatches, file: "gui/cads_splash.c", pattern: "CadsColorMagenta" }
  - id: builds
    title: The firmware still builds
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: flush-present
    title: The flush path is linked in
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_canvas_flush" }
socratic:
  - { trigger: "task:magenta-rect:failed", question: { en: "Which function draws the palette swatches and corner markers, and which palette slot name have you not used yet?", de: "Welche Funktion zeichnet die Palettenfelder und Eckmarken, und welchen Palettenslot-Namen hast du noch nicht verwendet?" }, hints: [ { en: "The test pattern lives in cads_test_pattern_draw() in gui/cads_splash.c; the palette enum is in gui/canvas.h.", de: "Das Testmuster liegt in cads_test_pattern_draw() in gui/cads_splash.c; das Paletten-Enum steht in gui/canvas.h." }, { en: "Every colour is a cads_color_t slot: CadsColorMagenta is slot 13 and is not drawn by the pattern today.", de: "Jede Farbe ist ein cads_color_t-Slot: CadsColorMagenta ist Slot 13 und wird vom Muster heute nicht gezeichnet." }, { en: "Add one call: cads_canvas_fill_rect(x, y, w, h, CadsColorMagenta); inside cads_test_pattern_draw(), then rebuild.", de: "Füge einen Aufruf ein: cads_canvas_fill_rect(x, y, w, h, CadsColorMagenta); innerhalb von cads_test_pattern_draw(), dann neu bauen." } ] }
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

`cads_canvas_set_palette()` re-tints every pixel in a slot at the next flush, which is what makes a theme one table rather than a repaint. The palette is stored pre-byte-swapped to big-endian RGB565, so per-pixel conversion is a lookup and a store.

## The drawing API

```c
cads_canvas_clear(CadsColorBackground);
cads_canvas_fill_rect(0, 0, CADS_CANVAS_WIDTH, 40, CadsColorBrand);
cads_canvas_draw_text(12, 8, &cads_font16, "CaDS Zero", CadsColorWhite);
cads_canvas_flush();   /* pushes only what changed */
```

`cads_canvas_draw_text()` places the **top of the line box** at `y`, not the baseline, and returns the pen position so runs in different colours chain. Clipping nests via `cads_canvas_push_clip()` / `pop_clip()`, eight levels deep.

## Damage, and why it is not optional

Every drawing call extends one bounding box. `cads_canvas_flush()` converts exactly that region to RGB565 in 16-row bands, alternating between two staging buffers so the next band converts while the current one goes out over DMA, and returns the pixel count transferred. A full screen costs about 448 ms on this bus; a 40×40 update costs 4.7 ms. That factor of 95 is the difference between a usable UI and one that repaints at 2 fps. Widgets that write the buffer directly must call `cads_canvas_damage()` themselves.

Two limits to keep in mind: no alpha or blending (an indexed buffer cannot express partial coverage), and the canvas is **not thread safe** — one task owns the display, guarded by a mutex (`apps/bringup/tasks.c`).

## Your task

`cads_test_pattern_draw()` in `gui/cads_splash.c` (reachable on the panel via **Settings → Test pattern**) draws a brand header, sixteen palette swatches, four corner markers and two diagonals. It uses several slots — but not `CadsColorMagenta`. Add one `cads_canvas_fill_rect(...)` call with `CadsColorMagenta` somewhere inside that function (a small block in the empty lower half is a good place), rebuild, flash, and open the test pattern to see it. The checks confirm the call is present, the build passes, and the flush path is linked.
