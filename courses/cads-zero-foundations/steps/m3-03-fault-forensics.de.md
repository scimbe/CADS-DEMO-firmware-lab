---
id: m3-03-fault-forensics
title: Einen Fault lesen, und der Forensik-Ring
bloom: analyze
objectives: [cz.debug.forensics]
requires: [m3-02-registers-svd]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: m3-04-stack-guard }
  - { doc: "docs/how-to/debug.md" }
  - { file: "targets/itsboard/startup/fault_handlers.c" }
  - { file: "lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h", line: 626 }
  - { file: "modules/diag/include/cads/diag/forensic.h" }
  - { file: "apps/bringup/explorer.c", line: 568 }
sources: [docs/how-to/debug.md, docs/ROADMAP.md, targets/itsboard/startup/fault_handlers.c, lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h, modules/diag/include/cads/diag/forensic.h, modules/diag/src/cads_forensic.c, apps/bringup/explorer.c]
tasks:
  - id: run-e
    title: Den Forensik-Ring mit dem Befehl E ausgeben
    check: { type: serialExpect, send: "E\n", pattern: "forensic ring", timeoutMs: 15000 }
  - id: decode-busfault
    title: Eine Bus-Fault-Signatur dekodieren
    check: { type: question, prompt: { en: "A dump reads BusFault, CFSR = 0x00008200, with a BFAR line under it. Which two bits are set?", de: "Ein Dump zeigt BusFault, CFSR = 0x00008200 und darunter eine BFAR-Zeile. Welche zwei Bits sind gesetzt?" }, rubric: "Bit 9 und Bit 15, beide im Bereich 15:8, also BFSR. Bit 9 heißt PRECISERR, Bit 15 heißt BFARVALID; das zweite erklärt, warum die Adresszeile überhaupt mitgedruckt wurde. Belegbar über SCB_CFSR_PRECISERR_Pos und SCB_CFSR_BFARVALID_Pos. Wer 0x82 dem niederwertigen Byte zuordnet, hat um acht Stellen danebengegriffen; wer nur ein einziges gesetztes Bit nennt, hat 0x8200 nicht vollständig zerlegt.", bloom: analyze }
  - id: decode-usagefault
    title: Eine Usage-Fault-Signatur dekodieren
    check: { type: question, prompt: { en: "A second dump reads UsageFault, CFSR = 0x00020000, and no BFAR line. Which bit reports that?", de: "Ein zweiter Dump zeigt UsageFault, CFSR = 0x00020000 und keine BFAR-Zeile. Welches Bit meldet das?" }, rubric: "Bit 17, im Bereich 31:16, also im Teilregister UFSR. Es ist INVSTATE (SCB_CFSR_INVSTATE_Pos in lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h): der Kern sollte in einen Zustand springen, den er nicht einnehmen kann - auf diesem Chip praktisch immer eine Zieladresse ohne gesetztes Thumb-Bit, etwa ein Sprung nach 0x0. Dass keine BFAR-Zeile dabeisteht, ist konsistent: ein Usage-Fault rastet keine Adresse ein, sein Gültigkeitsbit bleibt also gelöscht. Wer Bit 17 als das zweite Bit von rechts zählt, hat den 31:16-Bereich nicht abgezogen.", bloom: analyze }
misconceptions:
  - { pattern: "forensic ring: 0 record", question: { en: "The ring is empty. Does that mean nothing ever crashed, or that something erased it?", de: "Der Ring ist leer. Heißt das, dass nie etwas abgestürzt ist, oder dass etwas ihn gelöscht hat?" }, hints: [ { en: "Which of the two - a reset or a real power cycle - did this board just go through?", de: "Welches von beiden - ein Reset oder ein echter Power-Cycle - hat dieses Board gerade hinter sich?" }, { en: "Read the section on where the ring is placed: it names the memory region and what the reset handler does to it.", de: "Lies den Abschnitt dazu, wo der Ring liegt: er nennt den Speicherbereich und was der Reset-Handler mit ihm macht." }, { en: "An empty ring after unplugging the board is the correct, expected reading - it is not evidence that the ring is broken.", de: "Ein leerer Ring nach dem Abziehen des Boards ist die korrekte, erwartete Anzeige - er ist kein Beleg dafür, dass der Ring kaputt ist." } ] }
socratic:
  - { trigger: "task:run-e:failed", question: { en: "E printed nothing at all. Is the board at the console prompt, or still inside the app-tree session that ignores plain typed bytes?", de: "E druckte gar nichts. Ist das Board am Konsolen-Prompt oder noch in der App-Baum-Sitzung, die einfache getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal with the menu icon at the top left, Terminal, New Terminal, run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne mit dem Menü-Symbol oben links, Terminal, New Terminal ein Terminal, führe dort python3 scripts/board_key.py quit aus und lass den Check dann erneut laufen." }, { en: "Do not run z FAULT to force output - it halts the firmware for good and needs a reflash.", de: "Führe nicht z FAULT aus, um eine Ausgabe zu erzwingen - es hält die Firmware für immer an und braucht einen Reflash." } ] }
  - { trigger: "question:decode-busfault:weak", question: { en: "Write 0x00008200 out as 32 binary digits. Which two of them are ones, and which numbered positions are those?", de: "Schreib 0x00008200 als 32 Binärziffern aus. Welche zwei davon sind Einsen, und welche Positionsnummern sind das?" }, hints: [ { en: "Each hex digit is exactly four bits - are you converting the whole word, or only the two digits that caught your eye?", de: "Jede Hexziffer ist genau vier Bits - wandelst du das ganze Wort um oder nur die zwei Ziffern, die dir aufgefallen sind?" }, { en: "Compare each position against the table of the three sub-registers above, then open lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h with Ctrl/Cmd+P and search it for SCB_CFSR_ with Ctrl/Cmd+F.", de: "Vergleiche jede Position mit der Tabelle der drei Teilregister weiter oben, öffne dann lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h mit Strg/Cmd+P und such darin mit Strg/Cmd+F nach SCB_CFSR_." }, { en: "One of the two bits is not a fault cause at all - it is the flag that decides whether the address line below is meaningful.", de: "Eines der beiden Bits ist gar keine Fehlerursache - es ist das Kennzeichen, das entscheidet, ob die Adresszeile darunter etwas bedeutet." } ] }
  - { trigger: "question:decode-usagefault:weak", question: { en: "Which sub-register does bit 17 belong to, and how far into that sub-register is it?", de: "Zu welchem Teilregister gehört Bit 17, und wie weit liegt es in diesem Teilregister drin?" }, hints: [ { en: "Did you subtract the sub-register's own starting position before counting inside it?", de: "Hast du die Startposition des Teilregisters abgezogen, bevor du darin weitergezählt hast?" }, { en: "In core_cm4.h the usage-fault bits are written as SCB_CFSR_USGFAULTSR_Pos plus an offset - read the offsets, not the absolute numbers.", de: "In core_cm4.h sind die Usage-Fault-Bits als SCB_CFSR_USGFAULTSR_Pos plus einen Versatz geschrieben - lies die Versätze, nicht die absoluten Zahlen." }, { en: "Offset 0 at that spot is the undefined-instruction case; you want the next one along, offset 1.", de: "Versatz 0 an dieser Stelle ist der Fall der undefinierten Instruktion; du suchst den nächsten, also Versatz 1." } ] }
---

## Lernziel

Mache aus einem Fault-Dump und dem Absturz-Ring des Boards eine Diagnose: welcher Fault, welche Instruktion und wo im Quelltext.

## Zuerst: das Board an den Konsolen-Prompt bringen

Die Bedienoberfläche ist englisch, der Kurstext deutsch. Eine Menüleiste ist nicht sichtbar: die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal` und `Help` öffnet.

Ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne darum ein Terminal (**☰ → `Terminal` → `New Terminal`**; ist der Bereich unten zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf) und führe einmal aus:

```bash
python3 scripts/board_key.py quit
```

Das Arbeitsverzeichnis ist die Projektwurzel; der Befehl braucht unter einer Sekunde. Mitlesen kannst du in der Board-Konsole: **`F1`**, dann `CaDS Board: Konsole öffnen` tippen, Enter.

Den Befehl `E` tippst du dort **nicht** selbst: der Prüfknopf sendet ihn, du liest nur die Antwort mit. Ist das Board von einer Debug-Sitzung angehalten, hört es ebenfalls nicht zu - drücke dann Continue oder Stop in der Debug-Werkzeugleiste oben.

<!-- SHOT: m3-forensic-ring-output | Die Board-Konsole nach dem Befehl E: Reset-Ursache, die Zeile # forensic ring: N record(s) und mindestens ein Datensatz mit PC, LR, CFSR | HARDWARE -->

## Die Firmware hält an und druckt; sie setzt nicht zurück

Ein Memory-, Bus- oder Usage-Fault startet diese Firmware nicht stillschweigend neu. Die vier Handler in `targets/itsboard/startup/fault_handlers.c` überschreiben die schwachen `Default_Handler`-Aliase der Vektortabelle. Jeder ist ein *naked* Trampolin: es liest `EXC_RETURN` aus `LR`, um MSP oder PSP zu wählen, **bevor** ein C-Prolog sie stören kann, und gibt dann den gestapelten Frame aus:

```
*** CaDS FAULT: <Name des Faults> ***
R0 .. R3, R12, LR, PC, PSR
CFSR = 0x........
HFSR = 0x........
```

`PC` ist die auslösende Instruktion. Der Dump endet mit `bkpt #0` und einer Schleife: „anhalten, nicht zurücksetzen“, denn ein Reset vernichtet die einzige Kopie der Beweise. Weil `cads_fault_init()` MemManage, BusFault und UsageFault in `SCB->SHCSR` freischaltet, nennt die Kopfzeile den Fault beim Namen; sonst käme jeder als undifferenzierter HardFault.

<!-- SHOT: m3-fault-dump-console | Ein vollstaendiger Fault-Dump in der Board-Konsole, von der Sternchen-Kopfzeile bis zur HFSR-Zeile | HARDWARE -->

## Der Aufbau von CFSR

`CFSR` ist kein einzelnes Register, sondern drei aneinandergelegte Teilregister (PM0214 §4.4.7-4.4.9), die der Handler als **ein** 32-Bit-Wort druckt:

| Bits | Teilregister | Deckt ab |
|---|---|---|
| 7:0 | MMFSR | Speicherverwaltungs-Faults |
| 15:8 | BFSR | Bus-Faults |
| 31:16 | UFSR | Usage-Faults |

Ein gesetztes Bit landet in genau einem der drei Bereiche. **Welches** Bit es ist, schlägst du dort nach, wo die Namen stehen: öffne `lib/CMSIS_6/CMSIS/Core/Include/core_cm4.h` mit `Strg`/`Cmd`+`P`, drücke `Strg`/`Cmd`+`F` und such nach `SCB_CFSR_`. Jede Bitposition steht dort als `SCB_CFSR_<NAME>_Pos`, als Versatz auf `SCB_CFSR_MEMFAULTSR_Pos` (0), `SCB_CFSR_BUSFAULTSR_Pos` (8) oder `SCB_CFSR_USGFAULTSR_Pos` (16).

Das Vorgehen ist immer dasselbe:

1. Das Wort in Bits ausschreiben und die Positionen der Einsen notieren (Zählung von rechts, ab null).
2. Jede Position dem Bereich 7:0, 15:8 oder 31:16 zuordnen - damit steht das Teilregister fest.
3. Die Position minus dem Anfang des Bereichs ergibt den Versatz, unter dem `core_cm4.h` den Namen führt.

Zwei Bits sind besonders: `MMFAR` und `BFAR` - die auslösende *Adresse* - werden nur gedruckt, wenn ihre Gültigkeitsbits in `CFSR` gesetzt sind. Ihr Fehlen ist deshalb ebenfalls Information.

## Wo die Signaturen dieses Kurses herkommen

Beide Signaturen deiner Aufgaben sind echt. `docs/ROADMAP.md` protokolliert unter dem 2026-08-26 drei Signaturen derselben Firmware nacheinander: einen `configASSERT`-Panic, einen UsageFault und einen präzisen BusFault mit `BFAR` auf `0x5808615E`, einer Adresse, die weder Flash noch RAM noch CCM noch Peripherie ist. Dass die Signaturen *wechselten*, liest sich eher nach Speicherkorruption als nach einem Logikfehler.

Eine dritte Quelle wäre `z FAULT`, der einzige destruktive Explorer-Befehl. **Führe ihn jetzt nicht aus** - er hält für immer an und braucht einen Reflash.

## Vom PC zur Zeile

Öffne ein Terminal (**☰ → `Terminal` → `New Terminal`**) und setze die Adresse aus der `PC`-Zeile ein:

```bash
arm-none-eabi-addr2line -e build/itsboard/cads-zero.elf 0x<PC>
```

Die Antwort kommt sofort, als eine Zeile mit Datei und Zeilennummer. In einer laufenden Sitzung tut `info line *0x<PC>` im Reiter `DEBUG CONSOLE` dasselbe. Bei einem *präzisen* Bus-Fault zeigt der gestapelte `PC` auf die schuldige Instruktion; bei einem unpräzisen nicht, weil der Schreibvorgang die CPU längst verlassen hatte.

## Der Forensik-Ring: Beweise, die einen Reset überleben

`modules/diag` führt einen Ring der letzten **6** Abstürze (`CADS_FORENSIC_RING_DEPTH`). Jeder Fault-Handler und `cads_hal_panic()` ruft `cads_forensic_record()` im Moment vor dem Halt: Grund, Uptime, Frame, `CFSR`/`HFSR`, die Adressen wenn gültig, `MSP` und `PSP`. Der Ring liegt per `CADS_CCM_SECTION` im **CCM** - der Reset-Handler nullt `.bss`, aber nicht `.ccm`, sodass ein Datensatz einen Watchdog-Reset überlebt. Echter Stromverlust löscht ihn.

Der Explorer-Befehl `E` druckt zuerst die Reset-Ursache dieses Boots (`cads_hal_reset_cause()`), dann eine Zeile `# forensic ring: N record(s)` und danach jeden Datensatz, neueste zuerst. Prüfe ihn, **bevor** du einen Boot für sauber hältst.

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt - `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin - zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen - nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Bring das Board mit dem Terminalbefehl oben an den Konsolen-Prompt und drücke **Prüfen** an der ersten Aufgabe: der Knopf sendet `E`, du liest Reset-Ursache und Datensätze in der Board-Konsole mit. Dekodiere dann die beiden Signaturen der zweiten und dritten Aufgabe, mit der Bereichstabelle oben und `core_cm4.h` als Legende. Der nächste Step nutzt den Ring, um einen Stack-Überlauf zu fangen.
