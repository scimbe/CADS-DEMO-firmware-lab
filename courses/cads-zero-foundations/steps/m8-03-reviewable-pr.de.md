---
id: m8-03-reviewable-pr
title: Was eine Einreichung begutachtbar macht
bloom: evaluate
objectives: [cz.quality.contribution]
requires: [m8-03-clean-room-pr]
recallFrom: [m4-02-ram-budget]
estimatedMinutes: 15
scaffold: independent
links:
  - { doc: "docs/how-to/agent-workflow.md" }
  - { step: m8-04-capstone }
sources: [docs/how-to/agent-workflow.md, docs/reference/module-layout.md]
tasks:
  - id: reviewable
    title: Was der Einreichung fehlt
    check: { type: question, prompt: { en: "What is missing before a reviewer can judge this PR at all?", de: "Was fehlt, bevor ein Reviewer diesen PR überhaupt beurteilen kann?" }, rubric: "Mindestens drei Dinge, die unabhängig von Lizenz und Pinwahl fehlen. Erstens Host-Unit-Tests für die portable Logik - ein Ton-Scheduler, eine Notentabelle, eine Tastgradberechnung brauchen kein Board, nur die letzten Zeilen am Timer tun das, und die sind das Gate des Maintainers; die Begruendung, es brauche das Board, gilt also fuer die Logik nicht. Zweitens die Beilagen aus dem Beitragsworkflow: nur die Aenderung und nichts Unverwandtes, eine aktualisierte docs/ROADMAP.md, ein Bench-Hinweis fuer den geaenderten Hardwarepfad, und der neue Groessenbericht, wenn sich der Speicherbedarf verschiebt. Drittens die Schichtung als Fehlen gelesen: ein Modul, das stm32f4xx.h einbindet, baut fuer eines der beiden Targets nicht, es fehlt also eine Implementierung unter targets/sim. Eine Antwort mit weniger als zwei dieser Punkte besteht nicht, und eine, die nur wiederholt, was am Entwurf falsch ist, statt zu sagen, was der Einreichung fehlt, ebenfalls nicht.", bloom: evaluate }
  - id: pr-ready
    title: Schreib die zwei entscheidbaren Beilagen als Werkzeug
    check: { type: command, cwd: ".", command: "T=tools/pr_ready.py; [ -f $T ] || exit 1; { echo modules/tone/tone.c; echo docs/ROADMAP.md; echo tests/unit/test_tone.c; } | python3 $T >/dev/null || exit 1; { echo modules/tone/tone.c; echo tests/unit/test_tone.c; } | python3 $T >/dev/null && exit 1; { echo modules/tone/tone.c; echo docs/ROADMAP.md; } | python3 $T >/dev/null && exit 1; exit 0", expectExitCode: 0, bloom: create }
socratic:
  - { trigger: "question:reviewable:weak", question: { en: "Separate what is wrong with the design from what is simply absent from the submission. The question asks about the second.", de: "Trenne, was am Entwurf falsch ist, von dem, was der Einreichung schlicht fehlt. Gefragt ist das Zweite." }, hints: [ { en: "A module that includes a vendor header cannot build for one of the two targets; that is an absence, not an opinion.", de: "Ein Modul, das einen Hersteller-Header einbindet, baut für eines der beiden Targets nicht; das ist ein Fehlen, keine Meinung." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR carries; go through that list against this submission.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält; geh diese Liste gegen diese Einreichung durch." }, { en: "The claim that it needs the board is worth testing: name the parts of a tone driver that are portable logic.", de: "Die Behauptung, es brauche das Board, lohnt eine Prüfung: benenne die Teile eines Ton-Treibers, die portable Logik sind." } ] }
  - { trigger: "task:pr-ready:failed", question: { en: "Your tool is run against three lists of changed paths, not one. Which of the three does it get wrong?", de: "Dein Werkzeug läuft gegen drei Listen geänderter Pfade, nicht gegen eine. Bei welcher der drei liegt es falsch?" }, hints: [ { en: "Try it by hand: echo three paths into it and read what it prints. A tool that always complains fails just as surely as one that never does.", de: "Probier es von Hand: schick ihm drei Pfade und lies, was es druckt. Ein Werkzeug, das immer meckert, fällt genauso sicher durch wie eines, das nie meckert." }, { en: "Two enclosures are decidable from the path list alone: an updated docs/ROADMAP.md, and something under tests/ when portable code changed.", de: "Zwei Beilagen sind allein aus der Pfadliste entscheidbar: eine aktualisierte docs/ROADMAP.md, und etwas unter tests/, wenn portabler Code geändert wurde." }, { en: "It reads the paths from standard input, one per line, so `git diff --name-only | python3 tools/pr_ready.py` is the real use.", de: "Es liest die Pfade von der Standardeingabe, einen je Zeile, sodass `git diff --name-only | python3 tools/pr_ready.py` der echte Anwendungsfall ist." } ] }
---

## Lernziel

Beurteile, ob eine Einreichung überhaupt begutachtbar ist — unabhängig davon, ob ihr Entwurf gut ist. Es geht um das, was fehlt: die Beilagen des Beitragsworkflows und die Logik, die man ohne Board hätte testen können.

## Die Zahl aus M4 ist eine der Beilagen

Eine der Beilagen, die ein PR mitbringen muss, ist der neue Größenbericht, sobald sich der Speicherbedarf verschiebt — genau die Marge, die du in **M4-02** vorhergesagt und gemessen hast und die `scripts/check_ram_budget.py` über der 48-KB-Untergrenze bewacht. Ohne sie muss ein Reviewer raten, ob die Änderung ins Bild passt.

## Derselbe Vorschlag, andere Frage

Der PR aus dem vorigen Step steht weiter: eine App *Tone*, aus fremdem Code übernommen, mit `stm32f4xx.h` in einem Modul, mit **PG0** als Ausgang, ohne Host-Test, „weil es das Board braucht". Lizenz und Pinwahl hast du beurteilt. Hier zählt nur, was der Einreichung als Paket fehlt.

## Die vierte Regel: der Workflow

Der Maintainer hält die Hardware exklusiv: Contributors flashen nicht, setzen nicht zurück und hängen keinen Debugger an. Du nimmst `swarm-ready`-Issues — in sich geschlossen und hardwarefrei —, `hardware-gate`-Punkte gehören dem Maintainer.

Was ein begutachtbarer PR mitbringt, listet `docs/how-to/agent-workflow.md` in einem Absatz auf: nur die Änderung und nichts Unverwandtes, Tests, wo die Logik sie zulässt, eine aktualisierte `docs/ROADMAP.md`, ein Bench-Hinweis für jeden geänderten Hardwarepfad und der neue Größenbericht bei verschobenem Speicherbedarf.

„Es braucht das Board" trifft auf die *Logik* selten zu: ein Ton-Scheduler, eine Notentabelle, eine Tastgradberechnung sind portabel und auf dem Host testbar; nur die letzten Zeilen, die einen Timer berühren, gehören hinter die HAL. Wer das Argument ungeprüft stehen lässt, verschiebt Arbeit auf den einzigen Menschen, der die Hardware hat.

## Zwei der Beilagen kann eine Maschine sehen

Ein Lint kann keine Absicht lesen, aber es kann eine Dateiliste lesen. Die zweite Aufgabe verlangt `tools/pr_ready.py`: es nimmt die geänderten Pfade zeilenweise von der Standardeingabe und endet mit 0, wenn die Einreichung die zwei entscheidbaren Beilagen trägt.

1. Wurde Quellcode unter `apps`, `gui`, `modules`, `services`, `core` oder `targets` geändert, muss `docs/ROADMAP.md` in der Liste stehen.
2. Wurde portabler Code geändert, muss etwas unter `tests/` mitgeändert worden sein.

Im echten Gebrauch ist das eine Pipeline: `git diff --name-only | python3 tools/pr_ready.py`. Geprüft wird dein Werkzeug gegen drei Listen — eine vollständige Einreichung, eine ohne `ROADMAP`, eine ohne Test. Ein Werkzeug, das immer meckert, besteht damit ebenso wenig wie eines, das nie meckert.

> **Was auch dieses Werkzeug nicht sieht.** Ob der Bench-Hinweis brauchbar ist, ob wirklich nichts Unverwandtes im PR steckt, ob der Test das Richtige zusichert — das bleibt Urteilsarbeit. Die erste Aufgabe fragt danach, und sie hat keine Maschine hinter sich.

## Deine Aufgabe

1. **Was fehlt.** Nenne, was der Einreichung fehlt, bevor jemand sie beurteilen kann — nicht, was an ihr falsch ist.
2. **Das Werkzeug.** Schreib `tools/pr_ready.py` nach den zwei Regeln oben.

Der letzte Step verlangt von dir eine Änderung, die dieses Review selbst besteht.
