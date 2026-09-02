---
id: m8-02-golden-images
title: Golden images for a write-only display
bloom: analyze
objectives: [cz.quality.golden]
requires: [m8-01-unit-tests]
estimatedMinutes: 15
links:
  - { file: "tests/gallery/gallery.c", line: 1 }
  - { file: "targets/sim/tests/golden_check.py", line: 1 }
  - { doc: "docs/ROADMAP.md" }
  - { step: m8-03-clean-room-pr }
sources: [tests/gallery/gallery.c, targets/sim/tests/golden_check.py, targets/sim/tests/CMakeLists.txt, targets/sim/golden/README.md, docs/ROADMAP.md]
tasks:
  - id: read-gallery
    title: Read how the gallery captures a screen
    check: { type: manual }
  - id: diff-reading
    title: Tell an environmental diff from a regression
    check: { type: question, prompt: { en: "Why does this project keep golden images at all for a panel whose bus is write-only, and how did the maintainers decide that the golden_splash/golden_boot_desktop failures of 2026-08-30 were environmental rather than a rendering regression?", de: "Warum hält dieses Projekt überhaupt Golden Images für ein Panel, dessen Bus nur beschreibbar ist, und wie entschieden die Maintainer, dass die Fehlschläge von golden_splash/golden_boot_desktop am 2026-08-30 umgebungsbedingt und keine Rendering-Regression waren?" }, rubric: "Explains that the RAM framebuffer is the only truth, so the host simulator (same canvas code, fake or SDL HAL) can dump it deterministically with no camera; the failures were diagnosed with a per-pixel delta histogram: every differing pixel was off by exactly +1 in R/G/B, only on anti-aliased edges, flat palette regions matched, no rendering commit since the goldens were made - the signature of SDL's RGB565-to-24bpp rounding, so the goldens were regenerated via the update_golden target rather than code changed.", bloom: analyze }
socratic:
  - { trigger: "question:diff-reading:weak", question: { en: "golden_check.py writes a diff PNG on mismatch. If every marked pixel sits on a text edge and none inside a flat colour block, what does that tell you about where the difference was introduced?", de: "golden_check.py schreibt bei Abweichung ein Diff-PNG. Wenn jedes markierte Pixel auf einer Textkante liegt und keines in einer flachen Farbfläche, was sagt dir das darüber, wo die Abweichung entstand?" }, hints: [ { en: "Flat regions come straight from the 16-colour palette; edges are where a conversion rounds.", de: "Flache Flächen kommen direkt aus der 16-Farben-Palette; Kanten sind dort, wo eine Konvertierung rundet." }, { en: "Check git log for a rendering-relevant commit since the goldens were last regenerated.", de: "Prüfe im git log, ob seit der letzten Regeneration der Goldens ein renderingrelevanter Commit landete." }, { en: "The ROADMAP entry of 2026-09-01 walks through exactly this diagnosis, ending in update_golden and 37/37 passing.", de: "Der ROADMAP-Eintrag vom 2026-09-01 geht genau diese Diagnose durch und endet mit update_golden und 37/37 bestanden." } ] }
---
## Learning goal

Understand how a firmware whose panel cannot be read back still tests what it draws, and learn to read a golden-image failure without mistaking a rounding artefact for a bug.

## The only truth is in RAM

The display bus has no return path, so the panel can never be asked what it shows. But the canvas is a retained 4-bpp framebuffer in RAM, and that buffer is the source of truth for the panel anyway. Anything that can read the buffer can therefore verify the picture — and the host can.

Two mechanisms do this:

- **`tests/gallery/gallery.c`** renders every application view (desktop, menu, settings, about, GPIO, netinfo, file browser, game, active tools) against `tests/unit/fake_hal.c`, walks the palette per pixel and writes a PPM per screen. It exists so all of the firmware's surfaces can be reviewed at once without walking the real board through them.
- **The golden tests** in `targets/sim/tests/` run the SDL2 simulator with `--screenshot`, which saves the first frame after the panel goes quiescent, and compare it pixel for pixel against a reference PNG in `targets/sim/golden/`. Two scenes exist: `splash.png` (250 ms idle, the boot mark) and `boot_desktop.png` (2000 ms idle, where a booted board actually lands because `boot.autostart` is on). A mismatch writes a diff PNG with every differing pixel painted saturated red.

The regeneration path is a CMake target, `update_golden`, so an intentional UI change is a reviewed diff of two PNGs in the same commit — not a silent edit.

## Reading a failure correctly

On 2026-08-30 both golden tests failed with 18 866 and 14 273 differing pixels. The obvious reading is a rendering regression. The maintainers instead built a per-pixel delta histogram and found that every differing pixel was off by exactly **+1** in one or more of R, G, B — deltas of only (1,1,0), (1,1,1) or (1,0,1) — and only on anti-aliased text edges, while every flat palette region matched exactly. No rendering-relevant commit had landed since the goldens were made. That is the signature of SDL's RGB565-to-24-bpp conversion rounding differently on this host than on the machine that captured the goldens: `golden_check.py` documents that SDL, not the project, performs that conversion. The fix was to regenerate the goldens via `update_golden`, verify 37/37 host tests pass, and confirm the board build was untouched. The full account is in `docs/ROADMAP.md` (2026-09-01).

The lesson generalises: a diff count is not a diagnosis. Where the pixels sit, how large the deltas are, and what changed in git together decide whether code or environment moved.

## Your task

Read the gallery's capture loop and `golden_check.py`'s header, then explain why golden images exist for a write-only panel and how the environmental diff was told apart from a regression. The next step turns from proving code to judging it.
