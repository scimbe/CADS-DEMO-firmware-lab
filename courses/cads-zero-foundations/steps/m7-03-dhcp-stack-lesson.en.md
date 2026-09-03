---
id: m7-03-dhcp-stack-lesson
title: Case study - the DHCP stack overflow
bloom: analyze
objectives: [cz.net.dhcp-lesson]
requires: [m7-02-udp-hello]
estimatedMinutes: 15
links:
  - { step: m7-04-recon-tools }
  - { step: m3-04-stack-guard }
  - { doc: "docs/ROADMAP.md" }
  - { doc: "docs/reference/config-file.md" }
  - { file: "apps/bringup/tasks.c", line: 74 }
sources: [docs/ROADMAP.md, apps/bringup/tasks.c, docs/reference/config-file.md, docs/how-to/debug.md]
tasks:
  - id: trace-the-crash
    title: Explain the crash, the diagnosis and the cost of the fix
    check: { type: question, prompt: { en: "Setting net.dhcp = 1 crashed the board on every reset. Explain (a) why enabling DHCP deepened the console task's stack in particular, (b) what evidence from a live GDB attach proved it was a stack overflow rather than a corrupt filesystem or a flaky debug session, and (c) why doubling CADS_CONSOLE_STACK cost nothing from the tight SRAM heap margin.", de: "net.dhcp = 1 ließ das Board bei jedem Reset abstürzen. Erkläre (a) warum DHCP ausgerechnet den Stack der Konsolen-Task vertieft hat, (b) welcher Beleg aus einem Live-GDB-Attach bewies, dass es ein Stack-Überlauf war und kein defektes Dateisystem und keine wacklige Debug-Sitzung, und (c) warum die Verdopplung von CADS_CONSOLE_STACK die knappe SRAM-Heap-Marge nichts gekostet hat." }, rubric: "(a) cads_net_poll() runs on the console task (explorer_app_demo main loop) and with net.dhcp=1 that executes lwIP's DHCP client state machine, deeper than the static-IP path, on the same stack already carrying the GUI/marauder/settings call chain; (b) st-util --no-reset + GDB showed the CPU trapped in the fault handler with SP clobbered to an absurd value and vApplicationIdleHook (the stack-guard sentinel) faulting on a garbage PC 0xF7FF0FF0, an instruction-fetch violation - the textbook overflow signature; reverting the config, reformatting littlefs and a real power-cycle all failed to change it, ruling those out; (c) task stacks live in CCM (about 59 KB free of 64 KB), not in the SRAM heap that check_ram_budget.py guards, so 512->1024 words cost 2 KB of CCM and left the 256 B floor margin untouched.", bloom: analyze }
socratic:
  - { trigger: "question:trace-the-crash:weak", question: { en: "Which task runs cads_net_poll() in the app tree, and what extra work does that call do once DHCP is enabled?", de: "Welche Task führt cads_net_poll() im App-Baum aus, und welche zusätzliche Arbeit erledigt dieser Aufruf, sobald DHCP aktiv ist?" }, hints: [ { en: "explorer_app_demo.c's main loop calls cads_net_poll() every tick on the console task - the same stack that also runs cads_gui_tick and cads_marauder_tick.", de: "Die Hauptschleife von explorer_app_demo.c ruft cads_net_poll() jeden Tick auf der Konsolen-Task auf - derselbe Stack, der auch cads_gui_tick und cads_marauder_tick trägt." }, { en: "Look for the register signature: a garbage PC and a clobbered SP inside the fault handler are what an overflow looks like from GDB.", de: "Achte auf die Registersignatur: ein Müll-PC und ein zerstörter SP im Fault-Handler sind das, wonach ein Überlauf aus GDB aussieht." }, { en: "Read tasks.c line 34 onward: stacks are CCM_SECTION arrays; CCM is a separate 64 KB region, so growing them never touches __cads_heap_size.", de: "Lies tasks.c ab Zeile 34: die Stacks sind CCM_SECTION-Arrays; CCM ist eine eigene 64-KB-Region, ihr Wachstum berührt __cads_heap_size nie." } ] }
---
## Learning goal

Analyse a real crash from the project's own record: how enabling DHCP overflowed a task stack, how a live debugger attach separated the true cause from two plausible wrong leads, and why the fix was cheap.

## The symptom

On 2026-08-28 the project lead wanted real internet on the board through a Mac's Internet Sharing. Setting `net.dhcp = 1` in `/config.txt` and resetting crashed the board every time. The console went silent — which, as you learned in M0, is not evidence of anything by itself.

## Two wrong leads, ruled out properly

`docs/ROADMAP.md`'s log entry for that day records the dead ends so they are not retried blind:

1. **Filesystem or config corruption.** Reverting `net.dhcp` to 0 did not stop the crash; a fresh `cads_config.py pull` read back clean content; a from-scratch reformatted littlefs volume crashed identically. Conclusively ruled out.
2. **SWD or debug-session flakiness.** A real power-cycle (`reset cause: power-on`, forensic ring genuinely cleared to zero records — CCM survives a plain reset but not power loss) still crashed. Ruled out too.

A third cost was self-inflicted: this Nucleo enumerates two `/dev/cu.usbmodem*` devices, and several "still crashed" reads were really `board_cmd.py` pinned to the wrong port, querying dead air. The lesson recorded: trust a live GDB attach over console silence when the two disagree.

## The real cause

`apps/bringup/explorer_app_demo.c`'s main loop calls `cads_net_poll()` every tick on the **console task** (`apps/bringup/tasks.c`, then a 512-word / 2048 B stack). With `net.dhcp = 1` that call runs lwIP's DHCP client state machine — visibly deeper than the static-IP path — on the same stack that the evening's whole added call chain already used: `cads_marauder_tick`'s PCAP and join depth, `cads_settings_service_config`, `cads_gui_tick`.

Caught live with `st-util --no-reset` and GDB: the CPU was trapped inside the fault handler, SP clobbered to an absurd low value, and `vApplicationIdleHook()` — the project's own stack-guard sentinel check — had faulted with a garbage PC of `0xF7FF0FF0`, an instruction-fetch violation. That is the textbook signature of a stack overflow severe enough to corrupt the very code trying to detect it.

## The fix, and why it was cheap

`CADS_CONSOLE_STACK` was doubled from 512 to 1024 words. Look at `apps/bringup/tasks.c` line 74 and the arrays right below it: every task stack is a `CADS_CCM_SECTION` array. CCM is a separate 64 KB region with about 59 KB free at the time, so doubling cost 2 KB of CCM and **nothing** from the SRAM heap that `scripts/check_ram_budget.py` guards (256 B floor, 704 B margin then, unaffected). Verified: a real DHCP lease at `192.168.2.3` across two full runs, with the forensic ring not growing between them.

Two days later the same class of bug hit `CADS_INPUT_STACK` (256 words, quadrupled to 1024) when navigating the Marauder menu — the input task runs every app's input handler synchronously. The pattern generalises: a task whose stack carries arbitrary app-specific depth cannot be sized by looking at its own loop.

## Your task

Answer the three-part analysis question. Draw on the ROADMAP log entry and on `tasks.c`'s own comment block, which tells this story in the code itself.
