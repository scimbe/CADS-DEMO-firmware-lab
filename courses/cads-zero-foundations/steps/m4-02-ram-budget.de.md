---
id: m4-02-ram-budget
title: Das RAM-Budget und die 48-KB-Untergrenze
bloom: apply
objectives: [cz.rtos.ram-budget]
requires: [m4-01-freertos-tasks]
estimatedMinutes: 15
links:
  - { step: m4-03-mutex-spi-bus }
  - { file: "scripts/check_ram_budget.py", line: 1 }
  - { file: "targets/itsboard/linker/cads_itsboard.ld", line: 157 }
  - { doc: "docs/reference/measurements.md" }
  - { doc: "docs/how-to/build.md" }
sources: [scripts/check_ram_budget.py, targets/itsboard/linker/cads_itsboard.ld, docs/reference/measurements.md, docs/reference/memory-map.md]
tasks:
  - id: build-report
    title: Erzeuge den Größenbericht
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: floor-vs-budget
    title: Unterscheide Untergrenze und Budget
    check: { type: question, prompt: { en: "The linker script asserts __cads_heap_size >= 48K, and scripts/check_ram_budget.py also reads __cads_heap_size. What does each one guard, and why was the second one added when the first already exists?", de: "Das Linkerskript sichert __cads_heap_size >= 48K zu, und scripts/check_ram_budget.py liest ebenfalls __cads_heap_size. Was sichert jedes der beiden ab, und warum wurde das zweite ergänzt, obwohl das erste schon existiert?" }, rubric: "Der Linker-ASSERT ist eine harte Untergrenze: unter 48 KB passen lwIP und GUI nicht, der Link scheitert. check_ram_budget.py liest dasselbe Symbol per nm und scheitert, wenn die Marge ÜBER der Grenze unter --min-margin-bytes (Standard 256 B) liegt; es existiert, weil das Projekt die Grenze mehrfach mit exakt null Byte Spielraum traf und das nur von Hand bemerkte - eine Grenze, die ein Build besteht oder nicht, ist kein Budget, das warnt, solange noch Raum zum Reparieren ist.", bloom: analyze }
socratic:
  - { trigger: "task:build-report:failed", question: { en: "Does the link error mention heap? If so, which 48 KB rule tripped, and what did your last change add to SRAM?", de: "Erwähnt der Linkfehler den Heap? Wenn ja, welche 48-KB-Regel hat ausgelöst, und was hat deine letzte Änderung dem SRAM hinzugefügt?" }, hints: [ { en: "Read the --print-memory-usage table: RAM used vs 192 KB; the heap is what is left.", de: "Lies die Tabelle von --print-memory-usage: RAM belegt gegen 192 KB; der Heap ist der Rest." }, { en: "Static buffers (.bss/.dmaram) are the usual culprit; task stacks are in CCM and do not count here.", de: "Statische Puffer (.bss/.dmaram) sind der übliche Grund; Task-Stacks liegen im CCM und zählen hier nicht." }, { en: "Offset a RAM-hungry change with a cut, or move CPU-only state into CCM via CADS_CCM_SECTION.", de: "Gleiche eine RAM-hungrige Änderung durch einen Abbau aus oder verlege CPU-only-Zustand per CADS_CCM_SECTION ins CCM." } ] }
---
## Lernziel

Lies das RAM-Budget der Firmware korrekt: was die 48-KB-Untergrenze des Linkers absichert, was die Margenprüfung obendrauf leistet und warum die Marge das gesamte Sicherheitsnetz ist.

## Es gibt keinen Heap — und genau das ist der Punkt

FreeRTOS allokiert nichts (M4-01), und nirgends wird `malloc` benutzt. Was der Linker „Heap" nennt, ist schlicht **das verbleibende SRAM**, nachdem `.data`, `.bss` und `.dmaram` platziert sind. `targets/itsboard/linker/cads_itsboard.ld` füllt den Bereich absichtlich nicht mit einer Sektion, damit `--print-memory-usage` eine aussagekräftige Zahl statt dauerhaft 100 % meldet:

```
__cads_heap_start = .;                      /* nach .dmaram */
__cads_heap_end   = ORIGIN(RAM) + LENGTH(RAM);
__cads_heap_size  = __cads_heap_end - __cads_heap_start;

ASSERT(__cads_heap_size >= 48K,
       "Less than 48K of heap left in SRAM - lwIP and the GUI will not fit")
```

Unter 48 KB passen die Pools des Netzwerkstacks und die GUI nicht, also **scheitert der Link**, statt dass das Board im Feld versagt. Das ist eine Untergrenze: ein Build besteht sie oder nicht.

## Warum eine Untergrenze kein Budget ist

`docs/reference/measurements.md` hält die Marge über dieser Grenze fest: 416 B nach den drei Arcade-Spielen (vorher 928 B), und das Projektlog zeigt, dass die Grenze mehrfach mit *exakt null Byte Spielraum* getroffen wurde — jedes Mal nur von einem Menschen bemerkt, der hinterher Bytes zählte. Ein Build, der lediglich linkt, lässt keinen Raum für das nächste Feature.

`scripts/check_ram_budget.py` schließt diese Lücke. Es liest `__cads_heap_size` per `nm` aus der gebauten ELF — genau das Symbol, das der ASSERT berechnet, keine Neuableitung aus Sektionsgrößen, die abdriften könnte — und scheitert, wenn die Marge über 48 KB dünner ist als `--min-margin-bytes`, Standard **256 B**, die kleinste Marge, die das Projekt je als real akzeptierte. CI führt es direkt nach dem Größenbericht aus; du kannst es selbst starten:

```bash
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf --min-margin-bytes 512
```

## Wohin das SRAM geht

Grob: 75 KB Framebuffer (480×320 bei 4 bpp), 30 KB RGB565-Staging, die Pools von lwIP und Statika. Task-Stacks stecken **nicht** in dieser Zahl — sie liegen im CCM (M4-01), weshalb die zwei Stack-Korrekturen in M4-05 dieses Budget keinen Byte kosteten. Eine RAM-hungrige Änderung an irgendetwas im SRAM braucht einen ausgleichenden Abbau, keinen hoffnungsvollen Build.

## Deine Aufgabe

Führe den Board-Build aus und lies die Tabelle, die `--print-memory-usage` druckt. Beantworte dann die Frage, die Linker-Untergrenze und Margenbudget unterscheidet.
