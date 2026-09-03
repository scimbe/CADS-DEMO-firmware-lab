---
id: m1-02-hal-boundary
title: Die HAL-Grenze
bloom: understand
objectives: [firmware-reference-hal]
requires: [m1-01-module-layout]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m1-03-sim-vs-board }
  - { doc: "docs/reference/hal.md" }
  - { file: "core/cads_hal.h", line: 57 }
  - { doc: "docs/reference/memory-map.md" }
sources: [docs/reference/hal.md, core/cads_hal.h, docs/reference/memory-map.md]
tasks:
  - id: read-header
    title: Du hast die drei Stellen im HAL-Header aufgeschlagen
    check: { type: command, cwd: ".", command: "grep -nE 'CADS_DMA_SECTION|display_readable|no FIFO' core/cads_hal.h", expectExitCode: 0 }
  - id: ccm-and-readable
    title: Entscheide, welcher Puffer ins CCM darf
    check: { type: question, prompt: { en: "The framebuffer and the console ring buffer are both to move into CCM. For which of the two is that safe?", de: "Der Framebuffer und der Konsolen-Ringpuffer sollen beide ins CCM wandern. Für welchen der beiden ist das gefahrlos?" }, rubric: "Nur für den Konsolen-Ringpuffer. Ihn füllt die Empfangs-Unterbrechungsroutine der USART, also die CPU selbst, und die CPU erreicht das CCM ohne Einschränkung. Der Framebuffer ist dagegen die Quelle eines DMA-Transfers, und DMA sieht das CCM auf diesem Chip nicht: der Transfer erzeugt dann nichts, ohne Fault und ohne Fehlerflag. Entscheidend ist also, wer den Puffer liest — CPU oder DMA. Wer beide erlaubt oder beide verbietet, hat dieses Kriterium nicht angewandt.", bloom: understand }
  - id: readable-widget
    title: Diagnostiziere einen Unterschied zwischen Simulator und Board
    check: { type: question, prompt: { en: "A widget draws correctly in the simulator and wrongly on the board, from the same object code. Which assumption in the widget explains that?", de: "Ein Widget zeichnet im Simulator richtig und auf dem Board falsch, aus demselben Objektcode. Welche Annahme im Widget erklärt das?" }, rubric: "Das Widget liest den Bildschirminhalt zurück, statt eine eigene Kopie zu führen — ein Lesen, Ändern und Zurückschreiben auf Videospeicher. Im Simulator ist display_readable true und der Rückweg existiert, auf dem ITSboard ist das Feld false und es gibt keinen; was zurückkommt, ist dort kein Bildinhalt. Richtig ist, den Descriptor zu fragen und den eigenen Puffer im RAM als einzige Wahrheit zu behandeln. Wer nur auf unterschiedliche Hardware verweist, hat das Feld nicht benannt.", bloom: understand }
socratic:
  - { trigger: "task:read-header:failed", question: { en: "The check reads one file in the firmware root. Is the path in the output the one you expected?", de: "Der Check liest eine einzige Datei im Wurzelverzeichnis der Firmware. Ist der Pfad in der Ausgabe der, den du erwartet hast?" }, hints: [ { en: "Nothing here depends on your editing anything: the check fails when it runs outside the firmware root or the header has been moved.", de: "Nichts hier hängt davon ab, dass du etwas änderst: der Check scheitert, wenn er außerhalb des Firmware-Wurzelverzeichnisses läuft oder der Header verschoben wurde." }, { en: "Open the file by hand with Ctrl/Cmd+P and type cads_hal.h; it lives in core/, next to cads_version.h.", de: "Öffne die Datei von Hand mit Strg/Cmd+P und tippe cads_hal.h; sie liegt in core/, neben cads_version.h." }, { en: "The three search terms are the three places this step is about: the memory-placement macros, the descriptor field for readability, and the sentence about the USART receive register.", de: "Die drei Suchbegriffe sind die drei Stellen, um die es in diesem Step geht: die Makros zur Speicherplatzierung, das Descriptor-Feld zur Lesbarkeit und der Satz über das Empfangsregister der USART." } ] }
  - { trigger: "question:ccm-and-readable:weak", question: { en: "For each of the two buffers, name who reads it: the processor itself, or the copying engine beside it?", de: "Nenne für jeden der beiden Puffer, wer ihn liest: der Prozessor selbst oder das Kopierwerk daneben?" }, hints: [ { en: "The commonest wrong turn is to treat CCM as simply forbidden. It is not — the header offers CADS_CCM_SECTION on purpose, for a particular kind of user.", de: "Der häufigste Irrweg ist, das CCM für schlicht verboten zu halten. Ist es nicht — der Header bietet CADS_CCM_SECTION mit Absicht an, für eine bestimmte Sorte Nutzer." }, { en: "Search core/cads_hal.h for CADS_CCM_SECTION with Ctrl/Cmd+F and read the comment above the two macros; it names the criterion in one half-sentence.", de: "Suche in core/cads_hal.h mit Strg/Cmd+F nach CADS_CCM_SECTION und lies den Kommentar über den beiden Makros; er nennt das Kriterium in einem Halbsatz." }, { en: "The console path in this step is described as interrupt-driven. An interrupt handler runs on the processor — that already settles one of the two cases.", de: "Der Konsolenpfad heißt in diesem Step interruptgetrieben. Eine Unterbrechungsroutine läuft auf dem Prozessor — damit ist einer der beiden Fälle schon entschieden." } ] }
  - { trigger: "question:readable-widget:weak", question: { en: "Which single field of the board descriptor has different values in the two worlds, and what does a widget do differently when it is true?", de: "Welches einzelne Feld des Board-Descriptors hat in den beiden Welten verschiedene Werte, und was macht ein Widget anders, wenn es true ist?" }, hints: [ { en: "The bug is not in the drawing arithmetic; the same object code produces it. Look for something the widget asks the hardware for instead of remembering it.", de: "Der Fehler steckt nicht in der Zeichenrechnung; derselbe Objektcode erzeugt ihn. Such nach etwas, das das Widget bei der Hardware erfragt, statt es sich zu merken." }, { en: "Open core/cads_hal.h at the cads_board_info_t struct (Ctrl/Cmd+P, then Ctrl/Cmd+F for board_info) and read the comment on each bool field.", de: "Öffne core/cads_hal.h bei der Struktur cads_board_info_t (Strg/Cmd+P, dann Strg/Cmd+F nach board_info) und lies den Kommentar an jedem bool-Feld." }, { en: "On this shield the display bus is write-only. A routine that first reads a pixel back therefore gets something on one target and nothing usable on the other.", de: "Auf diesem Shield ist der Displaybus nur beschreibbar. Eine Routine, die einen Bildpunkt erst zurückliest, bekommt auf dem einen Target etwas und auf dem anderen nichts Brauchbares." } ] }
---
## Lernziel

Kenne den einen Header, der portablen Code von Hardware trennt, und die zwei Verträge darin, die am leichtesten brechen.

## Wo du liest

`core/cads_hal.h` öffnest du mit `Strg`/`Cmd`+`P` und dem getippten Namen `cads_hal.h`. Die erste Aufgabe unten in diesem Panel (Knopf **Prüfen**) sucht drei Stellen in genau dieser Datei und gibt ihre Zeilennummern aus. Spring im Editor nacheinander dorthin — mit `Strg`/`Cmd`+`G` und der Nummer —, dann hast du die drei Absätze gelesen, um die es hier geht.

## Ein Header, zwei Implementierungen

`core/cads_hal.h` ist die gesamte Grenze zwischen Firmware und Silizium. Alles darüber kompiliert unverändert für das Board und für den Host-Simulator. Zwei Implementierungen existieren: `targets/itsboard/hal/` gegen STM32F429-Register und `targets/sim/hal_sim.c` gegen SDL2. Diese schmale Oberfläche macht den Simulator ehrlich — was sich hier nicht ausdrücken lässt, kann nicht stillschweigend nur in einer der beiden Welten funktionieren.

Der Header gruppiert rund vierzig Funktionen: Lebenszyklus (`cads_hal_early_init`, `cads_hal_init`), Zeit, Konsole, Display, Touch, Adapter-I/O, Board-LEDs, Panic, Watchdog und Reset-Ursache sowie den Hardware-Zufallsgenerator. Die Zeit ist dabei aus dem **DWT-Zykluszähler** abgeleitet — einem Zähler in der Debug-Einheit des Kerns, der jeden Prozessortakt mitzählt — und nicht aus einem regelmäßigen Unterbrechungssignal. Deshalb stimmt sie auch in einem **kritischen Abschnitt**, also in einem Codestück, für dessen Dauer Unterbrechungen gesperrt sind.

## Frag den Descriptor, statt anzunehmen

`cads_hal_board_info()` liefert ein `cads_board_info_t` — einen **Descriptor**: eine Struktur, die Eigenschaften des Boards als Datenfelder ausliefert, statt sie im Code zu verstecken. Die Schichten darüber stellen ihm Fragen, statt zu prüfen, auf welchem Board sie laufen: `has_network`, `has_touch`, `button_count`, `display_width`.

Die Makros `CADS_DISPLAY_WIDTH`/`HEIGHT` existieren nur, damit das Canvas seinen statischen **Framebuffer** zur **Linkzeit** dimensionieren kann. Ein Framebuffer ist der Speicherbereich im RAM, in dem das Bild vollständig steht, bevor es zum Panel geht; Linkzeit ist der Moment, in dem der Linker die Adressen vergibt — also lange vor dem ersten Programmstart. Layout-Code nutzt dagegen den Descriptor. Zwei seiner Felder wiegen am schwersten:

- **`display_readable`** ist auf dem ITSboard `false`: der Bus hat keinen Rückweg, nichts kann Videospeicher zurücklesen. Der Simulator setzt `true`, weil eine SDL-Oberfläche lesbar ist.
- **`display_pixels_per_second`** ist gemessen (342 000), nicht gerechnet. Eine GUI, die entscheidet, ob eine Animation bezahlbar ist, soll nachschlagen.

## Die zwei Verträge, die beißen

`cads_hal_display_blit()` übergibt ein Rechteck **RGB565**-Pixel an DMA und kehrt sofort zurück. Ein **Blit** ist das Kopieren eines rechteckigen Bildausschnitts von einem Speicher in einen anderen; *RGB565* ist das Pixelformat des Panels: sechzehn Bit je Bildpunkt, aufgeteilt in Rot, Grün und Blau. **DMA** (Direct Memory Access) ist ein Kopierwerk neben der CPU: es holt die Bytes selbst aus dem Speicher, während der Prozessor weiterrechnet.

- `pixels` muss gültig bleiben, bis `cads_hal_display_busy()` false meldet.
- Auf Hardware **muss der Puffer in DMA-fähigem SRAM liegen, nie im CCM**. CCM bei `0x10000000` ist für jeden DMA-Controller dieses Chips unsichtbar; ein Transfer von dort erzeugt nichts — kein Fault, kein Fehlerflag, nur falsche Ausgabe. Der Header stellt dafür `CADS_DMA_SECTION` bereit: es legt einen Puffer in die **Linker-Sektion** `.dmaram`, also in eine benannte Schublade des Speicherplans, der der Linker eine feste Region zuweist — hier garantiert im SRAM und in der Map-Datei nachlesbar. `CADS_CCM_SECTION` ist das Gegenstück für Dinge, die nur die CPU anfasst, etwa Task-Stacks.

Der Konsolen-Empfangspfad ist der andere Vertrag: interruptgetrieben mit **Ringpuffer**. Ein Ringpuffer ist ein Feld fester Größe, das vorn wieder anfängt, wenn es hinten voll ist, und so einen Strom von Bytes zwischen Schreiber und Leser puffert; man nennt ihn auch **FIFO**, first in, first out. Nötig ist er, weil die STM32F4-USART ein Ein-Byte-Empfangsregister und keinen eigenen FIFO im Baustein hat. Bei 115200 Baud landet alle 87 µs ein Byte, und jede langsamere Abfrageschleife verliert Zeichen. Gefüllt wird der Ringpuffer von der Empfangs-Unterbrechungsroutine, also von der CPU selbst. Die zwei Zähler `cads_hal_console_dropped()` und `cads_hal_console_overruns()` existieren, damit solcher Verlust nie wieder stumm bleibt — er trat einmal als Displayfehler auf.

## Deine Aufgabe

1. Drücke bei der ersten Aufgabe **Prüfen** und lies die drei ausgegebenen Stellen in `core/cads_hal.h` nach.
2. Entscheide dann, welcher der beiden genannten Puffer ins CCM darf, und begründe es.
3. Diagnostiziere zuletzt das Widget, das nur auf einer der beiden Seiten richtig zeichnet.

Der nächste Step zeigt, was die Grenze einbringt: derselbe Code läuft ohne angeschlossenes Board.
