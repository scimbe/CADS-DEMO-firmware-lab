---
id: m5-02-view-dispatcher
title: Views, der Dispatcher und die Soft-Key-Leiste
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
    title: Sage die Kapazität der View-Tabelle voraus
    check: { type: predict, prompt: { en: "The dispatcher table has a fixed capacity. Predict how many view slots the app tree provides today, and what happens to a view registered past that limit.", de: "Die Dispatcher-Tabelle hat feste Kapazität. Sage voraus, wie viele View-Plätze der App-Baum heute vorsieht und was mit einer View jenseits dieser Grenze geschieht." }, then: { type: command, cwd: ".", command: "grep -nE 'CADS_APP_DEMO_VIEW_CAPACITY' apps/bringup/explorer_app_demo.c", expectExitCode: 0 }, rubric: "Der Vergleich zeigt CADS_APP_DEMO_VIEW_CAPACITY 28u und die Tabelle s_entries, die genau so groß ist. Bestanden, wenn die Antwort nach dem Vergleich das Verhalten jenseits der Grenze benennt: add() liefert false, jeder Aufrufer verwirft das mit (void), und die View existiert stillschweigend nie - eine tote Menüzeile ohne jede Fehlermeldung. Eine falsch geratene Zahl mit dieser Einsicht besteht.", bloom: understand }
  - id: dead-row
    title: Eine Menüzeile öffnet nichts
    check: { type: question, prompt: { en: "A menu row opens nothing although cads_about_init() ran without error. Where do you look first?", de: "Eine Menüzeile öffnet nichts, obwohl cads_about_init() fehlerfrei durchlief. Wo suchst du zuerst?" }, rubric: "Nennt einen der beiden Wege, auf denen die Registrierung und die Menüzeile auseinanderlaufen können: die id, mit der die Zeile pusht, ist nicht die id, unter der die View eingetragen wurde; oder die Tabelle war voll, add() lieferte false und der Rückgabewert wurde verworfen. Beide sind stumm - eine Antwort, die eine Fehlermeldung erwartet, besteht nicht.", bloom: understand }
  - id: one-event-stream
    title: Warum die App die Herkunft der Eingabe nicht kennt
    check: { type: question, prompt: { en: "Why does an app's input callback never need to know whether the input came from a finger?", de: "Warum muss der input-Callback einer App nie wissen, ob die Eingabe von einem Finger kam?" }, rubric: "Weil die Berührung auf einer Zelle der Soft-Key-Leiste zu genau dem Tastenereignis gemacht wird, das die physische Taste darunter erzeugt hätte, bevor die App etwas sieht - cads_gui.c bietet Touch-Ereignisse deshalb zuerst cads_softkeys_touch() an. Der Callback sieht in beiden Fällen CadsInputPress/Release mit einer CadsKey-Konstante. Nennt die Regel dahinter: jede per Touch erreichbare Aktion ist auch per Taste erreichbar.", bloom: understand }
socratic:
  - { trigger: "task:dispatcher-capacity:stuck", question: { en: "The table is a plain C array. What has to be true of its size at compile time, and what does that force the code to do when it is full?", de: "Die Tabelle ist ein gewöhnliches C-Array. Was muss zur Compile-Zeit über seine Größe feststehen, und wozu zwingt das den Code, wenn es voll ist?" }, hints: [ { en: "The number is a #define next to the array in apps/bringup/explorer_app_demo.c.", de: "Die Zahl ist ein #define neben dem Array in apps/bringup/explorer_app_demo.c." }, { en: "Look at the return type of cads_view_dispatcher_add() in gui/view/cads_view_dispatcher.h and then at what the callers do with it.", de: "Sieh dir den Rückgabetyp von cads_view_dispatcher_add() in gui/view/cads_view_dispatcher.h an und dann, was die Aufrufer damit tun." }, { en: "A guessed number is fine here - the point is what you say about the failure mode after the comparison.", de: "Eine geratene Zahl ist hier in Ordnung - es zählt, was du nach dem Vergleich über den Fehlerfall sagst." } ] }
  - { trigger: "question:dead-row:weak", question: { en: "Two independent numbers have to agree for a row to open a view. Which two, and where does each of them live?", de: "Zwei voneinander unabhängige Zahlen müssen übereinstimmen, damit eine Zeile eine View öffnet. Welche zwei, und wo steht jede?" }, hints: [ { en: "One number is written when the view is registered; the other when the menu row is defined.", de: "Die eine Zahl wird beim Registrieren der View geschrieben, die andere beim Definieren der Menüzeile." }, { en: "Look at the item table in apps/menu/cads_menu_app.c and at the id argument in the app's own init function.", de: "Sieh dir die Item-Tabelle in apps/menu/cads_menu_app.c an und das id-Argument in der Init-Funktion der App." }, { en: "There is a second cause with the same symptom, and it has nothing to do with ids: see the host test tests/unit/test_app_tree.c and what it asserts.", de: "Es gibt eine zweite Ursache mit demselben Symptom, und sie hat nichts mit ids zu tun: sieh dir den Host-Test tests/unit/test_app_tree.c an und was er zusichert." } ] }
  - { trigger: "question:one-event-stream:weak", question: { en: "Follow one finger tap through the code. Which function gets it first, and what does the app receive afterwards?", de: "Verfolge einen Fingertipp durch den Code. Welche Funktion bekommt ihn zuerst, und was empfängt die App danach?" }, hints: [ { en: "cads_gui.c offers touch events to the soft-key strip before anything else sees them.", de: "cads_gui.c bietet Touch-Ereignisse der Soft-Key-Leiste an, bevor irgendetwas anderes sie sieht." }, { en: "The strip knows which cell sits under the finger, and each cell already carries the key it stands for.", de: "Die Leiste weiß, welche Zelle unter dem Finger liegt, und jede Zelle trägt bereits die Taste, für die sie steht." }, { en: "docs/explanation/input-scheme.md states the rule this construction exists to guarantee; name it in your answer.", de: "docs/explanation/input-scheme.md nennt die Regel, die diese Konstruktion garantieren soll; nenne sie in deiner Antwort." } ] }
---
## Lernziel

Verstehe die drei Teile, aus denen jede GUI-App besteht — eine View, der Dispatcher, der einen Stapel von Views besitzt, und die Widgets, die zeichnen — und wie ein einziger Ereignisstrom die App erreicht, egal ob die Eingabe von einer Taste oder einem Finger kam.

**Konkret:** eine Datei lesen und drei Aufgaben im Steptext beantworten. In diesem Step wird nichts gebaut und nichts geflasht.

## Wo du arbeitest

Der Kursbaum steht links in der Seitenleiste; du öffnest ihn über das Doktorhut-Symbol in der schmalen Leiste ganz links. Dieser Steptext ist ein eigener Reiter in der Mitte, benannt `CaDS Tutor: Views, der Dispatcher und die Soft-Key-Leiste`. Oben darin sitzt der Knopf **Run all checks**, unten stehen die drei Aufgaben, jede mit einem Eingabefeld und den Knöpfen **Prüfen** und **Hinweis anzeigen**.

Die Bedienoberfläche ist englisch, der Kurstext deutsch. Menüs erreichst du über das Symbol mit den drei Strichen (**☰**) ganz oben links — eine sichtbare Menüleiste gibt es nicht.

## Die Datei öffnen

Drücke `Strg`/`Cmd`+`P`, tippe `apps/about/cads_about.c` und drücke Enter; die Datei öffnet sich als Reiter in der Mitte, neben diesem Steptext. Ohne Tastatur: ganz links das oberste Symbol der Leiste (der Datei-Explorer), dann `apps` und `about` aufklappen und die Datei anklicken. Sie ist etwa 150 Zeilen lang und die kleinste vollständige App im Baum.

## Eine View ist ein Draw-Callback, ein Input-Callback und ein Kontext

`gui/view/cads_view.h` definiert `cads_view_t`: es hat `draw`, `input`, optionale `enter`/`exit`-Lebenszyklus-Hooks, einen Titel und eine Soft-Key-Tabelle — sonst nichts. Eine App füllt eine aus:

```c
cads_view_init(&s_about.view, cads_about_draw, cads_about_input, &s_about);
cads_view_set_lifecycle(&s_about.view, cads_about_enter, NULL);
cads_view_set_title(&s_about.view, "About");
cads_view_set_softkeys(&s_about.view, cads_about_keys, count);
(void)cads_view_dispatcher_add(dispatcher, CADS_VIEW_ID_ABOUT, &s_about.view);
```

Dieser letzte Aufruf lässt die App *existieren*. Der **View-Dispatcher** (`gui/view/cads_view_dispatcher.h`) hält eine Tabelle fester Kapazität aus `(id, view)`-Einträgen und einen Navigationsstapel: `push(id)` öffnet eine View obenauf, `pop()` kehrt zurück, `pop_to_root()` geht nach Hause. Ids sind schlichte Zahlen, die jede App in ihrem Header definiert — Desktop `0x0100`, Menü `0x0200`, About `0x0400`, GPIO `0x0500` — und die Item-Tabelle des Menüs (`apps/menu/cads_menu_app.c`) bildet eine beschriftete Zeile auf genau so eine id ab; eine Zeile zu aktivieren ist nichts anderes als „pushe, was sie benennt“.

Die Kapazität ist real und steht als `CADS_APP_DEMO_VIEW_CAPACITY` neben der Tabelle in `apps/bringup/explorer_app_demo.c`. Sieh dir den Rückgabetyp von `cads_view_dispatcher_add()` an und dann, was die Aufrufer damit tun — daraus folgt, was jenseits der Kapazität geschieht. Der Host-Test `tests/unit/test_app_tree.c` prüft die reale Registrierungszahl gegen die Kapazität; er existiert, weil dieser Fehler zweimal ausgeliefert wurde.

## Widgets zeichnen; die View sagt nur, wann

`apps/about` zeichnet selbst nichts: es besitzt eine `cads_textbox_t` und ruft in `draw` nur dann `cads_textbox_draw()` auf, wenn das Widget sich als dirty meldet. In `input` reicht es das Ereignis an `cads_textbox_input()` weiter und markiert, falls das Widget dirty wurde, die View über `cads_view_dirty_rect()` genau für das Damage-Rechteck des Widgets. Das ist das Muster: Widgets verfolgen ihr eigenes Damage, Views reichen es weiter, und das Canvas überträgt nur das.

## Ein Ereignisstrom, zwei Eingaben

Das Board hat acht Tasten unter dem Display und ein resistives Touch-Panel. `docs/explanation/input-scheme.md` legt fest, wie beide eine App erreichen: die acht Tasten sind eine **Soft-Key-Leiste** — ein Band aus Zellen am unteren Rand, jede beschriftet mit dem, was die Taste darunter *gerade jetzt* tut (`Up`, `Down`, `OK`, `Back`, `F1`, `F2`, je View umbenennbar).

Die Reihenfolge ist der ganze Trick: `cads_gui.c` bietet Touch-Ereignisse zuerst `cads_softkeys_touch()` an, und jede Zelle der Leiste weiß, für welche Taste sie steht. Was daraus für den `input`-Callback einer App folgt, ist die dritte Frage dieses Steps.

## Die erste Aufgabe ist eine Vorhersage

Schreib deine Zahl in das Eingabefeld der Aufgabe **Sage die Kapazität der View-Tabelle voraus** unten in diesem Steptext und drück dort **Prüfen**. Erst dann führt der Tutor den Vergleichsbefehl aus — ein `grep` über `apps/bringup/explorer_app_demo.c` — und zeigt dir dessen Ausgabe. Das dauert unter einer Sekunde.

Diese Ausgabe erscheint als Meldung **an der Aufgabe hier im Steptext**, nicht in einem Terminal unten. Bewertet wird, was du nach dem Vergleich über den Fehlerfall sagst, nicht ob du die Zahl geraten hast.

Willst du dieselbe Stelle selbst nachschlagen, öffne ein Terminal mit **☰ → `Terminal` → `New Terminal`** — ist der Terminal-Bereich unten zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und zu — und führ dort aus:

```bash
grep -n CADS_APP_DEMO_VIEW_CAPACITY apps/bringup/explorer_app_demo.c
```

## Drei Bedienfehler, die hier fast jeder einmal macht

- **Ein Befehl lief, aber die Ausgabe wird im falschen Fenster gesucht.** Die Ausgabe eines Tasks steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal. Die Ausgabe eines Prüfknopfs dagegen steht an der Aufgabe im Steptext.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin — zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Deine Aufgabe

Lies `apps/about/cads_about.c` ganz. Sage dann die Kapazität der View-Tabelle voraus und vergleiche; beantworte danach die zwei Fragen zur toten Menüzeile und zum Ereignisstrom, jede im Feld ihrer Aufgabe. Im nächsten Step baust du selbst eine App.
