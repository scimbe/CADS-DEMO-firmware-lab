---
id: m2-01-memory-map
title: Die Speicherkarte lesen
bloom: analyze
objectives: [firmware-reference-memory-map]
requires: [m2-00-mmio-primer]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-00-mmio-primer]
links:
  - { step: m2-02-mmio-gpio }
  - { doc: "docs/reference/memory-map.md" }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 23 }
sources: [docs/reference/memory-map.md, targets/itsboard/linker/cads_itsboard.ld, docs/SAFETY.md]
tasks:
  - id: predict-region
    title: Sage voraus, wo ein DMA-Puffer liegen muss
    check: { type: predict, prompt: { en: "A buffer that a DMA controller fills: which of the four regions must it live in?", de: "Ein Puffer, den ein DMA-Controller füllt: in welchem der vier Bereiche muss er liegen?" }, then: { type: command, cwd: ".", command: "grep -n -A6 'MEMORY' targets/itsboard/linker/cads_itsboard.ld", expectExitCode: 0 }, rubric: "Die Vorhersage nennt RAM bei 0x20000000 und begründet sie damit, dass das CCM für DMA nicht erreichbar ist. Eine falsche Vorhersage zählt als bestanden, wenn der Vergleich mit dem MEMORY-Block danach benannt wird.", bloom: analyze }
  - id: silent-zeros
    title: Erkläre einen Treiber, der nur Nullen misst
    check: { type: question, prompt: { en: "A driver puts its DMA receive buffer in .ccm and reads only zeroes, with no fault. Why?", de: "Ein Treiber legt seinen DMA-Empfangspuffer nach .ccm und liest nur Nullen, ohne Fault. Warum?" }, rubric: "Kein DMA-Controller dieses Bausteins erreicht das CCM bei 0x10000000; der Transfer läuft ins Leere, ohne Fehlerflag und ohne Fault, weil kein Bus den Zugriff meldet. Der Puffer gehört in eine .dmaram-Sektion im SRAM ab 0x20000000. Die Antwort muss das stille Scheitern als Kern nennen, nicht nur die falsche Adresse.", bloom: analyze }
  - id: flash-window
    title: Leite ab, warum ein Neuflashen das Dateisystem verschont
    check: { type: question, prompt: { en: "st-flash writes a 300 KB image at 0x08000000. Which two facts keep the filesystem intact?", de: "st-flash schreibt ein 300-KB-Image ab 0x08000000. Welche zwei Tatsachen lassen das Dateisystem unberührt?" }, rubric: "Erstens liegt das Image vollständig in Bank 1 und endet weit vor 0x08100000, das Dateisystem beginnt erst bei 0x08120000 in Bank 2. Zweitens löscht das Werkzeug nur die Sektoren, die es beschreibt, und löst nie ein Chip-Erase aus. Beide Tatsachen zusammen sind nötig; eine allein genügt nicht.", bloom: analyze }
socratic:
  - { trigger: "task:predict-region:stuck", question: { en: "Four regions, and one of them carries a warning in the linker script. Which one?", de: "Vier Bereiche, und einer trägt eine Warnung im Linkerskript. Welcher?" }, hints: [ { en: "Open targets/itsboard/linker/cads_itsboard.ld with Ctrl/Cmd+P and read the MEMORY block at the top.", de: "Öffne targets/itsboard/linker/cads_itsboard.ld mit Strg/Cmd+P und lies den MEMORY-Block ganz oben." }, { en: "One region's comment rules out a whole class of user. Which class, and what does that leave?", de: "Der Kommentar eines Bereichs schließt eine ganze Nutzerklasse aus. Welche, und was bleibt dann übrig?" }, { en: "Write down a region even if you are unsure — this task is about the comparison afterwards.", de: "Schreib einen Bereich hin, auch wenn du unsicher bist — diese Aufgabe lebt vom Vergleich danach." } ] }
  - { trigger: "question:silent-zeros:weak", question: { en: "You named the wrong address. Now the harder half: why is there no fault, no error flag, nothing?", de: "Du hast die falsche Adresse benannt. Jetzt die schwerere Hälfte: warum gibt es keinen Fault, kein Fehlerflag, nichts?" }, hints: [ { en: "A fault is reported by whoever notices the access. Who would have to notice here, and does that path exist?", de: "Einen Fault meldet, wer den Zugriff bemerkt. Wer müsste ihn hier bemerken, und gibt es diesen Weg überhaupt?" }, { en: "The section 'CCM: die Regel, die über die Platzierung entscheidet' names the consequence in one line.", de: "Der Abschnitt „CCM: die Regel, die über die Platzierung entscheidet“ nennt die Folge in einer Zeile." }, { en: "This is why the project marks DMA buffers explicitly instead of relying on a crash to find them.", de: "Genau deshalb markiert das Projekt DMA-Puffer ausdrücklich, statt sich auf einen Absturz zu verlassen, der sie findet." } ] }
  - { trigger: "question:flash-window:weak", question: { en: "You named one fact. Would it still hold if the tool erased the whole chip before writing?", de: "Du hast eine Tatsache genannt. Gälte sie auch, wenn das Werkzeug vor dem Schreiben den ganzen Chip löschte?" }, hints: [ { en: "Two independent things must be true: where the image lands, and how the tool clears space for it.", de: "Zwei unabhängige Dinge müssen zutreffen: wo das Image landet, und wie das Werkzeug Platz dafür schafft." }, { en: "Compare the FLASH_APP and FLASH_FS rows of the table with the size of the image.", de: "Vergleich die Zeilen FLASH_APP und FLASH_FS der Tabelle mit der Größe des Images." }, { en: "docs/SAFETY.md states which flash operations are forbidden outright; that is the second half.", de: "docs/SAFETY.md nennt die rundweg verbotenen Flash-Operationen; das ist die zweite Hälfte." } ] }
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

Der Flash hat 2 MB in zwei Bänken, und der Baustein beherrscht Read-while-Write über Bänke hinweg: die CPU kann weiter aus einer Bank ausführen, während die andere gelöscht oder programmiert wird. Die Firmware belegt nur Bank 1; das Dateisystem lebt in Bank 2. Geschrieben wird mit `scripts/flash.sh`; welche Flash-Operationen dabei erlaubt und welche rundweg verboten sind, steht in `docs/SAFETY.md`, und du brauchst das für die dritte Aufgabe. Drei unabhängige Prüfungen wachen darüber — der Linker sichert zu, dass das Image in Bank 1 passt, das Skript verweigert zu große Images, und CI schlägt fehl, wenn eine Sektion oberhalb von `0x08100000` landet —, weil ein Überschreiben des Dateisystems lautlos wäre.

## CCM: die Regel, die über die Platzierung entscheidet

**CCM ist für jeden DMA-Controller dieses Bausteins unsichtbar.** Es hängt am Datenbus des Rechenkerns, nicht an der Bus-Matrix, über die die DMA-Einheiten laufen — die Verbindung fehlt schlicht. Diese eine Tatsache bestimmt die Aufteilung:

- Alles, was ein Peripheriegerät liest oder schreibt, kommt ausdrücklich nach `.dmaram`, damit die Platzierung im SRAM in der Map-Datei sichtbar ist. Framebuffer und Display-Staging-Puffer liegen dort.
- Alles, was nur die CPU berührt, kommt ins CCM (`.ccm`), wo es nichts Knappes kostet: FreeRTOS-Task-Stacks und der Main-Stack.

Der Header `core/cads_hal.h` stellt `CADS_DMA_SECTION` und `CADS_CCM_SECTION` bereit, damit eine portable Datei den richtigen Bereich anfordern kann, ohne ein Target zu nennen.

## Was übrig bleibt, ist der Heap

Der Linker berechnet `__cads_heap_size` als das RAM, das nach `.data`, `.bss` und `.dmaram` übrig ist, und sichert zu, dass es mindestens 48 KB sind — lwIP und die GUI passen darunter nicht. Eine Änderung, die den Netzwerkstack still verdrängt, scheitert beim Linken statt im Feld. Diesem Boden begegnest du in M4 wieder.

## Deine Aufgabe

Drei Aufgaben, jede für sich. Erst sagst du voraus, in welchem Bereich ein DMA-Puffer liegen muss, und vergleichst deine Vorhersage mit dem `MEMORY`-Block des Linkerskripts. Dann erklärst du, warum ein falsch platzierter Puffer *stumm* scheitert statt laut. Zuletzt leitest du aus der Tabelle oben und aus `docs/SAFETY.md` ab, welche zwei Tatsachen zusammen das Dateisystem vor einem Neuflashen schützen.

Die Datei öffnest du mit `Strg`/`Cmd`+`P` und dem getippten Dateinamen; geprüft wird über den Knopf **Prüfen** an der jeweiligen Aufgabe.
