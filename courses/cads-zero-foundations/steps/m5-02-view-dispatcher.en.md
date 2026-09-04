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

Understand the three parts every GUI app is made of — a view, the dispatcher that owns a stack of views, and the widgets that draw — and how a single event stream reaches the app whether the input came from a button or a finger.

**Concretely:** read one file and answer three tasks in the step text. Nothing is built and nothing is flashed in this step.

## Where you work

The course tree is in the side bar on the left; you open it with the mortarboard icon in the narrow bar on the far left. This step text is a tab of its own in the middle, called `CaDS Tutor: Views, the dispatcher and the soft-key strip`. The **Run all checks** button sits at its top, and the three tasks are at the bottom, each with an input field and a **Prüfen** and a **Hinweis anzeigen** button.

The user interface is in English while this course is in German. Menus live behind the three-line icon (**☰**) at the very top left — there is no visible menu bar.

## Opening the file

Press `Ctrl`/`Cmd`+`P`, type `apps/about/cads_about.c` and press Enter; the file opens as a tab in the middle, next to this step text. Without the keyboard: the top icon in the narrow bar on the far left (the file explorer), then expand `apps` and `about` and click the file. It is about 150 lines and the smallest complete app in the tree.

## A view is a draw callback, an input callback and a context

`gui/view/cads_view.h` defines `cads_view_t`: it has `draw`, `input`, optional `enter`/`exit` lifecycle hooks, a title and a soft-key table — nothing else. An app fills one in:

```c
cads_view_init(&s_about.view, cads_about_draw, cads_about_input, &s_about);
cads_view_set_lifecycle(&s_about.view, cads_about_enter, NULL);
cads_view_set_title(&s_about.view, "About");
cads_view_set_softkeys(&s_about.view, cads_about_keys, count);
(void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, &s_about.view);
```

That last call is what makes the app *exist*. The **view dispatcher** (`gui/view/cads_view_dispatcher.h`) holds a fixed-capacity table of `(id, view)` entries and a navigation stack: `push(id)` opens a view on top, `pop()` returns, `pop_to_root()` goes home. Ids are plain numbers each app defines in its header — desktop `0x0100`, menu `0x0200`, about `0x0400`, GPIO `0x0500` — and the menu's item table (`apps/menu/cads_menu_app.c`) maps a labelled row onto exactly such an id; activating a row is nothing but "push what it names".

The capacity is real and sits as `CADS_APP_DEMO_VIEW_CAPACITY` beside the table in `apps/bringup/explorer_app_demo.c`. Look at the return type of `cads_view_dispatcher_add()` and then at what the callers do with it — what happens past the capacity follows from that. The host test `tests/unit/test_app_tree.c` checks the real registration count against the capacity; it exists because this fault shipped twice.

## Widgets draw; the view only says when

`apps/about` draws nothing itself: it owns a `cads_textbox_t` and calls `cads_textbox_draw()` in `draw` only when the widget reports itself dirty. In `input` it passes the event to `cads_textbox_input()` and, if the widget went dirty, marks the view through `cads_view_dirty_rect()` for exactly the widget's damage rectangle. That is the pattern: widgets track their own damage, views pass it on, and the canvas transfers only that.

## One event stream, two inputs

The board has eight buttons under the display and a resistive touch panel. `docs/explanation/input-scheme.md` fixes how both reach an app: the eight buttons are a **soft-key strip** — a band of cells along the bottom, each labelled with what the button under it does *right now* (`Up`, `Down`, `OK`, `Back`, `F1`, `F2`, renameable per view).

The ordering is the whole trick: `cads_gui.c` offers touch events to `cads_softkeys_touch()` first, and every cell of the strip knows which key it stands for. What follows from that for an app's `input` callback is the third question of this step.

## The first task is a prediction

Write your number into the input field of the task **Predict the capacity of the view table** at the bottom of this step text and press **Prüfen** there. Only then does the tutor run the comparison command — a `grep` over `apps/bringup/explorer_app_demo.c` — and show you its output. It takes under a second.

That output appears as a message **on the task here in the step text**, not in a terminal at the bottom. What is graded is what you say about the failure mode after the comparison, not whether you guessed the number.

If you want to look the place up yourself, open a terminal with **☰ → `Terminal` → `New Terminal`** — if the terminal area at the bottom is folded away, `Ctrl`/`Cmd`+`J` opens and closes it — and run:

```bash
grep -n CADS_APP_DEMO_VIEW_CAPACITY apps/bringup/explorer_app_demo.c
```

## Three operating mistakes almost everyone makes here

- **A command ran, but you are looking for its output in the wrong window.** A task's output is not in the step text and not in the editor, but in the terminal area at the bottom, in the terminal named after the task — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the terminal. A check button's output, by contrast, appears on the task in the step text.
- **You closed the terminal and ended the running process with it.** The cross on a terminal kills the process inside it — use `Ctrl`/`Cmd`+`J` to fold the area away instead, which leaves it running.
- **The palette does not react to the shortcut.** The browser swallowed `Ctrl`/`Cmd`+`Shift`+`P` — press `F1` instead, or go through **☰ → `Terminal`**.

## Your task

Read `apps/about/cads_about.c` end to end. Then predict the capacity of the view table and compare; afterwards answer the two questions about the dead menu row and the event stream, each in its own task's field. In the next step you build an app yourself.
