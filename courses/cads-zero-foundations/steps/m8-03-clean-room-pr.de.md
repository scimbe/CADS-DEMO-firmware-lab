---
id: m8-03-clean-room-pr
title: Eine Änderung beurteilen, bevor sie ein PR wird
bloom: evaluate
objectives: [cz.quality.cleanroom-pr, firmware-explanation-clean-room]
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
    check: { type: question, prompt: { en: "What is the smallest change that makes the adapted speaker code acceptable in this repository?", de: "Was ist die kleinste Änderung, die den übernommenen Speaker-Code in diesem Repository zulässig macht?" }, rubric: "Keine kleine. Der Code muss aus den Zwängen dieses Boards heraus neu geschrieben werden; Übernehmen oder Transliterieren ist eine Kopie, und GPL-3.0 wandert damit in ein MIT-Projekt, dessen Historie sich nicht ent-GPLen lässt. Umformulieren, Umbenennen oder Umstrukturieren des Originals genügt nicht. Nennt den zulässigen Weg: Upstream lesen, um zu verstehen, was eine gute Handheld-Firmware tut, und die Funktion danach ohne das Original daneben aus den eigenen Anforderungen bauen. Der Prüfstein ist die Frage, warum das Stück so geformt ist. Eine Antwort, die eine Umbenennung oder einen Lizenzhinweis für ausreichend hält, besteht nicht.", bloom: evaluate }
  - id: pin-verdict
    title: Die Pinwahl
    check: { type: question, prompt: { en: "Is the choice of PG0 defensible in a PR that will never be flashed?", de: "Ist die Wahl von PG0 in einem PR vertretbar, der nie geflasht wird?" }, rubric: "Nein. SAFETY.md bindet auch Code, den man nicht ausführt: PF0-7 und PG0-5 sind hochgezogene Eingänge, die der Adapter treiben kann, und zwei Push-Pull-Treiber auf einem Netz ist der Weg, auf dem Boards sterben. Dazu kommt das Argument gegen das Nie-geflasht: gemergter Code wird irgendwann von jemandem gebaut und geflasht, der diesen PR nicht gelesen hat, die Sicherheitsregel gilt also zum Zeitpunkt des Merge, nicht zum Zeitpunkt des Flashens. Bestanden nur mit dem elektrischen Grund; wer nur auf die Regel verweist, ohne sie zu begründen, besteht nicht.", bloom: evaluate }
  - id: reviewable
    title: Was den PR begutachtbar macht
    check: { type: question, prompt: { en: "What is missing before a reviewer can judge this PR at all?", de: "Was fehlt, bevor ein Reviewer diesen PR überhaupt beurteilen kann?" }, rubric: "Mindestens drei Dinge, die unabhängig von den beiden anderen Urteilen fehlen. Erstens die Schichtung: ein Modul darf stm32f4xx.h nicht einbinden, Hardwarezugriff läuft über core/cads_hal.h mit je einer Implementierung unter targets/itsboard und targets/sim, sonst baut das Feature nur für ein Target und ist nicht fertig. Zweitens Host-Unit-Tests für die portable Logik - ein Ton-Scheduler, eine Notentabelle, eine Tastgradberechnung brauchen kein Board, nur die letzten Zeilen am Timer tun das, und die sind das Gate des Maintainers, der die Hardware exklusiv hält. Drittens die Beilagen aus dem Agenten-Workflow: nur die Änderung und nichts Unverwandtes, aktualisierte docs/ROADMAP.md, ein Bench-Hinweis für den geänderten Hardwarepfad und der neue Größenbericht. Eine Antwort mit weniger als zwei dieser Punkte besteht nicht.", bloom: evaluate }
socratic:
  - { trigger: "question:licence-verdict:weak", question: { en: "Clean room's own test is one question: why is it shaped like this? If the honest answer is because that is how they did it, what follows?", de: "Der Clean-Room-Test ist eine Frage: warum ist es so geformt? Wenn die ehrliche Antwort lautet, weil sie es so gemacht haben - was folgt daraus?" }, hints: [ { en: "docs/explanation/clean-room.md treats adapting and transliterating as the same act as copying.", de: "docs/explanation/clean-room.md behandelt Übernehmen und Transliterieren als denselben Akt wie Kopieren." }, { en: "Ask what a licence does to a history rather than to a file, and whether that step can be taken back.", de: "Frag, was eine Lizenz mit einer Historie tut statt mit einer Datei, und ob dieser Schritt zurückgenommen werden kann." }, { en: "There is a legitimate way to end up with the same feature; describe what the contributor would have to be looking at while writing it.", de: "Es gibt einen zulässigen Weg zu demselben Feature; beschreibe, worauf der Contributor beim Schreiben schauen dürfte." } ] }
  - { trigger: "question:pin-verdict:weak", question: { en: "The PR is code, not a board. So what exactly is the harm, and who would encounter it?", de: "Der PR ist Code, kein Board. Worin besteht der Schaden also genau, und wer träfe darauf?" }, hints: [ { en: "docs/SAFETY.md section 3 names two pin groups that are inputs and says why they must stay inputs.", de: "docs/SAFETY.md Abschnitt 3 nennt zwei Pin-Gruppen, die Eingänge sind, und sagt, warum sie Eingänge bleiben müssen." }, { en: "The adapter can drive those nets; ask what happens when two push-pull drivers meet on one net.", de: "Der Adapter kann diese Netze treiben; frag dich, was geschieht, wenn zwei Push-Pull-Treiber auf einem Netz aufeinandertreffen." }, { en: "Merged code gets flashed eventually by someone who did not read this PR - say what that makes of the never-flashed argument.", de: "Gemergter Code wird irgendwann von jemandem geflasht, der diesen PR nicht gelesen hat - sag, was das aus dem Nie-geflasht-Argument macht." } ] }
  - { trigger: "question:reviewable:weak", question: { en: "Separate what is wrong with the design from what is simply absent from the submission. The question asks about the second.", de: "Trenne, was am Entwurf falsch ist, von dem, was der Einreichung schlicht fehlt. Gefragt ist das Zweite." }, hints: [ { en: "A module that includes a vendor header cannot build for one of the two targets; that is an absence, not an opinion.", de: "Ein Modul, das einen Hersteller-Header einbindet, baut für eines der beiden Targets nicht; das ist ein Fehlen, keine Meinung." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR carries; go through that list against this submission.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält; geh diese Liste gegen diese Einreichung durch." }, { en: "The claim that it needs the board is worth testing: name the parts of a tone driver that are portable logic.", de: "Die Behauptung, es brauche das Board, lohnt eine Prüfung: benenne die Teile eines Ton-Treibers, die portable Logik sind." } ] }
---

## Lernziel

Wende die vier stehenden Regeln des Projekts — Clean Room, beide Targets, Sicherheit und der Beitragsworkflow — so an, wie ein Reviewer es täte, auf eine Änderung, die alle vier auf einmal verletzt.

**Der erste Handgriff:** öffne `docs/explanation/clean-room.md` und `docs/SAFETY.md`. Wie das geht, steht gleich hier.

## Wo du in diesem Step arbeitest

Dieser Step startet keinen Task und baut nichts. Du liest vier Dokumente und schreibst drei Urteile.

**Ein Dokument öffnen:** `Strg`/`Cmd`+`P`, dann den Pfad tippen, Enter. Oder ganz links das oberste Symbol der Leiste (Datei-Explorer) und durch den Baum klicken. Die vier Pfade dieses Steps:

```
docs/explanation/clean-room.md
docs/SAFETY.md
docs/how-to/agent-workflow.md
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

Dieser eine Vorschlag verletzt alle vier stehenden Regeln auf einmal. Die drei Aufgaben zerlegen ihn: Lizenz, Pinwahl, Begutachtbarkeit.

## Die vier Regeln, die ein Reviewer hält

**1. Clean Room.** Diese Firmware enthält keinen Code aus `flipperzero-firmware` — nicht kopiert, nicht übernommen, nicht transliteriert. Jenes Projekt steht unter GPL-3.0; einen nennenswerten Teil davon einzubinden macht dieses MIT-Projekt ebenfalls zu GPL, unumkehrbar, denn eine Historie lässt sich nicht ent-GPLen. Upstream zu lesen, um zu verstehen, was eine gute Handheld-Firmware tut, ist erlaubt; eine Funktion mit dem Original daneben neu zu schreiben, ist es nicht. Der Test ist eine Frage: *Warum ist es so geformt?* Lautet die Antwort „weil sie es so gemacht haben", ist es eine Kopie. Lautet sie „weil dieses Display nur beschreibbar ist und 448 ms pro Bild kostet", ist es eigenständige Arbeit (`docs/explanation/clean-room.md`).

**2. Beide Targets.** Alles oberhalb der HAL baut für Board und Simulator. Ein Modul, das `stm32f4xx.h` einbindet, hat die Schichtung gebrochen: Hardwarezugriff läuft über `core/cads_hal.h`, mit einer Implementierung unter `targets/itsboard/` und einer unter `targets/sim/`. Ein Feature, das nur für ein Target baut, ist nicht fertig.

**3. Sicherheit.** `docs/SAFETY.md` ist bindend, auch für Code, den du nicht ausführen kannst. PA13/PA14 und PH0/PH1 werden nie angefasst; PF0..7 und PG0..5 sind hochgezogene Eingänge und werden **nie** als Ausgänge konfiguriert. Den elektrischen Grund nennt `docs/SAFETY.md` Abschnitt 3, und ob er auch für Code gilt, der nie auf ein Board kommt, ist die zweite Aufgabe.

**4. Der Workflow.** Der Maintainer hält die Hardware exklusiv: Contributors flashen nicht, setzen nicht zurück und hängen keinen Debugger an. Du nimmst `swarm-ready`-Issues (in sich geschlossen, hardwarefrei); `hardware-gate`-Punkte gehören dem Maintainer. Was ein begutachtbarer PR außerdem mitbringen muss, listet `docs/how-to/agent-workflow.md` in einem Absatz auf. Geh diese Liste gegen die Einreichung oben durch; die dritte Aufgabe fragt nach dem, was fehlt.

## Bewerten heißt, begründet Nein zu sagen

Ein Review ist kein Abhaken. Die Frage ist, ob jede Regel erfüllt ist, und falls nicht, welche kleinste Änderung sie erfüllt. „Es braucht das Board" trifft auf die *Logik* selten zu: ein Ton-Scheduler, eine Notentabelle, eine Tastgradberechnung sind portabel und auf dem Host testbar; nur die letzten Zeilen, die einen Timer berühren, gehören hinter die HAL, und die sind das Gate des Maintainers.

## Deine Aufgabe

Drei getrennte Urteile zum Vorschlag oben, jedes in seinem Feld unten im Steptext, jedes mit eigenem Knopf **Prüfen**.

1. **Die Lizenz.** Welche kleinste Änderung macht den Code zulässig?
2. **Die Pinwahl.** Hält das Argument „wird ja nie geflasht"?
3. **Die Form.** Was fehlt, bevor ein Reviewer überhaupt anfangen kann?

Der letzte Step verlangt von dir eine Änderung, die dieses Review selbst besteht.
