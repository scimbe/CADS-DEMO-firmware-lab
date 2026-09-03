---
id: m2-01-memory-map
title: Die Speicherkarte lesen
bloom: analyze
objectives: [firmware-reference-memory-map]
requires: [m2-00-mmio-primer]
estimatedMinutes: 15
links:
  - { step: m2-02-mmio-gpio }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 23 }
sources: [docs/reference/memory-map.md, targets/itsboard/linker/cads_itsboard.ld, docs/SAFETY.md]
tasks:
  - id: read-ld
    title: Lies den MEMORY-Block des Linkerskripts
    check: { type: manual }
  - id: place-buffers
    title: Entscheide, wo ein Puffer liegen muss
    check: { type: question, prompt: { en: "A new driver needs a receive buffer that a DMA controller will fill, and a second scratch buffer only the CPU touches. Where does each one go in this memory map, and why? Also: at which address does the littlefs volume start, and why can a firmware update not destroy it?", de: "Ein neuer Treiber braucht einen Empfangspuffer, den ein DMA-Controller füllt, und einen zweiten Arbeitspuffer, den nur die CPU berührt. Wohin gehört jeder in dieser Speicherkarte, und warum? Außerdem: Bei welcher Adresse beginnt das littlefs-Volume, und warum kann ein Firmware-Update es nicht zerstören?" }, rubric: "DMA-Puffer ins SRAM bei 0x20000000 (Sektion .dmaram), weil CCM bei 0x10000000 für jeden DMA-Controller unsichtbar ist und ein Transfer von dort stumm nichts liefert; der CPU-only-Puffer darf ins CCM (.ccm). littlefs beginnt bei 0x08120000 in Flash-Bank 2; die Firmware liegt in Bank 1 (0x08000000), und das Flash-Werkzeug löscht nur sektorweise den geschriebenen Bereich, nie per Mass-Erase.", bloom: analyze }
socratic:
  - { trigger: "question:place-buffers:weak", question: { en: "The linker script names four memory regions. Which one carries the comment 'NO DMA ACCESS', and what does that rule out?", de: "Das Linkerskript benennt vier Speicherbereiche. Welcher trägt den Kommentar 'NO DMA ACCESS', und was schließt das aus?" }, hints: [ { en: "Look at the MEMORY block near the top of targets/itsboard/linker/cads_itsboard.ld.", de: "Sieh dir den MEMORY-Block oben in targets/itsboard/linker/cads_itsboard.ld an." }, { en: "CCM at 0x10000000 cannot be read by any DMA engine; the framebuffer therefore sits in a .dmaram section inside RAM.", de: "CCM bei 0x10000000 kann von keiner DMA-Einheit gelesen werden; der Framebuffer liegt deshalb in einer .dmaram-Sektion im RAM." }, { en: "FLASH_FS begins at 0x08120000 in bank 2; the firmware in bank 1 is written by st-flash with per-sector erase only.", de: "FLASH_FS beginnt bei 0x08120000 in Bank 2; die Firmware in Bank 1 schreibt st-flash nur mit sektorweisem Löschen." } ] }
---
## Lernziel

Lies die Speicherkarte des STM32F429ZI so, wie der Linker sie sieht, und leite daraus ab, wo ein Puffer liegen muss — die eine Randbedingung, die den größten Teil des Layouts dieser Firmware bestimmt.

## Vier Bereiche, ein Skript

`targets/itsboard/linker/cads_itsboard.ld` deklariert den Speicher, den diese Firmware nutzen darf:

| Bereich | Adresse | Größe | Verwendung |
|---|---|---|---|
| `FLASH_APP` | `0x08000000` | 1024 KB | Bank 1, Sektoren 0–11: die Firmware |
| `FLASH_FS` | `0x08120000` | 896 KB | Bank 2, Sektoren 17–23: das littlefs-Volume |
| `RAM` | `0x20000000` | 192 KB | SRAM1+2+3, zusammenhängend, **DMA-fähig** |
| `CCM` | `0x10000000` | 64 KB | Core-Coupled Memory, **kein DMA-Zugriff** |

Die 128 KB zwischen den beiden Flash-Bereichen (`0x08100000`, Sektoren 12–16) sind reserviert und bleiben gelöscht. Die Sektorgeometrie innerhalb einer Bank ist nicht einheitlich — Sektoren 0–3 haben 16 KB, Sektor 4 hat 64 KB, 5–11 haben 128 KB —, weshalb das Dateisystem nur die 128-KB-Sektoren nutzt: eine konstante Blockgröße.

## Zwei Bänke sind der Grund, warum ein Update sicher ist

Der Flash hat 2 MB in zwei Bänken, und der Baustein beherrscht Read-while-Write über Bänke hinweg. Die Firmware belegt nur Bank 1; das Dateisystem lebt in Bank 2. `scripts/flash.sh` schreibt mit `st-flash write`, das nur den geschriebenen Bereich sektorweise löscht, ein Image über 1 MB verweigert und nie ein Chip-Erase auslöst. Drei unabhängige Prüfungen — der Linker sichert zu, dass das Image in Bank 1 passt, das Skript verweigert zu große Images, und CI schlägt fehl, wenn eine Sektion oberhalb von `0x08100000` landet —, weil ein Überschreiben des Dateisystems lautlos wäre.

## CCM: die Regel, die über die Platzierung entscheidet

**CCM ist für jeden DMA-Controller dieses Bausteins unsichtbar.** Ein Transfer mit Quelle `0x10000000` liefert nichts — kein Fault, kein Fehlerflag, nur falsche Ausgabe. Diese eine Tatsache bestimmt die Aufteilung:

- Alles, was ein Peripheriegerät liest oder schreibt, kommt ausdrücklich nach `.dmaram`, damit die Platzierung im SRAM in der Map-Datei sichtbar ist. Framebuffer und Display-Staging-Puffer liegen dort.
- Alles, was nur die CPU berührt, kommt ins CCM (`.ccm`), wo es nichts Knappes kostet: FreeRTOS-Task-Stacks und der Main-Stack.

Der Header `core/cads_hal.h` stellt `CADS_DMA_SECTION` und `CADS_CCM_SECTION` bereit, damit eine portable Datei den richtigen Bereich anfordern kann, ohne ein Target zu nennen.

## Was übrig bleibt, ist der Heap

Der Linker berechnet `__cads_heap_size` als das RAM, das nach `.data`, `.bss` und `.dmaram` übrig ist, und sichert zu, dass es mindestens 48 KB sind — lwIP und die GUI passen darunter nicht. Eine Änderung, die den Netzwerkstack still verdrängt, scheitert beim Linken statt im Feld. Diesem Boden begegnest du in M4 wieder.

## Deine Aufgabe

Lies den `MEMORY`-Block des Linkerskripts und `docs/reference/memory-map.md`, und beantworte dann die Platzierungsfrage: wohin ein DMA-Puffer gehört, wohin ein CPU-only-Puffer darf, wo littlefs beginnt und warum ein Neuflashen es unberührt lässt.
