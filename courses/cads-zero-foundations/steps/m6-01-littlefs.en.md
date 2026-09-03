---
id: m6-01-littlefs
title: Where the filesystem lives
bloom: understand
objectives: [cz.storage.littlefs]
requires: [m5-04-dirty-rect-eval]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m6-02-config-file }
  - { step: m4-04-iwdg-watchdog }
  - { doc: "docs/reference/memory-map.md" }
  - { doc: "docs/SAFETY.md" }
  - { file: "modules/storage/src/cads_flash_stm32f4.c", line: 135 }
  - { file: "modules/storage/include/cads/storage/flash.h", line: 101 }
  - { file: "targets/itsboard/hal/hal_watchdog.c", line: 43 }
sources: [docs/reference/memory-map.md, docs/SAFETY.md, modules/storage/src/cads_flash_stm32f4.c, modules/storage/include/cads/storage/flash.h, targets/itsboard/hal/hal_watchdog.c, docs/reference/explorer-console.md]
misconceptions:
  - { pattern: "no valid filesystem, or damage", question: { en: "littlefs did not recognise the volume. Is that a broken filesystem, or a medium that never had one?", de: "littlefs hat das Volume nicht erkannt. Ist das ein kaputtes Dateisystem oder ein Medium, das nie eines hatte?" }, hints: [ { en: "On a fresh volume the gate formats first and says so; this message on a later run means the content changed under it.", de: "Auf einem frischen Volume formatiert das Gate zuerst und sagt das auch; diese Meldung bei einem späteren Lauf heißt, der Inhalt hat sich darunter verändert." }, { en: "The console has a second command that talks to the raw flash driver below littlefs; run it and compare the two verdicts.", de: "Die Konsole hat einen zweiten Befehl, der den rohen Flash-Treiber unterhalb von littlefs anspricht; führ ihn aus und vergleich die beiden Urteile." }, { en: "If the raw driver passes and only the filesystem layer complains, letting the gate format once is the correct repair, not a workaround.", de: "Besteht der rohe Treiber und nur die Dateisystemschicht klagt, ist ein einmaliges Formatieren durch das Gate die richtige Reparatur, keine Notlösung." } ] }
  - { pattern: "content mismatch - did not survive the reset intact", question: { en: "The file was there but its content had changed. What sits between the write and the next read that could have altered it?", de: "Die Datei war da, aber ihr Inhalt hatte sich geändert. Was liegt zwischen dem Schreiben und dem nächsten Lesen, das ihn verändert haben könnte?" }, hints: [ { en: "The gate expects a reset between the two runs, not a reflash and not a host-side volume push.", de: "Das Gate erwartet zwischen den beiden Läufen einen Reset, keinen Reflash und keinen Volume-Push vom Host." }, { en: "A host-side push writes the whole volume back and overwrites anything the board wrote in the meantime.", de: "Ein Push vom Host schreibt das ganze Volume zurück und überschreibt alles, was das Board zwischenzeitlich geschrieben hat." }, { en: "Run the gate twice with nothing but a reset in between; that is the sequence the check is written for.", de: "Führ das Gate zweimal aus, mit nichts als einem Reset dazwischen; für diese Abfolge ist der Check geschrieben." } ] }
tasks:
  - id: storage-gate
    title: Run the storage gate on the console
    check: { type: serialExpect, send: "u\n", pattern: "storage test: PASS", timeoutMs: 60000, bloom: understand }
  - id: erase-vs-watchdog
    title: Predict whether a format trips the watchdog
    check: { type: predict, prompt: { en: "Formatting the volume erases seven 128 KB sectors one after another, and each erase blocks the calling thread. Predict whether the IWDG resets the board while that runs.", de: "Ein Format löscht sieben 128-KB-Sektoren nacheinander, und jedes Löschen blockiert den aufrufenden Thread. Sage voraus, ob der IWDG das Board dabei zurücksetzt." }, then: { type: command, cwd: ".", command: "grep -n -B3 -E 'CADS_FLASH_ERASE_TIMEOUT_MS|CADS_IWDG_RELOAD_VALUE' modules/storage/src/cads_flash_stm32f4.c targets/itsboard/hal/hal_watchdog.c", expectExitCode: 0 }, rubric: "The comparison puts two numbers side by side: the driver erase timeout (CADS_FLASH_ERASE_TIMEOUT_MS 4000 ms, with the comment that RM0090 gives a worst case under 2 s for the 128 KB sector) and the IWDG period (prescaler /64, RLR 1000, so about 2.048 s). Passes if the answer, after the comparison, explains why those do not contradict: the erase blocks the calling thread, not the CPU - the part is dual-bank, so code and interrupt handlers keep running from bank 1 and the 1 kHz tick hook feeds the IWDG throughout. A prediction of yes with that resolution passes just as one of no does.", bloom: understand }
  - id: why-safe
    title: Explain why a reflash cannot destroy the volume
    check: { type: question, prompt: { en: "Why can writing a new firmware image not erase the littlefs volume?", de: "Warum kann das Schreiben eines neuen Firmware-Images das littlefs-Volume nicht löschen?" }, rubric: "One reason is enough, but it has to be the mechanism: st-flash write sector-erases only the range it writes from 0x08000000 and never does a mass erase; or the image is size-checked against 1 MB before writing and cannot spill past bank 1; or the part is dual-bank, so bank 2 is a separate erase domain. Places the volume in bank 2 at 0x08120000 while doing so. An answer that only says the tool does not touch it does not pass.", bloom: understand }
socratic:
  - { trigger: "task:storage-gate:failed", question: { en: "The gate reported a failure. Does the raw flash driver work at all, or is it the filesystem layer on top that is unhappy?", de: "Das Gate meldete einen Fehler. Funktioniert der rohe Flash-Treiber überhaupt, oder ist die Dateisystemschicht darüber unglücklich?" }, hints: [ { en: "The board has to be at the console prompt, not inside the app tree - board_key.py quit returns you there.", de: "Das Board muss am Konsolen-Prompt stehen, nicht im App-Baum - board_key.py quit bringt dich dorthin zurück." }, { en: "The explorer has a second command that bypasses littlefs entirely and talks to the flash driver alone; the help list names it.", de: "Der Explorer hat einen zweiten Befehl, der littlefs komplett umgeht und nur den Flash-Treiber anspricht; die Hilfeliste nennt ihn." }, { en: "If the raw driver passes and the gate does not, the volume content is the problem, and the first run after a format is expected to differ from a verifying run.", de: "Besteht der rohe Treiber und das Gate nicht, ist der Volume-Inhalt das Problem, und der erste Lauf nach einem Format unterscheidet sich erwartungsgemäß von einem prüfenden Lauf." } ] }
  - { trigger: "task:erase-vs-watchdog:stuck", question: { en: "The erase blocks a thread. Does it also stop the CPU from fetching instructions, and where does the watchdog get fed from?", de: "Das Löschen blockiert einen Thread. Hält es auch die CPU davon ab, Befehle zu holen, und von wo wird der Watchdog gefüttert?" }, hints: [ { en: "The volume lives in bank 2. The firmware executes from bank 1. Ask what the part allows in that situation.", de: "Das Volume liegt in Bank 2. Die Firmware läuft aus Bank 1. Frag dich, was der Baustein in dieser Lage erlaubt." }, { en: "The watchdog is fed from the FreeRTOS tick hook in modules/kernel/src/kernel.c, which runs at 1 kHz from an interrupt.", de: "Der Watchdog wird aus dem FreeRTOS-Tick-Hook in modules/kernel/src/kernel.c gefüttert, der mit 1 kHz aus einem Interrupt läuft." }, { en: "Write your prediction down either way - the comparison afterwards is where the two numbers meet.", de: "Schreib deine Vorhersage in jedem Fall hin - der Vergleich danach ist die Stelle, an der die beiden Zahlen aufeinandertreffen." } ] }
  - { trigger: "question:why-safe:weak", question: { en: "What exactly does the flash tool erase before it writes, and how far does that reach?", de: "Was genau löscht das Flash-Werkzeug, bevor es schreibt, und wie weit reicht das?" }, hints: [ { en: "There is a difference between erasing the sectors you are about to write and erasing the whole device.", de: "Es ist ein Unterschied, ob man die Sektoren löscht, die man gleich beschreibt, oder das ganze Bauteil." }, { en: "docs/SAFETY.md section 4 states which of the two this lab does, and what is checked about the image before writing.", de: "docs/SAFETY.md Abschnitt 4 nennt, welches der beiden dieses Labor tut und was am Image vor dem Schreiben geprüft wird." }, { en: "One reason is enough, but it has to be a reason, not a hope - name the mechanism and the address range it covers.", de: "Ein Grund genügt, aber es muss ein Grund sein und keine Hoffnung - nenne den Mechanismus und den Adressbereich, den er abdeckt." } ] }
---
## Learning goal

Locate the on-board filesystem in the flash map and understand why a firmware update, done the way this lab does it, cannot touch it.

## There is no card

The Waveshare shield carries a microSD slot, but the ITS adapter does not route it and no card is in use, so CaDS Zero stores its files in **internal flash**. The STM32F429ZI has 2 MB of flash split into **two banks of 1 MB**, and the firmware uses that split as a hard wall (`docs/reference/memory-map.md`):

| Region | Address | Size | Sectors | Use |
|---|---|---|---|---|
| `FLASH_APP` | `0x08000000` | 1024 KB | bank 1, 0–11 | firmware |
| reserved | `0x08100000` | 128 KB | bank 2, 12–16 | left erased |
| `FLASH_FS` | `0x08120000` | 896 KB | bank 2, 17–23 | littlefs volume |

Sector geometry is not uniform: sectors 0–3 are 16 KB, sector 4 is 64 KB, sectors 5–11 are 128 KB. The filesystem uses only the 128 KB sectors of bank 2 so that its block size is constant.

## littlefs, and why that one

littlefs is a small filesystem designed for raw flash that survives power loss mid-write. The firmware's flash driver (`modules/storage/src/cads_flash_stm32f4.c`) refuses any address below `0x08120000` — checked at compile time with a `_Static_assert` and again at run time against the sector number — so even a bug in the filesystem layer cannot turn into a write over the firmware.

## Why a reflash cannot hurt it

Three independent facts, **any one of which is enough**. Two of them are about the flash tool and are written up in `docs/SAFETY.md` §4: what exactly it erases before writing, and what it checks about the image beforehand. Read those two paragraphs — the third task of this step asks for one of them in your own words, with the address range.

The third fact is here because you will need it again shortly: **the part is dual-bank.** Bank 2 is a separate erase domain, and the CPU can keep executing from bank 1 while bank 2 is being erased or programmed. That is also what lets the running firmware write its own files without stalling.

The same wall works in the other direction: the linker asserts the firmware fits in bank 1, and CI fails if any section lands above `0x08100000`.

## How long an erase takes, and who is watching

A format erases the volume's seven sectors one at a time, and a 128 KB sector is the largest erase unit on this part. The header says that takes "on the order of one second" and blocks the calling thread for that long (`modules/storage/include/cads/storage/flash.h`); the driver next to it cites RM0090's worst-case figure — under 2 s — and sets its own timeout generously above that (`modules/storage/src/cads_flash_stm32f4.c`).

Put the number from M4-04 next to it: this board's IWDG runs with prescaler /64 and reload 1000, so it expires after roughly **2.048 s** (`targets/itsboard/hal/hal_watchdog.c`). Two magnitudes suspiciously close together. Whether that becomes a problem is the second task of this step — and the answer lies in the same property of the part that already carries point 3 above.

## The gate you can run

The explorer command `u` is the M4 hardware gate: on a fresh volume it formats and writes test data; on every later run it verifies the same data survived a reset. Both paths end in the same verdict line, and that is exactly what the check waits for. `y` is its lower-level sibling, a raw flash-driver diagnostic that bypasses littlefs entirely — the tool for isolating a driver fault from a filesystem one.

## Your task

From the board console, run `u` and read its report (remember `board_key.py quit` if the board sits in the app tree). Then predict whether a format trips the watchdog and compare against the two constants in the source. Finally, the question of why a reflash leaves the volume intact. The next step opens the one file you will edit inside that volume.
