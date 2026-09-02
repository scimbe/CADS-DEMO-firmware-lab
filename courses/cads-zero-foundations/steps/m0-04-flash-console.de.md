---
id: m0-04-flash-console
title: Flashen und das Hardware-Gate bestehen
bloom: apply
objectives: [firmware-how-to-flash, firmware-how-to-board-test]
requires: [m0-03-build]
estimatedMinutes: 15
links:
  - { step: m0-05-explorer }
  - { doc: "docs/how-to/board-test.md" }
  - { doc: "docs/tutorials/first-gate.md" }
sources: [docs/how-to/flash.md, docs/tutorials/first-gate.md, docs/SAFETY.md, docs/reference/measurements.md]
tasks:
  - id: flashed
    title: Das Image wird auf das Board geschrieben
    check: { type: flash, since: stepStart }
  - id: self-test
    title: Der On-Target-Selbsttest besteht
    check: { type: serialExpect, pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: read-numbers
    title: Lies eine gemessene Zahl aus dem Gate
    check: { type: question, prompt: { en: "The self test prints diagnostic lines beginning with '#'. What does flush_kpixel_per_s report, and why is a full-screen redraw so slow on this board?", de: "Der Selbsttest druckt Diagnosezeilen, die mit '#' beginnen. Was meldet flush_kpixel_per_s, und warum ist ein Vollbild-Neuaufbau auf diesem Board so langsam?" }, rubric: "Nennt rund 342 kpixel/s (Vollbild ~448 ms) und erklärt, dass die Schieberegisterkette 16 SPI-Takte pro Pixel kostet, also der Bus und nicht der Treiber die Grenze ist.", bloom: understand }
socratic:
  - { trigger: "task:self-test:failed", question: { en: "No RESULT line arrived. Is the console reading the ST-Link's virtual COM port, or a different serial device?", de: "Keine RESULT-Zeile kam an. Liest die Konsole den virtuellen COM-Port der ST-Link oder ein anderes serielles Gerät?" }, hints: [ { en: "The gate reads TAP over the ST-Link VCP; the wrong port produces silence that looks like a hardware fault.", de: "Das Gate liest TAP über den VCP der ST-Link; der falsche Port erzeugt Stille, die wie ein Hardwarefehler aussieht." }, { en: "A plan of 9 assertions with fewer arriving means the firmware died part way — reflash and watch the count.", de: "Ein Plan mit 9 Zusicherungen, von denen weniger ankommen, heißt, die Firmware starb unterwegs — neu flashen und die Zählung beobachten." }, { en: "If flashing itself failed, a stale GDB server may hold the probe; disconnect and reconnect the board.", de: "Schlug das Flashen selbst fehl, hält womöglich ein verwaister GDB-Server die Probe; trenne und verbinde das Board neu." } ] }
---
## Lernziel

Bringe deinen Build auf das echte Board und bestehe das Hardware-Gate — der Moment, in dem ein kompiliertes Image zu Firmware wird, die nachweislich auf Silizium läuft.

## Flashen und was es verweigert

Flashen schreibt `cads-zero.bin` an `0x08000000` über die ST-Link. Das Werkzeug ist bewusst eng gefasst (`docs/SAFETY.md`, `docs/how-to/flash.md`):

- **`st-flash write` löscht sektorweise nur den geschriebenen Bereich.** Ein ~230 KB großes Image berührt die ersten Sektoren und sonst nichts.
- **Niemals ein Mass-Erase.** Ein Chip-Erase nähme das littlefs-Dateisystem in Flash-Bank 2 mit.
- **Die Imagegröße wird gegen 1 MB geprüft**, damit ein zu großes Image nicht über Bank 1 hinaus ins Dateisystem-Fenster bei `0x08120000` läuft.
- **Option-Bytes werden nie geschrieben**, sodass Read-Protection nie versehentlich gesetzt wird.

In diesem Labor baut der Build-+-Flash-Task, schreibt dann das frische Image und setzt das Board zurück.

## Das Gate, nicht der Bildschirm

Der Displaybus ist nur beschreibbar, „der Bildschirm sah richtig aus" kann also kein Gate sein. Stattdessen führt `apps/bringup` einen On-Target-Selbsttest aus, der **TAP** (Test Anything Protocol) über die serielle Konsole ausgibt, und das Gate liest ihn zurück:

```
1..9
ok 1 - SysTick advances at 1 kHz
ok 2 - DWT microsecond clock agrees
...
# flush_pixels: 153600
# flush_us: 448233
# flush_kpixel_per_s: 342
ok 7 - dirty rectangle limits the transfer
# RESULT: PASS
```

`1..9` ist der Plan; `ok`/`not ok` sind Zusicherungen; `#`-Zeilen sind Diagnosen. Das Format ist Absicht: die Meinung eines Menschen kann keinen Build durchfallen lassen, `ok 4` schon.

## Die Zahl, die alles formt

`flush_kpixel_per_s: 342` ist gemessen, nicht gerechnet. Ein Vollbild hat 153 600 Pixel, bei dieser Rate kostet ein Neuaufbau also etwa **448 ms**. Das Panel wird über eine Schieberegisterkette gespeist, die 16 SPI-Takte pro Pixel verbraucht, also ist der Bus die Grenze und der Treiber schon bei 97 % davon. Genau diese Tatsache ist der Grund, warum das Canvas Dirty-Rectangles verfolgt — die Folgen begegnen dir in M5 wieder.

## Deine Aufgabe

Flashe das Board und lass den Selbsttest laufen. Die Checks bestätigen, dass der Schreibvorgang geschah und `RESULT: PASS` über die Konsole zurückkam. Lies dann eine gemessene Zahl aus der Gate-Ausgabe. Der nächste Step öffnet die Diagnosekonsole, die du gerade benutzt hast.
