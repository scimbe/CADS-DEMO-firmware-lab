---
id: m8-03-reviewable-pr
title: What makes a submission reviewable
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
    title: What the submission lacks
    check: { type: question, prompt: { en: "What is missing before a reviewer can judge this PR at all?", de: "Was fehlt, bevor ein Reviewer diesen PR überhaupt beurteilen kann?" }, rubric: "At least three things that are missing independently of the licence and the pin choice. First host unit tests for the portable logic - a tone scheduler, a note table, a duty-cycle calculation need no board, only the last lines at the timer do, and those are the maintainer's gate; the claim that it needs the board therefore does not hold for the logic. Second the enclosures from the contribution workflow: only the change and nothing unrelated, an updated docs/ROADMAP.md, a bench note for the hardware path touched, and the new size report when memory shifts. Third the layering read as an absence: a module that includes stm32f4xx.h does not build for one of the two targets, so an implementation under targets/sim is missing. An answer with fewer than two of these does not pass, and neither does one that merely repeats what is wrong with the design instead of saying what the submission lacks.", bloom: evaluate }
  - id: pr-ready
    title: Write the two decidable enclosures as a tool
    check: { type: command, cwd: ".", command: "T=tools/pr_ready.py; [ -f $T ] || exit 1; { echo modules/tone/tone.c; echo docs/ROADMAP.md; echo tests/unit/test_tone.c; } | python3 $T >/dev/null || exit 1; { echo modules/tone/tone.c; echo tests/unit/test_tone.c; } | python3 $T >/dev/null && exit 1; { echo modules/tone/tone.c; echo docs/ROADMAP.md; } | python3 $T >/dev/null && exit 1; exit 0", expectExitCode: 0, bloom: create }
socratic:
  - { trigger: "question:reviewable:weak", question: { en: "Separate what is wrong with the design from what is simply absent from the submission. The question asks about the second.", de: "Trenne, was am Entwurf falsch ist, von dem, was der Einreichung schlicht fehlt. Gefragt ist das Zweite." }, hints: [ { en: "A module that includes a vendor header cannot build for one of the two targets; that is an absence, not an opinion.", de: "Ein Modul, das einen Hersteller-Header einbindet, baut für eines der beiden Targets nicht; das ist ein Fehlen, keine Meinung." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR carries; go through that list against this submission.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält; geh diese Liste gegen diese Einreichung durch." }, { en: "The claim that it needs the board is worth testing: name the parts of a tone driver that are portable logic.", de: "Die Behauptung, es brauche das Board, lohnt eine Prüfung: benenne die Teile eines Ton-Treibers, die portable Logik sind." } ] }
  - { trigger: "task:pr-ready:failed", question: { en: "Your tool is run against three lists of changed paths, not one. Which of the three does it get wrong?", de: "Dein Werkzeug läuft gegen drei Listen geänderter Pfade, nicht gegen eine. Bei welcher der drei liegt es falsch?" }, hints: [ { en: "Try it by hand: echo three paths into it and read what it prints. A tool that always complains fails just as surely as one that never does.", de: "Probier es von Hand: schick ihm drei Pfade und lies, was es druckt. Ein Werkzeug, das immer meckert, fällt genauso sicher durch wie eines, das nie meckert." }, { en: "Two enclosures are decidable from the path list alone: an updated docs/ROADMAP.md, and something under tests/ when portable code changed.", de: "Zwei Beilagen sind allein aus der Pfadliste entscheidbar: eine aktualisierte docs/ROADMAP.md, und etwas unter tests/, wenn portabler Code geändert wurde." }, { en: "It reads the paths from standard input, one per line, so `git diff --name-only | python3 tools/pr_ready.py` is the real use.", de: "Es liest die Pfade von der Standardeingabe, einen je Zeile, sodass `git diff --name-only | python3 tools/pr_ready.py` der echte Anwendungsfall ist." } ] }
---

## Learning goal

Judge whether a submission can be reviewed at all — independently of whether its design is good. This is about what is absent: the contribution workflow's enclosures, and the logic that could have been tested without the board.

## The number from M4 is one of the enclosures

One of the enclosures a PR has to carry is the new size report as soon as memory shifts — exactly the margin you predicted and measured in **M4-02**, the one `scripts/check_ram_budget.py` guards above the 48 KB floor. Without it a reviewer has to guess whether the change still fits.

## The same proposal, a different question

The PR from the previous step still stands: a *Tone* app taken from foreign code, with `stm32f4xx.h` inside a module, with **PG0** as an output, and no host test, "because it needs the board". You have judged the licence and the pin choice. Here only one thing counts: what the submission lacks as a package.

## The fourth rule: the workflow

The maintainer holds the hardware exclusively: contributors do not flash, reset or attach a debugger. You take `swarm-ready` issues — self-contained and hardware-free — while `hardware-gate` items are the maintainer's.

What a reviewable PR carries is listed in one paragraph of `docs/how-to/agent-workflow.md`: only the change and nothing unrelated, tests where the logic allows them, an updated `docs/ROADMAP.md`, a bench note for every hardware path touched, and the new size report when memory shifts.

"It needs the board" is rarely true of the *logic*: a tone scheduler, a note table, a duty-cycle calculation are portable and testable on the host; only the last few lines that touch a timer belong behind the HAL. Leaving that claim untested shifts work onto the one person who has the hardware.

## Two of the enclosures a machine can see

A lint cannot read intent, but it can read a list of files. The second task asks for `tools/pr_ready.py`: it takes the changed paths from standard input, one per line, and exits 0 when the submission carries the two decidable enclosures.

1. If source code under `apps`, `gui`, `modules`, `services`, `core` or `targets` changed, `docs/ROADMAP.md` has to be in the list.
2. If portable code changed, something under `tests/` has to have changed with it.

In real use that is a pipeline: `git diff --name-only | python3 tools/pr_ready.py`. Your tool is checked against three lists — a complete submission, one without `ROADMAP`, one without a test. A tool that always complains therefore fails just as surely as one that never does.

> **What this tool does not see either.** Whether the bench note is useful, whether nothing unrelated really sits in the PR, whether the test asserts the right thing — that stays judgement work. The first task asks for it, and it has no machine behind it.

## Your task

1. **What is missing.** Name what the submission lacks before anyone can judge it — not what is wrong with it.
2. **The tool.** Write `tools/pr_ready.py` following the two rules above.

The final step asks you to make a change that passes this review yourself.
