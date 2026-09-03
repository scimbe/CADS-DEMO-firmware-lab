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
    check: { type: all, bloom: create, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name '*.c.obj' -o -name '*.c.o'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_nettool$' || continue; nm -u $o | grep -q cads_net_poll || continue; nm -u $o | grep -q cads_net_status || continue; exit 0; done; exit 1", expectExitCode: 0 }, { type: command, cwd: ".", command: "for o in $(find build/itsboard -name 'explorer.c.obj' -o -name 'explorer.c.o'); do nm -u $o 2>/dev/null | grep -q cads_project_nettool && exit 0; done; exit 1", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_nettool" } ] }
  - id: both-targets
    title: The host build builds and contains your tool
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host", expectExitCode: 0, timeoutMs: 600000 }, { type: command, cwd: ".", command: "for o in $(find build/host -name '*.c.o' -o -name '*.c.obj'); do nm $o 2>/dev/null | grep -qE ' [Tt] _?cads_project_nettool$' && exit 0; done; exit 1", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the behaviour on a dead link
    check: { type: question, prompt: { en: "How does your tool behave when the link is down and no host answers? Two cases - no link at all, and a link with nobody answering - one sentence each on the behaviour on the wire, plus one sentence on what the tool prints.", de: "Wie verhält sich dein Werkzeug, wenn der Link unten ist und kein Host antwortet? Zwei Fälle - gar kein Link und ein Link, an dem niemand antwortet - je ein Satz zum Verhalten auf der Leitung, plus ein Satz dazu, was das Werkzeug ausgibt." }, rubric: "Names a concrete on-wire behaviour and separates two failure cases. First, no link: cads_net_status() reports link_up false, and cads_net_udp_send() silently does nothing with no link or a zero destination - so the caller has to poll with a deadline and give up rather than assume. Second, a link but nobody answering: that is visible only through a timeout you chose, because the send function has no return value. Says what the tool prints in each case, and treats a well-formed negative result as a result rather than a failure. An answer that names only one of the two cases does not pass.", bloom: create }
socratic:
  - { trigger: "task:tool-substance:failed", question: { en: "Four things are checked at once. Is it the board build, the object file of your handler, the explorer object, or the ELF symbol?", de: "Vier Dinge werden auf einmal geprüft. Ist es der Board-Build, die Objektdatei deines Handlers, das Explorer-Objekt oder das ELF-Symbol?" }, hints: [ { en: "Did you build the board image after your last edit? These sub-checks read the object files under build/itsboard, not the source text.", de: "Hast du das Board-Image nach deiner letzten Änderung gebaut? Diese Teil-Checks lesen die Objektdateien unter build/itsboard, nicht den Quelltext." }, { en: "The check looks for the translation unit that defines cads_project_nettool and wants unresolved references to cads_net_poll and cads_net_status in it; the dispatch is the switch on line[0] in apps/bringup/explorer.c, whose object file must reference your handler.", de: "Der Check sucht die Übersetzungseinheit, die cads_project_nettool definiert, und will darin unaufgelöste Referenzen auf cads_net_poll und cads_net_status; das Dispatch ist das switch über line[0] in apps/bringup/explorer.c, dessen Objektdatei deinen Handler referenzieren muss." }, { en: "Pick a letter that is still free - the help listing in cads_help() shows every one already taken.", de: "Wähle einen noch freien Buchstaben - die Hilfeliste in cads_help() zeigt jeden bereits vergebenen." } ] }
  - { trigger: "task:both-targets:failed", question: { en: "The board build passed and the host build did not. Which call in your tool exists on only one of the two sides?", de: "Der Board-Build lief durch, der Host-Build nicht. Welcher Aufruf in deinem Werkzeug existiert nur auf einer der beiden Seiten?" }, hints: [ { en: "Does the host build fail outright, or does it succeed while the second half finds no definition of your symbol? The first is a portability error, the second means your tool is not compiled into the host target at all.", de: "Scheitert der Host-Build ganz, oder läuft er durch und die zweite Hälfte findet keine Definition deines Symbols? Das erste ist ein Portabilitätsfehler, das zweite heißt, dein Werkzeug wird für den Host gar nicht mitgebaut." }, { en: "modules/net has a board file and a sim file; only what both export is safe to call from portable code. Read the first error of the host build, not the last.", de: "modules/net hat eine Board-Datei und eine Sim-Datei; nur was beide exportieren, darf portabler Code aufrufen. Lies den ersten Fehler des Host-Builds, nicht den letzten." }, { en: "Board-only hardware code belongs behind the same _demo.c / _sim.c split the existing explorer commands use - and your library has to be linked into the host target too, or no object file with your symbol is ever produced.", de: "Board-only-Hardwarecode gehört hinter dieselbe _demo.c / _sim.c-Trennung, die die vorhandenen Explorer-Befehle benutzen - und deine Bibliothek muss auch im Host-Target gelinkt sein, sonst entsteht nie eine Objektdatei mit deinem Symbol." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two failures look the same from the outside: no link at all, and a link with nobody answering. How does your tool tell them apart, and should it?", de: "Zwei Fehler sehen von außen gleich aus: gar kein Link und ein Link, an dem niemand antwortet. Wie unterscheidet dein Werkzeug sie, und sollte es das?" }, hints: [ { en: "Do both failures produce the same output in your tool? If so, you have not yet separated them - one of the two is visible in cads_net_status().", de: "Erzeugen beide Fehler in deinem Werkzeug dieselbe Ausgabe? Dann hast du sie noch nicht getrennt - einer der beiden ist in cads_net_status() sichtbar." }, { en: "The send function has no return value, so silence after a send tells you nothing on its own.", de: "Die Sendefunktion hat keinen Rückgabewert, Stille nach dem Senden sagt für sich also nichts." }, { en: "State what your tool prints in each case - a well-formed negative result is a result, not a failure.", de: "Sag, was dein Werkzeug in jedem Fall druckt - ein wohlgeformtes negatives Ergebnis ist ein Ergebnis, kein Fehler." } ] }
---
## Goal

Build a small, real network tool on the board's own lwIP stack — something that speaks on the wire and behaves sanely when the network does not answer.

## What you build on

**Prerequisite:** work through this project step only after the Foundations steps `m7-02-udp-hello` and `m7-04-recon-tools`. The tutor cannot enforce that: `requires:` resolves only steps of the same pack, and the lock in `course.json` demands the whole Foundations course — the ordering among the projects is yours to keep.

This project assumes the Foundations module M7, especially the UDP-hello step (m7-02-udp-hello) and the recon commands (m7-04-recon-tools). The public API you use is `modules/net/include/cads/net/net.h`; the worked example is `docs/tutorials/lwip-udp-hello.md`.

## Requirements

- Pick one honest job: a UDP responder that answers a probe, a periodic telemetry sender, or a passive watcher built on the toolbox parsers (`modules/toolbox`).
- Expose a handler named exactly **`cads_project_nettool`** and make it reachable by adding a case to the explorer dispatch (the `switch(line[0])` in `apps/bringup/explorer.c`), so it can be driven from the console.
- Use only the portable API: `cads_net_init()`, `cads_net_poll()`, `cads_net_status()`, and `cads_net_udp_send()` for sending. Remember the contract: nothing detects link-up on its own, so poll for `link_up` before you send, and `cads_net_udp_send()` silently no-ops with no link or a zero destination.
- Build for both targets. The simulator has an honest "no link" stub, so your tool must compile and link there even though it will not transmit.
- Stay passive-or-benign: this is a lab tool, not an attack. The offensive M9 suite is out of scope here.

## Acceptance

The substance checks read the **built object files**, not the source text. A handler with the right name and an empty body passes none of them, and a comment even less.

1. **Substance and reachability.** First the board image builds. Then the translation unit that *defines* `cads_project_nettool` must carry unresolved references to `cads_net_poll` **and** `cads_net_status` — the machine-checkable form of the contract that nothing detects link-up on its own. The object file of `apps/bringup/explorer.c` must list `cads_project_nettool` as an undefined symbol, so your `case` really calls the handler; and the symbol must be in the ELF.
2. **Both targets.** The host build is configured and built — **and** an object file under `build/host` must then *define* `cads_project_nettool`. That the repository builds proves nothing about your tool; only the symbol in the host build shows that it is compiled for both targets. It links against the honest "no link" stub; if your tool hangs there in an unbounded wait, the design is wrong, not the stub.
3. **Defence.** You explain what happens on a dead link and what the tool prints then.

## Deliver

One command that does one networking job, plus a note on what it sends or watches and how it degrades when the link is down.
