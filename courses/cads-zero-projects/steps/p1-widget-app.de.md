---
id: p1-widget-app
title: "Projekt: eigene App mit Widget"
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
    title: Die App registriert eine View und das Menü ruft sie auf
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_app_init$' || continue; nm -u $o | grep -q cads_view_dispatcher_add || continue; nm -u $o | grep -q cads_view_set_softkeys || continue; exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'cads_menu_app.c.obj' -o -name 'cads_menu_app.c.o'); do nm -u $o 2>/dev/null | grep -q cads_project_app_init && exit 0; done; exit 1", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" } ] }
  - id: damage-discipline
    title: Deine App meldet ihr Damage
    check: { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_app_init$' || continue; nm -u $o | grep -qE 'cads_view_dirty_rect|cads_canvas_damage' && exit 0; done; exit 1", expectExitCode: 0, bloom: create }
  - id: defend
    title: Verteidige den Entwurf
    check: { type: question, prompt: { en: "What is your app's one job, and which rectangle does it damage when that job produces an update? Three sentences - the single job, the rectangle with a size relative to the 480x320 surface, and what that discipline buys.", de: "Was ist die eine Aufgabe deiner App, und welches Rechteck beschädigt sie, wenn diese Aufgabe eine Aktualisierung erzeugt? Drei Sätze - die eine Aufgabe, das Rechteck mit einer Größenangabe im Verhältnis zur Fläche 480x320, und was diese Disziplin einbringt." }, rubric: "Nennt einen klaren Einzelzweck in einem Satz ohne und. Benennt das Widget und das Rechteck, das es bei einer Aktualisierung beschädigt, mit einer Größenangabe im Verhältnis zur Fläche 480x320. Und begründet, was diese Disziplin einbringt: ein kleines Update kostet Millisekunden, ein Vollbild rund 448 ms, und der Ethernet-Empfänger ist währenddessen aus. Eine Antwort ohne ein konkretes Rechteck besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:app-substance:failed", question: { en: "The check wants four things at once. Which of them fails - the board build, the object file of your app, the menu object, or the ELF symbol?", de: "Der Check will vier Dinge auf einmal. Welches davon scheitert - der Board-Build, die Objektdatei deiner App, das Menü-Objekt oder das ELF-Symbol?" }, hints: [ { en: "Did you build the board image after your last edit? These sub-checks read object files under build/itsboard, so an unbuilt tree fails them without saying anything about your code.", de: "Hast du das Board-Image nach deiner letzten Änderung gebaut? Diese Teil-Checks lesen Objektdateien unter build/itsboard, ein nicht gebauter Baum lässt sie also scheitern, ohne etwas über deinen Code zu sagen." }, { en: "The check looks for the translation unit that defines cads_project_app_init and wants unresolved references to cads_view_dispatcher_add and cads_view_set_softkeys in that same unit. Model the shape on apps/about/cads_about.c and its CMakeLists.txt.", de: "Der Check sucht die Übersetzungseinheit, die cads_project_app_init definiert, und will in derselben Einheit unaufgelöste Referenzen auf cads_view_dispatcher_add und cads_view_set_softkeys. Baue die Form nach apps/about/cads_about.c und seiner CMakeLists.txt." }, { en: "A comment produces no symbol reference: apps/menu/cads_menu_app.c has to call the function for real before its object file lists cads_project_app_init as undefined. It also needs a cads_menu_item_t row pointing at your view id.", de: "Ein Kommentar erzeugt keine Symbolreferenz: apps/menu/cads_menu_app.c muss die Funktion wirklich aufrufen, bevor ihre Objektdatei cads_project_app_init als undefiniert führt. Dazu gehört eine cads_menu_item_t-Zeile, die auf deine View-ID zeigt." } ] }
  - { trigger: "task:damage-discipline:failed", question: { en: "Your app draws something. What tells the canvas which part of the screen has to be pushed to the panel?", de: "Deine App zeichnet etwas. Was sagt dem Canvas, welcher Teil des Bildschirms zum Panel geschoben werden muss?" }, hints: [ { en: "Does the drawing happen in the translation unit that defines cads_project_app_init, or in a helper in another file? The check reads exactly that unit.", de: "Geschieht das Zeichnen in der Übersetzungseinheit, die cads_project_app_init definiert, oder in einer Hilfsfunktion einer anderen Datei? Der Check liest genau diese Einheit." }, { en: "apps/about does this in its input callback, only when the widget reports itself dirty.", de: "apps/about tut das in seinem input-Callback, nur wenn das Widget sich als dirty meldet." }, { en: "Widgets that write the framebuffer directly must announce their own damage instead - either route satisfies this check.", de: "Widgets, die den Framebuffer direkt beschreiben, müssen ihr Damage selbst melden - beide Wege bestehen diesen Check." } ] }
  - { trigger: "question:defend:weak", question: { en: "Say what the app is for in one sentence, then say which pixels change when its state changes. If the second answer is all of them, why?", de: "Sag in einem Satz, wofür die App da ist, und dann, welche Pixel sich ändern, wenn sich ihr Zustand ändert. Wenn die Antwort alle lautet - warum?" }, hints: [ { en: "Is there an and in your sentence? Then you are probably describing two apps rather than one.", de: "Steht in deinem Satz ein „und“? Dann beschreibst du wahrscheinlich zwei Apps und nicht eine." }, { en: "Give the rectangle in terms of the widget, not the screen: what is its size relative to 480x320?", de: "Gib das Rechteck über das Widget an, nicht über den Bildschirm: wie groß ist es im Verhältnis zu 480x320?" }, { en: "The measured cost of a full flush against a small one is in the foundations dirty-rectangle step; use it to say what your discipline buys.", de: "Die gemessenen Kosten eines vollen gegen einen kleinen Flush stehen im Dirty-Rectangle-Step der Grundlagen; sag damit, was deine Disziplin einbringt." } ] }
---

## Ziel

Füge CaDS Zero eine wirklich neue Anwendung hinzu: eine eigene View, ein Widget, ins Menü eingebunden und auf dem echten Panel erreichbar.

**Der erste Handgriff:** öffne `apps/about/cads_about.c` — die kleinste vollständige App im Baum und deine Vorlage. Der nächste Abschnitt sagt, wie.

## Wo du arbeitest

Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `Run Task...`. Eine sichtbare Menüleiste gibt es nicht: die Menüs stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help` öffnet.

**Datei öffnen oder anlegen:** `Strg`/`Cmd`+`P`, dann den Pfad tippen, Enter. Oder ganz links das oberste Symbol der Leiste (Datei-Explorer) und durch den Baum klicken; dort legst du mit der rechten Maustaste auch neue Ordner und Dateien an. Deine Vorlagen:

```
apps/about/cads_about.c
apps/about/CMakeLists.txt
apps/menu/cads_menu_app.c
```

**Bauen:** drücke **`F1`**, tippe `Tasks: Run Task`, Enter, dann **`CaDS: Build`** aus der Liste wählen. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**. (`Strg`/`Cmd`+`Umschalt`+`P` öffnet die Palette auch, wird im Browser aber oft abgefangen; `F1` ist der zuverlässige Weg.) Unten im Terminal-Bereich öffnet sich ein eigenes Terminal mit dem Namen des Tasks; ist der Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und wieder zu. Du siehst CMake und dann den Compiler Datei für Datei. **Wie lange:** beim ersten Mal etwa eine Minute, danach Sekunden. **Erfolg:** die letzte Zeile stammt vom Build-Werkzeug, nicht vom Compiler, und unter `build/itsboard/` liegt eine frische `cads-zero.elf`.

**Aufs Board bringen** (nur wenn du es selbst ansehen willst; die Abnahme verlangt es nicht): **`F1`** → `Tasks: Run Task` → **`CaDS: Build + Flash`**, etwa eine Minute plus rund 15 Sekunden fürs Flashen.

**Prüfen:** im Steptext, dem Reiter in der Mitte namens `CaDS Tutor: Projekt: eigene App mit Widget`. Jede Aufgabe unten hat einen Knopf **Prüfen** und einen Knopf **Hinweis anzeigen**; **Run all checks** oben im Reiter prüft alles auf einmal.

## Drei Bedienfehler, die genau hier passieren

- **Der Task lief, aber die Ausgabe wird im falschen Fenster gesucht.** Sie steht nicht im Steptext und nicht im Editor, sondern unten im Terminal-Bereich in dem Terminal, das den Namen des Tasks trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.
- **Das Terminal geschlossen und damit den Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin; mitten in `CaDS: Build` heißt das, der Build ist abgebrochen und die Objektdateien sind unvollständig — genau die, die die Abnahme liest. Zum Wegklappen `Strg`/`Cmd`+`J` nehmen, das lässt ihn weiterlaufen.
- **Die Palette reagiert nicht auf das Tastenkürzel.** Der Browser hat `Strg`/`Cmd`+`Umschalt`+`P` abgefangen — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

## Worauf du aufbaust

**Voraussetzung:** Bearbeite diesen Projekt-Step erst nach den Grundlagen-Steps `m5-02-view-dispatcher` und `m5-03-own-app`. Der Tutor kann das nicht erzwingen: `requires:` löst nur Steps desselben Packs auf, und die Sperre in `course.json` verlangt den gesamten Grundlagenkurs — die Reihenfolge innerhalb der Projekte liegt bei dir.

## Anforderungen

- Lege eine neue App unter `apps/<name>/` mit eigener CMake-Bibliothek an, nach dem Vorbild von `apps/about`.
- Stelle eine Init-Funktion mit genau dem Namen **`cads_project_app_init(cads_view_dispatcher_t*)`** bereit, die eine `cads_view_t` aufbaut, Titel und Softkeys setzt und eine eindeutige View-ID mit `cads_view_dispatcher_add()` registriert.
- Zeichne **ein Widget** deiner Wahl (eine Anzeige, eine Liste, ein kleines Messfeld) mit der Canvas-API und halte deinen Schaden auf das tatsächlich geänderte Rechteck begrenzt — zeichne nie den ganzen Bildschirm neu. Siehe `docs/reference/canvas.md`.
- Binde sie in den Launcher ein: `#include` deinen Header in `apps/menu/cads_menu_app.c`, rufe `cads_project_app_init(dispatcher)` neben den anderen `cads_*_init`-Aufrufen auf, ergänze eine `cads_menu_item_t`-Zeile mit deiner View-ID und linke deine Bibliothek aus `apps/menu/CMakeLists.txt`.
- Beachte die Beide-Targets-Regel: nichts oberhalb der HAL darf board-only werden, deine App muss also auch für den Host bauen.

<!-- SHOT: p1-menu-entry | Board-Panel, Hauptmenue mit dem neuen Eintrag der eigenen App zwischen den vorhandenen | HARDWARE -->

## Abnahme

Die Substanz-Checks lesen nicht den Quelltext, sondern die **gebauten Objektdateien** unter `build/itsboard`. Ein Kommentar erzeugt keine Symbolreferenz und besteht deshalb keinen von ihnen. **Baue also nach jeder Änderung neu**, bevor du prüfst: **`F1`** → `Tasks: Run Task` → Enter → **`CaDS: Build`**.

1. **Registrierung und Verdrahtung.** Zuerst baut das Board-Image. Danach sucht der Check die Übersetzungseinheit, die `cads_project_app_init` *definiert*, und verlangt in genau dieser Einheit unaufgelöste Referenzen auf `cads_view_dispatcher_add` und `cads_view_set_softkeys` (`nm -u`). Die Objektdatei von `apps/menu/cads_menu_app.c` muss `cads_project_app_init` als undefiniertes Symbol führen — das entsteht nur, wenn das Menü die Funktion wirklich aufruft. Zuletzt muss das Symbol in der ELF stehen.
2. **Schadensdisziplin.** Dieselbe Übersetzungseinheit muss `cads_view_dirty_rect` oder `cads_canvas_damage` referenzieren. Das ist die maschinelle Fassung der Anforderung „zeichne nie den ganzen Bildschirm neu".
3. **Entwurfsverteidigung.** Du nennst die eine Aufgabe und das Rechteck, das sie beschädigt.

Willst du selbst nachsehen, was der Check sieht: öffne ein Terminal mit **☰ → `Terminal` → `New Terminal`** — das Arbeitsverzeichnis ist die Projektwurzel — und lass dir die Symbole deiner Objektdatei zeigen:

```
nm -u $(find build/itsboard -name '*.c.o' -o -name '*.c.obj' | xargs grep -l . 2>/dev/null | head -0) ; find build/itsboard -name '*.c.o' -o -name '*.c.obj'
```

## Liefern

Eine kleine, fokussierte App — ein Bildschirm, der eine Sache gut macht — plus eine kurze Notiz zu den Entwurfsentscheidungen, die du im Review verteidigen würdest.
