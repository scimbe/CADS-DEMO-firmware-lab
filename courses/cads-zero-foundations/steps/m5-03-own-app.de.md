---
id: m5-03-own-app
title: Baue deine eigene Menü-App
bloom: apply
objectives: [cz.gui.app]
requires: [m5-02-view-dispatcher]
estimatedMinutes: 40
scaffold: worked
recallFrom: [m5-02-view-dispatcher]
creates: [cads_hello_init]
links:
  - { step: m5-04-dirty-rect-eval }
  - { file: "apps/about/cads_about.c", line: 126 }
  - { file: "apps/menu/cads_menu_app.c", line: 55 }
  - { doc: "docs/reference/canvas.md" }
sources: [apps/about/cads_about.c, apps/about/CMakeLists.txt, apps/menu/cads_menu_app.c, apps/menu/CMakeLists.txt, CMakeLists.txt, apps/bringup/explorer_app_demo.c]
misconceptions:
  - { pattern: "undefined reference to", question: { en: "The compiler accepted the call and the linker did not. Which of the two build steps knows about headers, and which about libraries?", de: "Der Compiler nahm den Aufruf an, der Linker nicht. Welcher der beiden Schritte kennt Header, und welcher Bibliotheken?" }, hints: [ { en: "A header declaration is enough to compile a call; the definition has to be in an object file that is actually linked.", de: "Eine Header-Deklaration genügt, um einen Aufruf zu übersetzen; die Definition muss in einer Objektdatei liegen, die auch gelinkt wird." }, { en: "Two CMake places decide that: add_subdirectory() in the root file and target_link_libraries() in apps/menu.", de: "Zwei CMake-Stellen entscheiden darüber: add_subdirectory() in der Wurzeldatei und target_link_libraries() in apps/menu." }, { en: "Order matters - the subdirectory that defines the library has to be added before the target that links it.", de: "Die Reihenfolge zählt - das Verzeichnis, das die Bibliothek definiert, muss vor dem Target hinzugefügt werden, das sie linkt." } ] }
  - { pattern: "_sbrk", question: { en: "Something in your app pulled in newlib's heap. Which formatting function did you use?", de: "Irgendetwas in deiner App hat newlibs Heap hereingezogen. Welche Formatierungsfunktion hast du benutzt?" }, hints: [ { en: "This linker script deliberately provides no _sbrk, so anything needing a C library heap fails to link on purpose.", de: "Dieses Linker-Skript stellt absichtlich kein _sbrk bereit, alles mit C-Bibliotheks-Heap scheitert also mit Absicht beim Linken." }, { en: "The printf family is the usual culprit; docs/ROADMAP.md records this exact failure twice.", de: "Die printf-Familie ist der übliche Verursacher; docs/ROADMAP.md hält genau diesen Fehlschlag zweimal fest." }, { en: "cads/toolbox has bounded replacements for building strings; apps/about uses them and links cleanly.", de: "cads/toolbox hat begrenzte Ersatzfunktionen zum Bauen von Zeichenketten; apps/about nutzt sie und linkt sauber." } ] }
tasks:
  - id: app-registers
    title: Deine App baut eine View auf und registriert sie
    check: { type: all, bloom: apply, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_hello_init' apps --include=*.c | xargs -r grep -l cads_view_dispatcher_add | xargs -r grep -l cads_view_set_softkeys | grep -q .", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_hello_init" } ] }
  - id: wired-into-menu
    title: Das Menü ruft deine Init-Funktion wirklich auf
    check: { type: command, cwd: ".", command: "grep -nE 'cads_hello_init[[:space:]]*\\([a-z]' apps/menu/cads_menu_app.c", expectExitCode: 0, bloom: apply }
  - id: builds
    title: Die Firmware baut mit der neuen App
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
socratic:
  - { trigger: "task:app-registers:failed", question: { en: "The check wants three things in one file: the definition, a registration and a soft-key table. Which of the three is missing from yours?", de: "Der Check will drei Dinge in einer Datei: die Definition, eine Registrierung und eine Soft-Key-Tabelle. Welches der drei fehlt deiner?" }, hints: [ { en: "An empty function body satisfies the linker but not this check - that is the point of it.", de: "Ein leerer Funktionsrumpf stellt den Linker zufrieden, diesen Check nicht - genau darum geht es." }, { en: "apps/about/cads_about.c does all three in its last five lines; read them as a checklist.", de: "apps/about/cads_about.c erledigt alle drei in seinen letzten fünf Zeilen; lies sie als Checkliste." }, { en: "Soft keys are not decoration here: without a Back entry your view has no documented way out.", de: "Soft-Keys sind hier keine Zierde: ohne einen Back-Eintrag hat deine View keinen dokumentierten Ausgang." } ] }
  - { trigger: "task:wired-into-menu:failed", question: { en: "Where in apps/menu/cads_menu_app.c do the other apps get called, and does your call sit in the same place?", de: "Wo in apps/menu/cads_menu_app.c werden die anderen Apps aufgerufen, und steht dein Aufruf an derselben Stelle?" }, hints: [ { en: "All init calls live together in cads_menu_app_init(); the include belongs at the top of the file.", de: "Alle Init-Aufrufe stehen zusammen in cads_menu_app_init(); der Include gehört an den Kopf der Datei." }, { en: "The check requires a call with an argument, so a mention in a comment or in the include line does not count.", de: "Der Check verlangt einen Aufruf mit Argument, eine Erwähnung im Kommentar oder in der Include-Zeile zählt also nicht." }, { en: "Registering the view and adding the menu row are two separate edits; this check only sees the first of them.", de: "Die View zu registrieren und die Menüzeile zu ergänzen sind zwei getrennte Änderungen; dieser Check sieht nur die erste." } ] }
  - { trigger: "task:builds:failed", question: { en: "A new app is a library the build has to know about in two places. Which CMake file adds the directory, and which one links the library into the menu?", de: "Eine neue App ist eine Bibliothek, von der der Build an zwei Stellen wissen muss. Welche CMake-Datei fügt das Verzeichnis hinzu, und welche linkt die Bibliothek ins Menü?" }, hints: [ { en: "The root CMakeLists.txt add_subdirectory()s each app before apps/menu; apps/menu/CMakeLists.txt links the app library into cads_app_menu.", de: "Die Wurzel-CMakeLists.txt ruft add_subdirectory() für jede App vor apps/menu auf; apps/menu/CMakeLists.txt linkt die App-Bibliothek in cads_app_menu." }, { en: "Copy apps/about/CMakeLists.txt as your template and compare every line of yours against it.", de: "Nimm apps/about/CMakeLists.txt als Vorlage und vergleiche jede Zeile deiner Datei damit." }, { en: "A missing header at compile time and a missing symbol at link time are different faults - read which one the output names before changing anything.", de: "Ein fehlender Header beim Übersetzen und ein fehlendes Symbol beim Linken sind verschiedene Fehler - lies, welchen die Ausgabe nennt, bevor du etwas änderst." } ] }
---
## Lernziel

Erschaffe eine vollständige eigene App — eine View mit einem Widget, beim Dispatcher registriert und als Zeile im Hauptmenü erreichbar — und binde sie so in den Build ein, dass sie in der Firmware ausgeliefert wird.

**Konkret:** drei neue Dateien anlegen, zwei CMake-Dateien und eine Menüdatei ändern, den Task `CaDS: Build` starten, flashen und die neue Zeile auf dem Panel öffnen. Jeder Schritt steht unten mit vollem Bedienweg.

## Dateien anlegen und öffnen

Zum **Anlegen** einer Datei: ganz links in der schmalen Symbolleiste das oberste Symbol (der Datei-Explorer), dann im Baum mit der rechten Maustaste auf den Ordner klicken und `New File...` bzw. `New Folder...` wählen — die Bedienoberfläche ist englisch, der Kurstext deutsch. Genauso geht es im Terminal. Öffne eines mit **☰ → `Terminal` → `New Terminal`** (das Symbol mit den drei Strichen sitzt ganz oben links; ist der Bereich unten zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu):

```bash
mkdir -p apps/hello && touch apps/hello/cads_hello.h apps/hello/cads_hello.c apps/hello/CMakeLists.txt
```

Zum **Öffnen** einer schon vorhandenen Datei: `Strg`/`Cmd`+`P`, den Pfad tippen, Enter. Speichern mit `Strg`/`Cmd`+`S`.

## Die Gestalt einer App

Eine App in diesem Baum ist ein Verzeichnis unter `apps/` mit Header, Quelldatei und CMake-Bibliothek. `apps/about` ist die kleinste vollständige und deine Vorlage. Öffne sie mit `Strg`/`Cmd`+`P` und lies sie parallel zu dieser Anleitung.

**1. `apps/hello/cads_hello.h`.** Deklariere eine View-Id und eine Init-Funktion. Die vergebenen Ids reichen von `0x0100` (Desktop) bis `0x0C00` (Marauder); wähle eine freie:

```c
#define CADS_VIEW_ID_HELLO 0x0D00u
void cads_hello_init(cads_view_dispatcher_t* dispatcher);
```

**2. `apps/hello/cads_hello.c`.** Orientiere dich an `cads_about.c`: eine statische Struktur mit einer `cads_view_t` und einem Widget — eine `cads_textbox_t` mit Textpuffer ist der geringste Code, oder zeichne im `draw`-Callback direkt mit dem Canvas. Gib ihr eine Soft-Key-Tabelle mit mindestens `{CadsKeyBack, "Back"}`. Die Init-Funktion ist der entscheidende Teil:

```c
void cads_hello_init(cads_view_dispatcher_t* dispatcher) {
    if(dispatcher == NULL) return;
    /* ... Widget-Init ... */
    cads_view_init(&s_hello.view, cads_hello_draw, cads_hello_input, &s_hello);
    cads_view_set_lifecycle(&s_hello.view, cads_hello_enter, NULL);
    cads_view_set_title(&s_hello.view, "Hello");
    cads_view_set_softkeys(&s_hello.view, cads_hello_keys, 1u);
    (void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_HELLO, &s_hello.view);
}
```

Zwei Projektregeln gelten. **Kein `snprintf`** — es zieht newlibs `_sbrk` herein, das das Linker-Skript absichtlich nicht bereitstellt; nutze `cads_str_append()` und `cads_fmt_uint()` aus `cads/toolbox`, wie `about` es tut. Und **zeichne nur, was sich geändert hat**: meldet dein Widget dirty, markiere die View mit `cads_view_dirty_rect()` für dieses Rechteck.

**3. `apps/hello/CMakeLists.txt`** entsteht durch Kopieren von `apps/about/CMakeLists.txt`: eine `STATIC`-Bibliothek `cads_app_hello`, `target_include_directories(... PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})`, gelinkt `PUBLIC cads_gui_view cads_toolbox PRIVATE cads_flags`.

**4. Den Build verdrahten.** Öffne die Wurzel-`CMakeLists.txt` mit `Strg`/`Cmd`+`P` und füge neben den anderen Apps `add_subdirectory(apps/hello)` ein, *vor* `add_subdirectory(apps/menu)`. Öffne dann `apps/menu/CMakeLists.txt` und ergänze `target_link_libraries(cads_app_menu PRIVATE cads_app_hello)`.

**5. Das Menü verdrahten.** Öffne `apps/menu/cads_menu_app.c`: binde `../hello/cads_hello.h` ein, ergänze in `cads_menu_app_items[]` eine Zeile `{"Hello", NULL, CADS_VIEW_ID_HELLO}` und rufe in `cads_menu_app_init()` neben den anderen Init-Aufrufen `cads_hello_init(dispatcher);` auf.

## Eine Sache vor dem Bauen prüfen

Die Dispatcher-Tabelle hat 28 Plätze und der App-Baum registriert heute 26 Views, eine weitere passt also; jenseits der Kapazität scheitert `add()` *stillschweigend*. Woher diese Zahlen stammen und was der Host-Test `test_app_tree` damit tut, hast du in `m5-02` verglichen.

## Bauen, Host-Tests, flashen

Starte den Task **`CaDS: Build`**: **`F1`**, dann `Tasks: Run Task` tippen, Enter, dann **`CaDS: Build`** aus der Liste wählen. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**. Unten öffnet sich ein eigenes Terminal mit dem Namen `CaDS: Build`; der erste Lauf dauert etwa eine Minute, spätere Sekunden. Fertig ist er, wenn keine neuen Zeilen mehr kommen und wieder eine Eingabeaufforderung dasteht; Erfolg heißt, die letzte Zeile stammt vom Build-Werkzeug und der Reiter `PROBLEMS` unten bleibt leer.

Alles oberhalb der HAL muss für beide Targets kompilieren, also lauf auch der Host-Build: **`F1`**, `Tasks: Run Task`, Enter, **`CaDS: Host tests`** — oder **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**. Das dauert etwa eine halbe Minute und endet mit der Zusammenfassung von `ctest`.

Zum Flashen: **`F1`**, `Tasks: Run Task`, Enter, **`CaDS: Build + Flash`** — oder **☰ → `Terminal` → `Run Task...` → `CaDS: Build + Flash`**. Das Flashen braucht etwa 15 Sekunden.

![Der Fortschritt beim Flashen als Meldung, waehrend der Task laeuft](flash-progress.png)

## Deine Zeile auf dem Panel öffnen

Öffne die Board-Konsole: **`F1`**, dann `CaDS Board: Konsole öffnen` tippen, Enter. Tippe dort `d` und Enter — das startet den App-Baum auf dem Panel; ab da überhört das Board einzeln getippte Buchstaben. Navigiert wird aus einem Terminal (**☰ → `Terminal` → `New Terminal`**):

```bash
python3 scripts/board_key.py ok
```

Das öffnet vom Desktop aus das Menü. Dann so oft `down`, bis `Hello` markiert ist, und `ok`:

```bash
python3 scripts/board_key.py down ok
```

Das Skript druckt je Taste eine Zeile `| sent: <taste>`. Zurück zum Konsolen-Prompt:

```bash
python3 scripts/board_key.py quit
```

<!-- SHOT: m5-hello-app-panel | Die eigene Hello-App offen auf dem Panel, mit ihrem Titel und der Back-Softkey-Zelle | HARDWARE -->

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin — mitten im Build heißt das, der Build ist abgebrochen. Zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Bau die App nach den fünf Punkten oben, lass `CaDS: Build` und `CaDS: Host tests` durchlaufen, flashe und öffne die Zeile auf dem Panel. Die Checks bestätigen, dass das Menü `cads_hello_init` aufruft, dass das Symbol in die ELF gelinkt ist und dass der Build gelingt — einzeln mit **Prüfen** an der Aufgabe, alle mit **Run all checks** oben im Steptext.
