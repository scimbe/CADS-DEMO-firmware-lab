---
id: m0-04-flash-console
title: Flash and pass the hardware gate
bloom: apply
objectives: [firmware-how-to-flash, firmware-how-to-board-test]
requires: [m0-03-build]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m0-02-connect]
links:
  - { step: m0-05-explorer }
  - { doc: "docs/how-to/board-test.md" }
  - { doc: "docs/tutorials/first-gate.md" }
sources: [docs/how-to/flash.md, docs/tutorials/first-gate.md, docs/SAFETY.md, docs/reference/measurements.md]
tasks:
  - id: flashed
    title: The image is written to the board
    check: { type: flash, since: stepStart }
  - id: self-test
    title: The on-target self test passes
    check: { type: serialExpect, pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: read-numbers
    title: Work out how long one full screen takes
    check: { type: question, prompt: { en: "The self test reports flush_kpixel_per_s: 342, and a full screen holds 153600 pixels. Work out how long one full screen takes.", de: "Der Selbsttest meldet flush_kpixel_per_s: 342, und ein Vollbild hat 153600 Pixel. Rechne aus, wie lange ein Vollbild dauert." }, rubric: "What is graded is the calculation, not a number copied out of the text: 342 kpixel/s is 342000 pixels per second, and 153600 divided by 342000 gives roughly 0.45 seconds, about 450 ms. A traceable division with correct handling of the units and a result between 440 and 460 ms is right; a bare number without a route to it is not, while a small rounding difference with a correct route is.", bloom: apply }
socratic:
  - { trigger: "task:flashed:failed", question: { en: "This check does not flash for you; it only asks whether a write happened since this step opened. Did you trigger one?", de: "Dieser Check flasht nicht für dich; er fragt nur, ob seit dem Öffnen dieses Steps geschrieben wurde. Hast du das ausgelöst?" }, hints: [ { en: "Most often nothing was written at all — pressing Check alone does not flash anything.", de: "Meistens wurde gar nicht geschrieben — allein auf Prüfen zu drücken flasht nichts." }, { en: "Press F1, type CaDS Board: Flash and run the entry; alternatively use the menu Terminal → Run Task… and pick CaDS: Build + Flash.", de: "Drücke F1, tippe „CaDS Board: Flash“ und führe den Eintrag aus; alternativ über das Menü Terminal → Run Task… den Eintrag „CaDS: Build + Flash“ wählen." }, { en: "Flashing needs two things at once: a connected probe and an existing build/itsboard/cads-zero.bin. If the board dropped out, m0-02 is the step to repeat; if the file is missing, m0-03 is.", de: "Flashen braucht zweierlei gleichzeitig: eine verbundene Probe und eine vorhandene build/itsboard/cads-zero.bin. Ist das Board abgefallen, gehört m0-02 wiederholt; fehlt die Datei, m0-03." } ] }
  - { trigger: "task:self-test:failed", question: { en: "Nothing matched. Is the console showing the board's text at all, or is it silent from the first line on?", de: "Nichts passte. Zeigt die Konsole überhaupt Text vom Board, oder bleibt sie von der ersten Zeile an still?" }, hints: [ { en: "A wrong or unopened console produces exactly the same silence as a dead board — check the window before you suspect the hardware.", de: "Eine falsche oder gar nicht geöffnete Konsole erzeugt dieselbe Stille wie ein totes Board — sieh erst im Fenster nach, bevor du die Hardware verdächtigst." }, { en: "Open it with F1 and CaDS Board: Konsole öffnen, then trigger a fresh start with CaDS Board: Reset: the self test runs on every boot, so the lines come again.", de: "Öffne sie mit F1 und „CaDS Board: Konsole öffnen“, und löse dann mit „CaDS Board: Reset“ einen neuen Start aus: der Selbsttest läuft bei jedem Start, die Zeilen kommen also erneut." }, { en: "If lines arrive but stop before the end, count them against the plan in the first line: the firmware died part way, and the last assertion printed names the area that failed.", de: "Kommen Zeilen an, hören aber vorzeitig auf, zähl sie gegen den Plan in der ersten Zeile: die Firmware starb unterwegs, und die zuletzt gedruckte Zusicherung benennt den Bereich, in dem es passierte." } ] }
  - { trigger: "question:read-numbers:weak", question: { en: "What does the unit kpixel/s stand for, written out in full?", de: "Wofür steht die Einheit kpixel/s, ausgeschrieben?" }, hints: [ { en: "The most common slip is the k: 342 kpixel/s is not 342 pixels per second.", de: "Der häufigste Fehler steckt im k: 342 kpixel/s sind nicht 342 Pixel je Sekunde." }, { en: "Write the division down before you compute it: an amount of pixels divided by a rate of pixels per second leaves seconds. Both numbers are in the task text.", de: "Schreib die Division erst hin, bevor du rechnest: eine Menge Pixel geteilt durch eine Rate in Pixel je Sekunde ergibt Sekunden. Beide Zahlen stehen in der Aufgabe." }, { en: "The result is well under one second, so state it in milliseconds — and show the division you used, not only the number that comes out.", de: "Das Ergebnis liegt deutlich unter einer Sekunde, gib es also in Millisekunden an — und zeig die Division, die du benutzt hast, nicht nur die Zahl, die herauskommt." } ] }
---
## Learning goal

Put your build onto the real board and pass the hardware gate — the moment a compiled image becomes firmware that provably runs on silicon.

## Where you do this

You trigger the flash yourself; this step's check only looks at whether it happened.

1. Command palette with `F1`, then **CaDS Board: Flash (build/itsboard/cads-zero.bin)** — that writes the most recently built image to the board. Alternatively the menu **Terminal → Run Task…** and **CaDS: Build + Flash**, which builds once more first.
2. Open the **board console** with the palette command **CaDS Board: Konsole öffnen**. That window is where the text the board sends of its own accord arrives.
3. After the write the board restarts and runs the self test immediately. If the console was opened too late, trigger a fresh start with **CaDS Board: Reset** — the self test runs on every boot.
4. Back in this panel: press **Check** on the first two tasks.

## Flashing, and what it refuses to do

**Flashing** means writing the finished program into the microcontroller's flash memory so it stays there without power. Concretely it writes `cads-zero.bin` to address `0x08000000` over the ST-Link. The tooling is deliberately narrow (`docs/SAFETY.md`, `docs/how-to/flash.md`):

- **`st-flash write` sector-erases only the range it writes.** Flash cannot be overwritten byte by byte; it can only be erased in whole **sectors** — contiguous blocks of a fixed size. A ~230 KB image touches the first few sectors and nothing else.
- **No mass erase, ever.** A *mass* or *chip erase* wipes the entire flash in one go; it would take the littlefs filesystem in flash bank 2 with it, where the board's own files live.
- **Image size is checked against 1 MB**, so an oversized image cannot run past bank 1 into the filesystem window at `0x08120000`.
- **Option bytes are never written.** The *option bytes* are a small configuration area of the chip that could equally be written; read protection lives there, and setting it makes a board permanently unreadable. So the tooling does not touch them at all.

## The gate, not the screen

The display bus is write-only, so "the screen looked right" cannot be a gate. Instead `apps/bringup` runs an on-target self test on every boot that emits **TAP** (Test Anything Protocol, a line format for test results) over the serial console, and the gate reads it back:

```
1..10
ok 1 - SysTick advances at 1 kHz
ok 2 - DWT microsecond clock agrees
...
# flush_pixels: 153600
# flush_kpixel_per_s: 342
ok 7 - dirty rectangle limits the transfer
# RESULT: PASS
```

`1..10` is the plan: that many assertions are announced. `ok`/`not ok` are the assertions themselves; `#` lines are diagnostics, measurements without a verdict. The format is deliberate: a human's opinion cannot fail a build, but `ok 4` can. If fewer lines arrive than the plan announced, the firmware died part way — which also counts as failing.

## The number that shapes everything

`flush_kpixel_per_s: 342` is measured, not calculated: 342,000 pixels per second really did travel over the bus. The panel is fed through a shift-register chain that spends 16 **SPI** clocks per pixel — SPI being the serial bus the chip writes the display over, one bit shifted along per clock. So the bus is the limit, not the driver; the driver is already at 97 % of what the bus can give. What that rate means for a full-screen redraw you will work out yourself in a moment — and that order of magnitude is exactly why the canvas tracks dirty rectangles. You will meet the consequences again in M5.

## Your task

Flash the board and let the self test run. The checks confirm the write happened and that `RESULT: PASS` came back over the console. Then work out how long one full screen takes at the measured rate. The next step opens the diagnostic console you just used.
