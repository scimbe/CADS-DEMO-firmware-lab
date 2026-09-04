---
id: m4-04-iwdg-watchdog
title: The independent watchdog and the reset cause
bloom: understand
objectives: [cz.rtos.watchdog]
requires: [m4-03-mutex-spi-bus]
estimatedMinutes: 14
scaffold: independent
recallFrom: [m3-03-fault-forensics]
links:
  - { step: m4-05-stack-sizing }
  - { step: m3-03-fault-forensics }
  - { file: "core/cads_hal.h", line: 280 }
  - { file: "modules/kernel/src/kernel.c", line: 309 }
  - { file: "targets/itsboard/hal/hal_watchdog.c", line: 49 }
  - { doc: "docs/SAFETY.md" }
sources: [core/cads_hal.h, modules/kernel/src/kernel.c, targets/itsboard/hal/hal_watchdog.c, apps/bringup/explorer.c, docs/SAFETY.md]
tasks:
  - id: reset-cause
    title: Read this boot's reset cause
    check: { type: serialExpect, send: "E\n", pattern: "reset cause", timeoutMs: 15000 }
  - id: iwdg-period
    title: Settle the contradiction in the source
    check: { type: question, prompt: { en: "Prescaler /64, reload 1000, LSI at about 32 kHz. The comment above the two defines in targets/itsboard/hal/hal_watchdog.c claims about 2.048 ms per tick and about 2.048 s in total. Which of the two figures - the comment's or your own - follows from the values given, and why?", de: "Prescaler /64, Reload 1000, LSI mit etwa 32 kHz. Der Kommentar über den beiden Defines in targets/itsboard/hal/hal_watchdog.c nennt etwa 2,048 ms je Tick und etwa 2,048 s insgesamt. Welche der beiden Zahlen - die des Kommentars oder deine eigene - folgt aus den angegebenen Werten, und warum?" }, rubric: "Your own arithmetic wins; the comment is wrong at this point. The prescaler divides the LSI frequency: 32,000 / 64 = 500 Hz, so one counter tick lasts 1/500 s = 2.0 ms. The counter runs down from 1000, making the period 2.0 s. The answer must also say where the 2.048 comes from: 2.048 ms per tick follows from 64 / 31,250 s, so it presupposes an LSI of 31.25 kHz rather than 32 kHz - a figure that appears neither in the comment nor anywhere this step cites. Passes if 2.0 ms and 2.0 s are named and the comment is explicitly called out as inconsistent with the 32 kHz it itself states; taking the 2.048 s on trust does not pass. The second half of the answer is the comparison: 2.0 s is about four times the firmware's longest normal blocking span, the 448 ms full-screen flush - which is why no legitimate operation can trip the watchdog. Multiplying 1000 ticks by the raw LSI period instead of the divided one lands at 31 ms and skipped the prescaler.", bloom: understand }
misconceptions:
  - { pattern: "reset cause: IWDG watchdog", question: { en: "The board says the watchdog reset it. Does that make this boot clean or suspect?", de: "Das Board meldet einen Watchdog-Reset. Ist dieser Boot damit sauber oder verdächtig?" }, hints: [ { en: "Something stopped the tick from reaching the watchdog for two whole seconds - is that ever normal here?", de: "Etwas hat den Tick zwei ganze Sekunden lang nicht bis zum Watchdog kommen lassen - ist das hier je normal?" }, { en: "Read on past the reset-cause line: the same E output lists the forensic ring underneath it.", de: "Lies über die Reset-Ursachen-Zeile hinaus: dieselbe E-Ausgabe listet darunter den Forensik-Ring." }, { en: "A record written shortly before the reset survives in CCM, so the reason string that preceded the reset is usually still readable.", de: "Ein kurz vor dem Reset geschriebener Datensatz überlebt im CCM, die Grundzeichenkette vor dem Reset ist also meist noch lesbar." } ] }
socratic:
  - { trigger: "task:reset-cause:failed", question: { en: "Did E produce any output at all, or is the board still inside the app tree that ignores plain typed bytes?", de: "Hat E überhaupt eine Ausgabe erzeugt, oder steckt das Board noch im App-Baum, der einfach getippte Bytes ignoriert?" }, hints: [ { en: "No echo at all usually means the prompt is not the thing listening right now.", de: "Gar kein Echo heißt meistens, dass gerade nicht der Prompt zuhört." }, { en: "Open a terminal at the bottom (menu icon with three lines at the top left, then Terminal, then New Terminal), run python3 scripts/board_key.py quit there, then let the check run again.", de: "Öffne unten ein Terminal (Symbol mit den drei Strichen oben links, dann Terminal, dann New Terminal), führe dort python3 scripts/board_key.py quit aus, dann lass den Check erneut laufen." }, { en: "The reset-cause line is the first thing E prints, before the ring - if you see ring records but no cause line, the output was truncated at the top.", de: "Die Reset-Ursachen-Zeile ist das Erste, was E druckt, noch vor dem Ring - siehst du Ring-Datensätze, aber keine Ursachenzeile, wurde die Ausgabe oben abgeschnitten." } ] }
  - { trigger: "question:iwdg-period:weak", question: { en: "What does a prescaler of /64 do to the 32 kHz before the counter ever sees it?", de: "Was macht ein Prescaler von /64 mit den 32 kHz, bevor der Zähler sie überhaupt sieht?" }, hints: [ { en: "Are you dividing the clock first and then counting, or counting at the raw clock rate?", de: "Teilst du den Takt zuerst und zählst dann, oder zählst du mit dem rohen Takt?" }, { en: "Read the comment block above the two defines in targets/itsboard/hal/hal_watchdog.c; it walks the same two steps but arrives at a different number - do the arithmetic yourself before you believe it.", de: "Lies den Kommentarblock über den beiden Defines in targets/itsboard/hal/hal_watchdog.c; er geht dieselben zwei Schritte durch, kommt aber auf eine andere Zahl - rechne selbst nach, bevor du sie glaubst." }, { en: "One counting step lasts as long as one cycle of the already-divided clock; the reload number only says how many steps it takes to reach zero.", de: "Ein Zählschritt dauert so lange wie eine Schwingung des bereits geteilten Takts; die Reload-Zahl sagt nur, wie viele Schritte bis null nötig sind." } ] }
---

## Learning goal

Understand how the independent watchdog turns "the board sits locked up with the red LED on" into "the board recovers on its own, and the cause is still readable afterwards".

## Two halves of one feature

`core/cads_hal.h` documents the design in the comment above `cads_hal_watchdog_init()`:

1. **`cads_hal_watchdog_init()` / `cads_hal_watchdog_feed()`.** `modules/kernel/src/kernel.c` arms the IWDG at scheduler start and feeds it from `vApplicationTickHook()` — once per SysTick at 1 kHz — **never from an application task**.
2. **`cads_hal_reset_cause()`.** Decodes `RCC->CSR` before anything clears it, so a reset the watchdog caused is distinguishable from a power-on or a debugger reset.

One subtlety: `cads_hal_watchdog_init()` takes a timeout parameter (`CADS_WATCHDOG_TIMEOUT_MS`), discards it with `(void)timeout_ms` and uses fixed values. The period is therefore not in the caller but in the hardware configuration — and you are about to work it out.

## Why the tick, not a task

Feeding from the tick proves that the interrupt subsystem is alive and recovers from a true lockup — HardFault recursion, interrupts globally disabled — with **zero** risk of a spurious reset: a 448 ms full-screen flush never stops the tick. The honest limit: it does **not** catch a cooperative task spinning forever on something that will never happen.

## What the hardware does

`targets/itsboard/hal/hal_watchdog.c` writes only IWDG, DBGMCU and `RCC->CSR` — no GPIO, so none of the pin rules in `docs/SAFETY.md` apply. Three things matter:

- **One-way door.** Once started with key `0xCCCC`, the IWDG cannot be stopped by software — only a full power-on. It is clocked from the **LSI**, the chip's own RC oscillator at a nominal **32 kHz**, independent of the PLL and HSE. It is configured with prescaler **`/64`** (`CADS_IWDG_PRESCALER_BITS`) and reload **1000** (`CADS_IWDG_RELOAD_VALUE`). The LSI has no tight tolerance spec and is never read back: the period is a nominal figure, not a guaranteed one. How long it is, is your second task.
- **Frozen on debug halt.** `DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP`, so attaching GDB to a live panic never races a surprise reset out from under you.
- **Sticky flags.** `RCC->CSR`'s reset-cause bits survive until cleared. `cads_hal_reset_cause()` reads them exactly once per boot — `RCC_CSR_IWDGRSTF` maps to `CadsResetWatchdogIndependent` — clears them with `RMVF`, and returns the cached answer later.

## A comment that does not match its own numbers

Do the arithmetic; do not copy it. **Open the file yourself first:** press `Ctrl`/`Cmd`+`P`, type `hal_watchdog.c`, Enter — it appears as a tab **in the middle** of the window. Without the keyboard: the topmost icon of the narrow bar on the far left (the file explorer), then click through the tree. The comment sits directly above the two defines and states two values:

> `IWDG_PR prescaler /64 (PR=100b) gives a ~2.048 ms tick at nominal 32 kHz;`
> `IWDG_RLR=1000 (max 0xFFF=4095) gives ~2.048 s.`

The same comment gives the LSI's nominal frequency as 32 kHz. But those two numbers do not follow from 32 kHz and `/64`. Which one does, which does not, and what LSI frequency you would have to assume for the comment to be right — that is your second task. The two lines above are a quotation: read them in the original before judging them. A number in a comment is a claim like any other.

## Task 1 — read this boot's reset cause

**Step 1 — open the board console.** Press **`F1`**, type `CaDS Board: Konsole öffnen`, Enter. **At the bottom** of the terminal area a terminal named `CaDS Board Console` appears, the board's serial console at 115200 baud. That area carries the tabs `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`; `Ctrl`/`Cmd`+`J` folds it open and shut. It takes a second.

<!-- SHOT: m4-palette-board-console | Die geoeffnete Befehlspalette mit eingetipptem CaDS Board und der gefilterten Liste der Board-Befehle -->

**Step 2 — bring the board to the prompt.** A freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal first (**☰ → `Terminal` → `New Terminal`**; ☰ is the three-line icon at the very top left, there is no visible menu bar) and run once:

```bash
python3 scripts/board_key.py quit
```

The working directory is the project root, and it takes under a second.

**Step 3 — read along.** You do not type `E` yourself: the **Check** button on this task sends it, you only read the answer. That button sits at the bottom of the step text, the tab `CaDS Tutor: The independent watchdog and the reset cause` **in the middle**; the top of that tab also carries **Run all checks**. The answer arrives in under a second; its first line reads `# this boot's reset cause: ...`, with the forensic ring from M3-03 underneath.

<!-- SHOT: m4-console-reset-cause | Das Terminal CaDS Board Console mit der Zeile this boot reset cause und darunter dem Forensik-Ring | HARDWARE -->

## Task 2 — do the arithmetic

Compute the watchdog period from the three hardware values above, settle the contradiction with the comment, and compare the result with the firmware's longest normal blocking span.

## When the interface gets in the way

- **The command ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal `CaDS Board Console` — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it and drops the console — use `Ctrl`/`Cmd`+`J` to fold the area away instead.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.
