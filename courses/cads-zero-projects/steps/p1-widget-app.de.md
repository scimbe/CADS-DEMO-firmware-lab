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
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_app_init' apps --include=*.c | xargs -r grep -l cads_view_dispatcher_add | xargs -r grep -l cads_view_set_softkeys | grep -q .", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE 'cads_project_app_init[[:space:]]*\\([a-z]' apps/menu/cads_menu_app.c", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_app_init" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: damage-discipline
    title: Deine App meldet ihr Damage
    check: { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_app_init' apps --include=*.c | xargs -r grep -lE 'cads_view_dirty_rect|cads_canvas_damage' | grep -q .", expectExitCode: 0, bloom: create }
  - id: defend
    title: Verteidige den Entwurf
    check: { type: question, prompt: { en: "What is your app's one job, and which rectangle does it damage when that job produces an update?", de: "Was ist die eine Aufgabe deiner App, und welches Rechteck beschädigt sie, wenn diese Aufgabe eine Aktualisierung erzeugt?" }, rubric: "Nennt einen klaren Einzelzweck in einem Satz ohne und. Benennt das Widget und das Rechteck, das es bei einer Aktualisierung beschädigt, mit einer Größenangabe im Verhältnis zur Fläche 480x320. Und begründet, was diese Disziplin einbringt: ein kleines Update kostet Millisekunden, ein Vollbild rund 448 ms, und der Ethernet-Empfänger ist währenddessen aus. Eine Antwort ohne ein konkretes Rechteck besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:app-substance:failed", question: { en: "The check wants four things at once. Which of them fails - the app's own file, the menu call, the symbol, or the build?", de: "Der Check will vier Dinge auf einmal. Welches davon scheitert - die eigene Datei der App, der Menü-Aufruf, das Symbol oder der Build?" }, hints: [ { en: "An empty init function passes the linker but not this check: the same file must also register a view and set soft keys.", de: "Eine leere Init-Funktion besteht den Linker, aber nicht diesen Check: dieselbe Datei muss auch eine View registrieren und Soft-Keys setzen." }, { en: "Model the whole shape on apps/about: a view, soft keys, and a cads_view_dispatcher_add() with a unique view id.", de: "Baue die ganze Form nach apps/about: eine View, Soft-Keys und ein cads_view_dispatcher_add() mit einer eindeutigen View-ID." }, { en: "The menu side needs the include, a call with the dispatcher as its argument, and a cads_menu_item_t row pointing at your view id.", de: "Die Menü-Seite braucht den Include, einen Aufruf mit dem Dispatcher als Argument und eine cads_menu_item_t-Zeile, die auf deine View-ID zeigt." } ] }
  - { trigger: "task:damage-discipline:failed", question: { en: "Your app draws something. What tells the canvas which part of the screen has to be pushed to the panel?", de: "Deine App zeichnet etwas. Was sagt dem Canvas, welcher Teil des Bildschirms zum Panel geschoben werden muss?" }, hints: [ { en: "Widgets track their own damage; a view forwards it for exactly the widget's rectangle.", de: "Widgets verfolgen ihr eigenes Damage; eine View reicht es für genau das Rechteck des Widgets weiter." }, { en: "apps/about does this in its input callback, only when the widget reports itself dirty.", de: "apps/about tut das in seinem input-Callback, nur wenn das Widget sich als dirty meldet." }, { en: "Widgets that write the framebuffer directly must announce their own damage instead - either route satisfies this check.", de: "Widgets, die den Framebuffer direkt beschreiben, müssen ihr Damage selbst melden - beide Wege bestehen diesen Check." } ] }
  - { trigger: "question:defend:weak", question: { en: "Say what the app is for in one sentence, then say which pixels change when its state changes. If the second answer is all of them, why?", de: "Sag in einem Satz, wofür die App da ist, und dann, welche Pixel sich ändern, wenn sich ihr Zustand ändert. Wenn die Antwort alle lautet - warum?" }, hints: [ { en: "One job means one sentence without an and; if you need two, the app is two apps.", de: "Eine Aufgabe heißt ein Satz ohne und; brauchst du zwei, ist die App zwei Apps." }, { en: "Give the rectangle in terms of the widget, not the screen: what is its size relative to 480x320?", de: "Gib das Rechteck über das Widget an, nicht über den Bildschirm: wie groß ist es im Verhältnis zu 480x320?" }, { en: "The measured cost of a full flush against a small one is in the foundations dirty-rectangle step; use it to say what your discipline buys.", de: "Die gemessenen Kosten eines vollen gegen einen kleinen Flush stehen im Dirty-Rectangle-Step der Grundlagen; sag damit, was deine Disziplin einbringt." } ] }
---
## Ziel

Füge CaDS Zero eine wirklich neue Anwendung hinzu: eine eigene View, ein Widget, ins Menü eingebunden und auf dem echten Panel erreichbar.

## Worauf du aufbaust

Dieses Projekt setzt das Grundlagen-Modul M5 voraus, besonders den Step, in dem du deine eigene Menü-App ergänzt hast (m5-03-own-app), und das View-/Dispatcher-Modell (m5-02-view-dispatcher). Lies `apps/about/cads_about.c` erneut — es ist die kleinste vollständige App im Baum und deine beste Vorlage.

## Anforderungen

- Lege eine neue App unter `apps/<name>/` mit eigener CMake-Bibliothek an, nach dem Vorbild von `apps/about`.
- Stelle eine Init-Funktion mit genau dem Namen **`cads_project_app_init(cads_view_dispatcher_t*)`** bereit, die eine `cads_view_t` aufbaut, Titel und Softkeys setzt und eine eindeutige View-ID mit `cads_view_dispatcher_add()` registriert.
- Zeichne **ein Widget** deiner Wahl (eine Anzeige, eine Liste, ein kleines Messfeld) mit der Canvas-API und halte deinen Schaden auf das tatsächlich geänderte Rechteck begrenzt — zeichne nie den ganzen Bildschirm neu. Siehe `docs/reference/canvas.md`.
- Binde sie in den Launcher ein: `#include` deinen Header in `apps/menu/cads_menu_app.c`, rufe `cads_project_app_init(dispatcher)` neben den anderen `cads_*_init`-Aufrufen auf, ergänze eine `cads_menu_item_t`-Zeile mit deiner View-ID und linke deine Bibliothek aus `apps/menu/CMakeLists.txt`.
- Beachte die Beide-Targets-Regel: nichts oberhalb der HAL darf board-only werden, deine App muss also auch für den Host bauen.

## Abnahme

Die Checks prüfen Substanz, nicht Absicht — ein leerer Funktionsrumpf mit dem richtigen Namen besteht keinen davon.

1. **Registrierung und Verdrahtung.** Die Datei, die `cads_project_app_init` *definiert*, muss auch `cads_view_dispatcher_add()` aufrufen und `cads_view_set_softkeys()` setzen; `apps/menu/cads_menu_app.c` muss die Funktion mit einem Argument aufrufen (ein Kommentar oder eine bloße Include-Zeile genügt nicht); das Symbol muss in der ELF sein; und das Board-Image muss bauen.
2. **Schadensdisziplin.** Dieselbe Datei muss `cads_view_dirty_rect()` oder `cads_canvas_damage()` benutzen. Das ist die maschinelle Fassung der Anforderung „zeichne nie den ganzen Bildschirm neu".
3. **Entwurfsverteidigung.** Du nennst die eine Aufgabe und das Rechteck, das sie beschädigt.

## Liefern

Eine kleine, fokussierte App — ein Bildschirm, der eine Sache gut macht — plus eine kurze Notiz zu den Entwurfsentscheidungen, die du im Review verteidigen würdest.
