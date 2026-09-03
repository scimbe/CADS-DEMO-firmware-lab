---
id: m2-03-buttons
title: Buttons, inputs and one inversion
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
    title: Run the port watcher and press a button
    check: { type: serialExpect, send: "w 10\n", pattern: "WATCH end", timeoutMs: 20000 }
  - id: why-invert
    title: Find the two events that cannot be a button press
    check: { type: question, prompt: { en: "Two of the six events in the transcript cannot come from a button press. Which two, and how can you tell?", de: "Zwei der sechs Ereignisse im Mitschnitt können nicht von einem Tastendruck stammen. Welche beiden sind es, und woran erkennst du das?" }, rubric: "They are CHG PG4 and CHG PA13. Two independent arguments must be visible. First the location: the eight buttons hang on PF0..PF7 only; PG4 is INT4, a general-purpose line at connector CN3 that the manufacturer's test exercises with a jumper wire, and PA13 is SWDIO, which the explorer itself marks RESERVED and which the attached debugger drives all the time. Second the shape: a button line rests high thanks to its pull-up and a press pulls it to ground, so every button event opens with a change to 0 and closes on release with a change to 1 — PF3 and PF6 show exactly that pair, while PA13 opens with a change to 1. Listing the port letters without arguing from the resting level or the RESERVED note is half an answer.", bloom: analyze }
  - id: mask-inputs
    title: Derive the HAL's two bit operations
    check: { type: question, prompt: { en: "Turn port F's IDR into a byte in which 1 means pressed. Which two bit operations does that take?", de: "Aus dem IDR von Port F soll ein Byte werden, in dem 1 gedrückt heißt. Welche zwei Bitoperationen braucht es?" }, rubric: "First the complement (~ in C), which flips every 0 into a 1: the low of a pressed button becomes a 1 and the high of a resting line becomes a 0. Second a mask with & 0xFF, which keeps the lower eight bits only, because the IDR reports sixteen pins and only PF0..PF7 are buttons — without the mask the inverted upper bits would all be set. Together that is the line (uint8_t)(~CADS_PIN_IN_PORT->IDR) & 0xFFu in cads_hal_adapter_inputs(); CADS_PIN_IN_PORT is GPIOF. Both operations must be named with their reason, the bare symbols are not enough.", bloom: apply }
socratic:
  - { trigger: "task:find-pin:failed", question: { en: "No WATCH line came back from the board. Does the console answer single letters at all right now?", de: "Vom Board kam keine WATCH-Zeile zurück. Antwortet die Konsole im Moment überhaupt auf einzelne Buchstaben?" }, hints: [ { en: "Could the board still be sitting in the touchscreen app tree, where typed single letters are ignored?", de: "Könnte das Board noch im Touchscreen-App-Baum stehen, in dem getippte einzelne Buchstaben überhört werden?" }, { en: "Open a terminal (menu Terminal, New Terminal) and run python3 scripts/board_key.py quit there — in the terminal, not in the board console. Then send w 10 again.", de: "Öffne ein Terminal (Menü Terminal, New Terminal) und führe dort python3 scripts/board_key.py quit aus — im Terminal, nicht in der Board-Konsole. Danach sende w 10 erneut." }, { en: "The watcher reports changes only. Ending with changes=0 is a quiet bench, not a broken command.", de: "Der Watcher meldet ausschließlich Änderungen. Ein Abschluss mit changes=0 heißt ruhige Werkbank, nicht kaputtes Kommando." } ] }
  - { trigger: "question:why-invert:weak", question: { en: "Which port carries the eight buttons — and do all six events sit on that port?", de: "Auf welchem Port liegen die acht Taster — und liegen alle sechs Ereignisse auf diesem Port?" }, hints: [ { en: "Could one of the lines come from something other than a hand — a wire at connector CN3, or the debugger that works on SWD the whole time?", de: "Könnte eine der Zeilen von etwas anderem als einer Hand stammen — von einem Draht am Stecker CN3 oder vom Debugger, der die ganze Zeit auf SWD arbeitet?" }, { en: "Go through the transcript line by line against the table above: port letter first, then the direction of the level change. The bracket the explorer appends itself is an argument too.", de: "Geh den Mitschnitt Zeile für Zeile gegen die Tabelle oben durch: erst der Portbuchstabe, dann die Richtung des Pegelwechsels. Auch die Klammer, die der Explorer selbst anhängt, ist ein Argument." }, { en: "A pulled-up button line rests high, so its first event must move in one direction and cannot move in the other.", de: "Eine Tasterleitung ruht dank Pull-up auf High; ihr erstes Ereignis muss deshalb in die eine Richtung gehen und kann nicht in die andere gehen." } ] }
  - { trigger: "question:mask-inputs:weak", question: { en: "Write the IDR of a port down as sixteen bits. Which of them do you want, and which are in the way?", de: "Schreib das IDR eines Ports als sechzehn Bits hin. Welche davon willst du, und welche stören?" }, hints: [ { en: "Is the flip missing, or the limit to eight bits, or both?", de: "Fehlt dir die Umkehrung, oder die Begrenzung auf acht Bits, oder beides?" }, { en: "m2-00 laid the ground: its hex table shows how a hex digit becomes four bits, and the paragraph on the complement above says what flipping is called.", de: "m2-00 hat den Boden gelegt: seine Hextabelle zeigt, wie aus einer Hexziffer vier Bits werden, und der Absatz über das Komplement weiter oben nennt das Kippen beim Namen." }, { en: "0xFF is exactly 1111 1111, so an AND with it keeps the lower eight bits and clears everything above them.", de: "0xFF ist genau 1111 1111; ein Und damit behält die unteren acht Bits und löscht alles darüber." } ] }
misconceptions:
  - { pattern: "changes=0", question: { en: "The watcher ran for its full window and saw no change at all. What did it have to see?", de: "Der Watcher lief sein ganzes Fenster lang und sah keine einzige Änderung. Was hätte er sehen müssen?" }, hints: [ { en: "Did the press happen inside the ten seconds, or after the window had already closed?", de: "Fiel der Druck in die zehn Sekunden, oder erst nachdem das Fenster schon zu war?" }, { en: "Send w 10 and press a button straight away, while the WATCH start line is still on screen.", de: "Sende w 10 und drücke sofort einen Taster, solange die Zeile WATCH start noch auf dem Schirm steht." }, { en: "The watcher compares each port against its previous value, so it only ever reports edges, never a state that is held.", de: "Der Watcher vergleicht jeden Port mit seinem vorherigen Wert, meldet also nur Flanken und niemals einen gehaltenen Zustand." } ] }
---
## Learning goal

Read the adapter's buttons and input lines correctly, tell them apart from the lines that merely look like buttons, and understand why the firmware inverts the board's wiring in exactly one place.

## What the lines are

The ITS adapter brings fourteen input lines to the MCU (`docs/HARDWARE.md`):

| Name | Port | What it is |
|---|---|---|
| IN0..IN7 (S0..S7) | PF0..PF7 | the eight push buttons, **active low**, pulled up |
| INT0..INT5 | PG0..PG5 | general-purpose inputs at connector `CN3`, EXTI capable, pulled up |

Three terms hide in that table:

- A **pull-up** is a resistor inside the chip that holds a line high for as long as nobody actively pulls it down. An input without one has no defined resting state.
- **Active low** means the active, reported state of that line is 0, not 1.
- **EXTI capable** means the pin can raise an interrupt when its level changes (*external interrupt*). That alone does not make it a button.

The button mapping was settled from the manufacturer's own hardware test (`ITS-BRD/its_brd_tst`, `GPIOTest`). It waits for each button with

```c
while ((GPIOF->IDR & (1 << i)) != 0) { }
```

`IDR` is a port's *input data register* — a 16-bit value in which bit *n* reports the level currently present at pin *n* (you met the register names in `m2-00`). The `&` is a bitwise AND; `x & (1 << i)` blanks out everything except bit *i*. That is called **masking**, and `1 << i` is the notation for "the bit numbered *i*" from `m2-00`. So the loop spins for exactly as long as that one bit has a particular value — which value, and what follows from it for the wiring, is your first piece of thinking.

The same test exercises the INT lines differently: it asks the operator to jumper OUT0 to INTx with a wire. The adapter schematic shows them unbuffered, straight from the MCU to connector `CN3`.

## One inversion, in the HAL

`core/cads_hal.h` promises:

```c
/** IN0..IN7 on GPIOF, active low (pulled up). Bit n = INn. */
uint8_t cads_hal_adapter_inputs(void);
```

and `docs/reference/hal.md` adds the contract that matters: the function **already inverts the board's wiring**, so a set bit means "pressed" regardless of the hardware's polarity. On the board, `targets/itsboard/hal/hal_io.c` does it in a single line. Which two bit operations that line consists of is the third task.

You know two of the tools from `m2-00`; one is new here: the **complement** of a bit pattern is its mirror image — every 0 becomes a 1 and every 1 becomes a 0. In C it is written `~x`.

That inversion lives here and nowhere else. The input service, the soft-key strip, every app: all of them see "bit set = pressed" and would work unchanged on a board wired active-high. This is the same argument as the output side in the previous step, seen from the input direction: the HAL absorbs the electrical fact so portable code never has to know it.

## Watching the pins live

Three explorer commands turn this into something you can see:

- `i` dumps every port's IDR once, as a static baseline. The line starts with `# IDR `.
- `w <sec>` watches every pin of every port for changes. Each change is printed as `CHG P<port><pin> -> <0|1>  t=<ms>`; if the pin is on the firmware's reserved list, the explorer appends `[RESERVED: SWD/HSE/RMII, not a button]`. The window closes with `# WATCH end, changes=<n>`.
- `s <sec>` streams the **debounced** S0..S7 state with key names. Debounced means: mechanical contacts chatter for a few milliseconds as they close, and the input service filters that chatter out before it reports a press. `w`, by contrast, shows the raw edges.

## A transcript to work through

This transcript comes from a `w 10` on a board with a debugger attached and a wire plugged into connector `CN3`. The baseline `i` dumps are abbreviated:

```
# WATCH start, press things now
# IDR PA=… PB=… (abbreviated)
CHG PF3 -> 0  t=1204
CHG PF3 -> 1  t=1338
CHG PG4 -> 0  t=3906
CHG PF6 -> 0  t=5011
CHG PF6 -> 1  t=5140
CHG PA13 -> 1  t=6002  [RESERVED: SWD/HSE/RMII, not a button]
# WATCH end, changes=6
```

Two of those six events cannot come from a button press. Which ones, and how you can tell, is the second task — there are two independent arguments, and you want to name both.

## Your task

Open the board console (`F1`, then `CaDS Board: Open console`) and send `w 10`. Press a button right away while the window is open, and note which port and bit move. Then try `s 10` and `i`.

If nothing comes back: a freshly flashed board boots into the touchscreen app tree and ignores single letters. Open a terminal (menu *Terminal → New Terminal*) and run `python3 scripts/board_key.py quit` there once — in the terminal, not in the board console.

Then work through the transcript above, and finally derive the two bit operations with which the HAL turns the IDR into its byte. Checking happens via the **Check** button on each task.
