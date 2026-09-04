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
    title: The host-test task runs clean
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0, bloom: analyze }
  - id: read-a-diff
    title: Read a pixel diff
    check: { type: question, prompt: { en: "A golden fails: 12 differing pixels, all inside one flat palette block, each off by (0,0,32). Regression or environment?", de: "Ein Golden schlägt fehl: 12 abweichende Pixel, alle in einer flachen Palettenfläche, jedes um (0,0,32) daneben. Regression oder Umgebung?" }, rubric: "A regression. The location decides it: a flat palette region comes straight out of the sixteen-colour palette, and there is nothing there for a colour conversion to round - unlike anti-aliased edges, where intermediate values arise. The magnitude confirms it: a delta of 32 in one channel is not a rounding by one but a multiple of the neighbour distance in the 5-6-5 grid. The delta (0,0,32) lands in the blue channel, which has five bits, so its neighbour distance in 8-bit output is 8 - making 32 four neighbour steps, not one. A different palette entry or a different fill was therefore drawn, not the same colour rounded differently. An answer that calls 32 a single neighbour step has not applied the arithmetic derived in the body of this step. Names the next step: look in git for a rendering-relevant commit since the last regeneration. An answer that merely repeats the 2026-08-30 diagnosis does not pass.", bloom: analyze }
  - id: regeneration-rule
    title: When a golden may be regenerated
    check: { type: question, prompt: { en: "When are you allowed to regenerate a golden with update_golden?", de: "Wann darfst du ein Golden mit update_golden neu erzeugen?" }, rubric: "Only once it is established that the change was intended - afterwards, never before. The path is deliberately a build target so the new reference arrives as a reviewed diff of two PNGs in the same commit rather than as a silent edit. The precondition is visually inspecting the diff PNG, because a golden that has recorded a bug is worse than none: it makes the bug the specification from then on. Names the order, judgement before regeneration; naming only the target does not pass.", bloom: analyze }
socratic:
  - { trigger: "task:suite-green:failed", question: { en: "This task excludes the golden scenes, so a unit test failed. Which subject does ctest name, and did it fail to compile or fail an assertion?", de: "Dieser Task schließt die Golden-Szenen aus, es scheiterte also ein Unit-Test. Welches Subjekt nennt ctest, und scheiterte es beim Kompilieren oder an einer Zusicherung?" }, hints: [ { en: "Look in the terminal at the bottom named after the task, not in the step text; the failing subject is named in the summary block at the end.", de: "Sieh unten im Terminal nach, das den Namen des Tasks trägt, nicht im Steptext; das gescheiterte Subjekt steht im Schlussblock." }, { en: "The task already passes --output-on-failure, so the failing assertion is printed in full with its file and line.", de: "Der Task übergibt bereits --output-on-failure, die gescheiterte Zusicherung steht also vollständig mit Datei und Zeile da." }, { en: "If the run stopped before any test line appeared, it was the build, not a test; read the first compiler error rather than the last line.", de: "Brach der Lauf ab, bevor eine Testzeile erschien, war es der Build und kein Test; lies den ersten Compilerfehler statt der letzten Zeile." } ] }
  - { trigger: "question:read-a-diff:weak", question: { en: "Where does the colour of a flat block come from, and where does the colour of an anti-aliased edge come from?", de: "Woher kommt die Farbe einer flachen Fläche, und woher die Farbe einer geglätteten Kante?" }, hints: [ { en: "Flat regions come straight out of the sixteen-colour palette; there is nothing there for a conversion to round.", de: "Flache Flächen kommen direkt aus der Palette mit sechzehn Farben; dort gibt es für eine Konvertierung nichts zu runden." }, { en: "Compare the size of the delta in this case against the deltas the 2026-08-30 investigation found.", de: "Vergleich die Größe des Deltas in diesem Fall mit den Deltas, die die Untersuchung vom 2026-08-30 fand." }, { en: "Say what you would check in git next, and what result would confirm your reading.", de: "Sag, was du als Nächstes im git prüfen würdest und welches Ergebnis deine Lesart bestätigte." } ] }
  - { trigger: "question:regeneration-rule:weak", question: { en: "A golden is a record of what the code should draw. What does regenerating it do to that record?", de: "Ein Golden hält fest, was der Code zeichnen soll. Was macht ein Neuerzeugen mit dieser Aufzeichnung?" }, hints: [ { en: "The regeneration path is a build target on purpose, so the new reference lands in a commit and can be looked at.", de: "Der Regenerationspfad ist mit Absicht ein Build-Target, damit die neue Referenz in einem Commit landet und angesehen werden kann." }, { en: "Ask what a golden is worth once it has recorded a bug rather than the intended picture.", de: "Frag, was ein Golden wert ist, sobald es einen Fehler statt des beabsichtigten Bildes festhält." }, { en: "Your answer needs the order of the two acts: which one comes first, the judgement or the regeneration?", de: "Deine Antwort braucht die Reihenfolge der beiden Handlungen: welche kommt zuerst, das Urteil oder die Regeneration?" } ] }
---

## Learning goal

Understand how a firmware whose panel cannot be read back still tests what it draws, and learn to read a golden-image failure without mistaking a rounding artefact for a bug.

**The first move:** start the task `CaDS: Host tests`, then the task `CaDS: Golden images (informativ)`. Both paths are in the next section.

## Starting the two tasks

The user interface is in English while this course text is not, so the menu item is called `Run Task...`.

Press **`F1`**, type `Tasks: Run Task`, Enter, then pick **`CaDS: Host tests`** from the list. Without the keyboard: the three-line symbol (**☰**) at the very top left, then **`Terminal` → `Run Task...` → `CaDS: Host tests`**. (`Ctrl`/`Cmd`+`Shift`+`P` opens the palette too, but a browser often swallows it; `F1` is the reliable way.) A terminal named after the task opens in the terminal area at the bottom; if that area is folded away, `Ctrl`/`Cmd`+`J` opens and closes it. About half a minute, and on success the closing line is `100% tests passed, 0 tests failed out of 35`.

**This task does not contain the golden scenes.** Its command ends in `-E '^golden_'`, which excludes them explicitly. The scenes run in the second task: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Golden images (informativ)`**, or **☰ → `Terminal` → `Run Task...` → `CaDS: Golden images (informativ)`**. It also builds the host preset first, so it takes about half a minute, and runs `ctest` with `-R '^golden_'`: two lines, `golden_splash` and `golden_boot_desktop`, each `Passed` or `Failed`.

The word **(informativ)** is meant literally: the SDL2 version in this container rounds edge pixels ±1 differently from the machine that captured the references. A failure here is therefore no verdict on your code — which is why the first task checks the host-test task.

<!-- SHOT: m8-golden-task-run | Terminal-Bereich unten, Terminal mit dem Namen CaDS: Golden images (informativ), die zwei ctest-Zeilen golden_splash und golden_boot_desktop -->

## Three operating mistakes that happen right here

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal. Because you start two tasks here, two such outputs sit side by side; go by the name.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

## The only truth is in RAM

The display bus has no return path, so the panel can never be asked what it shows. But the canvas is a retained 4-bpp framebuffer in RAM, and that buffer is the source of truth anyway. Anything that can read it can verify the picture — and the host can.

Two mechanisms do this. **`tests/gallery/gallery.c`** renders every view against `tests/unit/fake_hal.c` and writes a PPM per screen. **The golden tests** in `targets/sim/tests/` run the SDL2 simulator with `--screenshot`, which saves the first frame after the panel goes quiescent, and compare it pixel for pixel against a reference in `targets/sim/golden/`. Two scenes: `splash.png` (250 ms idle) and `boot_desktop.png` (2000 ms idle, where a booted board lands).

A mismatch writes a diff PNG with every differing pixel painted saturated red. Open it with `Ctrl`/`Cmd`+`P` and this path — the editor shows PNGs as images in the middle:

```
build/host/targets/sim/tests/splash.diff.png
```

The regeneration path is a CMake target, not a task. Open a terminal with **☰ → `Terminal` → `New Terminal`** — the working directory is the project root — and run:

```
cmake --build build/host --target update_golden
```

That way an intentional UI change is a reviewed diff of two PNGs in the same commit.

## Reading a failure correctly

On 2026-08-30 both golden tests failed with 18 866 and 14 273 differing pixels out of 153 600 — obviously a rendering regression. A delta histogram said otherwise: every differing pixel was off by exactly **+1** in at least one of R, G, B, and only on anti-aliased text edges, while every flat palette region matched. No rendering-relevant commit had landed since the goldens were made. That is the signature of SDL's RGB565-to-24-bpp conversion. The account is in `docs/ROADMAP.md`.

That becomes three questions to ask of any failure: **where** do the differing pixels sit, **how large** are the deltas, **what** changed in git since the last regeneration. A diff count on its own is not a diagnosis.

For the second question: the panel works in RGB565, so a channel has 5 or 6 bits. A delta of 1 in an 8-bit output channel is rounding; the distance between two *adjacent* representable values is 8 in a 5-bit channel and 4 in a 6-bit one. A delta of that size means a different value was drawn, not the same one rounded differently.

## Your task

Three tasks, each with its own **Prüfen** button at the bottom of the step text; **Run all checks** at the top of the `CaDS Tutor: Golden images for a write-only display` tab checks all of them at once.

1. **The host-test task runs clean.** Start it as above: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Host tests`**.
2. **Read a diff.** Judge the failure the task describes — its numbers differ from the 2026-08-30 case, the method is the same; work out the neighbour distance of the affected channel before you classify the delta.
3. **The regeneration rule.** Answer when a golden may be regenerated.

Read the gallery's capture loop and `golden_check.py`'s header alongside, both via `Ctrl`/`Cmd`+`P`. The next step turns from proving code to judging it.
