---
id: m1-02-hal-boundary
title: Die HAL-Grenze
bloom: understand
objectives: [firmware-reference-hal]
requires: [m1-01-module-layout]
estimatedMinutes: 15
links:
  - { step: m1-03-sim-vs-board }
  - { doc: "docs/reference/hal.md" }
  - { file: "core/cads_hal.h", line: 57 }
sources: [docs/reference/hal.md, core/cads_hal.h, docs/reference/memory-map.md]
tasks:
  - id: read-header
    title: Du hast den HAL-Header von oben bis unten gelesen
    check: { type: manual }
  - id: ccm-and-readable
    title: Zwei Verträge, die leicht zu brechen sind
    check: { type: question, prompt: { en: "Why must a buffer handed to cads_hal_display_blit() never live in CCM on this board, and what does the board descriptor's display_readable being false force every widget to do?", de: "Warum darf ein Puffer, der an cads_hal_display_blit() übergeben wird, auf diesem Board nie im CCM liegen, und wozu zwingt display_readable = false im Board-Descriptor jedes Widget?" }, rubric: "Nennt, dass CCM bei 0x10000000 für jeden DMA-Controller des STM32F4 unsichtbar ist, ein Transfer von dort also stillschweigend nichts erzeugt (kein Fault, kein Fehlerflag), daher die .dmaram-Sektion im SRAM; und dass display_readable=false bedeutet, das Panel kann nicht zurückgelesen werden, der RAM-Framebuffer ist die einzige Wahrheit, Widgets müssen eine eigene Kopie halten statt Read-Modify-Write auf Videospeicher.", bloom: understand }
socratic:
  - { trigger: "question:ccm-and-readable:weak", question: { en: "The HAL header says a DMA transfer from CCM 'silently produces nothing'. What is the linker section that guarantees the framebuffer avoids that?", de: "Der HAL-Header sagt, ein DMA-Transfer aus dem CCM 'erzeugt stillschweigend nichts'. Welche Linker-Sektion garantiert, dass der Framebuffer das vermeidet?" }, hints: [ { en: "Search core/cads_hal.h for CADS_DMA_SECTION.", de: "Suche in core/cads_hal.h nach CADS_DMA_SECTION." }, { en: "docs/reference/memory-map.md: SRAM at 0x20000000 is DMA-capable, CCM at 0x10000000 is not.", de: "docs/reference/memory-map.md: SRAM bei 0x20000000 ist DMA-fähig, CCM bei 0x10000000 nicht." }, { en: "display_readable is false because the shield's 74HC4094 shift-register chain has no return path.", de: "display_readable ist false, weil die 74HC4094-Schieberegisterkette des Shields keinen Rückweg hat." } ] }
---
## Lernziel

Kenne den einen Header, der portablen Code von Hardware trennt, und die zwei Verträge darin, die am leichtesten brechen.

## Ein Header, zwei Implementierungen

`core/cads_hal.h` ist die gesamte Grenze zwischen Firmware und Silizium. Alles darüber kompiliert unverändert für das Board und für den Host-Simulator. Zwei Implementierungen existieren: `targets/itsboard/hal/` gegen STM32F429-Register und `targets/sim/hal_sim.c` gegen SDL2. Diese schmale Oberfläche macht den Simulator ehrlich — was sich hier nicht ausdrücken lässt, kann nicht stillschweigend nur in einer der beiden Welten funktionieren.

Der Header gruppiert rund vierzig Funktionen: Lebenszyklus (`cads_hal_early_init`, `cads_hal_init`), Zeit (aus dem DWT-Zykluszähler abgeleitet, nicht aus einem Tick-Interrupt, also auch in kritischen Abschnitten korrekt), Konsole, Display, Touch, Adapter-I/O, Board-LEDs, Panic, Watchdog und Reset-Ursache sowie den Hardware-RNG.

## Frag den Descriptor, statt anzunehmen

`cads_hal_board_info()` liefert ein `cads_board_info_t`. Die Schichten darüber stellen ihm Fragen, statt zu prüfen, auf welchem Board sie laufen: `has_network`, `has_touch`, `button_count`, `display_width`. Die Makros `CADS_DISPLAY_WIDTH`/`HEIGHT` existieren nur, damit das Canvas seinen statischen Framebuffer zur Linkzeit dimensionieren kann; Layout-Code nutzt den Descriptor. Zwei Felder wiegen am schwersten:

- **`display_readable`** ist auf dem ITSboard `false`: der Bus hat keinen Rückweg, nichts kann Videospeicher zurücklesen. Der RAM-Framebuffer ist die einzige Wahrheit darüber, was auf dem Schirm ist. Der Simulator setzt `true`, weil eine SDL-Oberfläche lesbar ist.
- **`display_pixels_per_second`** ist gemessen (342 000), nicht gerechnet. Eine GUI, die entscheidet, ob eine Animation bezahlbar ist, soll nachschlagen.

## Die zwei Verträge, die beißen

`cads_hal_display_blit()` übergibt ein Rechteck RGB565-Pixel an DMA und kehrt sofort zurück:

- `pixels` muss gültig bleiben, bis `cads_hal_display_busy()` false meldet.
- Auf Hardware **muss der Puffer in DMA-fähigem SRAM liegen, nie im CCM**. CCM bei `0x10000000` ist für jeden DMA-Controller dieses Chips unsichtbar; ein Transfer von dort erzeugt nichts — kein Fault, kein Fehlerflag, nur falsche Ausgabe. Der Header stellt `CADS_DMA_SECTION` (die `.dmaram`-Sektion des Linkers) bereit, damit die Platzierung garantiert und in der Map-Datei sichtbar ist, und `CADS_CCM_SECTION` für Dinge, die nur die CPU anfasst, etwa Task-Stacks.

Der Konsolen-Empfangspfad ist der andere: interruptgetrieben mit Ringpuffer, weil die STM32F4-USART ein Ein-Byte-Empfangsregister und kein FIFO hat. Bei 115200 Baud landet alle 87 µs ein Byte, und jede langsamere Polling-Schleife verliert Zeichen. Die zwei Zähler `cads_hal_console_dropped()` und `cads_hal_console_overruns()` existieren, damit solcher Verlust nie wieder stumm bleibt — er trat einmal als Displayfehler auf.

## Deine Aufgabe

Lies `core/cads_hal.h` einmal von oben bis unten und erkläre die beiden Verträge oben in eigenen Worten. Der nächste Step zeigt, was die Grenze einbringt: derselbe Code läuft ohne angeschlossenes Board.
