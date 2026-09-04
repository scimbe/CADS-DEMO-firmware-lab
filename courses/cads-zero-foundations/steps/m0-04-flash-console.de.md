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
  - { trigger: "task:flashed:failed", question: { en: "This check does not flash for you; it only asks whether a write happened since this step opened. Did you trigger one?", de: "Dieser Check flasht nicht für dich; er fragt nur, ob seit dem Öffnen dieses Steps geschrieben wurde. Hast du das ausgelöst?" }, hints: [ { en: "Most often nothing was written at all — pressing Check alone does not flash anything.", de: "Meistens wurde gar nicht geschrieben — allein auf Prüfen zu drücken flasht nichts." }, { en: "Press F1, type CaDS Board: Flash and run the entry; alternatively use the menu ☰ at the top left, then Terminal, then Run Task..., and pick CaDS: Build + Flash.", de: "Drücke F1, tippe „CaDS Board: Flash“ und führe den Eintrag aus; alternativ über das Menü ☰ oben links, dann Terminal, dann Run Task..., den Eintrag „CaDS: Build + Flash“ wählen." }, { en: "Flashing needs two things at once: a connected probe and an existing build/itsboard/cads-zero.bin. If the board dropped out, m0-02 is the step to repeat; if the file is missing, m0-03 is.", de: "Flashen braucht zweierlei gleichzeitig: eine verbundene Probe und eine vorhandene build/itsboard/cads-zero.bin. Ist das Board abgefallen, gehört m0-02 wiederholt; fehlt die Datei, m0-03." } ] }
  - { trigger: "task:self-test:failed", question: { en: "Nothing matched. Is the console showing the board's text at all, or is it silent from the first line on?", de: "Nichts passte. Zeigt die Konsole überhaupt Text vom Board, oder bleibt sie von der ersten Zeile an still?" }, hints: [ { en: "A wrong or unopened console produces exactly the same silence as a dead board — check the window before you suspect the hardware.", de: "Eine falsche oder gar nicht geöffnete Konsole erzeugt dieselbe Stille wie ein totes Board — sieh erst im Fenster nach, bevor du die Hardware verdächtigst." }, { en: "Open it with F1 and CaDS Board: Konsole öffnen, then trigger a fresh start with CaDS Board: Reset: the self test runs on every boot, so the lines come again.", de: "Öffne sie mit F1 und „CaDS Board: Konsole öffnen“, und löse dann mit „CaDS Board: Reset“ einen neuen Start aus: der Selbsttest läuft bei jedem Start, die Zeilen kommen also erneut." }, { en: "If lines arrive but stop before the end, count them against the plan in the first line: the firmware died part way, and the last assertion printed names the area that failed.", de: "Kommen Zeilen an, hören aber vorzeitig auf, zähl sie gegen den Plan in der ersten Zeile: die Firmware starb unterwegs, und die zuletzt gedruckte Zusicherung benennt den Bereich, in dem es passierte." } ] }
  - { trigger: "question:read-numbers:weak", question: { en: "What does the unit kpixel/s stand for, written out in full?", de: "Wofür steht die Einheit kpixel/s, ausgeschrieben?" }, hints: [ { en: "The most common slip is the k: 342 kpixel/s is not 342 pixels per second.", de: "Der häufigste Fehler steckt im k: 342 kpixel/s sind nicht 342 Pixel je Sekunde." }, { en: "Write the division down before you compute it: an amount of pixels divided by a rate of pixels per second leaves seconds. Both numbers are in the task text.", de: "Schreib die Division erst hin, bevor du rechnest: eine Menge Pixel geteilt durch eine Rate in Pixel je Sekunde ergibt Sekunden. Beide Zahlen stehen in der Aufgabe." }, { en: "The result is well under one second, so state it in milliseconds — and show the division you used, not only the number that comes out.", de: "Das Ergebnis liegt deutlich unter einer Sekunde, gib es also in Millisekunden an — und zeig die Division, die du benutzt hast, nicht nur die Zahl, die herauskommt." } ] }
---
## Lernziel

Bringe deinen Build auf das echte Board und bestehe das Hardware-Gate — der Moment, in dem ein kompiliertes Image zu Firmware wird, die nachweislich auf Silizium läuft.

## Handgriff 1: flashen

Das Flashen löst du selbst aus; der Check dieses Steps sieht nur nach, ob es seit dem Öffnen des Steps geschehen ist. Drücke **`F1`** für die Befehlspalette (`Strg`/`Cmd`+`Umschalt`+`P` tut dasselbe, wird im Browser aber oft abgefangen) und tippe:

```
CaDS Board: Flash
```

Der vollständige Eintrag heißt `CaDS Board: Flash (build/itsboard/cads-zero.bin)`; `Enter` schreibt das zuletzt gebaute Image auf das Board.

**Ohne Tastatur:** in der Statusleiste unten links steht `Board: verbunden · läuft`. Ein Klick darauf öffnet das Board-Menü mit `Flash (build/itsboard/cads-zero.bin)`, `Reset`, `Anhalten`, `Konsole öffnen`, `Log anzeigen`, `Trennen`.

![Das Board-Menü im verbundenen Zustand mit Flash, Reset, Anhalten, Konsole öffnen, Log anzeigen, Trennen](board-menu-connected.png)

**Was du dabei siehst:** die Ausgabe steht *nicht* in einem Terminal. Rechts unten läuft eine Meldung mit dem Fortschritt, danach zeigt die Statusleiste das Ergebnis. Das Schreiben dauert einige Sekunden — im Bild 327088 Bytes in 15973 ms.

![Die Fortschrittsmeldung CaDS: Flash cads-zero.bin: program 60%](flash-progress.png)

![Die Statusleiste nach dem Schreiben: Flash ok: 327088 Bytes in 15973 ms](flash-ok.png)

**Dritter Weg, mit Neubau:** **☰ → `Terminal` → `Run Task...` → `CaDS: Build + Flash`** baut zuerst (beim ersten Mal etwa eine Minute) und flasht danach. Dieser Weg läuft als Task in einem eigenen Terminal unten, das seinen Namen trägt — schließe es nicht, solange es läuft: das Kreuz am Terminal beendet den Vorgang mitten im Schreiben. Zum Wegklappen `Strg`/`Cmd`+`J` nehmen.

## Handgriff 2: die Board-Konsole öffnen

**`F1`**, dann:

```
CaDS Board: Konsole öffnen
```

Unten öffnet sich ein Terminal mit dem Namen `CaDS Board Console`. Seine erste Zeile ist ein Hinweis in Cyan, danach läuft der Text ein, den das Board von sich aus über die serielle Leitung schickt (115200 Baud, siehe m0-02). Ohne Tastatur führt derselbe Weg über die Statusleiste und `Konsole öffnen`.

![Die Board-Konsole mit dem Selbsttest: Banner, 1..10, zehn ok-Zeilen und RESULT: PASS](board-console-boot.png)

Nach dem Schreiben startet das Board neu und führt den Selbsttest sofort aus. War die Konsole zu spät offen, löse mit dem Palettenbefehl

```
CaDS Board: Reset
```

einen neuen Start aus — der Selbsttest läuft bei jedem Start. Bleibt die Konsole still und zeigt einen gelben Hinweis, ist der serielle Port im Browser noch nicht freigegeben: dann noch einmal `CaDS Board: Verbinden` und im Browserdialog bestätigen.

![Die Konsole mit dem gelben Hinweis, dass kein serieller Port freigegeben ist](board-console-no-serial-grant.png)

**Zwei Fenster, zwei Ausgaben.** Der Fortschritt des Flashens erscheint als Meldung und in der Statusleiste; der Text des Boards steht im Terminal `CaDS Board Console` unten — nicht in diesem Steptext. `Strg`/`Cmd`+`J` klappt den Terminal-Bereich auf, rechts wählst du zwischen den offenen Terminals. Und dieses eine Terminal darfst du schließen: das beendet nur die Konsole, nicht das Board; der Palettenbefehl oben öffnet sie wieder.

## Flashen und was es verweigert

**Flashen** heißt: das fertige Programm in den Flash-Speicher des Mikrocontrollers schreiben, damit es dort auch ohne Strom bleibt. Konkret schreibt es `cads-zero.bin` an die Adresse `0x08000000` über die ST-Link. Das Werkzeug ist bewusst eng gefasst (`docs/SAFETY.md`):

- **`st-flash write` löscht sektorweise nur den geschriebenen Bereich.** Flash lässt sich nicht byteweise überschreiben, sondern nur in ganzen **Sektoren** — Blöcken fester Größe — löschen.
- **Niemals ein Mass-Erase.** Ein *Chip-Erase* löscht den gesamten Flash auf einen Schlag; er nähme das littlefs-Dateisystem in Flash-Bank 2 mit.
- **Die Imagegröße wird gegen 1 MB geprüft**, damit ein zu großes Image nicht ins Dateisystem-Fenster bei `0x08120000` läuft.
- **Option-Bytes werden nie geschrieben.** Diese kleine Konfigurationsfläche des Chips trägt den Auslese-Schutz, der ein Board dauerhaft unlesbar machen kann. Also fasst das Werkzeug sie gar nicht erst an.

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

`1..10` ist der Plan: so viele Zusicherungen sind angekündigt. `ok`/`not ok` sind die Zusicherungen selbst; `#`-Zeilen sind Diagnosen, also Messwerte ohne Urteil. Kommen weniger Zeilen an, als der Plan ankündigt, ist die Firmware unterwegs gestorben — auch das ist ein Durchfallen.

Der zweite Check tippt nichts: er hört bis zu 60 Sekunden auf der Konsole mit und wird grün, sobald `RESULT: PASS` durchläuft. Du sorgst nur dafür, dass das Board es gerade sendet — also flashen oder zurücksetzen, dann **Prüfen** drücken.

## Die Zahl, die alles formt

`flush_kpixel_per_s: 342` ist gemessen, nicht gerechnet: 342 000 Pixel je Sekunde gingen tatsächlich über den Bus. Das Panel wird über eine Schieberegisterkette gespeist, die 16 **SPI**-Takte pro Pixel verbraucht — SPI ist der serielle Bus, über den der Chip das Display beschreibt. Der Bus ist damit die Grenze, nicht der Treiber; der liegt schon bei 97 % dessen, was der Bus hergibt. Was das für einen Vollbild-Neuaufbau bedeutet, rechnest du gleich aus — und genau diese Größenordnung ist der Grund, warum das Canvas Dirty-Rectangles verfolgt. Die Folgen begegnen dir in M5 wieder.

## Deine Aufgabe

Flashe das Board (`F1` → `CaDS Board: Flash`), öffne die Konsole (`F1` → `CaDS Board: Konsole öffnen`) und drücke dann an den ersten beiden Aufgaben **Prüfen**. Rechne danach im Feld der dritten Aufgabe aus, wie lange ein Vollbild bei der gemessenen Rate dauert, und drücke **Antwort abgeben**. Der nächste Step öffnet die Diagnosekonsole, die du gerade benutzt hast.
