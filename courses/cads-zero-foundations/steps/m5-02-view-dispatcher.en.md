---
id: m5-02-view-dispatcher
title: Views, the dispatcher and the soft-key strip
bloom: understand
objectives: [cz.gui.views]
requires: [m5-01-canvas-draw]
estimatedMinutes: 15
links:
  - { step: m5-03-own-app }
  - { doc: "docs/explanation/input-scheme.md" }
  - { file: "apps/about/cads_about.c", line: 126 }
  - { file: "gui/view/cads_view_dispatcher.h", line: 94 }
sources: [docs/explanation/input-scheme.md, apps/about/cads_about.c, gui/view/cads_view.h, gui/view/cads_view_dispatcher.h, gui/widgets/cads_softkeys.h]
tasks:
  - id: read-about
    title: Read apps/about as the minimal app
    check: { type: manual }
  - id: view-model
    title: Explain how a view is registered and driven
    check: { type: question, prompt: { en: "Walk through what cads_about_init() does to become a menu entry: how does the view reach the dispatcher, how does it get input events, and by what path does a finger on the soft-key strip turn into a key press for the app?", de: "Erkläre, was cads_about_init() tut, um ein Menüeintrag zu werden: wie gelangt die View zum Dispatcher, wie bekommt sie Eingabeereignisse, und auf welchem Weg wird ein Finger auf der Soft-Key-Leiste zu einem Tastendruck für die App?" }, rubric: "Mentions cads_view_init(draw, input, context), cads_view_set_softkeys, and cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, view); that the menu pushes the id via cads_view_dispatcher_push; and that cads_softkeys_touch synthesises the key event of the touched cell so the app sees one event stream whether it came from a finger or a button.", bloom: understand }
socratic:
  - { trigger: "question:view-model:weak", question: { en: "The last line of cads_about_init() is the one that makes the app exist. What does it call, and what would happen if that call returned false?", de: "Die letzte Zeile von cads_about_init() ist die, die die App existieren lässt. Was ruft sie auf, und was geschähe, wenn dieser Aufruf false zurückgäbe?" }, hints: [ { en: "cads_view_dispatcher_add() registers the view under CADS_VIEW_ID_ABOUT (0x0400).", de: "cads_view_dispatcher_add() registriert die View unter CADS_VIEW_ID_ABOUT (0x0400)." }, { en: "The menu's item table maps a row to that same id and pushes it with cads_view_dispatcher_push().", de: "Die Item-Tabelle des Menüs bildet eine Zeile auf dieselbe id ab und pusht sie mit cads_view_dispatcher_push()." }, { en: "Past the dispatcher's capacity add() returns false and every caller discards it - the view silently never exists (docs/explanation/config-design.md).", de: "Jenseits der Dispatcher-Kapazität liefert add() false, und jeder Aufrufer verwirft das - die View existiert dann stillschweigend nie (docs/explanation/config-design.md)." } ] }
---
## Learning goal

Understand the three parts every GUI app is made of — a view, the dispatcher that owns a stack of views, and the widgets that draw — and how one event stream reaches an app whether the input came from a button or a finger.

## A view is a draw callback, an input callback and a context

`gui/view/cads_view.h` defines `cads_view_t`: it has `draw`, `input`, optional `enter`/`exit` lifecycle hooks, a title, and a soft-key table — nothing else. An app fills one in:

```c
cads_view_init(&s_about.view, cads_about_draw, cads_about_input, &s_about);
cads_view_set_lifecycle(&s_about.view, cads_about_enter, NULL);
cads_view_set_title(&s_about.view, "About");
cads_view_set_softkeys(&s_about.view, cads_about_keys, count);
(void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, &s_about.view);
```

That last call is what makes the app *exist*. The **view dispatcher** (`gui/view/cads_view_dispatcher.h`) keeps a fixed-capacity table of `(id, view)` entries and a navigation stack: `push(id)` opens a view on top, `pop()` returns, `pop_to_root()` goes home. Ids are plain numbers each app defines in its header — desktop `0x0100`, menu `0x0200`, about `0x0400`, gpio `0x0500` — and the menu's item table (`apps/menu/cads_menu_app.c`) maps a labelled row to exactly such an id, so activating a row is nothing more than "push what it names".

The capacity is real: `explorer_app_demo.c` sizes the table at `CADS_APP_DEMO_VIEW_CAPACITY` (28 today). Past it, `add()` returns `false`, every caller discards that with `(void)`, and the view silently never exists — a dead menu row with no error anywhere. That exact bug shipped twice before it was understood, which is why the host test `tests/unit/test_app_tree.c` asserts the real registration count against the real capacity.

## Widgets draw; the view only says when

`apps/about` draws nothing itself: it owns a `cads_textbox_t` and, in `draw`, calls `cads_textbox_draw()` only if the widget reports dirty. In `input` it forwards the event to `cads_textbox_input()` and, if the widget became dirty, marks the view dirty for exactly the widget's damage rectangle via `cads_view_dirty_rect()`. That is the pattern: widgets track their own damage, views forward it, and the canvas from the previous step pushes only that.

## One event stream, two inputs

The board has a row of eight buttons under the display and a resistive touch panel. `docs/explanation/input-scheme.md` settles how both reach an app: the eight buttons are a **soft-key strip** — a band of cells along the bottom edge, each labelled with what the button below it does *right now* (`Up`, `Down`, `OK`, `Back`, `F1`, `F2`, relabelled per view). Touch is direct manipulation. And the rule that keeps this coherent: **every action reachable by touch is also reachable by button, and vice versa.**

The strip implements that rule by construction. `cads_gui.c` offers touch events to `cads_softkeys_touch()` first; a touch landing on a cell synthesises exactly the key event the physical button would have produced, so the app's `input` callback sees `CadsInputPress`/`Release` with a `CadsKey*` either way and never has to know where it came from.

## Your task

Read `apps/about/cads_about.c` end to end — it is the smallest complete app in the tree, about 150 lines — and then explain the registration and input path in your own words. The next step has you build one.
