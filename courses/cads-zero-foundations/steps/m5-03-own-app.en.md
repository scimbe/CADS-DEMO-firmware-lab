---
id: m5-03-own-app
title: Build your own menu app
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
    title: Your app builds a view and registers it
    check: { type: all, bloom: apply, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_hello_init' apps --include=*.c | xargs -r grep -l cads_view_dispatcher_add | xargs -r grep -l cads_view_set_softkeys | grep -q .", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_hello_init" } ] }
  - id: wired-into-menu
    title: The menu really calls your init function
    check: { type: command, cwd: ".", command: "grep -nE 'cads_hello_init[[:space:]]*\\([a-z]' apps/menu/cads_menu_app.c", expectExitCode: 0, bloom: apply }
  - id: builds
    title: The firmware builds with the new app
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, bloom: apply }
socratic:
  - { trigger: "task:app-registers:failed", question: { en: "The check wants three things in one file: the definition, a registration and a soft-key table. Which of the three is missing from yours?", de: "Der Check will drei Dinge in einer Datei: die Definition, eine Registrierung und eine Soft-Key-Tabelle. Welches der drei fehlt deiner?" }, hints: [ { en: "An empty function body satisfies the linker but not this check - that is the point of it.", de: "Ein leerer Funktionsrumpf stellt den Linker zufrieden, diesen Check nicht - genau darum geht es." }, { en: "apps/about/cads_about.c does all three in its last five lines; read them as a checklist.", de: "apps/about/cads_about.c erledigt alle drei in seinen letzten fünf Zeilen; lies sie als Checkliste." }, { en: "Soft keys are not decoration here: without a Back entry your view has no documented way out.", de: "Soft-Keys sind hier keine Zierde: ohne einen Back-Eintrag hat deine View keinen dokumentierten Ausgang." } ] }
  - { trigger: "task:wired-into-menu:failed", question: { en: "Where in apps/menu/cads_menu_app.c do the other apps get called, and does your call sit in the same place?", de: "Wo in apps/menu/cads_menu_app.c werden die anderen Apps aufgerufen, und steht dein Aufruf an derselben Stelle?" }, hints: [ { en: "All init calls live together in cads_menu_app_init(); the include belongs at the top of the file.", de: "Alle Init-Aufrufe stehen zusammen in cads_menu_app_init(); der Include gehört an den Kopf der Datei." }, { en: "The check requires a call with an argument, so a mention in a comment or in the include line does not count.", de: "Der Check verlangt einen Aufruf mit Argument, eine Erwähnung im Kommentar oder in der Include-Zeile zählt also nicht." }, { en: "Registering the view and adding the menu row are two separate edits; this check only sees the first of them.", de: "Die View zu registrieren und die Menüzeile zu ergänzen sind zwei getrennte Änderungen; dieser Check sieht nur die erste." } ] }
  - { trigger: "task:builds:failed", question: { en: "A new app is a library the build has to know about in two places. Which CMake file adds the directory, and which one links the library into the menu?", de: "Eine neue App ist eine Bibliothek, von der der Build an zwei Stellen wissen muss. Welche CMake-Datei fügt das Verzeichnis hinzu, und welche linkt die Bibliothek ins Menü?" }, hints: [ { en: "The root CMakeLists.txt add_subdirectory()s each app before apps/menu; apps/menu/CMakeLists.txt links the app library into cads_app_menu.", de: "Die Wurzel-CMakeLists.txt ruft add_subdirectory() für jede App vor apps/menu auf; apps/menu/CMakeLists.txt linkt die App-Bibliothek in cads_app_menu." }, { en: "Copy apps/about/CMakeLists.txt as your template and compare every line of yours against it.", de: "Nimm apps/about/CMakeLists.txt als Vorlage und vergleiche jede Zeile deiner Datei damit." }, { en: "A missing header at compile time and a missing symbol at link time are different faults - read which one the output names before changing anything.", de: "Ein fehlender Header beim Übersetzen und ein fehlendes Symbol beim Linken sind verschiedene Fehler - lies, welchen die Ausgabe nennt, bevor du etwas änderst." } ] }
---
## Learning goal

Create a complete app of your own — a view with a widget, registered with the dispatcher and reachable as a row in the main menu — and wire it into the build so it ships in the firmware.

**Concretely:** create three new files, change two CMake files and one menu file, run the task `CaDS: Build`, flash, and open the new row on the panel. Each step is spelled out below with its full operating path.

## Creating and opening files

To **create** a file: the top icon in the narrow bar on the far left (the file explorer), then right-click the folder in the tree and pick `New File...` or `New Folder...` — the user interface is in English while this course is in German. The terminal does the same. Open one with **☰ → `Terminal` → `New Terminal`** (the three-line icon sits at the very top left; if the area at the bottom is folded away, `Ctrl`/`Cmd`+`J` opens and closes it):

```bash
mkdir -p apps/hello && touch apps/hello/cads_hello.h apps/hello/cads_hello.c apps/hello/CMakeLists.txt
```

To **open** a file that already exists: `Ctrl`/`Cmd`+`P`, type the path, Enter. Save with `Ctrl`/`Cmd`+`S`.

## The shape of an app

An app in this tree is a directory under `apps/` with a header, a source file and a CMake library. `apps/about` is the smallest complete one and your template. Open it with `Ctrl`/`Cmd`+`P` and read it alongside these instructions.

**1. `apps/hello/cads_hello.h`.** Declare a view id and an init function. The ids in use run from `0x0100` (desktop) to `0x0C00` (Marauder); pick a free one:

```c
#define CADS_VIEW_ID_HELLO 0x0D00u
void cads_hello_init(cads_view_dispatcher_t* dispatcher);
```

**2. `apps/hello/cads_hello.c`.** Follow `cads_about.c`: a static struct holding a `cads_view_t` and a widget — a `cads_textbox_t` with a text buffer is the least code, or draw straight onto the canvas in the `draw` callback. Give it a soft-key table with at least `{CadsKeyBack, "Back"}`. The init function is the decisive part:

```c
void cads_hello_init(cads_view_dispatcher_t* dispatcher) {
    if(dispatcher == NULL) return;
    /* ... widget init ... */
    cads_view_init(&s_hello.view, cads_hello_draw, cads_hello_input, &s_hello);
    cads_view_set_lifecycle(&s_hello.view, cads_hello_enter, NULL);
    cads_view_set_title(&s_hello.view, "Hello");
    cads_view_set_softkeys(&s_hello.view, cads_hello_keys, 1u);
    (void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_HELLO, &s_hello.view);
}
```

Two project rules apply. **No `snprintf`** — it pulls in newlib's `_sbrk`, which the linker script deliberately does not provide; use `cads_str_append()` and `cads_fmt_uint()` from `cads/toolbox`, as `about` does. And **draw only what changed**: when your widget reports dirty, mark the view with `cads_view_dirty_rect()` for that rectangle.

**3. `apps/hello/CMakeLists.txt`** comes from copying `apps/about/CMakeLists.txt`: a `STATIC` library `cads_app_hello`, `target_include_directories(... PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})`, linked `PUBLIC cads_gui_view cads_toolbox PRIVATE cads_flags`.

**4. Wire the build.** Open the root `CMakeLists.txt` with `Ctrl`/`Cmd`+`P` and add `add_subdirectory(apps/hello)` beside the other apps, *before* `add_subdirectory(apps/menu)`. Then open `apps/menu/CMakeLists.txt` and add `target_link_libraries(cads_app_menu PRIVATE cads_app_hello)`.

**5. Wire the menu.** Open `apps/menu/cads_menu_app.c`: include `../hello/cads_hello.h`, add a row `{"Hello", NULL, CADS_VIEW_ID_HELLO}` to `cads_menu_app_items[]`, and call `cads_hello_init(dispatcher);` in `cads_menu_app_init()` beside the other init calls.

## One thing to check before building

The dispatcher table has 28 slots and the app tree registers 26 views today, so one more fits; past the capacity `add()` fails *silently*. Where those numbers come from, and what the host test `test_app_tree` does about it, you compared in `m5-02`.

## Build, host tests, flash

Start the task **`CaDS: Build`**: press **`F1`**, type `Tasks: Run Task`, press Enter, then pick **`CaDS: Build`** from the list. Without the keyboard: **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**. A terminal of its own named `CaDS: Build` opens at the bottom; the first run takes about a minute, later ones seconds. It is finished when no new lines appear and a prompt is back; it worked when the last line is the build tool's and the `PROBLEMS` tab at the bottom stays empty.

Everything above the HAL has to compile for both targets, so run the host build too: **`F1`**, `Tasks: Run Task`, Enter, **`CaDS: Host tests`** — or **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**. That takes about half a minute and ends with the `ctest` summary.

To flash: **`F1`**, `Tasks: Run Task`, Enter, **`CaDS: Build + Flash`** — or **☰ → `Terminal` → `Run Task...` → `CaDS: Build + Flash`**. The flash takes about 15 seconds.

![The flash progress shown as a notification while the task runs](flash-progress.png)

## Opening your row on the panel

Open the board console: press **`F1`**, type `CaDS Board: Konsole öffnen`, press Enter. Type `d` there and press Enter — that starts the app tree on the panel; from then on the board ignores single typed letters. Navigation happens from a terminal (**☰ → `Terminal` → `New Terminal`**):

```bash
python3 scripts/board_key.py ok
```

That opens the menu from the desktop. Then as many `down` presses as it takes for `Hello` to be selected, and `ok`:

```bash
python3 scripts/board_key.py down ok
```

The script prints one `| sent: <key>` line per key. Back to the console prompt:

```bash
python3 scripts/board_key.py quit
```

<!-- SHOT: m5-hello-app-panel | Die eigene Hello-App offen auf dem Panel, mit ihrem Titel und der Back-Softkey-Zelle | HARDWARE -->

## Three operating mistakes almost everyone makes here

- **The task ran, but you are looking for its output in the wrong window.** It is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it — in the middle of a build that means the build was aborted. Use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

## Your task

Build the app following the five points above, let `CaDS: Build` and `CaDS: Host tests` run through, flash, and open the row on the panel. The checks confirm that the menu calls `cads_hello_init`, that the symbol is linked into the ELF, and that the build succeeds — one at a time with **Prüfen** on the task, all of them with **Run all checks** at the top of the step text.
