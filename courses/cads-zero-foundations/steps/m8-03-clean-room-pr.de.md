---
id: m8-03-clean-room-pr
title: Eine Änderung beurteilen, bevor sie ein PR wird
bloom: evaluate
objectives: [cz.quality.cleanroom-pr, firmware-explanation-clean-room]
requires: [m8-02-golden-images]
estimatedMinutes: 15
links:
  - { doc: "docs/explanation/clean-room.md" }
  - { doc: "docs/how-to/agent-workflow.md" }
  - { doc: "docs/SAFETY.md" }
  - { step: m8-04-capstone }
sources: [docs/explanation/clean-room.md, docs/how-to/agent-workflow.md, docs/SAFETY.md, docs/reference/module-layout.md]
tasks:
  - id: review-verdict
    title: Begutachte eine vorgeschlagene Änderung gegen die Projektregeln
    check: { type: question, prompt: { en: "A contributor proposes a PR: a new 'Tone' app adapted from flipperzero-firmware's speaker service, with its own driver in modules/tone that includes stm32f4xx.h directly, configures PG0 as a push-pull output to drive a piezo, and ships without a host test because 'it needs the board'. Evaluate it against the clean-room rule, the both-targets rule, the safety rules and the agent workflow. What must change before it is reviewable, and what must the PR carry?", de: "Ein Contributor schlägt einen PR vor: eine neue App 'Tone', übernommen aus dem Speaker-Service von flipperzero-firmware, mit eigenem Treiber in modules/tone, der stm32f4xx.h direkt einbindet, PG0 als Push-Pull-Ausgang für einen Piezo konfiguriert und ohne Host-Test kommt, weil 'es das Board braucht'. Bewerte ihn gegen die Clean-Room-Regel, die Beide-Targets-Regel, die Sicherheitsregeln und den Agenten-Workflow. Was muss sich ändern, bevor er begutachtbar ist, und was muss der PR enthalten?" }, rubric: "Lehnt aus vier Gründen mit Begründung ab: (1) Clean Room - GPL-3.0-Code aus flipperzero-firmware zu übernehmen ist eine Kopie, keine eigenständige Arbeit, und würde das MIT-Projekt umlizenzieren; muss aus den Zwängen des Boards neu geschrieben werden; (2) Beide Targets/Schichtung - ein Modul darf stm32f4xx.h nicht einbinden, Hardwarezugriff läuft über core/cads_hal.h mit einer Implementierung unter targets/itsboard und einer für den Simulator, damit es auch auf dem Host baut; (3) Sicherheit - PG0..PG5 sind hochgezogene Eingänge, die nie als Ausgang konfiguriert werden dürfen, die Pinwahl ist also verboten, ob je geflasht oder nicht; (4) Workflow - die portable Logik braucht Host-Unit-Tests, der Hardwarepfad ist ein Hardware-Gate-Punkt für den Maintainer, docs/ROADMAP.md muss aktualisiert werden, und der PR muss angeben, worauf am Bench zu achten ist, plus den neuen Größenbericht. Erwähnt, dass der Maintainer die Hardware exklusiv hält.", bloom: evaluate }
socratic:
  - { trigger: "question:review-verdict:weak", question: { en: "Clean-room's own test is one question: 'why is it shaped like this?' If the honest answer is 'because that is how they did it', what is the change?", de: "Der Clean-Room-Test ist eine Frage: 'Warum ist es so geformt?' Wenn die ehrliche Antwort 'weil sie es so gemacht haben' lautet, was ist die Änderung dann?" }, hints: [ { en: "docs/explanation/clean-room.md: adapting or transliterating upstream code is a copy, and GPL-3.0 travels with it.", de: "docs/explanation/clean-room.md: Übernehmen oder Transliterieren von Upstream-Code ist eine Kopie, und GPL-3.0 wandert mit." }, { en: "docs/SAFETY.md section 3: PF0..7 and PG0..5 are inputs, never outputs - two push-pull drivers on one net is how boards die.", de: "docs/SAFETY.md Abschnitt 3: PF0..7 und PG0..5 sind Eingänge, nie Ausgänge - zwei Push-Pull-Treiber auf einem Netz ist, wie Boards sterben." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR contains: the change only, tests where logic allows, ROADMAP updated, a bench note, the size report.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält: nur die Änderung, Tests wo Logik es erlaubt, ROADMAP aktualisiert, ein Bench-Hinweis, der Größenbericht." } ] }
---
## Lernziel

Wende die vier stehenden Regeln des Projekts — Clean Room, beide Targets, Sicherheit und der Beitragsworkflow — so an, wie ein Reviewer es täte, auf eine Änderung, die alle vier auf einmal verletzt.

## Die vier Regeln, die ein Reviewer hält

**1. Clean Room.** Diese Firmware enthält keinen Code aus `flipperzero-firmware` — nicht kopiert, nicht übernommen, nicht transliteriert. Jenes Projekt steht unter GPL-3.0; einen nennenswerten Teil davon einzubinden macht dieses MIT-Projekt ebenfalls zu GPL, unumkehrbar, denn eine Historie lässt sich nicht ent-GPLen. Upstream zu lesen, um zu verstehen, was eine gute Handheld-Firmware tut, ist erlaubt; eine Funktion mit dem Original daneben neu zu schreiben, ist es nicht. Der Test ist eine Frage: *Warum ist es so geformt?* Lautet die Antwort „weil sie es so gemacht haben", ist es eine Kopie. Lautet sie „weil dieses Display nur beschreibbar ist und 448 ms pro Bild kostet", ist es eigenständige Arbeit (`docs/explanation/clean-room.md`).

**2. Beide Targets.** Alles oberhalb der HAL baut für Board und Simulator. Ein Modul, das `stm32f4xx.h` einbindet, hat die Schichtung aus M1 gebrochen: Hardwarezugriff läuft über `core/cads_hal.h`, mit einer Implementierung unter `targets/itsboard/` und einer unter `targets/sim/`. Ein Feature, das nur für ein Target baut, ist nicht fertig.

**3. Sicherheit.** `docs/SAFETY.md` ist bindend, auch für Code, den du nicht ausführen kannst. PA13/PA14 und PH0/PH1 werden nie angefasst; PF0..7 und PG0..5 sind hochgezogene Eingänge und werden **nie** als Ausgänge konfiguriert, weil der Adapter diese Netze treiben kann und zwei Push-Pull-Treiber auf einem Netz der Weg ist, auf dem Boards sterben. Ein Treiber, der PG0 als Ausgang umkonfiguriert, ist falsch, selbst wenn er nie geflasht wird.

**4. Der Workflow.** Der Maintainer hält die Hardware exklusiv: Contributors flashen nicht, setzen nicht zurück und hängen keinen Debugger an. Du nimmst `swarm-ready`-Issues (in sich geschlossen, hardwarefrei); `hardware-gate`-Punkte gehören dem Maintainer. Ein begutachtbarer PR enthält die Änderung und nichts Unverwandtes, Unit-Tests für alles Portable und Golden Images für alles, was zeichnet, ein aktualisiertes `docs/ROADMAP.md`, einen Hinweis, worauf am Bench zu achten ist, falls ein Hardwarepfad sich änderte, und den neuen Größenbericht, falls der Speicherverbrauch sich änderte (`docs/how-to/agent-workflow.md`).

## Bewerten heißt, begründet Nein zu sagen

Ein Review ist kein Abhaken. Die Frage ist, ob jede Regel erfüllt ist, und falls nicht, welche kleinste Änderung sie erfüllt. „Es braucht das Board" trifft auf die *Logik* selten zu: ein Ton-Scheduler, eine Notentabelle, eine Tastgradberechnung sind portabel und auf dem Host testbar; nur die letzten Zeilen, die einen Timer berühren, gehören hinter die HAL, und die sind das Gate des Maintainers.

## Deine Aufgabe

Lies den Vorschlag in der Frage und schreibe das Urteil eines Reviewers: welche Regeln er bricht, warum, was sich ändern muss und was der PR enthalten muss. Der letzte Step verlangt von dir eine Änderung, die dieses Review selbst besteht.
