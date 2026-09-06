---
id: m8-03-clean-room-pr
title: Eine Änderung beurteilen, bevor sie ein PR wird
bloom: evaluate
objectives: [cz.quality.cleanroom-pr, firmware-explanation-clean-room]
recallFrom: [m1-01-module-layout, m7-02-udp-hello, m7-05-pa7-network-eval]
requires: [m8-02-golden-images]
estimatedMinutes: 20
scaffold: independent
links:
  - { doc: "docs/explanation/clean-room.md" }
  - { doc: "docs/how-to/agent-workflow.md" }
  - { doc: "docs/SAFETY.md" }
  - { step: m8-04-capstone }
sources: [docs/explanation/clean-room.md, docs/how-to/agent-workflow.md, docs/SAFETY.md, docs/reference/module-layout.md]
tasks:
  - id: licence-verdict
    title: Das Lizenzurteil
    check: { type: question, prompt: { en: "What is the smallest change that makes the adapted speaker code acceptable in this repository?", de: "Was ist die kleinste Änderung, die den übernommenen Speaker-Code in diesem Repository zulässig macht?" }, rubric: "Keine kleine. Der Code muss aus den Zwängen dieses Boards heraus neu geschrieben werden; Übernehmen oder Transliterieren ist eine Kopie, und GPL-3.0 wandert damit in ein MIT-Projekt, dessen Historie sich nicht ent-GPLen lässt. Umformulieren, Umbenennen oder Umstrukturieren des Originals genügt nicht. Nennt den zulässigen Weg: Upstream lesen, um zu verstehen, was eine gute Handheld-Firmware tut, und die Funktion danach ohne das Original daneben aus den eigenen Anforderungen bauen. Der Prüfstein ist die Frage, warum das Stück so geformt ist. Eine Antwort, die eine Umbenennung oder einen Lizenzhinweis für ausreichend hält, besteht nicht. Und noch etwas gehört in die Antwort, seit dieser Step ein Lint verlangt: Regel 1 dieses Lints findet einen fehlenden `furi_`-Präfix und sonst nichts. Sie belegt keine Herkunft. Ein Stück Code, das aus dem Original abgeschrieben und danach sauber umbenannt wurde, geht durch jedes Lint der Welt; ob es aus den Zwängen dieses Boards entstanden ist oder daneben abgetippt wurde, kann keine Maschine sehen. Wer das Bestehen des Lints als Lizenznachweis ausgibt, hat den Prüfstein nicht verstanden und besteht nicht.", bloom: evaluate }
  - id: pin-verdict
    title: Die Pinwahl
    check: { type: question, prompt: { en: "Is the choice of PG0 defensible in a PR that will never be flashed?", de: "Ist die Wahl von PG0 in einem PR vertretbar, der nie geflasht wird?" }, rubric: "Nein. SAFETY.md bindet auch Code, den man nicht ausführt: PF0-7 und PG0-5 sind hochgezogene Eingänge, die der Adapter treiben kann, und zwei Push-Pull-Treiber auf einem Netz ist der Weg, auf dem Boards sterben. Dazu kommt das Argument gegen das Nie-geflasht: gemergter Code wird irgendwann von jemandem gebaut und geflasht, der diesen PR nicht gelesen hat, die Sicherheitsregel gilt also zum Zeitpunkt des Merge, nicht zum Zeitpunkt des Flashens. Bestanden nur mit dem elektrischen Grund; wer nur auf die Regel verweist, ohne sie zu begründen, besteht nicht.", bloom: evaluate }
  - id: review-lint
    title: Schreib die drei maschinellen Regeln als Lint
    check: { type: command, cwd: ".", command: "L=tools/review_lint.py; [ -f $L ] || exit 1; python3 $L . >/dev/null || exit 1; ok=0; for r in 1 2 3; do d=$(mktemp -d); mkdir -p $d/gui $d/apps; case $r in 1) echo 'void furi_record_open(void);' > $d/gui/twin.c;; 2) echo '#include <stm32f4xx.h>' > $d/gui/twin.c;; 3) echo 'void f(void){ GPIOF->MODER = 0; }' > $d/apps/twin.c;; esac; python3 $L $d >/dev/null && ok=1; rm -rf $d; done; exit $ok", expectExitCode: 0, bloom: create }
socratic:
  - { trigger: "task:review-lint:failed", question: { en: "Your lint is run against four trees, not one. Which of them does it get wrong - the clean one, or one of the three twins?", de: "Dein Lint läuft gegen vier Bäume, nicht gegen einen. Bei welchem liegt es falsch — dem sauberen oder einem der drei Zwillinge?" }, hints: [ { en: "Run it by hand on the project root first: python3 tools/review_lint.py . must print nothing and exit 0.", de: "Führ es zuerst von Hand auf der Projektwurzel aus: python3 tools/review_lint.py . darf nichts drucken und muss mit 0 enden." }, { en: "Then build a throwaway tree yourself: a directory with a gui/ subdirectory, one .c file in it, one violation, and run the lint on that directory.", de: "Bau dir dann selbst einen Wegwerfbaum: ein Verzeichnis mit einem Unterverzeichnis gui/, darin eine .c-Datei mit genau einer Verletzung, und lass das Lint auf dieses Verzeichnis los." }, { en: "The three rules scan different directory sets. Rule 1 covers five, rule 2 covers three, rule 3 covers apps only - a lint that scans one fixed set cannot pass all three twins.", de: "Die drei Regeln durchsuchen verschiedene Verzeichnismengen. Regel 1 fünf, Regel 2 drei, Regel 3 nur apps — ein Lint mit einer einzigen festen Menge kann nicht alle drei Zwillinge bestehen." } ] }
  - { trigger: "question:licence-verdict:weak", question: { en: "Clean room's own test is one question: why is it shaped like this? If the honest answer is because that is how they did it, what follows?", de: "Der Clean-Room-Test ist eine Frage: warum ist es so geformt? Wenn die ehrliche Antwort lautet, weil sie es so gemacht haben - was folgt daraus?" }, hints: [ { en: "docs/explanation/clean-room.md treats adapting and transliterating as the same act as copying.", de: "docs/explanation/clean-room.md behandelt Übernehmen und Transliterieren als denselben Akt wie Kopieren." }, { en: "Ask what a licence does to a history rather than to a file, and whether that step can be taken back.", de: "Frag, was eine Lizenz mit einer Historie tut statt mit einer Datei, und ob dieser Schritt zurückgenommen werden kann." }, { en: "There is a legitimate way to end up with the same feature; describe what the contributor would have to be looking at while writing it.", de: "Es gibt einen zulässigen Weg zu demselben Feature; beschreibe, worauf der Contributor beim Schreiben schauen dürfte." } ] }
  - { trigger: "question:pin-verdict:weak", question: { en: "The PR is code, not a board. So what exactly is the harm, and who would encounter it?", de: "Der PR ist Code, kein Board. Worin besteht der Schaden also genau, und wer träfe darauf?" }, hints: [ { en: "docs/SAFETY.md section 3 names two pin groups that are inputs and says why they must stay inputs.", de: "docs/SAFETY.md Abschnitt 3 nennt zwei Pin-Gruppen, die Eingänge sind, und sagt, warum sie Eingänge bleiben müssen." }, { en: "The adapter can drive those nets; ask what happens when two push-pull drivers meet on one net.", de: "Der Adapter kann diese Netze treiben; frag dich, was geschieht, wenn zwei Push-Pull-Treiber auf einem Netz aufeinandertreffen." }, { en: "Merged code gets flashed eventually by someone who did not read this PR - say what that makes of the never-flashed argument.", de: "Gemergter Code wird irgendwann von jemandem geflasht, der diesen PR nicht gelesen hat - sag, was das aus dem Nie-geflasht-Argument macht." } ] }
---

## Lernziel

Wende drei der vier stehenden Regeln des Projekts — Clean Room, beide Targets und Sicherheit — so an, wie ein Reviewer es täte, auf eine Änderung, die alle vier auf einmal verletzt. Die vierte, der Beitragsworkflow, ist der nächste Step.

**Der erste Handgriff:** öffne `docs/explanation/clean-room.md` und `docs/SAFETY.md`. Wie das geht, steht gleich hier.

## Drei Maßstäbe, die du schon hast

Du beurteilst diese Änderung mit dem, was du schon gemessen hast: der Schichtregel aus **M1-01**, an der ein `#include "stm32f4xx.h"` im falschen Verzeichnis scheitert; der Beide-Targets-Regel, an der deine eigene Netzänderung aus **M7-02** sich messen lassen musste; und der Frage aus **M7-05**, was eine Pinentscheidung das Netzwerk kostet.

## Wo du in diesem Step arbeitest

Dieser Step baut nichts, aber er verlangt am Ende ein kleines Werkzeug. Du liest drei Dokumente, schreibst zwei Urteile und ein Lint.

**Ein Dokument öffnen:** `Strg`/`Cmd`+`P`, dann den Pfad tippen, Enter. Oder ganz links das oberste Symbol der Leiste (Datei-Explorer) und durch den Baum klicken. Die vier Pfade dieses Steps:

```
docs/explanation/clean-room.md
docs/SAFETY.md
docs/reference/module-layout.md
```

**Deine Antworten schreibst du im Steptext**, dem Reiter in der Mitte mit dem Namen `CaDS Tutor: Eine Änderung beurteilen, bevor sie ein PR wird`. Der Kursbaum steht links in der Seitenleiste, hinter dem Doktorhut-Symbol in der Leiste ganz links. Jede der drei Aufgaben unten im Steptext hat einen Knopf **Prüfen** und einen Knopf **Hinweis anzeigen**; der Knopf **Run all checks** oben im Reiter prüft alle drei auf einmal.

**Wenn ein Tastenkürzel nichts tut:** Der Browser fängt `Strg`/`Cmd`+`Umschalt`+`P` oft ab — die Befehlspalette erreichst du zuverlässig mit **`F1`**, und alles, was sie kann, geht auch über das Symbol mit den drei Strichen (**☰**) ganz oben links, das `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help` öffnet. Die Bedienoberfläche ist englisch, der Kurstext deutsch. Die beiden anderen klassischen Bedienfehler — die Ausgabe eines Tasks im falschen Fenster suchen und ein Terminal schließen, das noch etwas ausführt — können dir hier nicht passieren, weil dieser Step nichts startet; ab dem nächsten Step wieder.

## Der Vorschlag, den du beurteilst

Ein Contributor öffnet einen PR:

> **`[M?] Tone-App: Piepser über Piezo`** — Eine neue App *Tone*, übernommen aus dem Speaker-Service von
> `flipperzero-firmware` und an unsere View-API angepasst. Der Treiber liegt in `modules/tone` und bindet
> `stm32f4xx.h` direkt ein, um den Timer zu programmieren; er konfiguriert **PG0** als Push-Pull-Ausgang, an dem
> ein Piezo hängt. Kein Host-Test, „weil es das Board braucht". Sonst nichts im PR.

Dieser eine Vorschlag verletzt alle vier stehenden Regeln auf einmal. Hier zerlegst du drei davon: Lizenz, Pinwahl und die maschinell prüfbare Spur. Die vierte — was der Einreichung als Ganzes fehlt — ist der nächste Step.

## Die vier Regeln, die ein Reviewer hält

**1. Clean Room.** Diese Firmware enthält keinen Code aus `flipperzero-firmware` — nicht kopiert, nicht übernommen, nicht transliteriert. Jenes Projekt steht unter GPL-3.0; einen nennenswerten Teil davon einzubinden macht dieses MIT-Projekt ebenfalls zu GPL, unumkehrbar, denn eine Historie lässt sich nicht ent-GPLen. Upstream zu lesen, um zu verstehen, was eine gute Handheld-Firmware tut, ist erlaubt; eine Funktion mit dem Original daneben neu zu schreiben, ist es nicht. Der Test ist eine Frage: *Warum ist es so geformt?* Lautet die Antwort „weil sie es so gemacht haben", ist es eine Kopie. Lautet sie „weil dieses Display nur beschreibbar ist und 448 ms pro Bild kostet", ist es eigenständige Arbeit (`docs/explanation/clean-room.md`).

**2. Beide Targets.** Alles oberhalb der HAL baut für Board und Simulator. Ein Modul, das `stm32f4xx.h` einbindet, hat die Schichtung gebrochen: Hardwarezugriff läuft über `core/cads_hal.h`, mit einer Implementierung unter `targets/itsboard/` und einer unter `targets/sim/`. Ein Feature, das nur für ein Target baut, ist nicht fertig.

**3. Sicherheit.** `docs/SAFETY.md` ist bindend, auch für Code, den du nicht ausführen kannst. PA13/PA14 und PH0/PH1 werden nie angefasst; PF0..7 und PG0..5 sind hochgezogene Eingänge und werden **nie** als Ausgänge konfiguriert. Den elektrischen Grund nennt `docs/SAFETY.md` Abschnitt 3, und ob er auch für Code gilt, der nie auf ein Board kommt, ist die zweite Aufgabe.

## Bewerten heißt, begründet Nein zu sagen

Ein Review ist kein Abhaken. Die Frage ist, ob jede Regel erfüllt ist, und falls nicht, welche kleinste Änderung sie erfüllt. Ein Nein ohne diese kleinste Änderung ist für den Autor wertlos.


> **Was das Lint nicht zeigt.** Regel 1 prüft ein Kennzeichen, keine Herkunft. Ein sauber umbenanntes Plagiat besteht sie; ein von Grund auf eigener Treiber, der zufällig `furi_` im Kommentar erwähnt, fällt durch. Der Prüfstein aus `docs/explanation/clean-room.md` bleibt eine Frage an den Autor — *warum ist das Stück so geformt?* — und die beantwortet kein Programm. Ein grünes Lint ist deshalb eine notwendige, keine hinreichende Bedingung.

## Von drei der vier Regeln bleibt eine Maschine übrig


Ein Reviewer prüft die vier stehenden Regeln von Hand. Drei davon haben eine Spur, die ein Programm sehen kann, und die letzte Aufgabe dieses Steps verlangt, dass du sie schreibst: `tools/review_lint.py <verzeichnis>` durchsucht einen Baum und endet mit 0, wenn er sauber ist, sonst mit einem Wert ungleich 0, und druckt je Fund eine Zeile, die die verletzte Regel benennt.

1. **Clean Room** — kein Bezeichner mit dem Präfix `furi_` unter `apps`, `gui`, `modules`, `services`, `core`. `docs/explanation/clean-room.md` nennt den Präfix `cads_` selbst „das sichtbare Kennzeichen“.
2. **Beide Targets** — kein `stm32f4xx.h` unter `gui`, `apps`, `services`; Hardwarezugriff läuft über die HAL.
3. **Sicherheit** — kein Schreibzugriff auf `GPIOF->MODER` oder `GPIOG->MODER` unter `apps`; das sind die hochgezogenen Eingänge aus M2-04.

Geprüft wird dein Lint gegen **vier** Bäume: den echten, den es durchwinken muss, und drei Wegwerfbäume, die der Check selbst anlegt — je einer mit genau einer Verletzung. Ein Lint, das nur eine der drei Regeln kennt, fällt deshalb durch, und ein Lint, das immer meckert, ebenso.

Was dieses Lint **nicht** kann, steht im Abschnitt über das Lizenzurteil: Regel 1 sieht ein Kennzeichen, keine Herkunft.

## Deine Aufgabe

Zwei Urteile zum Vorschlag oben und ein Werkzeug, jedes in seinem Feld unten im Steptext.

1. **Die Lizenz.** Welche kleinste Änderung macht den Code zulässig?
2. **Die Pinwahl.** Hält das Argument „wird ja nie geflasht"?
3. **Das Lint.** Schreib die drei maschinell prüfbaren Regeln als ausführbares Werkzeug.

Der nächste Step fragt, was der Einreichung als Ganzes fehlt.
