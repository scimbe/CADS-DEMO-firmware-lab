---
id: m0-04-flash-console
title: Flashen und das Hardware-Gate bestehen
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
    title: Das Image wird auf das Board geschrieben
    check: { type: flash, since: stepStart }
  - id: self-test
    title: Der On-Target-Selbsttest besteht
    check: { type: serialExpect, pattern: "RESULT: PASS", timeoutMs: 60000 }
  - id: read-numbers
    title: Rechne die Dauer eines Vollbilds aus
    check: { type: question, prompt: { en: "The self test reports flush_kpixel_per_s: 342, and a full screen holds 153600 pixels. Work out how long one full screen takes.", de: "Der Selbsttest meldet flush_kpixel_per_s: 342, und ein Vollbild hat 153600 Pixel. Rechne aus, wie lange ein Vollbild dauert." }, rubric: "Bewertet wird der Rechenweg, nicht eine abgeschriebene Zahl: 342 kpixel/s sind 342000 Pixel je Sekunde, und 153600 geteilt durch 342000 ergibt rund 0,45 Sekunden, also etwa 450 ms. Richtig ist eine nachvollziehbare Rechnung mit sauberer Einheitenbehandlung und einem Ergebnis zwischen 440 und 460 ms; ein Ergebnis ohne Rechenweg zählt nicht, eine kleine Rundungsabweichung mit richtigem Weg schon.", bloom: apply }
socratic:
  - { trigger: "task:flashed:failed", question: { en: "This check does not flash for you; it only asks whether a write happened since this step opened. Did you trigger one?", de: "Dieser Check flasht nicht für dich; er fragt nur, ob seit dem Öffnen dieses Steps geschrieben wurde. Hast du das ausgelöst?" }, hints: [ { en: "Most often nothing was written at all — pressing Check alone does not flash anything.", de: "Meistens wurde gar nicht geschrieben — allein auf Prüfen zu drücken flasht nichts." }, { en: "Press F1, type CaDS Board: Flash and run the entry; alternatively use the menu Terminal → Run Task… and pick CaDS: Build + Flash.", de: "Drücke F1, tippe „CaDS Board: Flash“ und führe den Eintrag aus; alternativ über das Menü Terminal → Run Task… den Eintrag „CaDS: Build + Flash“ wählen." }, { en: "Flashing needs two things at once: a connected probe and an existing build/itsboard/cads-zero.bin. If the board dropped out, m0-02 is the step to repeat; if the file is missing, m0-03 is.", de: "Flashen braucht zweierlei gleichzeitig: eine verbundene Probe und eine vorhandene build/itsboard/cads-zero.bin. Ist das Board abgefallen, gehört m0-02 wiederholt; fehlt die Datei, m0-03." } ] }
  - { trigger: "task:self-test:failed", question: { en: "Nothing matched. Is the console showing the board's text at all, or is it silent from the first line on?", de: "Nichts passte. Zeigt die Konsole überhaupt Text vom Board, oder bleibt sie von der ersten Zeile an still?" }, hints: [ { en: "A wrong or unopened console produces exactly the same silence as a dead board — check the window before you suspect the hardware.", de: "Eine falsche oder gar nicht geöffnete Konsole erzeugt dieselbe Stille wie ein totes Board — sieh erst im Fenster nach, bevor du die Hardware verdächtigst." }, { en: "Open it with F1 and CaDS Board: Konsole öffnen, then trigger a fresh start with CaDS Board: Reset: the self test runs on every boot, so the lines come again.", de: "Öffne sie mit F1 und „CaDS Board: Konsole öffnen“, und löse dann mit „CaDS Board: Reset“ einen neuen Start aus: der Selbsttest läuft bei jedem Start, die Zeilen kommen also erneut." }, { en: "If lines arrive but stop before the end, count them against the plan in the first line: the firmware died part way, and the last assertion printed names the area that failed.", de: "Kommen Zeilen an, hören aber vorzeitig auf, zähl sie gegen den Plan in der ersten Zeile: die Firmware starb unterwegs, und die zuletzt gedruckte Zusicherung benennt den Bereich, in dem es passierte." } ] }
  - { trigger: "question:read-numbers:weak", question: { en: "What does the unit kpixel/s stand for, written out in full?", de: "Wofür steht die Einheit kpixel/s, ausgeschrieben?" }, hints: [ { en: "The most common slip is the k: 342 kpixel/s is not 342 pixels per second.", de: "Der häufigste Fehler steckt im k: 342 kpixel/s sind nicht 342 Pixel je Sekunde." }, { en: "Write the division down before you compute it: an amount of pixels divided by a rate of pixels per second leaves seconds. Both numbers are in the task text.", de: "Schreib die Division erst hin, bevor du rechnest: eine Menge Pixel geteilt durch eine Rate in Pixel je Sekunde ergibt Sekunden. Beide Zahlen stehen in der Aufgabe." }, { en: "The result is well under one second, so state it in milliseconds — and show the division you used, not only the number that comes out.", de: "Das Ergebnis liegt deutlich unter einer Sekunde, gib es also in Millisekunden an — und zeig die Division, die du benutzt hast, nicht nur die Zahl, die herauskommt." } ] }
---
## Lernziel

Bringe deinen Build auf das echte Board und bestehe das Hardware-Gate — der Moment, in dem ein kompiliertes Image zu Firmware wird, die nachweislich auf Silizium läuft.

## Wo du das machst

Das Flashen löst du selbst aus; der Check dieses Steps sieht nur nach, ob es geschehen ist.

1. Befehlspalette mit `F1`, dann **CaDS Board: Flash (build/itsboard/cads-zero.bin)** — das schreibt das zuletzt gebaute Image auf das Board. Alternativ Menü **Terminal → Run Task…** und **CaDS: Build + Flash**, das vorher noch einmal baut.
2. Öffne die **Board-Konsole** mit dem Palettenbefehl **CaDS Board: Konsole öffnen**. In diesem Fenster läuft der Text ein, den das Board von sich aus schickt.
3. Nach dem Schreiben startet das Board neu und führt den Selbsttest sofort aus. War die Konsole zu spät offen, löse mit **CaDS Board: Reset** einen neuen Start aus — der Selbsttest läuft bei jedem Start.
4. Zurück in diesem Panel: bei den ersten beiden Aufgaben auf **Prüfen** drücken.

## Flashen und was es verweigert

**Flashen** heißt: das fertige Programm in den Flash-Speicher des Mikrocontrollers schreiben, damit es dort auch ohne Strom bleibt. Konkret schreibt es `cads-zero.bin` an die Adresse `0x08000000` über die ST-Link. Das Werkzeug ist bewusst eng gefasst (`docs/SAFETY.md`, `docs/how-to/flash.md`):

- **`st-flash write` löscht sektorweise nur den geschriebenen Bereich.** Flash lässt sich nicht byteweise überschreiben, sondern nur in ganzen **Sektoren** — zusammenhängenden Blöcken fester Größe — löschen. Ein rund 230 KB großes Image berührt die ersten Sektoren und sonst nichts.
- **Niemals ein Mass-Erase.** Ein *Mass-* oder *Chip-Erase* löscht den gesamten Flash auf einen Schlag; er nähme das littlefs-Dateisystem in Flash-Bank 2 mit, in dem die Dateien des Boards liegen.
- **Die Imagegröße wird gegen 1 MB geprüft**, damit ein zu großes Image nicht über Bank 1 hinaus ins Dateisystem-Fenster bei `0x08120000` läuft.
- **Option-Bytes werden nie geschrieben.** Die *Option-Bytes* sind ein kleiner Konfigurationsbereich des Chips, den man ebenfalls beschreiben könnte; dort ließe sich der Auslese-Schutz setzen, der ein Board dauerhaft unlesbar macht. Also fasst das Werkzeug sie gar nicht erst an.

## Das Gate, nicht der Bildschirm

Der Displaybus ist nur beschreibbar, „der Bildschirm sah richtig aus“ kann also kein Gate sein. Stattdessen führt `apps/bringup` bei jedem Start einen On-Target-Selbsttest aus, der **TAP** (Test Anything Protocol, ein Zeilenformat für Testergebnisse) über die serielle Konsole ausgibt, und das Gate liest ihn zurück:

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

`1..10` ist der Plan: so viele Zusicherungen sind angekündigt. `ok`/`not ok` sind die Zusicherungen selbst; `#`-Zeilen sind Diagnosen, also Messwerte ohne Urteil. Das Format ist Absicht: die Meinung eines Menschen kann keinen Build durchfallen lassen, `ok 4` schon. Kommen weniger Zeilen an, als der Plan ankündigt, ist die Firmware unterwegs gestorben — auch das ist ein Durchfallen.

## Die Zahl, die alles formt

`flush_kpixel_per_s: 342` ist gemessen, nicht gerechnet: 342 000 Pixel je Sekunde gingen tatsächlich über den Bus. Das Panel wird über eine Schieberegisterkette gespeist, die 16 **SPI**-Takte pro Pixel verbraucht — SPI ist der serielle Bus, über den der Chip das Display beschreibt, und jeder Takt schiebt ein Bit weiter. Der Bus ist damit die Grenze, nicht der Treiber; der Treiber liegt schon bei 97 % dessen, was der Bus hergibt. Was diese Rate für einen Vollbild-Neuaufbau bedeutet, rechnest du gleich selbst aus — und genau diese Größenordnung ist der Grund, warum das Canvas Dirty-Rectangles verfolgt. Die Folgen begegnen dir in M5 wieder.

## Deine Aufgabe

Flashe das Board und lass den Selbsttest laufen. Die Checks bestätigen, dass der Schreibvorgang geschah und `RESULT: PASS` über die Konsole zurückkam. Rechne dann aus, wie lange ein Vollbild bei der gemessenen Rate dauert. Der nächste Step öffnet die Diagnosekonsole, die du gerade benutzt hast.
