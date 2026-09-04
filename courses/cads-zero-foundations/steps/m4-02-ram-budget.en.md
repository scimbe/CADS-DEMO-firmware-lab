---
id: m4-02-ram-budget
title: The RAM budget and the 48 KB floor
bloom: analyze
objectives: [cz.rtos.ram-budget]
requires: [m4-01-freertos-tasks]
estimatedMinutes: 18
scaffold: faded
recallFrom: [m4-01-freertos-tasks]
links:
  - { step: m4-03-mutex-spi-bus }
  - { file: "scripts/check_ram_budget.py", line: 1 }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 157 }
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/how-to/build.md" }
sources: [scripts/check_ram_budget.py, targets/itsboard/linker/cads_itsboard.ld, docs/reference/measurements.md, docs/reference/memory-map.md]
tasks:
  - id: build-report
    title: Produce the size report
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: margin-predict
    title: Predict the margin, then measure it
    check: { type: predict, prompt: { en: "Before running the budget check: how many bytes of margin above the 48 KB floor do you expect, and why?", de: "Bevor die Budgetprüfung läuft: wie viele Byte Marge über der 48-KB-Grenze erwartest du, und woraus?" }, then: { type: command, cwd: ".", command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf", expectExitCode: 0 }, rubric: "The prediction gives a number and a traceable derivation - from the margin logged in docs/reference/measurements.md, from the size report's RAM line (192 KB minus used), or from an earlier run. It does not have to be right: a pass is naming, after the comparison, how far off it was and why (a different state of the repository, different modules enabled, a different toolchain version). A prediction with no derivation, or a number edited to match the output afterwards, does not count.", bloom: analyze }
  - id: what-trips
    title: Decide which check trips first
    check: { type: question, prompt: { en: "Your margin is M. A feature adds 700 B of static SRAM. Which of the two checks trips?", de: "Deine Marge ist M. Ein Feature belegt 700 B mehr SRAM. Welche der beiden Prüfungen schlägt an?" }, rubric: "The answer works with the student's own margin M measured in the previous task and compares M - 700 against two different thresholds. The linker script's ASSERT only trips once M - 700 goes below zero, that is once the heap drops under 48 KB: with a three-digit remaining margin the build still links. check_ram_budget.py trips as soon as M - 700 is below --min-margin-bytes, default 256 B. So with a margin around 900 B the second check fires and the first does not - exactly the case the script exists for. An answer without an own number, or without both thresholds, is incomplete.", bloom: analyze }
misconceptions:
  - { pattern: "FAIL: only", question: { en: "The script failed but the build linked. Are those two the same threshold, or two different ones?", de: "Das Skript schlug fehl, der Build linkte aber. Sind das dieselbe Schwelle oder zwei verschiedene?" }, hints: [ { en: "Did the linker complain as well, or only the script that ran after it?", de: "Hat der Linker ebenfalls gemeckert, oder nur das Skript, das danach lief?" }, { en: "Read the last lines the script printed: it names the heap size, the floor and the margin as three separate numbers.", de: "Lies die letzten Zeilen, die das Skript gedruckt hat: es nennt Heap-Größe, Grenze und Marge als drei getrennte Zahlen." }, { en: "A build that still links but has run out of budget is the exact situation this script was written to catch - it is a warning with room to act, not a broken build.", de: "Ein Build, der noch linkt, aber sein Budget aufgebraucht hat, ist genau die Lage, für die dieses Skript geschrieben wurde - eine Warnung mit Handlungsspielraum, kein kaputter Build." } ] }
  - { pattern: "Less than 48K of heap left in SRAM", question: { en: "The link itself refused. Which memory region is exhausted, and which one is definitely not?", de: "Der Link selbst hat abgelehnt. Welcher Speicherbereich ist erschöpft, und welcher sicher nicht?" }, hints: [ { en: "Does the message talk about SRAM or about CCM - and where do your task stacks live?", de: "Spricht die Meldung von SRAM oder von CCM - und wo liegen deine Task-Stacks?" }, { en: "Read the --print-memory-usage table from the build: it shows RAM used against 192 KB, and the heap is the remainder.", de: "Lies die Tabelle von --print-memory-usage aus dem Bau: sie zeigt belegtes RAM gegen 192 KB, und der Heap ist der Rest." }, { en: "The usual culprit is a static buffer in .bss or .dmaram, not a stack - moving CPU-only state to CCM is one of the established levers.", de: "Der übliche Grund ist ein statischer Puffer in .bss oder .dmaram, kein Stack - CPU-only-Zustand ins CCM zu verlegen ist einer der etablierten Hebel." } ] }
  - { pattern: "No such file", question: { en: "The script never found the ELF it reads. Did the build terminal survive to the end?", de: "Das Skript hat die ELF nie gefunden, die es liest. Hat das Build-Terminal bis zum Ende durchgehalten?" }, hints: [ { en: "Closing a terminal with the cross kills the process inside it, so a build stopped halfway writes no ELF at all.", de: "Das Kreuz am Terminal beendet den Prozess darin; ein auf halber Strecke gestoppter Bau schreibt also gar keine ELF." }, { en: "Start the task CaDS: Build again - F1, then Tasks: Run Task, then CaDS: Build - and this time fold the terminal area away with Ctrl/Cmd+J instead of closing it.", de: "Starte den Task CaDS: Build erneut - F1, dann Tasks: Run Task, dann CaDS: Build - und klappe den Terminal-Bereich diesmal mit Strg/Cmd+J weg, statt ihn zu schließen." }, { en: "Afterwards build/itsboard/cads-zero.elf exists and the script prints its three numbers instead of an error.", de: "Danach existiert build/itsboard/cads-zero.elf, und das Skript druckt seine drei Zahlen statt eines Fehlers." } ] }
socratic:
  - { trigger: "task:build-report:failed", question: { en: "Does the error come from the compiler or from a linker ASSERT, and does it name a memory region?", de: "Kommt der Fehler vom Compiler oder von einem Linker-ASSERT, und nennt er einen Speicherbereich?" }, hints: [ { en: "Compiler errors name a file and a line; an ASSERT names a rule in prose - which kind is yours?", de: "Compilerfehler nennen Datei und Zeile; ein ASSERT nennt eine Regel im Klartext - welche Art ist deiner?" }, { en: "Open targets/itsboard/linker/cads_itsboard.ld and read the two ASSERT statements; each one guards a different region.", de: "Öffne targets/itsboard/linker/cads_itsboard.ld und lies die beiden ASSERT-Anweisungen; jede bewacht einen anderen Bereich." }, { en: "Whatever your last change added, it has to come back out of the same region - a build cannot be talked into fitting.", de: "Was deine letzte Änderung hinzugefügt hat, muss aus demselben Bereich wieder heraus - ein Build lässt sich nicht überreden zu passen." } ] }
  - { trigger: "task:margin-predict:failed", question: { en: "Did the script find an ELF at all, and is that ELF the one your last build produced?", de: "Hat das Skript überhaupt eine ELF gefunden, und ist es die aus deinem letzten Bau?" }, hints: [ { en: "A script that cannot find its input fails differently from one that found it and disliked the number - which message did you get?", de: "Ein Skript, das seine Eingabe nicht findet, scheitert anders als eines, das sie fand und die Zahl nicht mochte - welche Meldung hast du bekommen?" }, { en: "Run the CaDS: Build task first, then check that build/itsboard/cads-zero.elf exists before running the check again.", de: "Führe zuerst den Task CaDS: Build aus und prüfe dann, dass build/itsboard/cads-zero.elf existiert, bevor du den Check erneut startest." }, { en: "The script reads one symbol out of the ELF with nm; if that symbol is missing, it is the linker script that changed, not the script.", de: "Das Skript liest per nm ein einziges Symbol aus der ELF; fehlt dieses Symbol, hat sich das Linkerskript geändert, nicht das Skript." } ] }
  - { trigger: "question:what-trips:weak", question: { en: "How far above zero is your margin, and how far above 256 - are those the same distance?", de: "Wie weit über null liegt deine Marge, und wie weit über 256 - sind das dieselben Abstände?" }, hints: [ { en: "Are you comparing the new margin against one threshold or against two different ones?", de: "Vergleichst du die neue Marge gegen eine Schwelle oder gegen zwei verschiedene?" }, { en: "The linker's rule is in the ASSERT in cads_itsboard.ld; the script's rule is the --min-margin-bytes option in scripts/check_ram_budget.py.", de: "Die Regel des Linkers steht im ASSERT in cads_itsboard.ld; die Regel des Skripts ist die Option --min-margin-bytes in scripts/check_ram_budget.py." }, { en: "One of the two thresholds sits at the floor itself, the other a few hundred bytes above it - which one does 700 B of new SRAM reach first?", de: "Eine der beiden Schwellen liegt auf der Grenze selbst, die andere ein paar hundert Byte darüber - welche erreichen 700 B neues SRAM zuerst?" } ] }
---

## Learning goal

Read the firmware's RAM budget correctly: what the linker's 48 KB floor guards, what the margin check adds on top, and why the margin is the whole safety net.

## There is no heap — and that is the point

FreeRTOS allocates nothing (M4-01), and there is no `malloc` in use anywhere. What the linker calls "heap" is simply **whatever SRAM is left** after `.data`, `.bss` and `.dmaram` are placed. `targets/itsboard/linker/cads_itsboard.ld` deliberately does not fill the region with a section, so `--print-memory-usage` keeps reporting a meaningful number instead of 100 % forever:

```
__cads_heap_start = .;                      /* after .dmaram */
__cads_heap_end   = ORIGIN(RAM) + LENGTH(RAM);
__cads_heap_size  = __cads_heap_end - __cads_heap_start;

ASSERT(__cads_heap_size >= 48K,
       "Less than 48K of heap left in SRAM - lwIP and the GUI will not fit")
```

To open the linker script yourself: press `Ctrl`/`Cmd`+`P`, type `cads_itsboard.ld`, Enter — the file opens as a tab in the middle of the window.

Below 48 KB the network stack's pools and the GUI do not fit, so the link **fails** rather than the board failing in the field. That is a floor: a build either clears it or does not.

## Why a floor is not a budget

A floor has exactly two states. It tells you nothing about the distance you have left — and the project's own log shows it hit the floor at *exactly zero bytes of slack* more than once, each time noticed only by a human counting bytes afterwards. `docs/reference/measurements.md` therefore carries the margin as its own logged figure; look there before you predict it.

`scripts/check_ram_budget.py` closes the gap mechanically. It reads `__cads_heap_size` back out of the built ELF with `nm` — the very symbol the ASSERT computes — and fails if the margin above 48 KB is thinner than `--min-margin-bytes`, default **256 B**. It prints three numbers: heap size, floor and margin.

So there are **two** thresholds, not one: the floor at 48 KB where the link fails, and the margin above it where the budget warns while there is still room to fix things. Which of the two a change reaches first is your third task.

## Where the SRAM goes

Roughly: 75 KB framebuffer (480×320 at 4 bpp), 30 KB RGB565 staging, lwIP's pools, and statics. Task stacks are **not** in this number — they live in CCM (M4-01), which is why the two stack fixes from M3-04 cost nothing from this budget.

## Task 1 — produce the size report

Start the task **`CaDS: Build`**. The most convenient way: **`F1`**, then type `Tasks: Run Task`, Enter, then pick **`CaDS: Build`** from the list. Without the keyboard: the icon with three lines (**☰**) at the very top left — there is no visible menu bar — then **`Terminal` → `Run Task...` → `CaDS: Build`**. The interface is in English while the course text is German, so the menu entry reads `Run Task...` and not something German.

![Das Menue hinter dem Drei-Striche-Symbol, Terminal aufgeklappt, mit New Terminal und Run Task](menu-run-task.png)

![Die Liste aller Tasks des Projekts, aus der du CaDS: Build waehlst](task-picker.png)

`Ctrl`/`Cmd`+`Shift`+`P` opens the palette too, but a browser often swallows it; `F1` is the reliable way.

**What you see:** a terminal of its own named `CaDS: Build` opens in the terminal area at the bottom. If that area is folded away, `Ctrl`/`Cmd`+`J` folds it open and shut. The first build takes about a minute, later ones seconds. It is **finished** when no new lines appear and a prompt is back; right at the end sits the table `--print-memory-usage` prints. Read the `RAM` line there.

<!-- SHOT: m4-build-memory-usage-table | Das Terminal CaDS: Build am Ende des Baus, mit der Tabelle von --print-memory-usage und der Zeile fuer RAM -->

## Task 2 — predict the margin, then measure it

Write your prediction into this task's input field first. It sits at the bottom of the step text, the tab `CaDS Tutor: The RAM budget and the 48 KB floor` **in the middle** of the window. Only the **Check** button next to it then runs the script and shows you the number; before that you do not see it.

You can run the same script yourself. Open a terminal for it — **☰ → `Terminal` → `New Terminal`**, the working directory is the project root — and type:

```bash
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf
```

With a stricter threshold:

```bash
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf --min-margin-bytes 512
```

Both run in under a second. You know it worked from a last line starting with `PASS:` that names the margin in bytes; when the margin is too thin it starts with `FAIL: only`.

## Task 3 — decide which check trips first

Work with your own margin, the one you just measured, not with a number from the text.

## When the interface gets in the way

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it, and a build aborted halfway leaves no ELF behind — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.
