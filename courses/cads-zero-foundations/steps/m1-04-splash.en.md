---
id: m1-04-splash
title: Change the boot wordmark
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
    title: The wordmark string now contains M1 LAB
    check: { type: fileMatches, file: "gui/cads_splash.c", pattern: "M1 LAB" }
  - id: rebuild
    title: The firmware builds with your change
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: splash-linked
    title: The splash is still part of the image
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_splash_draw" }
socratic:
  - { trigger: "task:edit-wordmark:failed", question: { en: "The check looks for the exact token in the C source, not on the panel. Which string literal does cads_splash_draw_mark() hand to cads_canvas_draw_text_aligned(), and did you edit that one?", de: "Der Check sucht das exakte Token im C-Quelltext, nicht auf dem Panel. Welches String-Literal übergibt cads_splash_draw_mark() an cads_canvas_draw_text_aligned(), und hast du genau dieses geändert?" }, hints: [ { en: "Search gui/cads_splash.c for \"Z E R O\".", de: "Suche in gui/cads_splash.c nach \"Z E R O\"." }, { en: "The token must be exactly M1 LAB - one space, capital letters - inside the double quotes.", de: "Das Token muss exakt M1 LAB lauten - ein Leerzeichen, Großbuchstaben - innerhalb der Anführungszeichen." }, { en: "Save the file; the check reads it from disk, and format-on-save will not touch a string literal.", de: "Speichere die Datei; der Check liest sie von der Platte, und Format-on-Save fasst ein String-Literal nicht an." } ] }
---
## Learning goal

Make your first real change to the firmware — one string in the boot screen — and carry it through build and link on both sides of the HAL.

## Where the splash lives

`gui/cads_splash.c` is portable code in the `cads_gui` library: it draws into the canvas and never talks to hardware. `cads_splash_draw_mark()` clears the canvas to `CadsColorBackground`, draws the CaDS mark centred slightly above the middle, lays an accent rule in `CadsColorAccent` under it, and then places the wordmark:

```c
cads_rect_t title = {0, (int16_t)(rule_y + 12), CADS_CANVAS_WIDTH, 34};
cads_canvas_draw_text_aligned(
    title, CadsAlignCenter, &cads_font24, "Z E R O", CadsColorBrandLight);
```

`cads_canvas_draw_text_aligned()` aligns text within a box and centres it vertically (`docs/reference/canvas.md`). The colours are **palette slots**, not RGB values — `CadsColorBrandLight` is slot 3, the lion blue `#B5C4D8`. Because the framebuffer is 4 bpp indexed, changing a theme later is one table, not a repaint.

Two things the header documents are worth noticing. `cads_splash_draw()` draws but **does not flush**: the caller decides when the screen is worth a full-screen transfer, because on this bus that costs hundreds of milliseconds. And `cads_splash_draw_progress()` redraws the whole screen each call, so the boot animation needs no separate erase step.

## Why this is a good first edit

The change is one string literal, but the check chain behind it is the real lesson. `fileMatches` proves the source changed. The board build proves the change compiles under the cross toolchain and still fits the linker's memory assertions. `symbolInElf` proves `cads_splash_draw` is still linked into `cads-zero.elf` — the linker runs with `--gc-sections`, so a function nobody references would silently disappear from the image. That is the same three-stage evidence you will use for every later change: source, build, image.

The same file also builds into the host simulator, so after this step the boot screen in the SDL window and on the panel show your text from the same object code.

## Your task

1. Open `gui/cads_splash.c` and find the wordmark literal `"Z E R O"` (line 33).
2. Change it so the string contains the exact token `M1 LAB` — for instance `"M1 LAB"`.
3. Save, then run **CaDS: Build**.

The three checks confirm the edit, the build and the symbol in the image. Flash it if you like to see the text on the panel. The next module goes below the HAL to see what memory this image actually lands in.
