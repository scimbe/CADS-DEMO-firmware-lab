---
id: m4-02-ram-budget
title: Das RAM-Budget und die 48-KB-Untergrenze
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
    title: Erzeuge den Größenbericht
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: margin-predict
    title: Sage die Marge voraus, dann miss sie
    check: { type: predict, prompt: { en: "Before running the budget check: how many bytes of margin above the 48 KB floor do you expect, and why?", de: "Bevor die Budgetprüfung läuft: wie viele Byte Marge über der 48-KB-Grenze erwartest du, und woraus?" }, then: { type: command, cwd: ".", command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf", expectExitCode: 0 }, rubric: "Die Vorhersage nennt eine Zahl und eine nachvollziehbare Herleitung - etwa aus der in docs/reference/measurements.md protokollierten Marge, aus der RAM-Zeile des Größenberichts (192 KB minus belegt) oder aus einem früheren Lauf. Sie muss nicht treffen: bestanden ist, wer nach dem Vergleich benennt, wie weit er danebenlag und woran das liegt (ein anderer Stand des Repositorys, andere aktivierte Module, eine andere Toolchain-Version). Eine Vorhersage ohne Herleitung oder eine nachträglich an die Ausgabe angepasste Zahl zählt nicht.", bloom: analyze }
  - id: what-trips
    title: Entscheide, welche Prüfung zuerst anschlägt
    check: { type: question, prompt: { en: "Your margin is M. A feature adds 700 B of static SRAM. Which of the two checks trips?", de: "Deine Marge ist M. Ein Feature belegt 700 B mehr SRAM. Welche der beiden Prüfungen schlägt an?" }, rubric: "Die Antwort rechnet mit der eigenen, im vorigen Task gemessenen Marge M und vergleicht M - 700 gegen zwei verschiedene Schwellen. Der ASSERT im Linkerskript schlägt erst an, wenn M - 700 kleiner als null wird, der Heap also unter 48 KB fällt: bei einer dreistelligen Restmarge linkt der Build weiterhin. check_ram_budget.py schlägt schon an, wenn M - 700 unter --min-margin-bytes liegt, Standard 256 B. Bei einer Marge um 900 B trifft also die zweite Prüfung und die erste nicht - genau der Fall, für den das Skript existiert. Eine Antwort ohne eigene Zahl oder ohne beide Schwellen ist unvollständig.", bloom: analyze }
misconceptions:
  - { pattern: "FAIL: only", question: { en: "The script failed but the build linked. Are those two the same threshold, or two different ones?", de: "Das Skript schlug fehl, der Build linkte aber. Sind das dieselbe Schwelle oder zwei verschiedene?" }, hints: [ { en: "Did the linker complain as well, or only the script that ran after it?", de: "Hat der Linker ebenfalls gemeckert, oder nur das Skript, das danach lief?" }, { en: "Read the last lines the script printed: it names the heap size, the floor and the margin as three separate numbers.", de: "Lies die letzten Zeilen, die das Skript gedruckt hat: es nennt Heap-Größe, Grenze und Marge als drei getrennte Zahlen." }, { en: "A build that still links but has run out of budget is the exact situation this script was written to catch - it is a warning with room to act, not a broken build.", de: "Ein Build, der noch linkt, aber sein Budget aufgebraucht hat, ist genau die Lage, für die dieses Skript geschrieben wurde - eine Warnung mit Handlungsspielraum, kein kaputter Build." } ] }
  - { pattern: "Less than 48K of heap left in SRAM", question: { en: "The link itself refused. Which memory region is exhausted, and which one is definitely not?", de: "Der Link selbst hat abgelehnt. Welcher Speicherbereich ist erschöpft, und welcher sicher nicht?" }, hints: [ { en: "Does the message talk about SRAM or about CCM - and where do your task stacks live?", de: "Spricht die Meldung von SRAM oder von CCM - und wo liegen deine Task-Stacks?" }, { en: "Read the --print-memory-usage table from the build: it shows RAM used against 192 KB, and the heap is the remainder.", de: "Lies die Tabelle von --print-memory-usage aus dem Bau: sie zeigt belegtes RAM gegen 192 KB, und der Heap ist der Rest." }, { en: "The usual culprit is a static buffer in .bss or .dmaram, not a stack - moving CPU-only state to CCM is one of the established levers.", de: "Der übliche Grund ist ein statischer Puffer in .bss oder .dmaram, kein Stack - CPU-only-Zustand ins CCM zu verlegen ist einer der etablierten Hebel." } ] }
socratic:
  - { trigger: "task:build-report:failed", question: { en: "Does the error come from the compiler or from a linker ASSERT, and does it name a memory region?", de: "Kommt der Fehler vom Compiler oder von einem Linker-ASSERT, und nennt er einen Speicherbereich?" }, hints: [ { en: "Compiler errors name a file and a line; an ASSERT names a rule in prose - which kind is yours?", de: "Compilerfehler nennen Datei und Zeile; ein ASSERT nennt eine Regel im Klartext - welche Art ist deiner?" }, { en: "Open targets/itsboard/linker/cads_itsboard.ld and read the two ASSERT statements; each one guards a different region.", de: "Öffne targets/itsboard/linker/cads_itsboard.ld und lies die beiden ASSERT-Anweisungen; jede bewacht einen anderen Bereich." }, { en: "Whatever your last change added, it has to come back out of the same region - a build cannot be talked into fitting.", de: "Was deine letzte Änderung hinzugefügt hat, muss aus demselben Bereich wieder heraus - ein Build lässt sich nicht überreden zu passen." } ] }
  - { trigger: "task:margin-predict:failed", question: { en: "Did the script find an ELF at all, and is that ELF the one your last build produced?", de: "Hat das Skript überhaupt eine ELF gefunden, und ist es die aus deinem letzten Bau?" }, hints: [ { en: "A script that cannot find its input fails differently from one that found it and disliked the number - which message did you get?", de: "Ein Skript, das seine Eingabe nicht findet, scheitert anders als eines, das sie fand und die Zahl nicht mochte - welche Meldung hast du bekommen?" }, { en: "Run the CaDS: Build task first, then check that build/itsboard/cads-zero.elf exists before running the check again.", de: "Führe zuerst den Task CaDS: Build aus und prüfe dann, dass build/itsboard/cads-zero.elf existiert, bevor du den Check erneut startest." }, { en: "The script reads one symbol out of the ELF with nm; if that symbol is missing, it is the linker script that changed, not the script.", de: "Das Skript liest per nm ein einziges Symbol aus der ELF; fehlt dieses Symbol, hat sich das Linkerskript geändert, nicht das Skript." } ] }
  - { trigger: "question:what-trips:weak", question: { en: "How far above zero is your margin, and how far above 256 - are those the same distance?", de: "Wie weit über null liegt deine Marge, und wie weit über 256 - sind das dieselben Abstände?" }, hints: [ { en: "Are you comparing the new margin against one threshold or against two different ones?", de: "Vergleichst du die neue Marge gegen eine Schwelle oder gegen zwei verschiedene?" }, { en: "The linker's rule is in the ASSERT in cads_itsboard.ld; the script's rule is the --min-margin-bytes option in scripts/check_ram_budget.py.", de: "Die Regel des Linkers steht im ASSERT in cads_itsboard.ld; die Regel des Skripts ist die Option --min-margin-bytes in scripts/check_ram_budget.py." }, { en: "One of the two thresholds sits at the floor itself, the other a few hundred bytes above it - which one does 700 B of new SRAM reach first?", de: "Eine der beiden Schwellen liegt auf der Grenze selbst, die andere ein paar hundert Byte darüber - welche erreichen 700 B neues SRAM zuerst?" } ] }
---
## Lernziel

Lies das RAM-Budget der Firmware korrekt: was die 48-KB-Untergrenze des Linkers absichert, was die Margenprüfung obendrauf leistet und warum die Marge das gesamte Sicherheitsnetz ist.

## Es gibt keinen Heap — und genau das ist der Punkt

FreeRTOS allokiert nichts (M4-01), und nirgends wird `malloc` benutzt. Was der Linker „Heap“ nennt, ist schlicht **das verbleibende SRAM**, nachdem `.data`, `.bss` und `.dmaram` platziert sind. `targets/itsboard/linker/cads_itsboard.ld` füllt den Bereich absichtlich nicht mit einer Sektion, damit `--print-memory-usage` eine aussagekräftige Zahl statt dauerhaft 100 % meldet:

```
__cads_heap_start = .;                      /* nach .dmaram */
__cads_heap_end   = ORIGIN(RAM) + LENGTH(RAM);
__cads_heap_size  = __cads_heap_end - __cads_heap_start;

ASSERT(__cads_heap_size >= 48K,
       "Less than 48K of heap left in SRAM - lwIP and the GUI will not fit")
```

Unter 48 KB passen die Pools des Netzwerkstacks und die GUI nicht, also **scheitert der Link**, statt dass das Board im Feld versagt. Das ist eine Untergrenze: ein Build besteht sie oder nicht.

## Warum eine Untergrenze kein Budget ist

Eine Untergrenze kennt genau zwei Zustände. Sie sagt dir nichts über den Abstand, den du noch hast — und das Projektlog zeigt, dass die Grenze mehrfach mit *exakt null Byte Spielraum* getroffen wurde, jedes Mal nur von einem Menschen bemerkt, der hinterher Bytes zählte. Ein Build, der lediglich linkt, lässt keinen Raum für das nächste Feature. `docs/reference/measurements.md` führt die Marge deshalb als eigene, protokollierte Kennzahl mit; sieh dort nach, bevor du sie vorhersagst.

`scripts/check_ram_budget.py` schließt die Lücke maschinell. Es liest `__cads_heap_size` per `nm` aus der gebauten ELF — genau das Symbol, das der ASSERT berechnet, keine Neuableitung aus Sektionsgrößen, die abdriften könnte — und scheitert, wenn die Marge über 48 KB dünner ist als `--min-margin-bytes`, Standard **256 B**, die kleinste Marge, die das Projekt je als real akzeptierte. Es druckt drei Zahlen: Heap-Größe, Grenze und Marge. CI führt es direkt nach dem Größenbericht aus; du kannst es selbst starten:

```bash
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf
python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf --min-margin-bytes 512
```

Damit hast du **zwei** Schwellen, nicht eine: die Grenze bei 48 KB, an der der Link scheitert, und die Marge darüber, an der das Budget warnt, solange noch Raum zum Reparieren ist. Welche von beiden eine Änderung zuerst erreicht, ist die interessante Frage — und deine dritte Aufgabe.

## Wohin das SRAM geht

Grob: 75 KB Framebuffer (480×320 bei 4 bpp), 30 KB RGB565-Staging, die Pools von lwIP und Statika. Task-Stacks stecken **nicht** in dieser Zahl — sie liegen im CCM (M4-01), weshalb die zwei Stack-Korrekturen aus M3-04 dieses Budget keinen Byte kosteten. Eine RAM-hungrige Änderung an irgendetwas im SRAM braucht einen ausgleichenden Abbau, keinen hoffnungsvollen Build.

## Deine Aufgabe

Führe den Board-Build aus und lies die Tabelle, die `--print-memory-usage` druckt. Sag dann voraus, welche Marge `check_ram_budget.py` melden wird, und lass den Check nachmessen. Entscheide zuletzt mit deiner gemessenen Marge, welche der beiden Prüfungen ein 700 B großes neues Feature zuerst erreicht.
