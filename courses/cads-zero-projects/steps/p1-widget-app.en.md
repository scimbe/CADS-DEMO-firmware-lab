---
id: p1-widget-app
title: "Project: your own app with a widget"
bloom: create
objectives: [cz.gui.app]
requires: []
estimatedMinutes: 120
scaffold: independent
creates: [cads_project_app_init]
links:
  - { file: "apps/about/cads_about.c" }
  - { file: "apps/menu/cads_menu_app.c" }
  - { doc: "docs/reference/canvas.md" }
sources: [apps/about/cads_about.c, apps/menu/cads_menu_app.c, gui/canvas.h, gui/view/cads_view.h]
misconceptions:
  - { pattern: "undefined reference to", question: { en: "The link failed on a name the compiler was happy with. Is the definition missing, or is the library holding it not linked?", de: "Das Linken scheiterte an einem Namen, mit dem der Compiler zufrieden war. Fehlt die Definition, oder ist die Bibliothek mit ihr nicht gelinkt?" }, hints: [ { en: "A new app needs an add_subdirectory in the root CMakeLists.txt and a target_link_libraries in apps/menu.", de: "Eine neue App braucht ein add_subdirectory in der Wurzel-CMakeLists.txt und ein target_link_libraries in apps/menu." }, { en: "The subdirectory that defines the library has to be added before the target that links it.", de: "Das Verzeichnis, das die Bibliothek definiert, muss vor dem Target hinzugefügt werden, das sie linkt." }, { en: "Compare your CMakeLists.txt against apps/about/CMakeLists.txt line by line, including which keywords are PUBLIC.", de: "Vergleich deine CMakeLists.txt Zeile für Zeile mit apps/about/CMakeLists.txt, auch welche Schlüsselwörter PUBLIC sind." } ] }
tasks:
  - id: app-substance
    title: The app registers a view and the menu calls it
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_app_init' apps --include=*.c | xargs -r grep -l cads_view_dispatcher_add | xargs -r grep -l cads_view_set_softkeys | grep -q .", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'cads_project_app_init[[:space:]]*\\([a-z]' apps/menu/cads_menu_app.c", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: damage-discipline
    title: Your app reports its damage
    check: { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_app_init' apps --include=*.c | xargs -r grep -lE 'cads_view_dirty_rect|cads_canvas_damage' | grep -q .", expectExitCode: 0, bloom: create }
  - id: defend
    title: Defend the design
    check: { type: question, prompt: { en: "What is your app's one job, and which rectangle does it damage when that job produces an update?", de: "Was ist die eine Aufgabe deiner App, und welches Rechteck beschädigt sie, wenn diese Aufgabe eine Aktualisierung erzeugt?" }, rubric: "Names one clear single purpose in one sentence without an and. Names the widget and the rectangle it damages on an update, with a size relative to the 480x320 surface. And argues what that discipline buys: a small update costs milliseconds, a full screen about 448 ms, and the Ethernet receiver is off throughout. An answer without a concrete rectangle does not pass.", bloom: create }
socratic:
  - { trigger: "task:app-substance:failed", question: { en: "The check wants four things at once. Which of them fails - the app's own file, the menu call, the symbol, or the build?", de: "Der Check will vier Dinge auf einmal. Welches davon scheitert - die eigene Datei der App, der Menü-Aufruf, das Symbol oder der Build?" }, hints: [ { en: "An empty init function passes the linker but not this check: the same file must also register a view and set soft keys.", de: "Eine leere Init-Funktion besteht den Linker, aber nicht diesen Check: dieselbe Datei muss auch eine View registrieren und Soft-Keys setzen." }, { en: "Model the whole shape on apps/about: a view, soft keys, and a cads_view_dispatcher_add() with a unique view id.", de: "Baue die ganze Form nach apps/about: eine View, Soft-Keys und ein cads_view_dispatcher_add() mit einer eindeutigen View-ID." }, { en: "The menu side needs the include, a call with the dispatcher as its argument, and a cads_menu_item_t row pointing at your view id.", de: "Die Menü-Seite braucht den Include, einen Aufruf mit dem Dispatcher als Argument und eine cads_menu_item_t-Zeile, die auf deine View-ID zeigt." } ] }
  - { trigger: "task:damage-discipline:failed", question: { en: "Your app draws something. What tells the canvas which part of the screen has to be pushed to the panel?", de: "Deine App zeichnet etwas. Was sagt dem Canvas, welcher Teil des Bildschirms zum Panel geschoben werden muss?" }, hints: [ { en: "Widgets track their own damage; a view forwards it for exactly the widget's rectangle.", de: "Widgets verfolgen ihr eigenes Damage; eine View reicht es für genau das Rechteck des Widgets weiter." }, { en: "apps/about does this in its input callback, only when the widget reports itself dirty.", de: "apps/about tut das in seinem input-Callback, nur wenn das Widget sich als dirty meldet." }, { en: "Widgets that write the framebuffer directly must announce their own damage instead - either route satisfies this check.", de: "Widgets, die den Framebuffer direkt beschreiben, müssen ihr Damage selbst melden - beide Wege bestehen diesen Check." } ] }
  - { trigger: "question:defend:weak", question: { en: "Say what the app is for in one sentence, then say which pixels change when its state changes. If the second answer is all of them, why?", de: "Sag in einem Satz, wofür die App da ist, und dann, welche Pixel sich ändern, wenn sich ihr Zustand ändert. Wenn die Antwort alle lautet - warum?" }, hints: [ { en: "One job means one sentence without an and; if you need two, the app is two apps.", de: "Eine Aufgabe heißt ein Satz ohne und; brauchst du zwei, ist die App zwei Apps." }, { en: "Give the rectangle in terms of the widget, not the screen: what is its size relative to 480x320?", de: "Gib das Rechteck über das Widget an, nicht über den Bildschirm: wie groß ist es im Verhältnis zu 480x320?" }, { en: "The measured cost of a full flush against a small one is in the foundations dirty-rectangle step; use it to say what your discipline buys.", de: "Die gemessenen Kosten eines vollen gegen einen kleinen Flush stehen im Dirty-Rectangle-Step der Grundlagen; sag damit, was deine Disziplin einbringt." } ] }
---
## Goal

Add a genuinely new application to CaDS Zero: your own view, one widget, wired into the menu and reachable on the real panel.

## What you build on

This project assumes the Foundations module M5, especially the step where you added your own menu app (m5-03-own-app) and the view/dispatcher model (m5-02-view-dispatcher). Re-read `apps/about/cads_about.c` — it is the smallest complete app in the tree and your best template.

## Requirements

- Create a new app under `apps/<name>/` with its own CMake library, modelled on `apps/about`.
- Expose an init function named exactly **`cads_project_app_init(cads_view_dispatcher_t*)`** that builds a `cads_view_t`, sets a title and soft-keys, and registers a unique view id with `cads_view_dispatcher_add()`.
- Draw **one widget** of your choosing (a gauge, a list, a small readout) using the canvas API, and keep your damage to the rectangle that actually changed — never repaint the whole screen. See `docs/reference/canvas.md`.
- Wire it into the launcher: `#include` your header in `apps/menu/cads_menu_app.c`, call `cads_project_app_init(dispatcher)` alongside the other `cads_*_init` calls, add a `cads_menu_item_t` row pointing at your view id, and link your library from `apps/menu/CMakeLists.txt`.
- Respect the both-targets rule: nothing above the HAL may become board-only, so your app must also build for the host.

## Acceptance

The checks test substance, not intent — an empty function body with the right name passes none of them.

1. **Registration and wiring.** The file that *defines* `cads_project_app_init` must also call `cads_view_dispatcher_add()` and set `cads_view_set_softkeys()`; `apps/menu/cads_menu_app.c` must call the function with an argument (a comment or a bare include line does not count); the symbol must be in the ELF; and the board image must build.
2. **Damage discipline.** That same file must use `cads_view_dirty_rect()` or `cads_canvas_damage()`. That is the machine-checkable form of the requirement never to repaint the whole screen.
3. **Design defence.** You name the single job and the rectangle it damages.

## Deliver

A small, focused app — one screen that does one thing well — plus a short note on the design choices you made and would defend in review.
