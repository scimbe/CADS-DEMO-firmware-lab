---
id: m3-02-registers-svd
title: Kern- und Peripherieregister, live
bloom: apply
objectives: [cz.debug.registers-svd]
requires: [m3-01-gdb-breakpoints]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m3-03-fault-forensics }
  - { file: "targets/itsboard/STM32F429.svd" }
  - { file: "targets/itsboard/hal/hal_clock.c", line: 46 }
  - { file: "targets/itsboard/hal/hal_io.c", line: 62 }
  - { doc: "docs/how-to/vscode-setup.md" }
sources: [docs/how-to/vscode-setup.md, docs/how-to/debug.md, targets/itsboard/hal/hal_clock.c, targets/itsboard/hal/hal_io.c, targets/itsboard/board.h, docs/HARDWARE.md]
tasks:
  - id: odr-after-write
    title: Sage GPIOD->ODR voraus, dann schreibe die Ausgänge
    check: { type: predict, prompt: { en: "You are about to send `o 0055` on the console. Which value will the low byte of GPIOD->ODR hold afterwards, and why?", de: "Du sendest gleich `o 0055` an der Konsole. Welchen Wert hält danach das niederwertige Byte von GPIOD->ODR, und warum?" }, then: { type: serialExpect, send: "o 0055\n", pattern: "outputs = 0055", timeoutMs: 15000 }, rubric: "Die Vorhersage nennt 0x55 (binär 0101 0101) für das niederwertige Byte von GPIOD->ODR und begründet es damit, dass cads_hal_adapter_outputs() das Low-Byte des Arguments über GPIOD->BSRR setzt und die übrigen acht Bits im selben Wort löscht, sodass ODR danach genau dieses Byte spiegelt. Eine abweichende Zahl mit nachvollziehbarer Rechenkette zählt als bestanden, sofern die Abweichung nach dem Vergleich benannt wird.", bloom: apply }
  - id: sws-mask
    title: Baue die Maske für das Feld SWS
    check: { type: question, prompt: { en: "SWS sits in bits 3:2 of RCC_CFGR. Which hex mask isolates that field, and which masked value do you expect here?", de: "SWS liegt in RCC_CFGR auf den Bits 3:2. Welche Hexmaske isoliert dieses Feld, und welchen maskierten Wert erwartest du hier?" }, rubric: "Maske 0x0000000C (Bit 2 und Bit 3, also binär 1100). Da PLL als Systemtakt das Feld auf binär 10 setzt und das Feld bei Bit 2 beginnt, liest der maskierte Wert 0x00000008; nach einer Verschiebung um zwei Stellen nach rechts bleibt 0b10 = 2. Eine Antwort, die nur 0xC ohne den erwarteten Wert nennt, ist unvollständig; eine Antwort, die 0x3 oder 0x0C000000 nennt, hat die Bitnummerierung von der falschen Seite gezählt.", bloom: apply }
misconceptions:
  - { pattern: "outputs = 0085", question: { en: "The board echoed 0085, not 0055. In which number base does the o command read its argument?", de: "Das Board hat 0085 geantwortet, nicht 0055. In welchem Zahlensystem liest der Befehl o sein Argument?" }, hints: [ { en: "Did you type the decimal value of the pattern instead of its hex digits?", de: "Hast du den Dezimalwert des Musters getippt statt seiner Hexziffern?" }, { en: "Look at the help line for o in apps/bringup/explorer.c: the argument is documented as <hex>.", de: "Sieh dir die Hilfezeile zu o in apps/bringup/explorer.c an: das Argument ist als <hex> dokumentiert." }, { en: "The console never prints a 0x prefix; the four digits it echoes are already hex, so 85 there means 0x85, not eighty-five.", de: "Die Konsole druckt nie ein 0x-Präfix; die vier Ziffern, die sie zurückgibt, sind bereits hexadezimal, 85 dort heißt also 0x85, nicht fünfundachtzig." } ] }
socratic:
  - { trigger: "task:odr-after-write:failed", question: { en: "Did the board answer at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command that produces no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal with the menu icon at the top left, Terminal, New Terminal, run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne mit dem Menü-Symbol oben links, Terminal, New Terminal ein Terminal, führe dort python3 scripts/board_key.py quit aus und lass den Check dann erneut laufen." }, { en: "The board is also deaf while a debug session has it halted - press Continue or Stop on the debug toolbar at the top before writing to the console.", de: "Das Board ist auch taub, solange eine Debug-Sitzung es angehalten hat - drücke Continue oder Stop in der Debug-Werkzeugleiste oben, bevor du auf die Konsole schreibst." } ] }
  - { trigger: "question:sws-mask:weak", question: { en: "Which single bit is bit 2, written as a hex number, and which is bit 3?", de: "Welches einzelne Bit ist Bit 2, als Hexzahl geschrieben, und welches ist Bit 3?" }, hints: [ { en: "Are you counting bit positions from the right-hand end of the word, starting at zero?", de: "Zählst du die Bitpositionen vom rechten Ende des Wortes, beginnend bei null?" }, { en: "Write 1 << 2 and 1 << 3 as binary, put them side by side, and combine them with a bitwise or.", de: "Schreib 1 << 2 und 1 << 3 binär hin, leg sie nebeneinander und verknüpfe sie mit einem bitweisen Oder." }, { en: "Two adjacent bits sitting anywhere but at the far right: what you cut out is not yet the small number the datasheet talks about.", de: "Zwei benachbarte Bits, die nicht ganz rechts sitzen: was du herausschneidest, ist noch nicht die kleine Zahl aus dem Datenblatt." } ] }
---

## Lernziel

Lies die Register des STM32 auf dem laufenden Board durch den Debugger, damit du Hardwarefragen - stimmt der Takt, was hält ein Ausgangspin - durch Hinsehen statt durch Raten beantwortest.

## Die Sitzung öffnen, in der du liest

Die Bedienoberfläche ist englisch, der Kurstext deutsch, und eine sichtbare Menüleiste gibt es nicht: die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` und `Help` öffnet.

Klick auf das **Käfer-Symbol** in der Leiste ganz links, das die Ansicht **Run and Debug** öffnet. Wähle in der Konfigurationsliste oben **`Debug CaDS Zero (Board im Browser)`** und drücke **`F5`**; ohne Tastatur **☰ → `Run` → `Start Debugging`**. Unten im Terminal-Bereich läuft zuerst `CaDS: Build + Flash` in eigenen Terminals - beim ersten Mal etwa eine Minute plus 15 Sekunden. Danach hält die Ausführung bei `main()`, erkennbar an der Debug-Werkzeugleiste oben und an `Paused on breakpoint` im Bereich `CALL STACK`.

Register kannst du nur bei **angehaltenem** Target lesen. Läuft es, drücke den Pause-Knopf in der Debug-Werkzeugleiste oben.

## Kernregister

Der Bereich **`VARIABLES`** führt `Local`, `Global`, `Static` und **`Registers`**. Klapp `Registers` auf.

![Der Bereich VARIABLES mit den Abschnitten Local, Global, Static und Registers](debug-variables.png)

Darin stehen `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR` mit Live-Werten - der Zustand der CPU im Halt. `pc` ist die Stelle, an der es fortsetzt; `lr` die Rücksprungadresse der aktuellen Funktion; `sp` der aktive Stackpointer (MSP vor dem Scheduler-Start, PSP in einer Task). Alle drei brauchst du im nächsten Step.

![Registers aufgeklappt, mit den Live-Werten von r0, r1 und den übrigen Kernregistern](debug-registers.png)

## Peripherieregister über die SVD

Rohe Kernregister beantworten die Embedded-Frage selten. Du willst wissen: „Zeigt `RCC->CR` HSE bereit?“ oder „Was steht in `GPIOD->ODR`?“. `cortex-debug` beantwortet das mit einer **SVD-Datei**: `targets/itsboard/STM32F429.svd` beschreibt jedes Peripheriegerät, Register, Feld und Resetwert, von STMicroelectronics selbst und in die Konfiguration eingebunden.

Während einer Sitzung erscheint in der Ansicht **Run and Debug** ein Bereich **`XPeripherals`** mit jedem Peripheriegerät nach Name und Basisadresse. Klick auf den Pfeil vor einem Namen für seine Register mit Live-Werten, auf den Pfeil vor einem Register für seine Felder. Außerhalb einer Sitzung steht dort „No active debug session“, was korrekt ist.

![Der Bereich XPeripherals aus der SVD, mit ADC1 bei 0x40012000 und CAN1 bei 0x40006400](debug-peripherals-svd.png)

## Ein Feld aus einem Register herausschneiden

Ein Register ist selten eine Zahl, sondern eine Reihe von **Feldern**. Die SVD zeigt sie aufgeschlüsselt; rechnest du selbst, brauchst du die zwei Handgriffe aus dem MMIO-Primer: **maskieren** mit einer Maske, die genau die Bits *h:l* gesetzt hat (Bit *n* ist `1 << n`, gezählt vom rechten Ende ab null), und **verschieben** um `>> l`.

## Zwei Dinge, die sich jetzt zu lesen lohnen

**Der Taktbaum.** `targets/itsboard/hal/hal_clock.c` setzt in `RCC->CR` die Bits `HSEBYP` und `HSEON` und wartet, bis `HSERDY` gesetzt ist - die 8-MHz-Referenz ist ein Rechtecksignal vom MCO der ST-Link, kein Quarz, deshalb *Bypass* (`docs/HARDWARE.md`). Die Haupt-PLL wird auf 8 / 8 × 360 / 2 = 180 MHz konfiguriert und `RCC->CFGR` auf die PLL umgeschaltet. Dass die Umschaltung geschah, bestätigt das Feld `SWS` auf den **Bits 3:2** von `RCC_CFGR`, in der Sitzung unter `XPeripherals` → `RCC` → `CFGR`.

**Ein Ausgangsport.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`, Zeile 62) schreibt OUT0..7 über `GPIOD->BSRR` in einem atomaren Setz-und-Lösch-Wort, OUT8..15 über `GPIOE->BSRR` (`targets/itsboard/board.h` legt die Aufteilung fest). `BSRR` ist nur beschreibbar; das *Ergebnis* steht in `GPIOD->ODR`, dessen niederwertiges Byte der Zustand von PD0..PD7 ist. `ODR` zu lesen bestätigt also, was der letzte Ausgangsschreibvorgang wirklich getan hat - so wurde auch der SPI-Mutex-Boot-Hänger dieses Projekts gefunden, durch ein Live-Lesen von `BASEPRI` (`docs/ROADMAP.md`, 2026-08-26).

## Den Befehl schickt der Prüfknopf, nicht du

Der Explorer-Befehl `o <hex>` ruft `cads_hal_adapter_outputs()` auf und bestätigt das mit einer Zeile `# outputs = ....`. Den Befehl `o 0055` tippst du **nicht** selbst: der Prüfknopf sendet ihn, du liest nur die Antwort mit.

Zwei Dinge müssen dafür stimmen. Erstens darf das Board nicht angehalten sein: beende die Sitzung mit dem **Stop**-Knopf in der Debug-Werkzeugleiste oben, danach zeigt die Statusleiste wieder `Board: verbunden · läuft`.

![Nach Stop läuft das Board weiter, die Statusleiste zeigt wieder Board: verbunden · läuft](debug-after-stop.png)

Zweitens: ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne darum vorher ein Terminal (**☰ → `Terminal` → `New Terminal`**; ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf) und führe einmal aus:

```bash
python3 scripts/board_key.py quit
```

Das Arbeitsverzeichnis ist die Projektwurzel. Danach ist das Board am Konsolen-Prompt, und der Prüfknopf kommt durch.

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt - `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin - zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen - nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Sage zuerst voraus, was das niederwertige Byte von `GPIOD->ODR` nach `o 0055` hält, und schreib die Vorhersage in die erste Aufgabe. Bring das Board mit dem Terminalbefehl oben an den Konsolen-Prompt und drücke **Prüfen**: der Knopf sendet `o 0055`, du liest die Antwortzeile mit. Starte danach mit **`F5`** eine Sitzung und vergleiche unter `XPeripherals` → `GPIOD` → `ODR`. Baue schließlich die Maske für `SWS`. Der nächste Step liest mit denselben Registern einen Absturz.
