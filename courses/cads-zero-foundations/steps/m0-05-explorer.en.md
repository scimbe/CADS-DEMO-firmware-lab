---
id: m0-05-explorer
title: The bring-up explorer console
bloom: understand
objectives: [firmware-how-to-board-test]
requires: [m0-04-flash-console]
estimatedMinutes: 12
scaffold: faded
recallFrom: [m0-04-flash-console]
links:
  - { step: m1-01-module-layout }
  - { doc: "docs/reference/explorer-console.md" }
  - { doc: "docs/how-to/debug.md" }
sources: [docs/reference/explorer-console.md, docs/how-to/debug.md]
tasks:
  - id: list-commands
    title: The board prints its command list for you
    check: { type: serialExpect, send: "?\n", pattern: "# commands", timeoutMs: 15000 }
  - id: tried-commands
    title: The board's task report reaches you
    check: { type: serialExpect, send: "k\n", pattern: "# tasks", timeoutMs: 15000 }
  - id: which-command
    title: Argue why one command reveals the pin and the other does not
    check: { type: question, prompt: { en: "Why does w reveal the pin a button is wired to, while i does not?", de: "Warum verrät dir w den Pin, an dem ein Taster hängt, und i nicht?" }, rubric: "What is asked for is the comparison, not a letter: i reads the input registers exactly once and yields a snapshot, from which there is no way to tell which bit belongs to the button. w keeps reading and reports changes, so it is the press itself — the difference between before and after — that reveals the pin. An answer that only says w watches and i does not, without naming the before/after comparison as the reason, is incomplete.", bloom: understand }
socratic:
  - { trigger: "task:list-commands:failed", question: { en: "Is the board answering typed characters at all right now?", de: "Antwortet das Board gerade überhaupt auf getippte Zeichen?" }, hints: [ { en: "Most often the board is not listening because it is standing in the app tree after the flash — it then swallows typed commands on purpose and says nothing about it.", de: "Am häufigsten hört das Board nicht zu, weil es nach dem Flashen im App-Baum steht — dann verschluckt es getippte Befehle absichtlich und schweigt dazu." }, { en: "Open the board console with F1 and CaDS Board: Konsole öffnen, and type a single ? there followed by Enter. Single-letter commands belong in that window and nowhere else.", de: "Öffne die Board-Konsole mit F1 und „CaDS Board: Konsole öffnen“ und tippe dort ein einzelnes ? mit Enter. Ein-Buchstaben-Befehle gehören in dieses Fenster und in kein anderes." }, { en: "If it stays silent, the board is in the app tree. The way back to the prompt does not go through the console — see the section on where you type commands, and the pitfall below it.", de: "Bleibt es still, steht das Board im App-Baum. Der Weg zurück zum Prompt führt nicht über die Konsole — siehe den Abschnitt „Wo du Befehle eintippst“ und den Stolperstein darunter." } ] }
  - { trigger: "task:tried-commands:failed", question: { en: "Which of the two windows did you type into last?", de: "In welches der beiden Fenster hast du zuletzt getippt?" }, hints: [ { en: "Look at the bottom of the window: do you see a terminal? If not, open one with Terminal → New Terminal. The script that ends the app tree runs there, not in the board console.", de: "Schau nach unten: siehst du ein Terminal-Fenster? Wenn nicht, öffne eins mit Terminal → New Terminal. Das Skript, das den App-Baum beendet, läuft dort — nicht in der Board-Konsole." }, { en: "In that terminal: python3 scripts/board_key.py quit, once, with Enter. Then back to the board console and send k there.", de: "In diesem Terminal: python3 scripts/board_key.py quit, einmal, mit Enter. Danach zurück in die Board-Konsole und dort k senden." }, { en: "If ? answers by now but k does not, the report scrolled past before the console was open — simply send k again.", de: "Antwortet ? inzwischen, k aber nicht, lief der Bericht durch, bevor die Konsole offen war — schick k einfach noch einmal." } ] }
  - { trigger: "question:which-command:weak", question: { en: "Suppose you never press the button. What does a one-shot dump tell you about it then?", de: "Angenommen, du drückst den Taster gar nicht. Was sagt dir eine Einmal-Ausgabe dann über ihn?" }, hints: [ { en: "The most common answer names the right letter and leaves out the reason. Here the reason is the whole task.", de: "Die häufigste Antwort nennt den richtigen Buchstaben und lässt den Grund weg. Der Grund ist hier die ganze Aufgabe." }, { en: "Try both at the board: first i, then w, and press a button while w is running. The difference between the two outputs is the answer.", de: "Probier beides am Board: erst i, dann w, und drücke einen Taster, während w läuft. Der Unterschied zwischen beiden Ausgaben ist die Antwort." }, { en: "A single snapshot says nothing about which bit belongs to the button; that needs two states and the comparison between them.", de: "Ein einzelner Momentwert sagt nichts darüber, welches Bit zum Taster gehört; dafür braucht es zwei Zustände und den Vergleich dazwischen." } ] }
---
## Learning goal

Learn what the bring-up explorer console is, and build a mental map from symptom to command so you can interrogate the board directly instead of guessing.

## Where you type commands

From here on there are two windows you can type into, and they listen for completely different things. Mixing them up produces nothing at all — without any error message.

- The **terminal** runs on the server this environment works on. You open it from the menu **Terminal → New Terminal**; it unfolds at the bottom of the window and shows an input line. Programs of your workspace run here: scripts, compilers, `git`. Anything that looks like a file name with an extension (`scripts/board_key.py`) belongs here.
- The **board console** is the text channel to the board itself; you open it with `F1` and the command **CaDS Board: Konsole öffnen**. Here the firmware reads every character on its own, and a single letter such as `k` is already a complete command.

Typing a Python script into the board console therefore does nothing: the firmware just sees a run of letters, none of which it knows as a command. Conversely, the terminal knows no `k`.

## A console that predates the GUI

`apps/bringup` builds a second firmware entry point, separate from the real app tree: a **single-letter command console** over the same USART the ST-Link exposes as a virtual COM port. It exists because most of this board's subsystems — the Ethernet MAC and PHY, the adapter's GPIO banks, the write-only display bus — have no way to report their own state to a human without a driver already being trusted. This console is what let each one get bootstrapped and hardware-gated before the GUI that eventually wrapped it existed.

Every command is one character, optionally followed by one or two whitespace-separated arguments. Send `?` at any time to reprint the full command list; it starts with the line `# commands:` and then lists one command per line. The firmware's own help string is the ground truth if the reference ever disagrees. Full catalogue: `docs/reference/explorer-console.md`.

## From symptom to command

The value of the explorer is that it is usually faster to ask a subsystem directly than to attach a debugger. A few of the mappings you will use again (`docs/how-to/debug.md`):

| Symptom | Reach for | Why |
|---|---|---|
| A button does nothing, or the wrong thing | `w`, then `i` | `w` keeps watching every port's input register for changes; `i` prints the same state exactly once |
| A task looks starved or a stack looks tight | `k` | per-task stack high-water marks, task count, input counters |
| Ethernet link behaves oddly | `e`, `a`, `m` | these talk to the PHY over MDIO *below* lwIP, so they answer whether or not a netif is up |
| Display throughput seems off | `V` | re-measures full-screen flush throughput under real scheduler and network contention |

Two words from that second row, because they turn up constantly from here on: a **task** is a strand of a program that appears to run alongside others — the operating system inside the chip switches between them in turn. The **stack** is the memory a task piles its function calls and local variables onto; if it overflows, a task overwrites memory belonging to something else. That is exactly why `k` reports, per task, how much of it was still free in the worst case. The answer arrives as a single line starting with `# tasks`.

One command, `z FAULT`, is destructive by design: it trips a UsageFault deliberately and halts for good, to prove the fault handler works. It demands the literal argument `FAULT` so a fat-fingered keystroke cannot trigger it. Everything else is read-only or bounded in duration.

## A gotcha you will hit once

A freshly flashed board boots straight into the **app tree** — the touchscreen surface from the home screen through the menu into an app (`boot.autostart = 1`). That session **ignores plain typed bytes on purpose**: a stray console command does nothing and prints nothing, not even an error, which looks exactly like a hung board.

Getting back to the **prompt** — the place where the console waits for input again — takes a reserved byte that is not a keystroke. A script sends it for you, and it runs in a **terminal** (menu *Terminal → New Terminal*), not in the board console:

```
python3 scripts/board_key.py quit
```

After that your plain commands in the board console are heard again.

## Your task

Open the board console, return to the prompt if needed, and have the board answer twice: `?` for the command list and `k` for the task report. Then argue why, of the two commands for finding a button, only one reveals the pin. The next module opens up how the firmware is actually structured.
