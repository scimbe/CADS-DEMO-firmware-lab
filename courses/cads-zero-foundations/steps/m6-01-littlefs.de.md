---
id: m6-01-littlefs
title: Wo das Dateisystem liegt
bloom: understand
objectives: [cz.storage.littlefs]
requires: [m5-04-dirty-rect-eval]
estimatedMinutes: 12
links:
  - { step: m6-02-config-file }
  - { doc: "docs/reference/memory-map.md" }
  - { doc: "docs/SAFETY.md" }
  - { file: "modules/storage/src/cads_flash_stm32f4.c", line: 76 }
sources: [docs/reference/memory-map.md, docs/SAFETY.md, modules/storage/src/cads_flash_stm32f4.c, docs/reference/explorer-console.md]
tasks:
  - id: storage-gate
    title: Führe das Storage-Gate auf der Konsole aus
    check: { type: manual }
  - id: why-safe
    title: Erkläre, warum ein Reflash das Volume nicht zerstören kann
    check: { type: question, prompt: { en: "Where exactly does the littlefs volume sit in flash, and give two independent reasons why writing a new firmware image with the lab's flash task cannot destroy it.", de: "Wo genau liegt das littlefs-Volume im Flash, und nenne zwei voneinander unabhängige Gründe, warum das Schreiben eines neuen Firmware-Images mit dem Flash-Task des Labors es nicht zerstören kann?" }, rubric: "Verortet das Volume in Flash-Bank 2 bei 0x08120000 (896 KB, Sektoren 17-23). Gründe: st-flash write löscht sektorweise nur den geschriebenen Bereich ab 0x08000000, und es gibt nie ein Mass-Erase; das Image wird gegen 1 MB geprüft und kann nicht über Bank 1 hinauslaufen; der Chip ist Dual-Bank, Bank 2 ist also eine getrennte Löschdomäne von der Firmware in Bank 1.", bloom: understand }
socratic:
  - { trigger: "task:storage-gate:failed", question: { en: "The 'u' gate reported a failure. Does the raw flash driver work at all, or is it the filesystem layer on top that is unhappy?", de: "Das 'u'-Gate meldete einen Fehler. Funktioniert der rohe Flash-Treiber überhaupt, oder ist die Dateisystemschicht darüber unglücklich?" }, hints: [ { en: "The explorer has a second command that bypasses littlefs entirely and talks to the flash driver alone.", de: "Der Explorer hat einen zweiten Befehl, der littlefs komplett umgeht und nur den Flash-Treiber anspricht." }, { en: "Run 'y' - the raw flash driver diagnostic - and compare its verdict with 'u'.", de: "Führe 'y' aus - die rohe Flash-Treiberdiagnose - und vergleiche ihr Urteil mit 'u'." }, { en: "If 'y' passes and 'u' fails, the volume content is the problem; a fresh 'u' after a reset formats on first run.", de: "Besteht 'y' und 'u' scheitert, ist der Volume-Inhalt das Problem; ein frisches 'u' nach einem Reset formatiert beim ersten Lauf." } ] }
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

Drei voneinander unabhängige Tatsachen, von denen jede allein genügt:

1. **`st-flash write` löscht sektorweise nur den geschriebenen Bereich**, beginnend bei `0x08000000`. Ein ~230 KB großes Image berührt eine Handvoll Bank-1-Sektoren und sonst nichts. Es gibt **niemals ein Mass-Erase** (`docs/SAFETY.md` §4).
2. **Die Imagegröße wird vor dem Schreiben gegen 1 MB geprüft**, sodass ein zu großes Image nicht über Bank 1 hinaus ins Dateisystem-Fenster laufen kann.
3. **Der Chip ist Dual-Bank.** Bank 2 ist eine getrennte Löschdomäne, und die CPU kann weiter aus Bank 1 ausführen, während Bank 2 gelöscht oder programmiert wird. Genau das erlaubt der laufenden Firmware, ihre eigenen Dateien zu schreiben, ohne anzuhalten.

Dieselbe Mauer wirkt in die andere Richtung: der Linker sichert zu, dass die Firmware in Bank 1 passt, und CI schlägt fehl, wenn eine Sektion oberhalb von `0x08100000` landet.

## Das Gate, das du ausführen kannst

Der Explorer-Befehl `u` ist das M4-Hardware-Gate: auf einem frischen Volume formatiert er und schreibt Testdaten; bei jedem späteren Lauf prüft er, ob dieselben Daten einen Reset überstanden haben. `y` ist sein tiefer liegendes Geschwister, eine rohe Flash-Treiberdiagnose, die littlefs komplett umgeht — das Werkzeug, um einen Treiberfehler von einem Dateisystemfehler zu trennen.

## Deine Aufgabe

Führe auf der Board-Konsole `u` aus und lies den Bericht (denke an `board_key.py quit`, falls das Board im App-Baum sitzt). Beantworte dann die Frage, wo das Volume liegt und warum ein Reflash es unversehrt lässt. Der nächste Step öffnet die eine Datei, die du in diesem Volume bearbeiten wirst.
