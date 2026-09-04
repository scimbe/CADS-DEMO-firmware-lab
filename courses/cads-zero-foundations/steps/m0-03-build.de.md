---
id: m0-03-build
title: Beide Targets bauen
bloom: apply
objectives: [firmware-how-to-build]
requires: [m0-02-connect]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-04-flash-console }
  - { doc: "docs/how-to/build.md" }
  - { file: "scripts/build.sh", line: 13 }
sources: [docs/how-to/build.md, docs/tutorials/first-build.md, CMakePresets.json, docs/explanation/toolchain.md]
tasks:
  - id: build-firmware
    title: Die Firmware baut für das Board
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: has-main
    title: Der Build hat eine echte ELF erzeugt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
  - id: host-build
    title: Derselbe Code baut für den Simulator
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
socratic:
  - { trigger: "task:build-firmware:failed", question: { en: "A build first looks for a compiler, then for every header. Which of the two searches failed in your output?", de: "Ein Build sucht zuerst einen Compiler und dann jede Header-Datei. Welche der beiden Suchen ist in deiner Ausgabe fehlgeschlagen?" }, hints: [ { en: "The first build usually fails on something the build cannot find — the compiler or a header — not on a typo in the code.", de: "Der erste Build scheitert meist an etwas, das er nicht findet — dem Compiler oder einem Header —, nicht an einem Tippfehler im Code." }, { en: "The terminal the task ran in opens at the bottom of the window; scroll up in it to the FIRST red line. The last line only says that it stopped, not why.", de: "Das Terminal, in dem der Task lief, klappt unten im Fenster auf; scroll darin nach oben zur ERSTEN roten Zeile. Die letzte Zeile sagt nur, dass abgebrochen wurde, nicht warum." }, { en: "A message naming a header file points at lib/; a message naming CMAKE_C_COMPILER points at the Arm toolchain. Both are environment problems, not code problems.", de: "Eine Meldung, die eine Header-Datei nennt, zeigt auf lib/; eine Meldung über CMAKE_C_COMPILER zeigt auf die Arm-Toolchain. Beides sind Umgebungsprobleme, keine Codeprobleme." } ] }
  - { trigger: "task:has-main:failed", question: { en: "This check reads a file that the board build writes. Does that file exist yet?", de: "Dieser Check liest eine Datei, die der Board-Build schreibt. Gibt es diese Datei überhaupt schon?" }, hints: [ { en: "Usually the symbol is not missing — the ELF was never produced, so the board build did not run or stopped earlier.", de: "Meistens fehlt nicht das Symbol, sondern die ELF ist nie entstanden — der Board-Build lief also gar nicht oder brach vorher ab." }, { en: "Open the file explorer on the left with Ctrl/Cmd+Shift+E and look for build/itsboard/cads-zero.elf. If the folder is empty, the previous task is the one to finish first.", de: "Öffne links den Datei-Explorer mit Strg/Cmd+Shift+E und sieh nach build/itsboard/cads-zero.elf. Ist der Ordner leer, gehört zuerst die vorige Aufgabe erledigt." }, { en: "The host build does not produce this file; its results go to build/host/. Only the itsboard preset writes build/itsboard/.", de: "Der Host-Build erzeugt diese Datei nicht; seine Ergebnisse landen in build/host/. Nur das Preset itsboard schreibt nach build/itsboard/." } ] }
  - { trigger: "task:host-build:failed", question: { en: "This task builds and then runs tests. Which of the two stages does your output stop at?", de: "Diese Aufgabe baut und führt danach Tests aus. Bei welcher der beiden Stufen bleibt deine Ausgabe stehen?" }, hints: [ { en: "If the board build worked and this one does not, the Arm toolchain is not the suspect — the host build uses your system's own compiler.", de: "Wenn der Board-Build lief und dieser nicht, ist die Arm-Toolchain nicht der Verdächtige — der Host-Build nimmt den Compiler deines eigenen Systems." }, { en: "Start it by hand without the keyboard: ☰ at the top left, then Terminal, then Run Task..., then pick CaDS: Host tests; the end of the output states how many tests passed and how many failed.", de: "Starte ihn von Hand ohne Tastatur: ☰ oben links, dann Terminal, dann Run Task..., dann CaDS: Host tests wählen; am Ende der Ausgabe steht, wie viele Tests bestanden und wie viele fehlgeschlagen sind." }, { en: "Golden-image tests are deliberately excluded from this task, so a failure here names a real unit test. Read the failing test's name — it points straight at the source file to open.", de: "Golden-Image-Tests sind aus dieser Aufgabe absichtlich ausgeschlossen; ein Fehlschlag nennt hier also einen echten Unit-Test. Lies dessen Namen — er zeigt direkt auf die Quelldatei, die du öffnen solltest." } ] }
---
## Lernziel

Erzeuge beide Bauergebnisse aus einem Quellbaum: das echte Firmware-Image für das Board und den Host-Build, auf dem Simulator und Unit-Tests laufen.

## Handgriff 1: den Board-Build starten

Es gibt im Fenster keinen Knopf mit der Aufschrift `CaDS: Build`. Ein **Task** ist ein fertig hinterlegter Befehl mit einem Namen; du startest ihn über seinen Namen. Drei Wege führen zum selben Ergebnis, nimm einen:

- **Über den Tutor:** scroll in diesem Steptext nach unten zur Aufgabe *Die Firmware baut für das Board* und drücke **Prüfen**. Der Tutor startet den Task selbst und wertet seinen Rückgabewert aus.
- **Über die Befehlspalette:** **`F1`** drücken (das Tastenkürzel `Strg`/`Cmd`+`Umschalt`+`P` tut dasselbe, wird im Browser aber oft abgefangen), dann tippen:

```
Tasks: Run Task
```

`Enter`, dann aus der Liste `CaDS: Build` wählen.

- **Ohne Tastatur:** Es gibt keine sichtbare Menüleiste; die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links. Klick darauf, dann **`Terminal`**, dann **`Run Task...`**, dann `CaDS: Build`.

![Das Menü hinter dem Drei-Striche-Symbol, Terminal aufgeklappt, mit New Terminal und Run Task](menu-run-task.png)

![Die Liste aller Tasks des Projekts, von CaDS: Build bis CaDS: RAM budget](task-picker.png)

**Was du dabei siehst:** unten klappt der Terminal-Bereich auf, und der Task bekommt **sein eigenes Terminal, das seinen Namen trägt**. Dort scrollen die Zeilen des Compilers durch. `Strg`/`Cmd`+`J` klappt den Bereich auf und zu; rechts stehen alle offenen Terminals untereinander.

**Wie lange:** beim ersten Mal etwa eine Minute, danach nur Sekunden, weil nur Geändertes neu übersetzt wird.

**Woran du Erfolg erkennst:** keine roten Zeilen, am Ende der Größenbericht des Linkers (unten erklärt), und wieder eine Eingabeaufforderung. Der Check der Aufgabe wird grün.

<!-- SHOT: build-terminal-size-report | Das Terminal des Tasks CaDS: Build am Ende eines erfolgreichen Laufs, mit der Tabelle Memory region / Used Size / Region Size und ohne Fehlerzeilen -->

## Handgriff 2: den Host-Build starten

Derselbe Weg, anderer Name: **`F1`** → `Tasks: Run Task` → `Enter` → aus der Liste

```
CaDS: Host tests
```

Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**. Oder über den Tutor: **Prüfen** an der dritten Aufgabe.

Auch dieser Task bekommt sein eigenes Terminal unten. Er baut erst und führt danach die Tests aus, dauert beim ersten Mal deshalb länger als der Board-Build. Fertig ist er, wenn keine neuen Zeilen mehr kommen; die letzten Zeilen nennen, wie viele Tests bestanden und wie viele fehlgeschlagen sind.

## Drei Bedienfehler an dieser Stelle

- **Der Task lief, aber du suchst seine Ausgabe im falschen Fenster.** Sie steht *nicht* in diesem Steptext und *nicht* im Editor, sondern unten im Terminal mit dem Namen des Tasks. `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts wählst du das richtige Terminal.
- **Du hast das Terminal geschlossen und damit den Build abgebrochen.** Das Kreuz am Terminal beendet den Prozess darin — mitten in der Minute heißt das: nichts fertig, keine ELF. Zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt den Build weiterlaufen.
- **Das Tastenkürzel für die Palette tut nichts.** Der Browser hat es abgefangen. Nimm `F1` oder den Weg über **☰**.

## Zwei Presets, ein Baum

CaDS Zero baut mit CMake und Ninja. `CMakePresets.json` definiert zwei Configure-Presets. Ein *Preset* ist eine benannte, fertig eingestellte Bau-Konfiguration: statt ein Dutzend Optionen zu tippen, nennst du ihren Namen.

- **itsboard** — **cross-kompiliert** für den STM32F429 mit `arm-none-eabi-gcc`. *Cross-kompilieren* heißt: auf einem Rechner Code für einen anderen Prozessortyp erzeugen. Die **Artefakte** — die Dateien, die ein Build hinterlässt — landen in `build/itsboard/`: `cads-zero.elf` (Programm samt Symbol- und Debug-Informationen), `.bin` und `.hex` (die reinen Bytes für den Flash), `cads-zero.map` (welche Funktion wo liegt).
- **host** — baut mit dem Compiler deines Systems den SDL2-**Simulator** (bildet das Board auf dem Bildschirm nach) und die **Unit-Tests**: automatische Prüfungen einzelner Funktionen. Eine Arm-Toolchain braucht dieser Weg nicht.

Die Regel, auf der das Projekt ruht: **alles oberhalb der HAL baut für beide Targets.** *HAL* steht für Hardware Abstraction Layer, die dünne Schicht Code, die als Einzige die Register des Chips anfasst; alles darüber weiß nichts von der Hardware und läuft deshalb auch im Simulator. Genauer wird das in M1. Ein Feature, das nur für eines der beiden Targets kompiliert, ist nicht fertig.

Den Compiler installierst du nicht: der Container trägt `arm-none-eabi-gcc` 13.3.1 schon, `scripts/cads_env.sh` löst ihn auf (`docs/explanation/toolchain.md`).

## Den Größenbericht lesen

Jeder Firmware-Link druckt einen Speicherbericht. *Linken* ist der letzte Schritt eines Builds: der **Linker** setzt die übersetzten Teile zu einem Speicherabbild zusammen und gibt jedem Stück seine Adresse.

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` muss bei 0 bleiben — alles dort kollidiert mit **littlefs**, dem Dateisystem in Flash-Bank 2. Der Linker sichert außerdem 48 KB **Heap** zu, den Bereich, aus dem sich ein Programm zur Laufzeit Platz holt; darunter passen lwIP und GUI nicht. Ein Build, der eine dieser Regeln bricht, linkt gar nicht erst.

## Wenn der Build abbricht

Lies im Terminal die **erste** rote Zeile, nicht die letzte: die letzte sagt nur, dass abgebrochen wurde. Zwei Meldungen sind die häufigsten, und keine davon liegt an deinem Code. `fatal error: ... No such file or directory` nennt eine Header-Datei, die aus `lib/` kommt — ist einer der Ordner dort leer, wurde der Arbeitsbereich nicht vollständig angelegt; sag im Labor Bescheid und nenne den leeren Ordner. `is not a full path and was not found in the PATH` kommt schon beim Konfigurieren und meint den Cross-Compiler, nicht deinen Quelltext; der Host-Build läuft in diesem Fall trotzdem durch.

## Deine Aufgabe

Lass beide Builds laufen, den für das Board (`CaDS: Build`) und den für den Host (`CaDS: Host tests`), jeweils auf einem der drei Wege oben. Die Checks bestätigen, dass beide gelingen und dass der Board-Build eine ELF mit `main` erzeugt hat. Der nächste Step bringt dieses Image auf echtes Silizium.
