---
id: m5-02-view-dispatcher
title: Views, the dispatcher and the soft-key strip
bloom: understand
objectives: [cz.gui.views]
requires: [m5-01-canvas-draw]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m5-03-own-app }
  - { doc: "docs/explanation/input-scheme.md" }
  - { file: "apps/about/cads_about.c", line: 126 }
  - { file: "gui/view/cads_view_dispatcher.h", line: 94 }
  - { file: "apps/bringup/explorer_app_demo.c", line: 97 }
sources: [docs/explanation/input-scheme.md, apps/about/cads_about.c, gui/view/cads_view.h, gui/view/cads_view_dispatcher.h, gui/widgets/cads_softkeys.h, apps/bringup/explorer_app_demo.c]
tasks:
  - id: dispatcher-capacity
    title: Predict the capacity of the view table
    check: { type: predict, prompt: { en: "The dispatcher table has a fixed capacity. Predict how many view slots the app tree provides today, and what happens to a view registered past that limit.", de: "Die Dispatcher-Tabelle hat feste Kapazität. Sage voraus, wie viele View-Plätze der App-Baum heute vorsieht und was mit einer View jenseits dieser Grenze geschieht." }, then: { type: command, cwd: ".", command: "grep -nE 'CADS_APP_DEMO_VIEW_CAPACITY' apps/bringup/explorer_app_demo.c", expectExitCode: 0 }, rubric: "The comparison shows CADS_APP_DEMO_VIEW_CAPACITY 28u and the s_entries table sized exactly by it. Passes if the answer, after the comparison, names the behaviour past the limit: add() returns false, every caller discards that with (void), and the view silently never exists - a dead menu row with no error anywhere. A wrongly guessed number with that insight passes.", bloom: understand }
  - id: dead-row
    title: A menu row opens nothing
    check: { type: question, prompt: { en: "A menu row opens nothing although cads_about_init() ran without error. Where do you look first?", de: "Eine Menüzeile öffnet nichts, obwohl cads_about_init() fehlerfrei durchlief. Wo suchst du zuerst?" }, rubric: "Names one of the two ways registration and the menu row can drift apart: the id the row pushes is not the id the view was registered under; or the table was full, add() returned false and the return value was discarded. Both are silent - an answer that expects an error message does not pass.", bloom: understand }
  - id: one-event-stream
    title: Why the app does not know where the input came from
    check: { type: question, prompt: { en: "Why does an app's input callback never need to know whether the input came from a finger?", de: "Warum muss der input-Callback einer App nie wissen, ob die Eingabe von einem Finger kam?" }, rubric: "Because a touch landing on a cell of the soft-key strip is turned into exactly the key event the physical button below it would have produced, before the app sees anything - which is why cads_gui.c offers touch events to cads_softkeys_touch() first. The callback sees CadsInputPress/Release with a CadsKey constant either way. Names the rule behind it: every action reachable by touch is also reachable by button.", bloom: understand }
socratic:
  - { trigger: "task:dispatcher-capacity:stuck", question: { en: "The table is a plain C array. What has to be true of its size at compile time, and what does that force the code to do when it is full?", de: "Die Tabelle ist ein gewöhnliches C-Array. Was muss zur Compile-Zeit über seine Größe feststehen, und wozu zwingt das den Code, wenn es voll ist?" }, hints: [ { en: "The number is a #define next to the array in apps/bringup/explorer_app_demo.c.", de: "Die Zahl ist ein #define neben dem Array in apps/bringup/explorer_app_demo.c." }, { en: "Look at the return type of cads_view_dispatcher_add() in gui/view/cads_view_dispatcher.h and then at what the callers do with it.", de: "Sieh dir den Rückgabetyp von cads_view_dispatcher_add() in gui/view/cads_view_dispatcher.h an und dann, was die Aufrufer damit tun." }, { en: "A guessed number is fine here - the point is what you say about the failure mode after the comparison.", de: "Eine geratene Zahl ist hier in Ordnung - es zählt, was du nach dem Vergleich über den Fehlerfall sagst." } ] }
  - { trigger: "question:dead-row:weak", question: { en: "Two independent numbers have to agree for a row to open a view. Which two, and where does each of them live?", de: "Zwei voneinander unabhängige Zahlen müssen übereinstimmen, damit eine Zeile eine View öffnet. Welche zwei, und wo steht jede?" }, hints: [ { en: "One number is written when the view is registered; the other when the menu row is defined.", de: "Die eine Zahl wird beim Registrieren der View geschrieben, die andere beim Definieren der Menüzeile." }, { en: "Look at the item table in apps/menu/cads_menu_app.c and at the id argument in the app's own init function.", de: "Sieh dir die Item-Tabelle in apps/menu/cads_menu_app.c an und das id-Argument in der Init-Funktion der App." }, { en: "There is a second cause with the same symptom, and it has nothing to do with ids: see the host test tests/unit/test_app_tree.c and what it asserts.", de: "Es gibt eine zweite Ursache mit demselben Symptom, und sie hat nichts mit ids zu tun: sieh dir den Host-Test tests/unit/test_app_tree.c an und was er zusichert." } ] }
  - { trigger: "question:one-event-stream:weak", question: { en: "Follow one finger tap through the code. Which function gets it first, and what does the app receive afterwards?", de: "Verfolge einen Fingertipp durch den Code. Welche Funktion bekommt ihn zuerst, und was empfängt die App danach?" }, hints: [ { en: "cads_gui.c offers touch events to the soft-key strip before anything else sees them.", de: "cads_gui.c bietet Touch-Ereignisse der Soft-Key-Leiste an, bevor irgendetwas anderes sie sieht." }, { en: "The strip knows which cell sits under the finger, and each cell already carries the key it stands for.", de: "Die Leiste weiß, welche Zelle unter dem Finger liegt, und jede Zelle trägt bereits die Taste, für die sie steht." }, { en: "docs/explanation/input-scheme.md states the rule this construction exists to guarantee; name it in your answer.", de: "docs/explanation/input-scheme.md nennt die Regel, die diese Konstruktion garantieren soll; nenne sie in deiner Antwort." } ] }
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

The capacity is real, and it is written as `CADS_APP_DEMO_VIEW_CAPACITY` next to the table in `explorer_app_demo.c`. Look at the return type of `cads_view_dispatcher_add()` and then at what the callers do with it — that is where the behaviour past capacity follows from. The host test `tests/unit/test_app_tree.c` asserts the real registration count against the real capacity; it exists because that bug shipped twice before it was understood.

## Widgets draw; the view only says when

`apps/about` draws nothing itself: it owns a `cads_textbox_t` and, in `draw`, calls `cads_textbox_draw()` only if the widget reports dirty. In `input` it forwards the event to `cads_textbox_input()` and, if the widget became dirty, marks the view dirty for exactly the widget's damage rectangle via `cads_view_dirty_rect()`. That is the pattern: widgets track their own damage, views forward it, and the canvas from the previous step pushes only that.

## One event stream, two inputs

The board has a row of eight buttons under the display and a resistive touch panel. `docs/explanation/input-scheme.md` settles how both reach an app: the eight buttons are a **soft-key strip** — a band of cells along the bottom edge, each labelled with what the button below it does *right now* (`Up`, `Down`, `OK`, `Back`, `F1`, `F2`, relabelled per view). Touch is direct manipulation.

The ordering is the whole trick: `cads_gui.c` offers touch events to `cads_softkeys_touch()` first, and every cell of the strip knows which key it stands for. What follows from that for an app's `input` callback is the third question of this step; the rule behind it is in `docs/explanation/input-scheme.md`.

## Your task

Read `apps/about/cads_about.c` end to end — it is the smallest complete app in the tree, about 150 lines. Then predict the capacity of the view table and compare; afterwards answer the two questions about the dead menu row and the event stream. The next step has you build an app of your own.
