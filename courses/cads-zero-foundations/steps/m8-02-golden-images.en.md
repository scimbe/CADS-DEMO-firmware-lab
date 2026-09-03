---
id: m8-02-golden-images
title: Golden images for a write-only display
bloom: analyze
objectives: [cz.quality.golden]
requires: [m8-01-unit-tests]
estimatedMinutes: 15
scaffold: faded
links:
  - { file: "tests/gallery/gallery.c", line: 1 }
  - { file: "targets/sim/tests/golden_check.py", line: 1 }
  - { doc: "docs/ROADMAP.md" }
  - { step: m8-03-clean-room-pr }
sources: [tests/gallery/gallery.c, targets/sim/tests/golden_check.py, targets/sim/tests/CMakeLists.txt, targets/sim/golden/README.md, docs/ROADMAP.md]
tasks:
  - id: suite-green
    title: The host suite including the golden scenes is green
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: analyze }
  - id: read-a-diff
    title: Read a pixel diff
    check: { type: question, prompt: { en: "A golden fails: 12 differing pixels, all inside one flat palette block, each off by (0,0,32). Regression or environment?", de: "Ein Golden schlägt fehl: 12 abweichende Pixel, alle in einer flachen Palettenfläche, jedes um (0,0,32) daneben. Regression oder Umgebung?" }, rubric: "A regression. The location decides it: a flat palette region comes straight out of the sixteen-colour palette, and there is nothing there for a colour conversion to round - unlike anti-aliased edges, where intermediate values arise. The magnitude confirms it: a delta of 32 in one channel is not a rounding by one but a multiple of the neighbour distance in the 5-6-5 grid. The delta (0,0,32) lands in the blue channel, which has five bits, so its neighbour distance in 8-bit output is 8 - making 32 four neighbour steps, not one. A different palette entry or a different fill was therefore drawn, not the same colour rounded differently. An answer that calls 32 a single neighbour step has not applied the arithmetic derived in the body of this step. Names the next step: look in git for a rendering-relevant commit since the last regeneration. An answer that merely repeats the 2026-08-30 diagnosis does not pass.", bloom: analyze }
  - id: regeneration-rule
    title: When a golden may be regenerated
    check: { type: question, prompt: { en: "When are you allowed to regenerate a golden with update_golden?", de: "Wann darfst du ein Golden mit update_golden neu erzeugen?" }, rubric: "Only once it is established that the change was intended - afterwards, never before. The path is deliberately a build target so the new reference arrives as a reviewed diff of two PNGs in the same commit rather than as a silent edit. The precondition is visually inspecting the diff PNG, because a golden that has recorded a bug is worse than none: it makes the bug the specification from then on. Names the order, judgement before regeneration; naming only the target does not pass.", bloom: analyze }
socratic:
  - { trigger: "task:suite-green:failed", question: { en: "Is the failing test a unit test or one of the two golden scenes? The two fail for completely different reasons.", de: "Ist der scheiternde Test ein Unit-Test oder eine der beiden Golden-Szenen? Die beiden scheitern aus völlig verschiedenen Gründen." }, hints: [ { en: "ctest names the test; the golden ones are named after the scene they capture.", de: "ctest nennt den Test; die Golden-Tests sind nach der Szene benannt, die sie aufnehmen." }, { en: "A golden mismatch writes a diff PNG next to the reference - open it before drawing any conclusion.", de: "Eine Golden-Abweichung schreibt ein Diff-PNG neben die Referenz - öffne es, bevor du irgendetwas schließt." }, { en: "The two scenes differ only in how long the panel is allowed to settle before the frame is taken.", de: "Die beiden Szenen unterscheiden sich nur darin, wie lange das Panel sich beruhigen darf, bevor das Bild genommen wird." } ] }
  - { trigger: "question:read-a-diff:weak", question: { en: "Where does the colour of a flat block come from, and where does the colour of an anti-aliased edge come from?", de: "Woher kommt die Farbe einer flachen Fläche, und woher die Farbe einer geglätteten Kante?" }, hints: [ { en: "Flat regions come straight out of the sixteen-colour palette; there is nothing there for a conversion to round.", de: "Flache Flächen kommen direkt aus der Palette mit sechzehn Farben; dort gibt es für eine Konvertierung nichts zu runden." }, { en: "Compare the size of the delta in this case against the deltas the 2026-08-30 investigation found.", de: "Vergleich die Größe des Deltas in diesem Fall mit den Deltas, die die Untersuchung vom 2026-08-30 fand." }, { en: "Say what you would check in git next, and what result would confirm your reading.", de: "Sag, was du als Nächstes im git prüfen würdest und welches Ergebnis deine Lesart bestätigte." } ] }
  - { trigger: "question:regeneration-rule:weak", question: { en: "A golden is a record of what the code should draw. What does regenerating it do to that record?", de: "Ein Golden hält fest, was der Code zeichnen soll. Was macht ein Neuerzeugen mit dieser Aufzeichnung?" }, hints: [ { en: "The regeneration path is a build target on purpose, so the new reference lands in a commit and can be looked at.", de: "Der Regenerationspfad ist mit Absicht ein Build-Target, damit die neue Referenz in einem Commit landet und angesehen werden kann." }, { en: "Ask what a golden is worth once it has recorded a bug rather than the intended picture.", de: "Frag, was ein Golden wert ist, sobald es einen Fehler statt des beabsichtigten Bildes festhält." }, { en: "Your answer needs the order of the two acts: which one comes first, the judgement or the regeneration?", de: "Deine Antwort braucht die Reihenfolge der beiden Handlungen: welche kommt zuerst, das Urteil oder die Regeneration?" } ] }
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

The lesson generalises into three questions to ask of any failure: **where** do the differing pixels sit, **how large** are the deltas, and **what** changed in git since the last regeneration. A diff count on its own is not a diagnosis.

For the second question a sense of scale helps: the panel works in RGB565, so a channel has 5 or 6 bits. A delta of 1 in an 8-bit output channel is rounding; the distance between two *adjacent* representable values is 8 in a 5-bit channel and 4 in a 6-bit one, which scaled to 8 bits is markedly larger. A delta of that size means a different value was drawn, not the same one rounded differently.

## Your task

Run the host suite; it contains both golden scenes. Read the gallery's capture loop and `golden_check.py`'s header. Then judge the failure described in the second task — its numbers differ from the 2026-08-30 case, the method is the same; work out the neighbour distance of the affected channel before you classify the delta. Finally answer when a golden may be regenerated. The next step turns from proving code to judging it.

**Where you do this:**
- Open a file: `Ctrl`/`Cmd`+`P`.
- Open a terminal: menu *Terminal → New Terminal*.
- Open the board console: `F1`, then *CaDS Board: Konsole öffnen*.
- Build: menu *Terminal → Run Build Task…*.
