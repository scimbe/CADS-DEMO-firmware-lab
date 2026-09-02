---
id: m5-03-own-app
title: Build your own menu app
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
    title: The menu registers your app
    check: { type: fileMatches, file: "apps/menu/cads_menu_app.c", pattern: "cads_hello_init" }
  - id: symbol-exists
    title: Your init function is linked into the firmware
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_hello_init" }
  - id: builds
    title: The firmware builds with the new app
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
socratic:
  - { trigger: "task:builds:failed", question: { en: "A new app is a library the build has to know about in two places. Which CMake file adds the directory, and which one links the library into the menu?", de: "Eine neue App ist eine Bibliothek, von der der Build an zwei Stellen wissen muss. Welche CMake-Datei fügt das Verzeichnis hinzu, und welche linkt die Bibliothek ins Menü?" }, hints: [ { en: "The root CMakeLists.txt add_subdirectory()s each app before apps/menu; apps/menu/CMakeLists.txt target_link_libraries() the app library into cads_app_menu.", de: "Die Wurzel-CMakeLists.txt ruft add_subdirectory() für jede App vor apps/menu auf; apps/menu/CMakeLists.txt linkt die App-Bibliothek per target_link_libraries() in cads_app_menu." }, { en: "Copy apps/about/CMakeLists.txt as your template: one STATIC library, a PUBLIC include dir, linked against cads_gui_view and cads_toolbox.", de: "Nimm apps/about/CMakeLists.txt als Vorlage: eine STATIC-Bibliothek, ein PUBLIC-Include-Verzeichnis, gelinkt gegen cads_gui_view und cads_toolbox." }, { en: "An undefined reference to cads_hello_init at link time means the library was never linked into cads_app_menu; a missing header means the include dir is not PUBLIC.", de: "Ein undefined reference auf cads_hello_init beim Linken heißt, die Bibliothek wurde nie in cads_app_menu gelinkt; ein fehlender Header heißt, das Include-Verzeichnis ist nicht PUBLIC." } ] }
---
## Learning goal

Create a complete app of your own — a view with a widget, registered with the dispatcher and reachable as a row in the main menu — and wire it into the build so it ships in the firmware.

## The shape of an app

An app in this tree is a directory under `apps/` with a header, a source file and a CMake library. `apps/about` is the smallest complete one and your template. Read it side by side with these instructions.

**1. Create `apps/hello/cads_hello.h`.** Declare a view id and one init function. Ids in use run from `0x0100` (desktop) to `0x0C00` (Marauder); pick a free one:

```c
#define CADS_VIEW_ID_HELLO 0x0D00u
void cads_hello_init(cads_view_dispatcher_t* dispatcher);
```

**2. Create `apps/hello/cads_hello.c`.** Model it on `cads_about.c`: a static struct holding a `cads_view_t` and a widget — a `cads_textbox_t` with a text buffer is the least code, or draw with the canvas directly in your `draw` callback (`cads_canvas_fill_rect`, `cads_canvas_draw_text_aligned`). Give it a soft-key table with at least `{CadsKeyBack, "Back"}`. The init function is the part that matters:

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

Two project rules apply. **No `snprintf`** — it pulls in newlib's `_sbrk`, which the linker script deliberately does not provide; use `cads_str_append()` and `cads_fmt_uint()` from `cads/toolbox` as `about` does. And **draw only what changed**: if your widget reports dirty, mark the view dirty for that rectangle with `cads_view_dirty_rect()`.

**3. Create `apps/hello/CMakeLists.txt`** by copying `apps/about/CMakeLists.txt`: a `STATIC` library `cads_app_hello`, `target_include_directories(... PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})`, linked `PUBLIC cads_gui_view cads_toolbox PRIVATE cads_flags`.

**4. Wire the build.** In the root `CMakeLists.txt`, add `add_subdirectory(apps/hello)` next to the other apps, *before* `add_subdirectory(apps/menu)`. In `apps/menu/CMakeLists.txt`, add `target_link_libraries(cads_app_menu PRIVATE cads_app_hello)`. (The existing apps are behind `CADS_APP_*` options; an unconditional add is fine for this exercise.)

**5. Wire the menu.** In `apps/menu/cads_menu_app.c`: include `../hello/cads_hello.h`, add a row `{"Hello", NULL, CADS_VIEW_ID_HELLO}` to `cads_menu_app_items[]`, and call `cads_hello_init(dispatcher);` in `cads_menu_app_init()` alongside the other init calls.

## One thing to check before you build

The dispatcher table has 28 slots (`CADS_APP_DEMO_VIEW_CAPACITY` in `apps/bringup/explorer_app_demo.c`) and the full app tree registers 26 views today, so one more fits. If you ever add a second view, remember that past capacity `add()` fails *silently* — the host test `test_app_tree` is what would catch it.

## Your task

Build the app, run **CaDS: Build**, flash, and open **Menu → Hello** on the panel. The checks confirm the menu calls `cads_hello_init`, that the symbol is linked into the ELF, and that the build passes. Also run the host build — everything above the HAL must compile for both targets.
