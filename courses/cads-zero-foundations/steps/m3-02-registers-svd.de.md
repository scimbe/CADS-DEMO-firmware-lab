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
  - { trigger: "task:odr-after-write:failed", question: { en: "Did the board answer at all, or is it still inside the touchscreen app tree that ignores plain typed bytes?", de: "Hat das Board überhaupt geantwortet, oder steckt es noch im Touchscreen-App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "A console command that produces no echo at all usually means the prompt is not the thing listening right now.", de: "Ein Konsolenbefehl ganz ohne Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Send scripts/board_key.py quit from the terminal first, then let the check run again.", de: "Sende zuerst scripts/board_key.py quit aus dem Terminal, dann lass den Check erneut laufen." }, { en: "The board is also deaf while a debug session has it halted - resume or end the session before writing to the console.", de: "Das Board ist auch taub, solange eine Debug-Sitzung es angehalten hat - setze fort oder beende die Sitzung, bevor du auf die Konsole schreibst." } ] }
  - { trigger: "question:sws-mask:weak", question: { en: "Which single bit is bit 2, written as a hex number, and which is bit 3?", de: "Welches einzelne Bit ist Bit 2, als Hexzahl geschrieben, und welches ist Bit 3?" }, hints: [ { en: "Are you counting bit positions from the right-hand end of the word, starting at zero?", de: "Zählst du die Bitpositionen vom rechten Ende des Wortes, beginnend bei null?" }, { en: "Write 1 << 2 and 1 << 3 as binary, put them side by side, and combine them with a bitwise or.", de: "Schreib 1 << 2 und 1 << 3 binär hin, leg sie nebeneinander und verknüpfe sie mit einem bitweisen Oder." }, { en: "Two adjacent bits sitting anywhere but at the far right: what you cut out is not yet the small number the datasheet talks about.", de: "Zwei benachbarte Bits, die nicht ganz rechts sitzen: was du herausschneidest, ist noch nicht die kleine Zahl aus dem Datenblatt." } ] }
---
## Lernziel

Lies die Register des STM32 auf dem laufenden Board durch den Debugger, damit du Hardwarefragen - stimmt der Takt, was hält ein Ausgangspin - durch Hinsehen statt durch Raten beantwortest.

## Kernregister

Bei angehaltenem Target hat das Panel **Variables** einen Abschnitt **Registers**: `r0`-`r12`, `sp`, `lr`, `pc`, `xPSR`. Das ist der Zustand der CPU im Halt. `pc` ist die Stelle, an der die Ausführung fortsetzt; `lr` die Rücksprungadresse der aktuellen Funktion; `sp` der aktive Stackpointer (MSP vor dem Scheduler-Start, PSP in einer Task). Alle drei brauchst du, wenn du im nächsten Step einen Fault-Dump liest.

## Peripherieregister über die SVD

Rohe Kernregister beantworten die Embedded-Frage selten. Du willst wissen: „Zeigt `RCC->CR` HSE bereit?“ oder „Was steht in `GPIOD->ODR`?“. `cortex-debug` beantwortet das mit einer **SVD-Datei**: `targets/itsboard/STM32F429.svd` ist die Beschreibung jedes Peripheriegeräts, Registers, Feldes und Resetwerts von STMicroelectronics selbst, im Repository mitgeliefert (Apache-2.0) und in die Launch-Konfiguration eingebunden. Während einer Sitzung erscheint ein Panel **XPeripherals** in der Seitenleiste Run and Debug mit jedem Peripheriegerät nach Name und Basisadresse; klappe eines auf, um seine Register mit Live-Werten zu sehen. Außerhalb einer Sitzung steht dort „No active debug session“, was korrekt ist.

## Ein Feld aus einem Register herausschneiden

Ein Register ist selten eine einzelne Zahl; es ist eine Reihe von **Feldern**, jedes ein paar Bits breit. Die SVD zeigt sie dir aufgeschlüsselt, aber sobald du selbst rechnest - in GDB, in einem Skript, im Kopf - brauchst du das Handwerk dazu, und es besteht aus zwei Schritten:

1. **Maskieren.** Ein Feld auf den Bits *h:l* wird mit einer Maske isoliert, die genau diese Bits gesetzt hat. Bit *n* ist `1 << n`; mehrere Bits werden mit bitweisem Oder verbunden. Bitpositionen zählen immer vom rechten Ende des Wortes, beginnend bei null.
2. **Verschieben.** Das maskierte Wort ist noch nicht der Feldwert - das Feld sitzt ja an seiner Position. Erst `>> l` schiebt es nach ganz rechts und macht aus dem maskierten Wort die kleine Zahl, die im Datenblatt steht.

Diese zwei Schritte brauchst du gleich für `SWS`.

## Zwei Dinge, die sich jetzt zu lesen lohnen

**Der Taktbaum.** `targets/itsboard/hal/hal_clock.c` setzt in `RCC->CR` die Bits `HSEBYP` und `HSEON` und wartet dann, bis `HSERDY` gesetzt ist - die 8-MHz-Referenz ist ein Rechtecksignal vom MCO der ST-Link, kein Quarz, deshalb ist *Bypass* aktiv (`docs/HARDWARE.md`). Die Haupt-PLL wird dann auf 8 / 8 × 360 / 2 = 180 MHz konfiguriert und `RCC->CFGR` auf die PLL umgeschaltet. Die Bestätigung, dass die Umschaltung geschah, ist das Feld `SWS` auf den **Bits 3:2** von `RCC_CFGR`: läuft die PLL als Systemtakt, steht dort binär `10` - dieselbe Registerprüfung, die `docs/tutorials/first-gate.md` für eine fehlschlagende Zeitbasis-Zusicherung nennt.

**Ein Ausgangsport.** `cads_hal_adapter_outputs()` (`targets/itsboard/hal/hal_io.c`, Zeile 62) schreibt OUT0..7 über `GPIOD->BSRR` in einem atomaren Setz-und-Lösch-Wort und OUT8..15 über `GPIOE->BSRR` (`targets/itsboard/board.h` legt fest, welcher Port welche Hälfte trägt). `BSRR` ist nur beschreibbar; das *Ergebnis* ist in `GPIOD->ODR` sichtbar, dessen niederwertiges Byte der aktuelle Zustand von PD0..PD7 ist. `ODR` im Debugger zu lesen ist daher ein Weg zu bestätigen, was der letzte Ausgangsschreibvorgang wirklich getan hat.

Genau das machst du gleich: der Explorer-Befehl `o <hex>` ruft `cads_hal_adapter_outputs()` mit dem übergebenen Wert auf und bestätigt ihn mit einer Zeile `# outputs = ....`. Danach steht in `ODR` etwas, das du vorher hättest ausrechnen können - also rechne es zuerst aus.

## Lesen, nicht annehmen

Die Projektakte kennt mehr als einen Fall, in dem ein Registerlesen eine Frage entschied, die Nachdenken nicht klären konnte: der SPI-Mutex-Boot-Hänger wurde gefunden, indem `BASEPRI` live gelesen wurde, und die Signatur „hängt bei Reset_Handler“ ist eine bestimmte Menge von Registerwerten (`docs/ROADMAP.md`, Einträge vom 2026-08-26 und 2026-08-29). Die Gewohnheit, die du aufbaust: wenn das Verhalten der Firmware und dein Modell davon auseinandergehen, lies das Register.

## Deine Aufgabe

Bring das Board an den Konsolen-Prompt (nötigenfalls mit `scripts/board_key.py quit` aus dem Terminal). Sage voraus, was das niederwertige Byte von `GPIOD->ODR` nach `o 0055` hält, lass den Check den Befehl senden und prüfe deine Vorhersage anschließend in einer Debug-Sitzung unter XPeripherals → `GPIOD` → `ODR`. Baue dann die Maske für das Feld `SWS`. Der nächste Step nutzt dieselben Register, um einen Absturz zu lesen.
