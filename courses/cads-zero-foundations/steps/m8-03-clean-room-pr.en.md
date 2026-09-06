---
id: m8-03-clean-room-pr
title: Judge a change before it becomes a PR
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
    title: The licence verdict
    check: { type: question, prompt: { en: "What is the smallest change that makes the adapted speaker code acceptable in this repository?", de: "Was ist die kleinste Änderung, die den übernommenen Speaker-Code in diesem Repository zulässig macht?" }, rubric: "There is no small one. The code has to be rewritten from this board's constraints; adapting or transliterating is a copy, and GPL-3.0 travels with it into an MIT project whose history cannot be un-GPLed. Rewording, renaming or restructuring the original does not suffice. Names the legitimate route: read upstream to understand what a good handheld firmware does, then build the function from your own requirements without the original open beside you. The touchstone is the question of why the piece is shaped as it is. An answer that treats a rename or a licence notice as sufficient does not pass.", bloom: evaluate }
  - id: pin-verdict
    title: The choice of pin
    check: { type: question, prompt: { en: "Is the choice of PG0 defensible in a PR that will never be flashed?", de: "Ist die Wahl von PG0 in einem PR vertretbar, der nie geflasht wird?" }, rubric: "No. SAFETY.md binds code you do not run: PF0..7 and PG0..5 are pulled-up inputs the adapter may drive, and two push-pull drivers on one net is how boards die. Plus the argument against never-flashed: merged code is eventually built and flashed by someone who did not read this PR, so the safety rule applies at merge time, not at flash time. Passes only with the electrical reason; citing the rule without justifying it does not pass.", bloom: evaluate }
  - id: reviewable
    title: What makes the PR reviewable
    check: { type: question, prompt: { en: "What is missing before a reviewer can judge this PR at all?", de: "Was fehlt, bevor ein Reviewer diesen PR überhaupt beurteilen kann?" }, rubric: "At least three things missing independently of the other two verdicts. First the layering: a module must not include stm32f4xx.h; hardware access goes through core/cads_hal.h with one implementation under targets/itsboard and one under targets/sim, otherwise the feature builds for one target only and is not finished. Second host unit tests for the portable logic - a tone scheduler, a note table, a duty-cycle calculation need no board; only the last few lines at the timer do, and those are the gate of the maintainer, who holds the hardware exclusively. Third the accompaniments from the agent workflow: the change and nothing unrelated, an updated docs/ROADMAP.md, a bench note for the changed hardware path, and the new size report. An answer with fewer than two of those points does not pass.", bloom: evaluate }
  - id: review-lint
    title: Write the three machine-checkable rules as a lint
    check: { type: command, cwd: ".", command: "L=tools/review_lint.py; [ -f $L ] || exit 1; python3 $L . >/dev/null || exit 1; ok=0; for r in 1 2 3; do d=$(mktemp -d); mkdir -p $d/gui $d/apps; case $r in 1) printf 'void furi_record_open(void);\n' > $d/gui/twin.c;; 2) printf '#include <stm32f4xx.h>\n' > $d/gui/twin.c;; 3) printf 'void f(void){ GPIOF->MODER = 0; }\n' > $d/apps/twin.c;; esac; python3 $L $d >/dev/null && ok=1; rm -rf $d; done; exit $ok", expectExitCode: 0, bloom: create }
socratic:
  - { trigger: "task:review-lint:failed", question: { en: "Your lint is run against four trees, not one. Which of them does it get wrong - the clean one, or one of the three twins?", de: "Dein Lint läuft gegen vier Bäume, nicht gegen einen. Bei welchem liegt es falsch — dem sauberen oder einem der drei Zwillinge?" }, hints: [ { en: "Run it by hand on the project root first: python3 tools/review_lint.py . must print nothing and exit 0.", de: "Führ es zuerst von Hand auf der Projektwurzel aus: python3 tools/review_lint.py . darf nichts drucken und muss mit 0 enden." }, { en: "Then build a throwaway tree yourself: a directory with a gui/ subdirectory, one .c file in it, one violation, and run the lint on that directory.", de: "Bau dir dann selbst einen Wegwerfbaum: ein Verzeichnis mit einem Unterverzeichnis gui/, darin eine .c-Datei mit genau einer Verletzung, und lass das Lint auf dieses Verzeichnis los." }, { en: "The three rules scan different directory sets. Rule 1 covers five, rule 2 covers three, rule 3 covers apps only - a lint that scans one fixed set cannot pass all three twins.", de: "Die drei Regeln durchsuchen verschiedene Verzeichnismengen. Regel 1 fünf, Regel 2 drei, Regel 3 nur apps — ein Lint mit einer einzigen festen Menge kann nicht alle drei Zwillinge bestehen." } ] }
  - { trigger: "question:licence-verdict:weak", question: { en: "Clean room's own test is one question: why is it shaped like this? If the honest answer is because that is how they did it, what follows?", de: "Der Clean-Room-Test ist eine Frage: warum ist es so geformt? Wenn die ehrliche Antwort lautet, weil sie es so gemacht haben - was folgt daraus?" }, hints: [ { en: "docs/explanation/clean-room.md treats adapting and transliterating as the same act as copying.", de: "docs/explanation/clean-room.md behandelt Übernehmen und Transliterieren als denselben Akt wie Kopieren." }, { en: "Ask what a licence does to a history rather than to a file, and whether that step can be taken back.", de: "Frag, was eine Lizenz mit einer Historie tut statt mit einer Datei, und ob dieser Schritt zurückgenommen werden kann." }, { en: "There is a legitimate way to end up with the same feature; describe what the contributor would have to be looking at while writing it.", de: "Es gibt einen zulässigen Weg zu demselben Feature; beschreibe, worauf der Contributor beim Schreiben schauen dürfte." } ] }
  - { trigger: "question:pin-verdict:weak", question: { en: "The PR is code, not a board. So what exactly is the harm, and who would encounter it?", de: "Der PR ist Code, kein Board. Worin besteht der Schaden also genau, und wer träfe darauf?" }, hints: [ { en: "docs/SAFETY.md section 3 names two pin groups that are inputs and says why they must stay inputs.", de: "docs/SAFETY.md Abschnitt 3 nennt zwei Pin-Gruppen, die Eingänge sind, und sagt, warum sie Eingänge bleiben müssen." }, { en: "The adapter can drive those nets; ask what happens when two push-pull drivers meet on one net.", de: "Der Adapter kann diese Netze treiben; frag dich, was geschieht, wenn zwei Push-Pull-Treiber auf einem Netz aufeinandertreffen." }, { en: "Merged code gets flashed eventually by someone who did not read this PR - say what that makes of the never-flashed argument.", de: "Gemergter Code wird irgendwann von jemandem geflasht, der diesen PR nicht gelesen hat - sag, was das aus dem Nie-geflasht-Argument macht." } ] }
  - { trigger: "question:reviewable:weak", question: { en: "Separate what is wrong with the design from what is simply absent from the submission. The question asks about the second.", de: "Trenne, was am Entwurf falsch ist, von dem, was der Einreichung schlicht fehlt. Gefragt ist das Zweite." }, hints: [ { en: "A module that includes a vendor header cannot build for one of the two targets; that is an absence, not an opinion.", de: "Ein Modul, das einen Hersteller-Header einbindet, baut für eines der beiden Targets nicht; das ist ein Fehlen, keine Meinung." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR carries; go through that list against this submission.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält; geh diese Liste gegen diese Einreichung durch." }, { en: "The claim that it needs the board is worth testing: name the parts of a tone driver that are portable logic.", de: "Die Behauptung, es brauche das Board, lohnt eine Prüfung: benenne die Teile eines Ton-Treibers, die portable Logik sind." } ] }
---

## Learning goal

Apply the project's four standing rules — clean room, both targets, safety, and the contribution workflow — as a reviewer would, to a change that violates all of them at once.

**The first move:** open `docs/explanation/clean-room.md` and `docs/SAFETY.md`. The path is right here.

## Three yardsticks you already hold

You judge this change with what you have already measured: the layering rule from **M1-01**, which an `#include "stm32f4xx.h"` in the wrong directory fails; the both-targets rule your own network change from **M7-02** had to answer to; and the question from **M7-05** of what a pin decision costs the network.

## Where you work in this step

This step starts no task and builds nothing. You read four documents and write three verdicts.

**Opening a document:** `Ctrl`/`Cmd`+`P`, type the path, Enter. Or use the topmost symbol in the bar on the far left (the file explorer) and click through the tree. The four paths for this step:

```
docs/explanation/clean-room.md
docs/SAFETY.md
docs/how-to/agent-workflow.md
docs/reference/module-layout.md
```

**You write your answers in the step text**, the tab in the middle named `CaDS Tutor: Judge a change before it becomes a PR`. The course tree sits on the left in the side bar, behind the graduation-cap symbol in the bar on the far left. Each of the three tasks at the bottom of the step text has a **Prüfen** button and a **Hinweis anzeigen** button; the **Run all checks** button at the top of the tab checks all three at once.

**When a shortcut does nothing:** the browser often swallows `Ctrl`/`Cmd`+`Shift`+`P` — the command palette is reliably reached with **`F1`**, and everything it can do is also behind the three-line symbol (**☰**) at the very top left, which opens `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help`. The user interface is in English while this course text is not. The two other classic operating mistakes — hunting for a task's output in the wrong window, and closing a terminal that is still running something — cannot happen here, because this step starts nothing; from the next step on they can again.

## The proposal you are judging

A contributor opens a PR:

> **`[M?] Tone app: beeper over a piezo`** — A new *Tone* app, adapted from `flipperzero-firmware`'s speaker
> service and fitted to our view API. The driver lives in `modules/tone` and includes `stm32f4xx.h` directly to
> program the timer; it configures **PG0** as a push-pull output with a piezo on it. No host test, "because it
> needs the board". Nothing else in the PR.

That one proposal violates all four standing rules at once. The three tasks take it apart: licence, pin choice, reviewability.

## The four rules a reviewer holds

**1. Clean room.** This firmware contains no code from `flipperzero-firmware` — not copied, not adapted, not transliterated. That project is GPL-3.0; vendoring any meaningful part of it makes this MIT project GPL too, irreversibly, because you cannot un-GPL a history. Reading upstream to understand what a good handheld firmware does is allowed; rewriting a function with the original open beside you is not. The tell is one question: *why is it shaped like this?* If the answer is "because that is how they did it", it is a copy. If the answer is "because this display is write-only and 448 ms per frame", it is independent work (`docs/explanation/clean-room.md`).

**2. Both targets.** Everything above the HAL builds for the board and the simulator. A module that includes `stm32f4xx.h` has broken the layering: hardware access goes through `core/cads_hal.h`, with an implementation under `targets/itsboard/` and one under `targets/sim/`. A feature that only builds for one target is not finished.

**3. Safety.** `docs/SAFETY.md` is binding, including for code you cannot run. PA13/PA14 and PH0/PH1 are never touched; PF0..7 and PG0..5 are pulled-up inputs and are **never** configured as outputs. `docs/SAFETY.md` section 3 gives the electrical reason, and whether it also binds code that never reaches a board is the second task.

**4. The workflow.** The maintainer holds the hardware exclusively: contributors do not flash, reset or attach a debugger. You take `swarm-ready` issues (self-contained, hardware-free); `hardware-gate` items are the maintainer's. What else a reviewable PR has to carry is listed in one paragraph of `docs/how-to/agent-workflow.md`. Walk that list against the submission above; the third task asks what is missing.

## Evaluating means saying no with reasons

A review is not a checklist tick. The question is whether each rule is met, and if not, what the smallest change is that meets it. "It needs the board" is rarely true of the *logic*: a tone scheduler, a note table, a duty-cycle calculation are portable and testable on the host; only the last few lines that touch a timer belong behind the HAL, and those are the maintainer's gate.

## Three of the four rules leave a machine behind

A reviewer applies the four standing rules by hand. Three of them leave a trace a program can see, and the last task of this step asks you to write it: `tools/review_lint.py <directory>` walks a tree and exits 0 when it is clean, non-zero otherwise, printing one line per finding that names the rule it broke.

1. **Clean room** — no identifier with the `furi_` prefix under `apps`, `gui`, `modules`, `services`, `core`. `docs/explanation/clean-room.md` itself calls the `cads_` prefix “the visible marker”.
2. **Both targets** — no `stm32f4xx.h` under `gui`, `apps`, `services`; hardware access goes through the HAL.
3. **Safety** — no write to `GPIOF->MODER` or `GPIOG->MODER` under `apps`; those are the pulled-up inputs from M2-04.

Your lint is run against **four** trees: the real one, which it must wave through, and three throwaway trees the check builds itself — one violation each. A lint that knows only one of the three rules therefore fails, and so does a lint that complains about everything.

What this lint **cannot** do is in the section on the licence verdict: rule 1 sees a marker, not a provenance.

## Your task

Three separate verdicts on the proposal above, each in its own field at the bottom of the step text, each with its own **Prüfen** button.

1. **The licence.** What is the smallest change that makes the code acceptable?
2. **The pin choice.** Does the "it is never flashed" argument hold?
3. **The form.** What is missing before a reviewer can even start?

The final step asks you to make a change that passes this review yourself.
