---
id: m5-02-view-dispatcher
title: Views, der Dispatcher und die Soft-Key-Leiste
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
    title: Lies apps/about als die minimale App
    check: { type: manual }
  - id: view-model
    title: Erkläre, wie eine View registriert und angesteuert wird
    check: { type: question, prompt: { en: "Walk through what cads_about_init() does to become a menu entry: how does the view reach the dispatcher, how does it get input events, and by what path does a finger on the soft-key strip turn into a key press for the app?", de: "Erkläre, was cads_about_init() tut, um ein Menüeintrag zu werden: wie gelangt die View zum Dispatcher, wie bekommt sie Eingabeereignisse, und auf welchem Weg wird ein Finger auf der Soft-Key-Leiste zu einem Tastendruck für die App?" }, rubric: "Nennt cads_view_init(draw, input, context), cads_view_set_softkeys und cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, view); dass das Menü die id per cads_view_dispatcher_push pusht; und dass cads_softkeys_touch das Tastenereignis der berührten Zelle synthetisiert, sodass die App einen Ereignisstrom sieht, egal ob von Finger oder Taste.", bloom: understand }
socratic:
  - { trigger: "question:view-model:weak", question: { en: "The last line of cads_about_init() is the one that makes the app exist. What does it call, and what would happen if that call returned false?", de: "Die letzte Zeile von cads_about_init() ist die, die die App existieren lässt. Was ruft sie auf, und was geschähe, wenn dieser Aufruf false zurückgäbe?" }, hints: [ { en: "cads_view_dispatcher_add() registers the view under CADS_VIEW_ID_ABOUT (0x0400).", de: "cads_view_dispatcher_add() registriert die View unter CADS_VIEW_ID_ABOUT (0x0400)." }, { en: "The menu's item table maps a row to that same id and pushes it with cads_view_dispatcher_push().", de: "Die Item-Tabelle des Menüs bildet eine Zeile auf dieselbe id ab und pusht sie mit cads_view_dispatcher_push()." }, { en: "Past the dispatcher's capacity add() returns false and every caller discards it - the view silently never exists (docs/explanation/config-design.md).", de: "Jenseits der Dispatcher-Kapazität liefert add() false, und jeder Aufrufer verwirft das - die View existiert dann stillschweigend nie (docs/explanation/config-design.md)." } ] }
---
## Lernziel

Verstehe die drei Teile, aus denen jede GUI-App besteht — eine View, der Dispatcher, der einen Stapel von Views besitzt, und die Widgets, die zeichnen — und wie ein einziger Ereignisstrom die App erreicht, egal ob die Eingabe von einer Taste oder einem Finger kam.

## Eine View ist ein Draw-Callback, ein Input-Callback und ein Kontext

`gui/view/cads_view.h` definiert `cads_view_t`: es hat `draw`, `input`, optionale `enter`/`exit`-Lebenszyklus-Hooks, einen Titel und eine Soft-Key-Tabelle — sonst nichts. Eine App füllt eine aus:

```c
cads_view_init(&s_about.view, cads_about_draw, cads_about_input, &s_about);
cads_view_set_lifecycle(&s_about.view, cads_about_enter, NULL);
cads_view_set_title(&s_about.view, "About");
cads_view_set_softkeys(&s_about.view, cads_about_keys, count);
(void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, &s_about.view);
```

Dieser letzte Aufruf lässt die App *existieren*. Der **View-Dispatcher** (`gui/view/cads_view_dispatcher.h`) hält eine Tabelle fester Kapazität aus `(id, view)`-Einträgen und einen Navigationsstapel: `push(id)` öffnet eine View obenauf, `pop()` kehrt zurück, `pop_to_root()` geht nach Hause. Ids sind schlichte Zahlen, die jede App in ihrem Header definiert — Desktop `0x0100`, Menü `0x0200`, About `0x0400`, GPIO `0x0500` — und die Item-Tabelle des Menüs (`apps/menu/cads_menu_app.c`) bildet eine beschriftete Zeile auf genau so eine id ab; eine Zeile zu aktivieren ist nichts anderes als „pushe, was sie benennt".

Die Kapazität ist real: `explorer_app_demo.c` bemisst die Tabelle mit `CADS_APP_DEMO_VIEW_CAPACITY` (heute 28). Darüber hinaus liefert `add()` `false`, jeder Aufrufer verwirft das mit `(void)`, und die View existiert stillschweigend nie — eine tote Menüzeile ohne irgendeine Fehlermeldung. Genau dieser Fehler ist zweimal ausgeliefert worden, bevor er verstanden war; deshalb prüft der Host-Test `tests/unit/test_app_tree.c` die reale Registrierungszahl gegen die reale Kapazität.

## Widgets zeichnen; die View sagt nur, wann

`apps/about` zeichnet selbst nichts: es besitzt eine `cads_textbox_t` und ruft in `draw` nur dann `cads_textbox_draw()` auf, wenn das Widget sich als dirty meldet. In `input` reicht es das Ereignis an `cads_textbox_input()` weiter und markiert, falls das Widget dirty wurde, die View über `cads_view_dirty_rect()` genau für das Damage-Rechteck des Widgets. Das ist das Muster: Widgets verfolgen ihr eigenes Damage, Views reichen es weiter, und das Canvas aus dem vorigen Step überträgt nur das.

## Ein Ereignisstrom, zwei Eingaben

Das Board hat eine Reihe von acht Tasten unter dem Display und ein resistives Touch-Panel. `docs/explanation/input-scheme.md` legt fest, wie beide eine App erreichen: die acht Tasten sind eine **Soft-Key-Leiste** — ein Band aus Zellen am unteren Rand, jede beschriftet mit dem, was die Taste darunter *gerade jetzt* tut (`Up`, `Down`, `OK`, `Back`, `F1`, `F2`, je View umbenennbar). Touch ist direkte Manipulation. Und die Regel, die das zusammenhält: **Jede per Touch erreichbare Aktion ist auch per Taste erreichbar, und umgekehrt.**

Die Leiste setzt diese Regel konstruktiv um. `cads_gui.c` bietet Touch-Ereignisse zuerst `cads_softkeys_touch()` an; eine Berührung auf einer Zelle synthetisiert genau das Tastenereignis, das die physische Taste erzeugt hätte, sodass der `input`-Callback der App in beiden Fällen `CadsInputPress`/`Release` mit einer `CadsKey*` sieht und nie wissen muss, woher es kam.

## Deine Aufgabe

Lies `apps/about/cads_about.c` von Anfang bis Ende — es ist die kleinste vollständige App im Baum, etwa 150 Zeilen — und erkläre dann den Registrierungs- und Eingabepfad in eigenen Worten. Im nächsten Step baust du selbst eine.
