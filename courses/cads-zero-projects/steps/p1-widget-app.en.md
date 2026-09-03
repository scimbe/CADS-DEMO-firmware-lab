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
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_app_init$' || continue; nm -u $o | grep -q cads_view_dispatcher_add || continue; nm -u $o | grep -q cads_view_set_softkeys || continue; exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'cads_menu_app.c.obj' -o -name 'cads_menu_app.c.o'); do nm -u $o 2>/dev/null | grep -q cads_project_app_init && exit 0; done; exit 1", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" } ] }
  - id: damage-discipline
    title: Your app reports its damage
    check: { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_app_init$' || continue; nm -u $o | grep -qE 'cads_view_dirty_rect|cads_canvas_damage' && exit 0; done; exit 1", expectExitCode: 0, bloom: create }
  - id: defend
    title: Defend the design
    check: { type: question, prompt: { en: "What is your app's one job, and which rectangle does it damage when that job produces an update? Three sentences - the single job, the rectangle with a size relative to the 480x320 surface, and what that discipline buys.", de: "Was ist die eine Aufgabe deiner App, und welches Rechteck beschädigt sie, wenn diese Aufgabe eine Aktualisierung erzeugt? Drei Sätze - die eine Aufgabe, das Rechteck mit einer Größenangabe im Verhältnis zur Fläche 480x320, und was diese Disziplin einbringt." }, rubric: "Names one clear single purpose in one sentence without an and. Names the widget and the rectangle it damages on an update, with a size relative to the 480x320 surface. And argues what that discipline buys: a small update costs milliseconds, a full screen about 448 ms, and the Ethernet receiver is off throughout. An answer without a concrete rectangle does not pass.", bloom: create }
socratic:
  - { trigger: "task:app-substance:failed", question: { en: "The check wants four things at once. Which of them fails - the board build, the object file of your app, the menu object, or the ELF symbol?", de: "Der Check will vier Dinge auf einmal. Welches davon scheitert - der Board-Build, die Objektdatei deiner App, das Menü-Objekt oder das ELF-Symbol?" }, hints: [ { en: "Did you build the board image after your last edit? These sub-checks read object files under build/itsboard, so an unbuilt tree fails them without saying anything about your code.", de: "Hast du das Board-Image nach deiner letzten Änderung gebaut? Diese Teil-Checks lesen Objektdateien unter build/itsboard, ein nicht gebauter Baum lässt sie also scheitern, ohne etwas über deinen Code zu sagen." }, { en: "The check looks for the translation unit that defines cads_project_app_init and wants unresolved references to cads_view_dispatcher_add and cads_view_set_softkeys in that same unit. Model the shape on apps/about/cads_about.c and its CMakeLists.txt.", de: "Der Check sucht die Übersetzungseinheit, die cads_project_app_init definiert, und will in derselben Einheit unaufgelöste Referenzen auf cads_view_dispatcher_add und cads_view_set_softkeys. Baue die Form nach apps/about/cads_about.c und seiner CMakeLists.txt." }, { en: "A comment produces no symbol reference: apps/menu/cads_menu_app.c has to call the function for real before its object file lists cads_project_app_init as undefined. It also needs a cads_menu_item_t row pointing at your view id.", de: "Ein Kommentar erzeugt keine Symbolreferenz: apps/menu/cads_menu_app.c muss die Funktion wirklich aufrufen, bevor ihre Objektdatei cads_project_app_init als undefiniert führt. Dazu gehört eine cads_menu_item_t-Zeile, die auf deine View-ID zeigt." } ] }
  - { trigger: "task:damage-discipline:failed", question: { en: "Your app draws something. What tells the canvas which part of the screen has to be pushed to the panel?", de: "Deine App zeichnet etwas. Was sagt dem Canvas, welcher Teil des Bildschirms zum Panel geschoben werden muss?" }, hints: [ { en: "Does the drawing happen in the translation unit that defines cads_project_app_init, or in a helper in another file? The check reads exactly that unit.", de: "Geschieht das Zeichnen in der Übersetzungseinheit, die cads_project_app_init definiert, oder in einer Hilfsfunktion einer anderen Datei? Der Check liest genau diese Einheit." }, { en: "apps/about does this in its input callback, only when the widget reports itself dirty.", de: "apps/about tut das in seinem input-Callback, nur wenn das Widget sich als dirty meldet." }, { en: "Widgets that write the framebuffer directly must announce their own damage instead - either route satisfies this check.", de: "Widgets, die den Framebuffer direkt beschreiben, müssen ihr Damage selbst melden - beide Wege bestehen diesen Check." } ] }
  - { trigger: "question:defend:weak", question: { en: "Say what the app is for in one sentence, then say which pixels change when its state changes. If the second answer is all of them, why?", de: "Sag in einem Satz, wofür die App da ist, und dann, welche Pixel sich ändern, wenn sich ihr Zustand ändert. Wenn die Antwort alle lautet - warum?" }, hints: [ { en: "Is there an and in your sentence? Then you are probably describing two apps rather than one.", de: "Steht in deinem Satz ein „und“? Dann beschreibst du wahrscheinlich zwei Apps und nicht eine." }, { en: "Give the rectangle in terms of the widget, not the screen: what is its size relative to 480x320?", de: "Gib das Rechteck über das Widget an, nicht über den Bildschirm: wie groß ist es im Verhältnis zu 480x320?" }, { en: "The measured cost of a full flush against a small one is in the foundations dirty-rectangle step; use it to say what your discipline buys.", de: "Die gemessenen Kosten eines vollen gegen einen kleinen Flush stehen im Dirty-Rectangle-Step der Grundlagen; sag damit, was deine Disziplin einbringt." } ] }
---
## Goal

Add a genuinely new application to CaDS Zero: your own view, one widget, wired into the menu and reachable on the real panel.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m5-02-view-dispatcher` and `m5-03-own-app`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

This project assumes the Foundations module M5, especially the step where you added your own menu app (m5-03-own-app) and the view/dispatcher model (m5-02-view-dispatcher). Re-read `apps/about/cads_about.c` — it is the smallest complete app in the tree and your best template.

## Requirements

- Create a new app under `apps/<name>/` with its own CMake library, modelled on `apps/about`.
- Expose an init function named exactly **`cads_project_app_init(cads_view_dispatcher_t*)`** that builds a `cads_view_t`, sets a title and soft-keys, and registers a unique view id with `cads_view_dispatcher_add()`.
- Draw **one widget** of your choosing (a gauge, a list, a small readout) using the canvas API, and keep your damage to the rectangle that actually changed — never repaint the whole screen. See `docs/reference/canvas.md`.
- Wire it into the launcher: `#include` your header in `apps/menu/cads_menu_app.c`, call `cads_project_app_init(dispatcher)` alongside the other `cads_*_init` calls, add a `cads_menu_item_t` row pointing at your view id, and link your library from `apps/menu/CMakeLists.txt`.
- Respect the both-targets rule: nothing above the HAL may become board-only, so your app must also build for the host.

## Acceptance

The substance checks do not read the source text; they read the **built object files** under `build/itsboard`. A comment produces no symbol reference, so it passes none of them.

1. **Registration and wiring.** First the board image builds. Then the check looks for the translation unit that *defines* `cads_project_app_init` and requires, in that same unit, unresolved references to `cads_view_dispatcher_add` and `cads_view_set_softkeys` (`nm -u`). The object file of `apps/menu/cads_menu_app.c` must list `cads_project_app_init` as an undefined symbol — which only happens if the menu really calls the function; an `#include` or a comment produces no reference. Finally the symbol must be in the ELF.
2. **Damage discipline.** That same translation unit must reference `cads_view_dirty_rect` or `cads_canvas_damage`. That is the machine-checkable form of the requirement never to repaint the whole screen.
3. **Design defence.** You name the single job and the rectangle it damages.

## Deliver

A small, focused app — one screen that does one thing well — plus a short note on the design choices you made and would defend in review.
