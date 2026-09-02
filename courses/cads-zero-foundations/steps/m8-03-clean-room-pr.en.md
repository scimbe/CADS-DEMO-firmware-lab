---
id: m8-03-clean-room-pr
title: Judge a change before it becomes a PR
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
    title: Review a proposed change against the project's rules
    check: { type: question, prompt: { en: "A contributor proposes a PR: a new 'Tone' app adapted from flipperzero-firmware's speaker service, with its own driver in modules/tone that includes stm32f4xx.h directly, configures PG0 as a push-pull output to drive a piezo, and ships without a host test because 'it needs the board'. Evaluate it against the clean-room rule, the both-targets rule, the safety rules and the agent workflow. What must change before it is reviewable, and what must the PR carry?", de: "Ein Contributor schlägt einen PR vor: eine neue App 'Tone', übernommen aus dem Speaker-Service von flipperzero-firmware, mit eigenem Treiber in modules/tone, der stm32f4xx.h direkt einbindet, PG0 als Push-Pull-Ausgang für einen Piezo konfiguriert und ohne Host-Test kommt, weil 'es das Board braucht'. Bewerte ihn gegen die Clean-Room-Regel, die Beide-Targets-Regel, die Sicherheitsregeln und den Agenten-Workflow. Was muss sich ändern, bevor er begutachtbar ist, und was muss der PR enthalten?" }, rubric: "Rejects on four grounds with reasons: (1) clean-room - adapting GPL-3.0 flipperzero-firmware code is a copy, not independent work, and would re-license the MIT project; must be rewritten from the board's constraints; (2) both-targets/layering - a module may not include stm32f4xx.h, hardware access goes through core/cads_hal.h with a targets/itsboard implementation and a sim implementation so it builds for host too; (3) safety - PG0..PG5 are pulled-up inputs that must never be configured as outputs, so the pin choice is forbidden regardless of whether it is ever flashed; (4) workflow - the portable logic must have host unit tests, the hardware path is a hardware-gate item for the maintainer, docs/ROADMAP.md must be updated, and the PR must state what to look for at the bench and the new size report. Student notes the maintainer holds the hardware exclusively.", bloom: evaluate }
socratic:
  - { trigger: "question:review-verdict:weak", question: { en: "Clean-room's own test is one question: 'why is it shaped like this?' If the honest answer is 'because that is how they did it', what is the change?", de: "Der Clean-Room-Test ist eine Frage: 'Warum ist es so geformt?' Wenn die ehrliche Antwort 'weil sie es so gemacht haben' lautet, was ist die Änderung dann?" }, hints: [ { en: "docs/explanation/clean-room.md: adapting or transliterating upstream code is a copy, and GPL-3.0 travels with it.", de: "docs/explanation/clean-room.md: Übernehmen oder Transliterieren von Upstream-Code ist eine Kopie, und GPL-3.0 wandert mit." }, { en: "docs/SAFETY.md section 3: PF0..7 and PG0..5 are inputs, never outputs - two push-pull drivers on one net is how boards die.", de: "docs/SAFETY.md Abschnitt 3: PF0..7 und PG0..5 sind Eingänge, nie Ausgänge - zwei Push-Pull-Treiber auf einem Netz ist, wie Boards sterben." }, { en: "docs/how-to/agent-workflow.md lists what a reviewable PR contains: the change only, tests where logic allows, ROADMAP updated, a bench note, the size report.", de: "docs/how-to/agent-workflow.md listet, was ein begutachtbarer PR enthält: nur die Änderung, Tests wo Logik es erlaubt, ROADMAP aktualisiert, ein Bench-Hinweis, der Größenbericht." } ] }
---
## Learning goal

Apply the project's four standing rules — clean room, both targets, safety, and the contribution workflow — as a reviewer would, to a change that violates all of them at once.

## The four rules a reviewer holds

**1. Clean room.** This firmware contains no code from `flipperzero-firmware` — not copied, not adapted, not transliterated. That project is GPL-3.0; vendoring any meaningful part of it makes this MIT project GPL too, irreversibly, because you cannot un-GPL a history. Reading upstream to understand what a good handheld firmware does is allowed; rewriting a function with the original open beside you is not. The tell is one question: *why is it shaped like this?* If the answer is "because that is how they did it", it is a copy. If the answer is "because this display is write-only and 448 ms per frame", it is independent work (`docs/explanation/clean-room.md`).

**2. Both targets.** Everything above the HAL builds for the board and the simulator. A module that includes `stm32f4xx.h` has broken the layering from M1: hardware access goes through `core/cads_hal.h`, with an implementation under `targets/itsboard/` and one under `targets/sim/`. A feature that only builds for one target is not finished.

**3. Safety.** `docs/SAFETY.md` is binding, including for code you cannot run. PA13/PA14 and PH0/PH1 are never touched; PF0..7 and PG0..5 are pulled-up inputs and are **never** configured as outputs, because the adapter may be driving those nets and two push-pull drivers on one net is how boards die. A driver that reconfigures PG0 as an output is wrong even if it is never flashed.

**4. The workflow.** The maintainer holds the hardware exclusively: contributors do not flash, reset or attach a debugger. You take `swarm-ready` issues (self-contained, hardware-free); `hardware-gate` items are the maintainer's. A reviewable PR contains the change and nothing unrelated, unit tests for anything portable and golden images for anything that draws, an updated `docs/ROADMAP.md`, a note saying what to look for at the bench if a hardware path changed, and the new size report if memory usage changed (`docs/how-to/agent-workflow.md`).

## Evaluating means saying no with reasons

A review is not a checklist tick. The question is whether each rule is met, and if not, what the smallest change is that meets it. "It needs the board" is rarely true of the *logic*: a tone scheduler, a note table, a duty-cycle calculation are portable and testable on the host; only the last few lines that touch a timer belong behind the HAL, and those are the maintainer's gate.

## Your task

Read the proposal in the question and write a reviewer's verdict: which rules it breaks, why, what must change, and what the PR must carry. The final step asks you to make a change that passes this review yourself.
