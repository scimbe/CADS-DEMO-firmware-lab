---
id: m6-01-littlefs
title: Wo das Dateisystem liegt
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
    title: Führe das Storage-Gate auf der Konsole aus
    check: { type: serialExpect, send: "u\n", pattern: "storage test: PASS", timeoutMs: 60000, bloom: understand }
  - id: erase-vs-watchdog
    title: Sage voraus, ob ein Format den Watchdog auslöst
    check: { type: predict, prompt: { en: "Formatting the volume erases seven 128 KB sectors one after another, and each erase blocks the calling thread. Predict whether the IWDG resets the board while that runs.", de: "Ein Format löscht sieben 128-KB-Sektoren nacheinander, und jedes Löschen blockiert den aufrufenden Thread. Sage voraus, ob der IWDG das Board dabei zurücksetzt." }, then: { type: command, cwd: ".", command: "grep -n -B3 -E 'CADS_FLASH_ERASE_TIMEOUT_MS|CADS_IWDG_RELOAD_VALUE' modules/storage/src/cads_flash_stm32f4.c targets/itsboard/hal/hal_watchdog.c", expectExitCode: 0 }, rubric: "Der Vergleich stellt zwei Zahlen nebeneinander: das Löschzeitlimit des Treibers (CADS_FLASH_ERASE_TIMEOUT_MS 4000 ms, mit dem Kommentar, dass RM0090 für den 128-KB-Sektor eine Worst-Case-Zeit unter 2 s nennt) und die IWDG-Periode (Vorteiler /64, RLR 1000, also rund 2,048 s). Bestanden, wenn die Antwort nach dem Vergleich erklärt, warum sich das nicht widerspricht: das Löschen blockiert den aufrufenden Thread, nicht die CPU - der Baustein ist Dual-Bank, Code und Interrupt-Handler laufen weiter aus Bank 1, und der 1-kHz-Tick-Hook füttert den IWDG durchgehend. Eine Vorhersage ja mit dieser Auflösung besteht ebenso wie eine Vorhersage nein.", bloom: understand }
  - id: why-safe
    title: Erkläre, warum ein Reflash das Volume nicht zerstören kann
    check: { type: question, prompt: { en: "Why can writing a new firmware image not erase the littlefs volume?", de: "Warum kann das Schreiben eines neuen Firmware-Images das littlefs-Volume nicht löschen?" }, rubric: "Ein Grund genügt, muss aber der Mechanismus sein: st-flash write löscht sektorweise nur den geschriebenen Bereich ab 0x08000000 und macht nie ein Mass-Erase; oder das Image wird vor dem Schreiben gegen 1 MB geprüft und kann nicht über Bank 1 hinauslaufen; oder der Chip ist Dual-Bank, Bank 2 ist also eine getrennte Löschdomäne. Verortet das Volume dabei in Bank 2 ab 0x08120000. Eine Antwort, die nur sagt, das Werkzeug fasse es nicht an, besteht nicht.", bloom: understand }
socratic:
  - { trigger: "task:storage-gate:failed", question: { en: "The gate reported a failure. Does the raw flash driver work at all, or is it the filesystem layer on top that is unhappy?", de: "Das Gate meldete einen Fehler. Funktioniert der rohe Flash-Treiber überhaupt, oder ist die Dateisystemschicht darüber unglücklich?" }, hints: [ { en: "The board has to be at the console prompt, not inside the app tree - board_key.py quit returns you there.", de: "Das Board muss am Konsolen-Prompt stehen, nicht im App-Baum - board_key.py quit bringt dich dorthin zurück." }, { en: "The explorer has a second command that bypasses littlefs entirely and talks to the flash driver alone; the help list names it.", de: "Der Explorer hat einen zweiten Befehl, der littlefs komplett umgeht und nur den Flash-Treiber anspricht; die Hilfeliste nennt ihn." }, { en: "If the raw driver passes and the gate does not, the volume content is the problem, and the first run after a format is expected to differ from a verifying run.", de: "Besteht der rohe Treiber und das Gate nicht, ist der Volume-Inhalt das Problem, und der erste Lauf nach einem Format unterscheidet sich erwartungsgemäß von einem prüfenden Lauf." } ] }
  - { trigger: "task:erase-vs-watchdog:stuck", question: { en: "The erase blocks a thread. Does it also stop the CPU from fetching instructions, and where does the watchdog get fed from?", de: "Das Löschen blockiert einen Thread. Hält es auch die CPU davon ab, Befehle zu holen, und von wo wird der Watchdog gefüttert?" }, hints: [ { en: "The volume lives in bank 2. The firmware executes from bank 1. Ask what the part allows in that situation.", de: "Das Volume liegt in Bank 2. Die Firmware läuft aus Bank 1. Frag dich, was der Baustein in dieser Lage erlaubt." }, { en: "The watchdog is fed from the FreeRTOS tick hook in modules/kernel/src/kernel.c, which runs at 1 kHz from an interrupt.", de: "Der Watchdog wird aus dem FreeRTOS-Tick-Hook in modules/kernel/src/kernel.c gefüttert, der mit 1 kHz aus einem Interrupt läuft." }, { en: "Write your prediction down either way - the comparison afterwards is where the two numbers meet.", de: "Schreib deine Vorhersage in jedem Fall hin - der Vergleich danach ist die Stelle, an der die beiden Zahlen aufeinandertreffen." } ] }
  - { trigger: "question:why-safe:weak", question: { en: "What exactly does the flash tool erase before it writes, and how far does that reach?", de: "Was genau löscht das Flash-Werkzeug, bevor es schreibt, und wie weit reicht das?" }, hints: [ { en: "There is a difference between erasing the sectors you are about to write and erasing the whole device.", de: "Es ist ein Unterschied, ob man die Sektoren löscht, die man gleich beschreibt, oder das ganze Bauteil." }, { en: "docs/SAFETY.md section 4 states which of the two this lab does, and what is checked about the image before writing.", de: "docs/SAFETY.md Abschnitt 4 nennt, welches der beiden dieses Labor tut und was am Image vor dem Schreiben geprüft wird." }, { en: "One reason is enough, but it has to be a reason, not a hope - name the mechanism and the address range it covers.", de: "Ein Grund genügt, aber es muss ein Grund sein und keine Hoffnung - nenne den Mechanismus und den Adressbereich, den er abdeckt." } ] }
---
## Lernziel

Verorte das Dateisystem des Boards in der Flash-Karte und verstehe, warum ein Firmware-Update, so wie dieses Labor es durchführt, es nicht berühren kann.

## Es gibt keine Karte

Das Waveshare-Shield trägt einen microSD-Schacht, aber der ITS-Adapter führt ihn nicht durch und es steckt keine Karte, also legt CaDS Zero seine Dateien im **internen Flash** ab. Der STM32F429ZI hat 2 MB Flash, aufgeteilt in **zwei Bänke zu je 1 MB**, und die Firmware nutzt diese Teilung als harte Mauer (`docs/reference/memory-map.md`):

| Region | Adresse | Größe | Sektoren | Verwendung |
|---|---|---|---|---|
| `FLASH_APP` | `0x08000000` | 1024 KB | Bank 1, 0–11 | Firmware |
| reserviert | `0x08100000` | 128 KB | Bank 2, 12–16 | bleibt gelöscht |
| `FLASH_FS` | `0x08120000` | 896 KB | Bank 2, 17–23 | littlefs-Volume |

Die Sektorgeometrie ist nicht einheitlich: Sektoren 0–3 haben 16 KB, Sektor 4 hat 64 KB, Sektoren 5–11 haben 128 KB. Das Dateisystem nutzt nur die 128-KB-Sektoren der Bank 2, damit seine Blockgröße konstant ist.

## littlefs, und warum gerade dieses

littlefs ist ein kleines Dateisystem für rohes Flash, das einen Stromausfall mitten im Schreiben übersteht. Der Flash-Treiber der Firmware (`modules/storage/src/cads_flash_stm32f4.c`) verweigert jede Adresse unterhalb von `0x08120000` — zur Compile-Zeit mit einem `_Static_assert` geprüft und zur Laufzeit noch einmal gegen die Sektornummer — sodass selbst ein Fehler in der Dateisystemschicht nicht zu einem Schreibzugriff über die Firmware werden kann.

## Warum ein Reflash ihm nichts anhaben kann

Drei voneinander unabhängige Tatsachen, von denen **jede allein genügt**. Zwei betreffen das Flash-Werkzeug und stehen in `docs/SAFETY.md` §4: was es vor dem Schreiben genau löscht, und was es vorher am Image prüft. Lies die beiden Absätze dort nach — die dritte Aufgabe dieses Steps verlangt einen davon in eigenen Worten, samt Adressbereich.

Die dritte Tatsache steht hier, weil du sie gleich noch einmal brauchst: **der Chip ist Dual-Bank.** Bank 2 ist eine getrennte Löschdomäne, und die CPU kann weiter aus Bank 1 ausführen, während Bank 2 gelöscht oder programmiert wird. Genau das erlaubt der laufenden Firmware, ihre eigenen Dateien zu schreiben, ohne anzuhalten.

Dieselbe Mauer wirkt in die andere Richtung: der Linker sichert zu, dass die Firmware in Bank 1 passt, und CI schlägt fehl, wenn eine Sektion oberhalb von `0x08100000` landet.

## Wie lange ein Löschen dauert, und wer dabei zusieht

Ein Format löscht die sieben Sektoren des Volumes einzeln, und ein 128-KB-Sektor ist die größte Löscheinheit dieses Bausteins. Der Header sagt dazu, das dauere „on the order of one second" und blockiere so lange den aufrufenden Thread (`modules/storage/include/cads/storage/flash.h`); der Treiber daneben nennt als Referenz die Worst-Case-Angabe aus RM0090 — unter 2 s — und setzt sein eigenes Zeitlimit großzügig darüber (`modules/storage/src/cads_flash_stm32f4.c`).

Daneben legst du die Zahl aus M4-04: der IWDG dieses Boards läuft mit Vorteiler /64 und Reload 1000, also nach rund **2,048 s** ab (`targets/itsboard/hal/hal_watchdog.c`). Zwei Größenordnungen, die verdächtig dicht beieinanderliegen. Ob daraus ein Problem wird, ist die zweite Aufgabe dieses Steps — und die Antwort steht in derselben Eigenschaft des Bausteins, die schon Punkt 3 oben trägt.

## Das Gate, das du ausführen kannst

Der Explorer-Befehl `u` ist das M4-Hardware-Gate: auf einem frischen Volume formatiert er und schreibt Testdaten; bei jedem späteren Lauf prüft er, ob dieselben Daten einen Reset überstanden haben. Beide Wege enden mit derselben Urteilszeile, und genau darauf wartet der Check. `y` ist sein tiefer liegendes Geschwister, eine rohe Flash-Treiberdiagnose, die littlefs komplett umgeht — das Werkzeug, um einen Treiberfehler von einem Dateisystemfehler zu trennen.

## Deine Aufgabe

Führe auf der Board-Konsole `u` aus und lies den Bericht (denke an `board_key.py quit`, falls das Board im App-Baum sitzt). Sage dann voraus, ob ein Format den Watchdog auslöst, und vergleiche mit den beiden Konstanten im Quelltext. Zuletzt die Frage, warum ein Reflash das Volume unversehrt lässt. Der nächste Step öffnet die eine Datei, die du in diesem Volume bearbeiten wirst.
