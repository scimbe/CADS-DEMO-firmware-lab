---
id: m5-03-own-app
title: Baue deine eigene Menü-App
bloom: create
objectives: [cz.gui.app]
requires: [m5-02-view-dispatcher]
estimatedMinutes: 40
creates: [cads_hello_init]
links:
  - { step: m5-04-dirty-rect-eval }
  - { file: "apps/about/cads_about.c", line: 126 }
  - { file: "apps/menu/cads_menu_app.c", line: 55 }
  - { doc: "docs/reference/canvas.md" }
sources: [apps/about/cads_about.c, apps/about/CMakeLists.txt, apps/menu/cads_menu_app.c, apps/menu/CMakeLists.txt, CMakeLists.txt, apps/bringup/explorer_app_demo.c]
tasks:
  - id: wired-into-menu
    title: Das Menü registriert deine App
    check: { type: fileMatches, file: "apps/menu/cads_menu_app.c", pattern: "cads_hello_init" }
  - id: symbol-exists
    title: Deine Init-Funktion ist in die Firmware gelinkt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_hello_init" }
  - id: builds
    title: Die Firmware baut mit der neuen App
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
socratic:
  - { trigger: "task:builds:failed", question: { en: "A new app is a library the build has to know about in two places. Which CMake file adds the directory, and which one links the library into the menu?", de: "Eine neue App ist eine Bibliothek, von der der Build an zwei Stellen wissen muss. Welche CMake-Datei fügt das Verzeichnis hinzu, und welche linkt die Bibliothek ins Menü?" }, hints: [ { en: "The root CMakeLists.txt add_subdirectory()s each app before apps/menu; apps/menu/CMakeLists.txt target_link_libraries() the app library into cads_app_menu.", de: "Die Wurzel-CMakeLists.txt ruft add_subdirectory() für jede App vor apps/menu auf; apps/menu/CMakeLists.txt linkt die App-Bibliothek per target_link_libraries() in cads_app_menu." }, { en: "Copy apps/about/CMakeLists.txt as your template: one STATIC library, a PUBLIC include dir, linked against cads_gui_view and cads_toolbox.", de: "Nimm apps/about/CMakeLists.txt als Vorlage: eine STATIC-Bibliothek, ein PUBLIC-Include-Verzeichnis, gelinkt gegen cads_gui_view und cads_toolbox." }, { en: "An undefined reference to cads_hello_init at link time means the library was never linked into cads_app_menu; a missing header means the include dir is not PUBLIC.", de: "Ein undefined reference auf cads_hello_init beim Linken heißt, die Bibliothek wurde nie in cads_app_menu gelinkt; ein fehlender Header heißt, das Include-Verzeichnis ist nicht PUBLIC." } ] }
---
## Lernziel

Erschaffe eine vollständige eigene App — eine View mit einem Widget, beim Dispatcher registriert und als Zeile im Hauptmenü erreichbar — und binde sie so in den Build ein, dass sie in der Firmware ausgeliefert wird.

## Die Gestalt einer App

Eine App in diesem Baum ist ein Verzeichnis unter `apps/` mit Header, Quelldatei und CMake-Bibliothek. `apps/about` ist die kleinste vollständige und deine Vorlage. Lies sie parallel zu dieser Anleitung.

**1. Lege `apps/hello/cads_hello.h` an.** Deklariere eine View-Id und eine Init-Funktion. Die vergebenen Ids reichen von `0x0100` (Desktop) bis `0x0C00` (Marauder); wähle eine freie:

```c
#define CADS_VIEW_ID_HELLO 0x0D00u
void cads_hello_init(cads_view_dispatcher_t* dispatcher);
```

**2. Lege `apps/hello/cads_hello.c` an.** Orientiere dich an `cads_about.c`: eine statische Struktur mit einer `cads_view_t` und einem Widget — eine `cads_textbox_t` mit Textpuffer ist der geringste Code, oder zeichne im `draw`-Callback direkt mit dem Canvas (`cads_canvas_fill_rect`, `cads_canvas_draw_text_aligned`). Gib ihr eine Soft-Key-Tabelle mit mindestens `{CadsKeyBack, "Back"}`. Die Init-Funktion ist der entscheidende Teil:

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

Zwei Projektregeln gelten. **Kein `snprintf`** — es zieht newlibs `_sbrk` herein, das das Linker-Skript absichtlich nicht bereitstellt; nutze `cads_str_append()` und `cads_fmt_uint()` aus `cads/toolbox`, wie `about` es tut. Und **zeichne nur, was sich geändert hat**: meldet dein Widget dirty, markiere die View mit `cads_view_dirty_rect()` genau für dieses Rechteck.

**3. Lege `apps/hello/CMakeLists.txt` an**, indem du `apps/about/CMakeLists.txt` kopierst: eine `STATIC`-Bibliothek `cads_app_hello`, `target_include_directories(... PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})`, gelinkt `PUBLIC cads_gui_view cads_toolbox PRIVATE cads_flags`.

**4. Verdrahte den Build.** Füge in der Wurzel-`CMakeLists.txt` neben den anderen Apps `add_subdirectory(apps/hello)` ein, *vor* `add_subdirectory(apps/menu)`. Füge in `apps/menu/CMakeLists.txt` `target_link_libraries(cads_app_menu PRIVATE cads_app_hello)` hinzu. (Die bestehenden Apps stehen hinter `CADS_APP_*`-Optionen; ein bedingungsloses Hinzufügen genügt für diese Übung.)

**5. Verdrahte das Menü.** In `apps/menu/cads_menu_app.c`: binde `../hello/cads_hello.h` ein, ergänze in `cads_menu_app_items[]` eine Zeile `{"Hello", NULL, CADS_VIEW_ID_HELLO}` und rufe in `cads_menu_app_init()` neben den anderen Init-Aufrufen `cads_hello_init(dispatcher);` auf.

## Eine Sache vor dem Bauen prüfen

Die Dispatcher-Tabelle hat 28 Plätze (`CADS_APP_DEMO_VIEW_CAPACITY` in `apps/bringup/explorer_app_demo.c`), und der vollständige App-Baum registriert heute 26 Views, eine weitere passt also. Fügst du je eine zweite View hinzu, denke daran, dass `add()` jenseits der Kapazität *stillschweigend* scheitert — der Host-Test `test_app_tree` ist das, was es fangen würde.

## Deine Aufgabe

Baue die App, führe **CaDS: Build** aus, flashe und öffne auf dem Panel **Menu → Hello**. Die Checks bestätigen, dass das Menü `cads_hello_init` aufruft, dass das Symbol in die ELF gelinkt ist und dass der Build gelingt. Führe auch den Host-Build aus — alles oberhalb der HAL muss für beide Targets kompilieren.
