---
id: m2-03-buttons
title: Taster, Eingänge und eine Invertierung
bloom: analyze
objectives: [cz.gpio.buttons]
requires: [m2-02-mmio-gpio]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m2-04-safety }
  - { doc: "docs/explanation/input-scheme.md" }
  - { doc: "docs/HARDWARE.md" }
  - { file: "targets/itsboard/hal/hal_io.c", line: 53 }
sources: [docs/HARDWARE.md, docs/explanation/input-scheme.md, targets/itsboard/hal/hal_io.c, core/cads_hal.h]
tasks:
  - id: find-pin
    title: Lass den Port-Watcher laufen und drücke einen Taster
    check: { type: serialExpect, send: "w 10\n", pattern: "WATCH end", timeoutMs: 20000 }
  - id: why-invert
    title: Finde die zwei Ereignisse, die kein Tastendruck sein können
    check: { type: question, prompt: { en: "Two of the six events in the transcript cannot come from a button press. Which two, and how can you tell?", de: "Zwei der sechs Ereignisse im Mitschnitt können nicht von einem Tastendruck stammen. Welche beiden sind es, und woran erkennst du das?" }, rubric: "Es sind CHG PG4 und CHG PA13. Zwei unabhängige Argumente müssen erkennbar sein. Erstens der Ort: die acht Taster hängen ausschließlich an PF0..PF7; PG4 ist INT4, eine Allzweckleitung am Stecker CN3, die der Herstellertest mit einer Drahtbrücke prüft, und PA13 ist SWDIO, das der Explorer selbst als RESERVED markiert und das der angeschlossene Debugger dauernd bewegt. Zweitens die Form: eine Tasterleitung ruht dank Pull-up auf High, ein Druck zieht sie auf Masse, deshalb beginnt jedes Tasterereignis mit einem Wechsel nach 0 und wird beim Loslassen von einem Wechsel nach 1 abgeschlossen — PF3 und PF6 zeigen genau dieses Paar, PA13 dagegen beginnt mit einem Wechsel nach 1. Wer nur die Portbuchstaben aufzählt, ohne die Ruhelage oder den RESERVED-Vermerk zu begründen, hat die Hälfte.", bloom: analyze }
  - id: mask-inputs
    title: Leite die zwei Bitoperationen der HAL ab
    check: { type: question, prompt: { en: "Turn port F's IDR into a byte in which 1 means pressed. Which two bit operations does that take?", de: "Aus dem IDR von Port F soll ein Byte werden, in dem 1 gedrückt heißt. Welche zwei Bitoperationen braucht es?" }, rubric: "Erstens das Komplement (in C ~), das jede 0 in eine 1 kippt: aus dem Low eines gedrückten Tasters wird eine 1, aus dem High einer ruhenden Leitung eine 0. Zweitens eine Maskierung mit & 0xFF, die nur die unteren acht Bits stehen lässt, weil das IDR sechzehn Pins meldet und nur PF0..PF7 Taster sind — ohne die Maske wären die invertierten oberen Bits gesetzt. Zusammen ist das die Zeile (uint8_t)(~CADS_PIN_IN_PORT->IDR) & 0xFFu aus cads_hal_adapter_inputs(); CADS_PIN_IN_PORT ist GPIOF. Beide Operationen samt Begründung müssen genannt sein, die bloßen Zeichen genügen nicht.", bloom: apply }
socratic:
  - { trigger: "task:find-pin:failed", question: { en: "No WATCH line came back from the board. Does the console answer single letters at all right now?", de: "Vom Board kam keine WATCH-Zeile zurück. Antwortet die Konsole im Moment überhaupt auf einzelne Buchstaben?" }, hints: [ { en: "Could the board still be sitting in the touchscreen app tree, where typed single letters are ignored?", de: "Könnte das Board noch im Touchscreen-App-Baum stehen, in dem getippte einzelne Buchstaben überhört werden?" }, { en: "Open a terminal (menu Terminal, New Terminal) and run python3 scripts/board_key.py quit there — in the terminal, not in the board console. Then send w 10 again.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe dort python3 scripts/board_key.py quit aus — im Terminal, nicht in der Board-Konsole. Danach sende w 10 erneut." }, { en: "The watcher reports changes only. Ending with changes=0 is a quiet bench, not a broken command.", de: "Der Watcher meldet ausschließlich Änderungen. Ein Abschluss mit changes=0 heißt ruhige Werkbank, nicht kaputtes Kommando." } ] }
  - { trigger: "question:why-invert:weak", question: { en: "Which port carries the eight buttons — and do all six events sit on that port?", de: "Auf welchem Port liegen die acht Taster — und liegen alle sechs Ereignisse auf diesem Port?" }, hints: [ { en: "Could one of the lines come from something other than a hand — a wire at connector CN3, or the debugger that works on SWD the whole time?", de: "Könnte eine der Zeilen von etwas anderem als einer Hand stammen — von einem Draht am Stecker CN3 oder vom Debugger, der die ganze Zeit auf SWD arbeitet?" }, { en: "Go through the transcript line by line against the table above: port letter first, then the direction of the level change. The bracket the explorer appends itself is an argument too.", de: "Geh den Mitschnitt Zeile für Zeile gegen die Tabelle oben durch: erst der Portbuchstabe, dann die Richtung des Pegelwechsels. Auch die Klammer, die der Explorer selbst anhängt, ist ein Argument." }, { en: "A pulled-up button line rests high, so its first event must move in one direction and cannot move in the other.", de: "Eine Tasterleitung ruht dank Pull-up auf High; ihr erstes Ereignis muss deshalb in die eine Richtung gehen und kann nicht in die andere gehen." } ] }
  - { trigger: "question:mask-inputs:weak", question: { en: "Write the IDR of a port down as sixteen bits. Which of them do you want, and which are in the way?", de: "Schreib das IDR eines Ports als sechzehn Bits hin. Welche davon willst du, und welche stören?" }, hints: [ { en: "Is the flip missing, or the limit to eight bits, or both?", de: "Fehlt dir die Umkehrung, oder die Begrenzung auf acht Bits, oder beides?" }, { en: "m2-00 laid the ground: its hex table shows how a hex digit becomes four bits, and the paragraph on the complement above says what flipping is called.", de: "m2-00 hat den Boden gelegt: seine Hextabelle zeigt, wie aus einer Hexziffer vier Bits werden, und der Absatz über das Komplement weiter oben nennt das Kippen beim Namen." }, { en: "0xFF is exactly 1111 1111, so an AND with it keeps the lower eight bits and clears everything above them.", de: "0xFF ist genau 1111 1111; ein Und damit behält die unteren acht Bits und löscht alles darüber." } ] }
misconceptions:
  - { pattern: "changes=0", question: { en: "The watcher ran for its full window and saw no change at all. What did it have to see?", de: "Der Watcher lief sein ganzes Fenster lang und sah keine einzige Änderung. Was hätte er sehen müssen?" }, hints: [ { en: "Did the press happen inside the ten seconds, or after the window had already closed?", de: "Fiel der Druck in die zehn Sekunden, oder erst nachdem das Fenster schon zu war?" }, { en: "Send w 10 and press a button straight away, while the WATCH start line is still on screen.", de: "Sende w 10 und drücke sofort einen Taster, solange die Zeile WATCH start noch auf dem Schirm steht." }, { en: "The watcher compares each port against its previous value, so it only ever reports edges, never a state that is held.", de: "Der Watcher vergleicht jeden Port mit seinem vorherigen Wert, meldet also nur Flanken und niemals einen gehaltenen Zustand." } ] }
---
## Lernziel

Lies die Taster und Eingangsleitungen des Adapters korrekt, unterscheide sie von den Leitungen, die nur so aussehen, und verstehe, warum die Firmware die Verdrahtung des Boards an genau einer Stelle invertiert.

## Was die Leitungen sind

Der ITS-Adapter führt vierzehn Eingangsleitungen zum MCU (`docs/HARDWARE.md`):

| Name | Port | Was es ist |
|---|---|---|
| IN0..IN7 (S0..S7) | PF0..PF7 | die acht Taster, **active low**, mit Pull-up |
| INT0..INT5 | PG0..PG5 | Allzweck-Eingänge am Stecker `CN3`, EXTI-fähig, mit Pull-up |

Drei Begriffe stecken in dieser Tabelle:

- Ein **Pull-up** ist ein Widerstand im Chip, der eine Leitung auf High zieht, solange niemand sie aktiv nach unten zieht. Ein Eingang ohne Pull-up hätte keinen definierten Ruhezustand.
- **Active low** heißt: der aktive, gemeldete Zustand dieser Leitung ist die 0, nicht die 1.
- **EXTI-fähig** heißt: dieser Pin kann einen Interrupt auslösen, wenn sich sein Pegel ändert (*External Interrupt*). Das macht ihn noch nicht zu einem Taster.

Die Tasterzuordnung stammt aus dem Hardwaretest des Herstellers (`ITS-BRD/its_brd_tst`, `GPIOTest`). Er wartet auf jeden Taster mit

```c
while ((GPIOF->IDR & (1 << i)) != 0) { }
```

Das `IDR` ist das *Input Data Register* eines Ports — ein 16-Bit-Wert, in dem Bit *n* den Pegel wiedergibt, der gerade an Pin *n* anliegt (die Registernamen hast du in `m2-00` kennengelernt). Das `&` ist das bitweise Und; `x & (1 << i)` blendet alles außer Bit *i* aus. Das nennt man **maskieren**, und `1 << i` ist die Schreibweise für „das Bit mit der Nummer *i*“ aus `m2-00`. Die Schleife dreht sich also genau so lange, wie dieses eine Bit einen bestimmten Wert hat — welchen, und was daraus für die Verdrahtung folgt, ist deine erste Denkaufgabe.

Die INT-Leitungen prüft derselbe Test anders: er bittet den Bediener, OUT0 mit einem Draht auf INTx zu brücken. Der Adapter-Schaltplan zeigt sie ungepuffert, direkt vom MCU zum Stecker `CN3`.

## Eine Invertierung, in der HAL

`core/cads_hal.h` verspricht:

```c
/** IN0..IN7 on GPIOF, active low (pulled up). Bit n = INn. */
uint8_t cads_hal_adapter_inputs(void);
```

und `docs/reference/hal.md` ergänzt den entscheidenden Vertrag: die Funktion **invertiert die Verdrahtung des Boards bereits**, sodass ein gesetztes Bit „gedrückt“ bedeutet, unabhängig von der Polarität der Hardware. Auf dem Board erledigt `targets/itsboard/hal/hal_io.c` das in einer einzigen Zeile. Aus welchen zwei Bitoperationen diese Zeile besteht, ist die dritte Aufgabe.

Zwei Werkzeuge dafür kennst du aus `m2-00`, eines kommt hier dazu: das **Komplement** einer Bitfolge ist ihr Kippbild — aus jeder 0 wird eine 1 und aus jeder 1 eine 0; in C schreibt man es `~x`.

Diese Invertierung lebt hier und nirgends sonst. Der Input-Service, die Softkey-Leiste, jede App: alle sehen „Bit gesetzt = gedrückt“ und liefen unverändert auf einem active-high verdrahteten Board. Das ist dasselbe Argument wie auf der Ausgangsseite im vorigen Step, aus Eingangsrichtung gesehen: die HAL nimmt die elektrische Tatsache auf, damit portabler Code sie nie kennen muss.

## Die Pins live beobachten

Drei Explorer-Befehle machen das sichtbar:

- `i` gibt das IDR aller Ports einmal aus, als statische Grundlinie. Die Zeile beginnt mit `# IDR `.
- `w <sec>` beobachtet jeden Pin jedes Ports auf Änderungen. Jede Änderung wird als `CHG P<Port><Pin> -> <0|1>  t=<ms>` gedruckt; liegt der Pin auf der Sperrliste der Firmware, hängt der Explorer `[RESERVED: SWD/HSE/RMII, not a button]` an. Am Ende steht `# WATCH end, changes=<n>`.
- `s <sec>` streamt den **entprellten** Zustand S0..S7 mit Tastennamen. Entprellt heißt: mechanische Kontakte flattern beim Schließen einige Millisekunden lang; der Eingabedienst filtert dieses Flattern heraus, bevor er einen Tastendruck meldet. `w` zeigt dagegen die rohen Flanken.

## Ein Mitschnitt zum Auswerten

Dieser Mitschnitt stammt von einem `w 10` an einem Board, an dem ein Debugger hängt und an dessen Stecker `CN3` ein Draht steckt. Die Grundlinien-Ausgaben von `i` sind gekürzt:

```
# WATCH start, press things now
# IDR PA=… PB=… (gekürzt)
CHG PF3 -> 0  t=1204
CHG PF3 -> 1  t=1338
CHG PG4 -> 0  t=3906
CHG PF6 -> 0  t=5011
CHG PF6 -> 1  t=5140
CHG PA13 -> 1  t=6002  [RESERVED: SWD/HSE/RMII, not a button]
# WATCH end, changes=6
```

Zwei dieser sechs Ereignisse können nicht von einem Tastendruck stammen. Welche, und woran man das erkennt, ist die zweite Aufgabe — es gibt zwei voneinander unabhängige Argumente, und beide willst du benennen.

## Deine Aufgabe

Öffne die Board-Konsole (`F1`, dann `CaDS Board: Konsole öffnen`) und sende `w 10`. Drücke sofort einen Taster, solange das Fenster offen ist, und notiere, welcher Port und welches Bit sich bewegen. Probier danach `s 10` und `i` aus.

Wenn nichts zurückkommt: ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne ein Terminal (Menü *Terminal → New Terminal*) und führe dort einmal `python3 scripts/board_key.py quit` aus — im Terminal, nicht in der Board-Konsole.

Werte dann den Mitschnitt oben aus und leite zuletzt die zwei Bitoperationen ab, mit denen die HAL aus dem IDR ihr Byte macht. Geprüft wird über den Knopf **Prüfen** an der jeweiligen Aufgabe.
