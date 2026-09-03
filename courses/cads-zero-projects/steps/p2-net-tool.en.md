---
id: p2-net-tool
title: "Project: a network tool on lwIP"
bloom: create
objectives: [cz.net.recon]
requires: []
estimatedMinutes: 120
scaffold: independent
creates: [cads_project_nettool]
links:
  - { file: "modules/net/include/cads/net/net.h" }
  - { doc: "docs/tutorials/lwip-udp-hello.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [modules/net/include/cads/net/net.h, docs/tutorials/lwip-udp-hello.md, apps/bringup/explorer.c, modules/net/src/cads_net_sim.c]
misconceptions:
  - { pattern: "not available in the simulator", question: { en: "You are running the host build. What does the sim stub promise about the link, and does your tool cope with that promise?", de: "Du führst den Host-Build aus. Was verspricht der Sim-Stub über den Link, und kommt dein Werkzeug mit diesem Versprechen zurecht?" }, hints: [ { en: "The simulator reports no link, ever - that is honest, not broken.", de: "Der Simulator meldet nie einen Link - das ist ehrlich, nicht kaputt." }, { en: "Your tool has to compile and link there anyway; a bounded link-wait that gives up is the shape that works on both targets.", de: "Dein Werkzeug muss dort trotzdem übersetzen und linken; eine begrenzte Link-Wartezeit, die aufgibt, ist die Form, die auf beiden Targets funktioniert." }, { en: "An unbounded wait for link_up hangs the host build forever - give the loop a deadline.", de: "Ein unbegrenztes Warten auf link_up hängt den Host-Build für immer - gib der Schleife ein Zeitlimit." } ] }
tasks:
  - id: tool-substance
    title: The handler polls the link and is reachable from the console
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_nettool' apps modules --include=*.c | xargs -r grep -l cads_net_poll | xargs -r grep -l cads_net_status | grep -q .", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*case .*cads_project_nettool' apps/bringup/explorer.c", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_nettool" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: both-targets
    title: The host build links too
    check: { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host", expectExitCode: 0, timeoutMs: 600000, bloom: create }
  - id: defend
    title: Defend the behaviour on a dead link
    check: { type: question, prompt: { en: "How does your tool behave when the link is down and no host answers?", de: "Wie verhält sich dein Werkzeug, wenn der Link unten ist und kein Host antwortet?" }, rubric: "Names a concrete on-wire behaviour and separates two failure cases. First, no link: cads_net_status() reports link_up false, and cads_net_udp_send() silently does nothing with no link or a zero destination - so the caller has to poll with a deadline and give up rather than assume. Second, a link but nobody answering: that is visible only through a timeout you chose, because the send function has no return value. Says what the tool prints in each case, and treats a well-formed negative result as a result rather than a failure. An answer that names only one of the two cases does not pass.", bloom: create }
socratic:
  - { trigger: "task:tool-substance:failed", question: { en: "Four things are checked at once. Is it the handler's own file, the dispatch case, the symbol, or the board build?", de: "Vier Dinge werden auf einmal geprüft. Ist es die eigene Datei des Handlers, der Dispatch-Case, das Symbol oder der Board-Build?" }, hints: [ { en: "A handler that never polls passes the linker but not this check - the same file must call both poll and status.", de: "Ein Handler, der nie pollt, besteht den Linker, aber nicht diesen Check - dieselbe Datei muss poll und status aufrufen." }, { en: "The dispatch is the switch on line[0] in apps/bringup/explorer.c; the check wants a real case line, not a mention.", de: "Das Dispatch ist das switch über line[0] in apps/bringup/explorer.c; der Check will eine echte case-Zeile, keine Erwähnung." }, { en: "Pick a letter that is still free - the help listing in cads_help() shows every one already taken.", de: "Wähle einen noch freien Buchstaben - die Hilfeliste in cads_help() zeigt jeden bereits vergebenen." } ] }
  - { trigger: "task:both-targets:failed", question: { en: "The board build passed and the host build did not. Which call in your tool exists on only one of the two sides?", de: "Der Board-Build lief durch, der Host-Build nicht. Welcher Aufruf in deinem Werkzeug existiert nur auf einer der beiden Seiten?" }, hints: [ { en: "modules/net has a board file and a sim file; only what both export is safe to call from portable code.", de: "modules/net hat eine Board-Datei und eine Sim-Datei; nur was beide exportieren, darf portabler Code aufrufen." }, { en: "Board-only hardware code belongs behind the same _demo.c / _sim.c split the existing explorer commands use.", de: "Board-only-Hardwarecode gehört hinter dieselbe _demo.c / _sim.c-Trennung, die die vorhandenen Explorer-Befehle benutzen." }, { en: "Read the first error of the host build, not the last; the later ones are usually consequences of it.", de: "Lies den ersten Fehler des Host-Builds, nicht den letzten; die späteren sind meist seine Folgen." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two failures look the same from the outside: no link at all, and a link with nobody answering. How does your tool tell them apart, and should it?", de: "Zwei Fehler sehen von außen gleich aus: gar kein Link und ein Link, an dem niemand antwortet. Wie unterscheidet dein Werkzeug sie, und sollte es das?" }, hints: [ { en: "One of the two is visible in cads_net_status(); the other is only visible as a timeout you chose.", de: "Einer der beiden ist in cads_net_status() sichtbar; der andere nur als ein Zeitlimit, das du gewählt hast." }, { en: "The send function has no return value, so silence after a send tells you nothing on its own.", de: "Die Sendefunktion hat keinen Rückgabewert, Stille nach dem Senden sagt für sich also nichts." }, { en: "State what your tool prints in each case - a well-formed negative result is a result, not a failure.", de: "Sag, was dein Werkzeug in jedem Fall druckt - ein wohlgeformtes negatives Ergebnis ist ein Ergebnis, kein Fehler." } ] }
---
## Goal

Build a small, real network tool on the board's own lwIP stack — something that speaks on the wire and behaves sanely when the network does not answer.

## What you build on

This project assumes the Foundations module M7, especially the UDP-hello step (m7-02-udp-hello) and the recon commands (m7-04-recon-tools). The public API you use is `modules/net/include/cads/net/net.h`; the worked example is `docs/tutorials/lwip-udp-hello.md`.

## Requirements

- Pick one honest job: a UDP responder that answers a probe, a periodic telemetry sender, or a passive watcher built on the toolbox parsers (`modules/toolbox`).
- Expose a handler named exactly **`cads_project_nettool`** and make it reachable by adding a case to the explorer dispatch (the `switch(line[0])` in `apps/bringup/explorer.c`), so it can be driven from the console.
- Use only the portable API: `cads_net_init()`, `cads_net_poll()`, `cads_net_status()`, and `cads_net_udp_send()` for sending. Remember the contract: nothing detects link-up on its own, so poll for `link_up` before you send, and `cads_net_udp_send()` silently no-ops with no link or a zero destination.
- Build for both targets. The simulator has an honest "no link" stub, so your tool must compile and link there even though it will not transmit.
- Stay passive-or-benign: this is a lab tool, not an attack. The offensive M9 suite is out of scope here.

## Acceptance

The checks test substance. A handler with the right name and an empty body passes none of them.

1. **Substance and reachability.** The file that *defines* `cads_project_nettool` must call `cads_net_poll()` **and** `cads_net_status()` — that is the machine-checkable form of the contract that nothing detects link-up on its own. On top of that, `apps/bringup/explorer.c` must contain a real `case` line for your letter (a mention in a comment does not count), the symbol must be in the ELF, and the board image must build.
2. **Both targets.** The host build is configured and built. It links against the honest "no link" stub; if your tool hangs there in an unbounded wait, the design is wrong, not the stub.
3. **Defence.** You explain what happens on a dead link and what the tool prints then.

## Deliver

One command that does one networking job, plus a note on what it sends or watches and how it degrades when the link is down.
