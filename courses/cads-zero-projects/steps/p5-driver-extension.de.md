---
id: p5-driver-extension
title: "Projekt: eine Treiber-Erweiterung"
bloom: create
objectives: [cz.explorer.extend]
requires: []
estimatedMinutes: 120
scaffold: independent
creates: [cads_project_driver]
links:
  - { file: "apps/bringup/explorer.c" }
  - { doc: "docs/SAFETY.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [apps/bringup/explorer.c, targets/itsboard/hal/hal_pwm.h, docs/SAFETY.md, core/cads_hal.h]
misconceptions:
  - { pattern: "unknown, .[?]. for help", question: { en: "The console did not recognise your letter. Is the case missing from the dispatch, or is the board not reading the console at all?", de: "Die Konsole hat deinen Buchstaben nicht erkannt. Fehlt der Case im Dispatch, oder liest das Board die Konsole gar nicht?" }, hints: [ { en: "The dispatch is a switch on the first character of the line, and letters are case sensitive.", de: "Das Dispatch ist ein switch über das erste Zeichen der Zeile, und Buchstaben unterscheiden Groß- und Kleinschreibung." }, { en: "Send the help command and check whether your letter appears; every taken letter is listed there.", de: "Sende den Hilfebefehl und prüf, ob dein Buchstabe auftaucht; jeder vergebene Buchstabe steht dort." }, { en: "If the board is inside the app tree it never reaches the dispatch - leave it first.", de: "Sitzt das Board im App-Baum, erreicht es das Dispatch nie - verlass ihn zuerst." } ] }
tasks:
  - id: driver-substance
    title: Die Diagnose nutzt die HAL und ist aus der Konsole erreichbar
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_driver$' || continue; nm -u $o | grep -q cads_hal_ && exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'explorer.c.obj' -o -name 'explorer.c.o'); do nm -u $o 2>/dev/null | grep -q cads_project_driver && exit 0; done; exit 1", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_driver" } ] }
  - id: safety-assured
    title: Keine verbotene Pin-Richtung im Quelltext
    check: { type: all, bloom: create, checks: [ { type: fileNotMatches, file: "apps/bringup/explorer.c", pattern: "GPIO[AFGH]->MODER" }, { type: command, cwd: ".", command: "if grep -rqE 'GPIO[FG]->MODER' apps --include=*.c; then exit 1; else exit 0; fi", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige die Sicherheit deiner Diagnose
    check: { type: question, prompt: { en: "Which pin does your tool deliberately leave alone, and what would driving it cost? One sentence per pin you touch, with its direction and its justification against docs/SAFETY.md, plus one sentence on the pin you avoided and the concrete consequence of driving it.", de: "Welchen Pin lässt dein Werkzeug bewusst in Ruhe, und was würde es kosten, ihn zu treiben? Je ein Satz für jeden Pin, den du anfasst, mit Richtung und Begründung gegen docs/SAFETY.md, plus ein Satz zu dem gemiedenen Pin und der konkreten Folge, ihn zu treiben." }, rubric: "Nennt jeden benutzten Pin mit Richtung und begründet jeden gegen docs/SAFETY.md. Nennt dann mindestens einen bewusst gemiedenen Pin mit der konkreten Folge, nicht bloß mit der Regel: PA13/PA14 kosten den Debug-Zugang und damit jedes Flashen über SWD; PH0/PH1 kosten den externen Takt und damit den Bootvorgang; PF0-7 und PG0-5 sind hochgezogene Eingänge, die der Adapter treiben kann, und zwei Push-Pull-Treiber auf einem Netz zerstören Hardware; die RMII-Pins kosten das Ethernet. Eine Antwort, die nur die Regel zitiert, ohne die Folge zu benennen, besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:driver-substance:failed", question: { en: "Four things are checked. Does your handler touch hardware through the HAL, and is it reached from a real dispatch case?", de: "Vier Dinge werden geprüft. Fasst dein Handler Hardware über die HAL an, und wird er aus einem echten Dispatch-Case erreicht?" }, hints: [ { en: "Did you build the board image after your last edit? These sub-checks read the object files under build/itsboard, not the source text.", de: "Hast du das Board-Image nach deiner letzten Änderung gebaut? Diese Teil-Checks lesen die Objektdateien unter build/itsboard, nicht den Quelltext." }, { en: "The check looks for the translation unit that defines cads_project_driver and wants at least one unresolved reference to a cads_hal_ function in it; model the shape on the existing diagnostics in apps/bringup/explorer.c - a case line, a call, a break, and a help line.", de: "Der Check sucht die Übersetzungseinheit, die cads_project_driver definiert, und will darin mindestens eine unaufgelöste Referenz auf eine cads_hal_-Funktion; baue die Form nach den vorhandenen Diagnosen in apps/bringup/explorer.c - eine case-Zeile, ein Aufruf, ein break und eine Hilfezeile." }, { en: "Board-only code needs a sim counterpart or a guard, or the host build stops linking and the board build alone is not enough.", de: "Board-only-Code braucht ein Sim-Gegenstück oder einen Guard, sonst linkt der Host-Build nicht mehr, und der Board-Build allein genügt nicht." } ] }
  - { trigger: "task:safety-assured:failed", question: { en: "Something in the source now configures the direction of a pin group that must stay input. Which group, and what is on those nets?", de: "Irgendetwas im Quelltext konfiguriert jetzt die Richtung einer Pin-Gruppe, die Eingang bleiben muss. Welche Gruppe, und was hängt an diesen Netzen?" }, hints: [ { en: "Did you set a direction yourself, or paste example code that writes a MODER register? The check searches the whole apps/ tree, not only your file.", de: "Hast du eine Richtung selbst gesetzt oder Beispielcode übernommen, der ein MODER-Register schreibt? Der Check sucht im ganzen apps/-Baum, nicht nur in deiner Datei." }, { en: "docs/SAFETY.md section 3 names the groups that are pulled-up inputs and must never become outputs; grep -rn MODER apps shows you every place that sets a direction.", de: "docs/SAFETY.md Abschnitt 3 nennt die Gruppen, die hochgezogene Eingänge sind und nie Ausgänge werden dürfen; grep -rn MODER apps zeigt dir jede Stelle, die eine Richtung setzt." }, { en: "The adapter can drive those nets, and two push-pull drivers on one net is the failure this check exists to prevent. If you need an output, use a pin the HAL already drives - the PWM surface owns one documented as safe.", de: "Der Adapter kann diese Netze treiben, und zwei Push-Pull-Treiber auf einem Netz sind der Fehler, den dieser Check verhindern soll. Brauchst du einen Ausgang, nimm einen Pin, den die HAL schon treibt - die PWM-Oberfläche besitzt einen, der als sicher dokumentiert ist." } ] }
  - { trigger: "question:defend:weak", question: { en: "List every pin your tool reads or drives, with a direction each. Now pick the one you were tempted by and did not take.", de: "Liste jeden Pin auf, den dein Werkzeug liest oder treibt, mit je einer Richtung. Wähl nun den, der dich reizte und den du nicht genommen hast." }, hints: [ { en: "Can you state a direction for every pin your tool touches? If not, you do not yet know what it does to the hardware.", de: "Kannst du für jeden Pin, den dein Werkzeug anfasst, die Richtung nennen? Wenn nicht, weißt du noch nicht, was es der Hardware antut." }, { en: "docs/SAFETY.md lists four groups that are off limits for different reasons: the debug pins, the oscillator pins, the pulled-up inputs, and the RMII set. Read what each one carries.", de: "docs/SAFETY.md listet vier Gruppen, die aus verschiedenen Gründen tabu sind: die Debug-Pins, die Oszillator-Pins, die hochgezogenen Eingänge und der RMII-Satz. Lies nach, was an jeder hängt." }, { en: "The cost is not always a dead board - one group costs you the debugger, another the clock, another the network. Which one did you avoid?", de: "Der Preis ist nicht immer ein totes Board - eine Gruppe kostet dich den Debugger, eine andere den Takt, eine andere das Netzwerk. Welche hast du gemieden?" } ] }
---
## Ziel

Erweitere die Treiberoberfläche des Boards um eine neue Hardware-Diagnose — eine wirklich nützliche Messung oder einen Generator — erreichbar aus der Explorer-Konsole und nachweislich sicher.

## Worauf du aufbaust

**Voraussetzung:** Bearbeite diesen Projekt-Step erst nach den Grundlagen-Steps `m2-02-mmio-gpio` und `m2-05-explorer-command`. Der Tutor kann das nicht erzwingen: `requires:` löst nur Steps desselben Packs auf, und die Sperre in `course.json` verlangt den gesamten Grundlagenkurs — die Reihenfolge innerhalb der Projekte liegt bei dir.

Dieses Projekt setzt die Grundlagen-Steps zum Ergänzen eines Explorer-Befehls (m2-05-explorer-command) und zum Ansteuern von GPIO (m2-02-mmio-gpio) voraus sowie die verbindlichen Regeln in `docs/SAFETY.md`. Die vorhandenen Diagnosen in `apps/bringup/explorer.c` (der Frequenzzähler `F`, der PWM-Generator `D` auf PE5, der Logikanalysator `L`) sind deine Vorbilder.

## Anforderungen

- Baue einen Handler mit genau dem Namen **`cads_project_driver`**, der echte Hardware nutzt: eine Zeitmessung, einen Signalgenerator, eine Bus-Sonde oder Ähnliches. Erreiche ihn über einen Case im Explorer-Dispatch (`switch(line[0])`) und eine Hilfezeile in `cads_help()`.
- Bevorzuge die HAL. Für PWM treibt `cads_hal_pwm_start()/stop()` bereits PE5 (Adapter OUT13, TIM9_CH1) — der einzige wirklich PWM-fähige OUT-Pin — und gibt ihn sauber zurück. Nutze eine HAL-Oberfläche, statt rohe Timer-Register zu schreiben.
- **Sicherheit ist die harte Anforderung.** Konfiguriere PF0-7 oder PG0-5 nie als Ausgänge; berühre nie PA13/PA14 (SWD) oder PH0/PH1 (HSE); überlasse die RMII-Pins dem Ethernet-Treiber. Braucht dein Werkzeug einen Jumper (wie der Durchgangstest `K`), sage es, und behandle „nichts verdrahtet" als wohlgeformtes negatives Ergebnis, nicht als Fehler.
- Halte den Host-Build linkfähig: trenne board-only-Code so wie die vorhandenen `explorer_*_demo.c` / `_sim.c`-Paare.

## Abnahme

Die Sicherheitsregel wird hier **maschinell** geprüft, nicht nur erfragt.

1. **Substanz und Erreichbarkeit.** Zuerst baut das Board-Image. Danach muss die **Objektdatei** der Übersetzungseinheit, die `cads_project_driver` *definiert*, mindestens eine unaufgelöste Referenz auf eine `cads_hal_`-Funktion führen — ein leerer Rumpf ist keine Hardware-Diagnose, und ein Kommentar erzeugt keine Referenz. Die Objektdatei von `apps/bringup/explorer.c` muss `cads_project_driver` als undefiniertes Symbol führen, dein `case` den Handler also wirklich aufrufen; und das Symbol muss in der ELF stehen.
2. **Sicherheitszusicherung.** Zwei Checks, die *scheitern*, wenn du die Regel brichst: `apps/bringup/explorer.c` darf keine Richtungskonfiguration der Ports A, F, G oder H enthalten, und im gesamten `apps/`-Baum darf `GPIO[FG]->MODER` nirgends auftauchen. Damit ist „nie als Ausgänge konfigurieren" keine Bitte mehr, sondern eine Abnahmebedingung.
3. **Verteidigung.** Du nennst jeden berührten Pin und einen, den du bewusst in Ruhe lässt.

## Liefern

Eine Hardware-Diagnose, die etwas Echtes misst oder erzeugt, mit einem schriftlichen Sicherheitsargument für jeden berührten Pin.
