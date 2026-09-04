---
id: m7-03-dhcp-stack-lesson
title: Case study - the DHCP stack overflow
bloom: analyze
objectives: [cz.net.dhcp-lesson]
requires: [m7-02-udp-hello]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m3-04-stack-guard, m4-05-stack-sizing]
links:
  - { step: m7-04-recon-tools }
  - { step: m3-04-stack-guard }
  - { step: m4-05-stack-sizing }
  - { doc: "docs/ROADMAP.md" }
  - { file: "apps/bringup/tasks.c", line: 74 }
  - { file: "lib/lwip/src/core/ipv4/dhcp.c", line: 176 }
sources: [docs/ROADMAP.md, apps/bringup/tasks.c, lib/lwip/src/core/ipv4/dhcp.c, modules/net/src/cads_net_board.c, docs/how-to/debug.md]
tasks:
  - id: why-deeper
    title: Explain the depth of the DHCP path
    check: { type: question, prompt: { en: "Why is lwIP's DHCP path deeper on the stack than the static-address path?", de: "Warum ist der DHCP-Pfad von lwIP auf dem Stack tiefer als der Pfad mit statischer Adresse?" }, rubric: "The static path writes address, mask and gateway into the netif at init and is then done; it has no per-frame work. The DHCP client is a state machine that, for every arriving reply, parses the BOOTP options out of a received pbuf chain (the option table and reply parser in lib/lwip/src/core/ipv4/dhcp.c) and in the same pass builds and sends messages of its own - all nested calls on the stack of whoever polled. Second half of the answer: the polling happens inside cads_net_poll() on the console task, whose stack already carries the entire app-tree tick chain. An answer that only says DHCP is more complicated does not pass.", bloom: analyze }
  - id: read-headroom
    title: Read the high-water marks of the three task stacks
    check: { type: serialExpect, send: "k\n", pattern: "console_free=", timeoutMs: 15000, bloom: analyze }
socratic:
  - { trigger: "question:why-deeper:weak", question: { en: "A static address is assigned once. What does a DHCP client have to do for every single reply frame that arrives?", de: "Eine statische Adresse wird einmal zugewiesen. Was muss ein DHCP-Client für jeden einzelnen ankommenden Antwort-Frame tun?" }, hints: [ { en: "One of the two paths only writes fields into a netif; the other reads a protocol out of a received buffer.", de: "Einer der beiden Pfade schreibt nur Felder in ein netif; der andere liest ein Protokoll aus einem empfangenen Puffer." }, { en: "lib/lwip/src/core/ipv4/dhcp.c has an option table and a reply parser; look at how a reply is walked and what it is walked over.", de: "lib/lwip/src/core/ipv4/dhcp.c hat eine Optionstabelle und einen Antwortparser; sieh dir an, wie eine Antwort abgelaufen wird und worüber." }, { en: "The answer has a second half: on whose stack all of that runs, and what was already on that stack before DHCP was switched on.", de: "Die Antwort hat eine zweite Hälfte: auf wessen Stack das alles läuft und was auf diesem Stack schon lag, bevor DHCP eingeschaltet wurde." } ] }
  - { trigger: "task:read-headroom:failed", question: { en: "The report comes from the scheduler, so it needs a running scheduler and a console prompt. Which of the two is missing?", de: "Der Bericht kommt vom Scheduler, er braucht also einen laufenden Scheduler und einen Konsolen-Prompt. Welches der beiden fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "This command reports nothing at all on the host build - there are no FreeRTOS tasks there to report about.", de: "Auf dem Host-Build meldet dieser Befehl gar nichts - dort gibt es keine FreeRTOS-Tasks, über die zu berichten wäre." }, { en: "The numbers are free headroom in bytes, not used bytes; a small number is the alarming one.", de: "Die Zahlen sind freier Spielraum in Byte, nicht verbrauchte Byte; die kleine Zahl ist die beunruhigende." } ] }
---
## Learning goal

Explain the network-specific half of a real crash: why enabling DHCP in particular deepened a task stack that static addressing had never strained.

## What you already know, and what is new here

The case study itself — the sentinel in the idle hook, the garbage PC `0xF7FF0FF0`, `CADS_CONSOLE_STACK` 512 → 1024 words, the cost paid in CCM rather than the SRAM heap — is told in full in **M3-04** and turned into a sizing rule in **M4-05**. It is **not** retold here.

What was left open there is this step's question: `net.dhcp = 1` broke the console task's stack and `net.dhcp = 0` did not. Both run through the same `cads_net_poll()` call, in the same loop, on the same task. So the difference is inside the network stack itself.

## Two paths through one function

With `net.dhcp = 0` the address is **configuration**: `modules/net/src/cads_net_board.c` writes address, mask and gateway into the netif when the config is applied, and after that there is no further work for it. Every later `cads_net_poll()` only moves frames.

With `net.dhcp = 1` the same code calls `dhcp_start()` on the netif, and from then on the address is a **protocol**. lwIP's client keeps a state machine; for every arriving reply it walks the options of a BOOTP packet — the file carries its own option table and a reply parser for that — and the payload it walks over is a **pbuf chain**, not a flat buffer. In the same pass it assembles its own next message and hands it over to be sent.

Read that for yourself: press `Ctrl`/`Cmd`+`P`, type `lib/lwip/src/core/ipv4/dhcp.c` and press Enter. Without the keyboard: the top icon in the narrow icon bar on the far left (the file explorer), then click through the tree. The file opens as a tab in the middle, next to the step-text tab `CaDS Tutor: <title>`. It is large; `Ctrl`/`Cmd`+`F` searches inside it.

The polling happens from the main loop of `apps/bringup/explorer_app_demo.c` — on the **console task**, which by then already ran the whole app-tree tick chain (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`). Trace where the work from `dhcp.c` ends up when `cads_net_poll()` is called out of that loop — that is this step's first question, and the answer has two halves.

## Why console silence was not evidence

`docs/ROADMAP.md`'s log entry for 2026-08-28 records two dead ends — filesystem damage and a flaky debug session — so they are not retried blind, and a third that was self-inflicted: this Nucleo enumerates two `/dev/cu.usbmodem*` devices, and several "still crashes" readings were really `board_cmd.py` pinned to the wrong port, querying dead air. The lesson recorded: trust a live GDB attach over console silence when the two disagree.

## Task 1 — explain the depth of the DHCP path

A free-text answer in the field on the task, then the **Check** button beside it. The tasks are at the bottom of the step text, the tab in the middle; **Run all checks** at the top of that same tab starts both tasks of this step at once. If one stays red, the **Show hint** button on that same task helps.

## Task 2 — read the high-water marks of the three task stacks

You do not type the console command `k` yourself: the check button sends it, you only read the answer.

A freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal first — click the icon with the three bars (**☰**) at the very top left, then **`Terminal` → `New Terminal`**; if the terminal area is folded away, `Ctrl`/`Cmd`+`J` opens it and folds it back. The working directory is the project root. Run once:

```
python3 scripts/board_key.py quit
```

In the lab the scripts reach the board through the bridge's console PTY; if the call finds no port, name it explicitly (`docs/SPEC.md`):

```
python3 scripts/board_key.py quit --port /home/coder/board-console
```

**Do not close this terminal while something is running in it.** The cross on a terminal kills the process inside it; use `Ctrl`/`Cmd`+`J` to fold it away instead, which leaves it running.

To watch while it sends, also open the board console: press **`F1`**, type `CaDS Board: Konsole öffnen` and press Enter. **If the palette does not react at all, the browser swallowed `Ctrl`/`Cmd`+`Shift`+`P`** — press `F1`, or go through **☰ → `Terminal`**.

Then click **Check**. Within a few seconds exactly one line comes back, starting `# tasks  ui_free=` and following with `input_free=`, `console_free=`, `tasks=`, `events=` and `last_key=`. The three `*_free` numbers are **free headroom in bytes**, not bytes used: the small number is the alarming one. On the host build the command reports nothing at all — there are no tasks there to report about.

<!-- SHOT: m7-task-stack-report | Board console after k: the line # tasks ui_free=.. input_free=.. console_free=.. tasks=.. events=.. last_key=.. | HARDWARE -->

**If you look for that line in the wrong window:** it is not in the step text and not in the editor. The board's answer is in the board console; the output of a terminal command is at the bottom in the terminal you started it from — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the right terminal.

That is the tool that lets you see this class of fault *before* the crash — and the reason M4-05 asks for evidence rather than a factor.

The interface is in English while the course text is German — so the menu item is called `New Terminal`.
