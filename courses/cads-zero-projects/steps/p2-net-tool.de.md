---
id: p2-net-tool
title: "Projekt: ein Netzwerk-Werkzeug auf lwIP"
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
    title: Der Handler pollt den Link und ist aus der Konsole erreichbar
    check: { type: all, bloom: create, checks: [ { type: command, cwd: ".", command: "grep -rlE 'void[[:space:]]+cads_project_nettool' apps modules --include=*.c | xargs -r grep -l cads_net_poll | xargs -r grep -l cads_net_status | grep -q .", expectExitCode: 0 }, { type: command, cwd: ".", command: "grep -nE '^[[:space:]]*case .*cads_project_nettool' apps/bringup/explorer.c", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_nettool" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: both-targets
    title: Auch der Host-Build linkt
    check: { type: command, cwd: ".", command: "cmake --preset host && cmake --build build/host", expectExitCode: 0, timeoutMs: 600000, bloom: create }
  - id: defend
    title: Verteidige das Verhalten am toten Link
    check: { type: question, prompt: { en: "How does your tool behave when the link is down and no host answers?", de: "Wie verhält sich dein Werkzeug, wenn der Link unten ist und kein Host antwortet?" }, rubric: "Nennt ein konkretes Verhalten auf der Leitung und trennt zwei Fehlerfälle. Erstens kein Link: cads_net_status() zeigt link_up falsch, und cads_net_udp_send() tut ohne Link oder mit Ziel 0 stillschweigend nichts - der Aufrufer muss also mit Zeitlimit pollen und aufgeben, statt anzunehmen. Zweitens Link vorhanden, aber niemand antwortet: das ist nur über ein selbst gewähltes Zeitlimit sichtbar, weil die Sendefunktion keinen Rückgabewert hat. Sagt, was das Werkzeug in beiden Fällen ausgibt, und behandelt ein wohlgeformtes negatives Ergebnis nicht als Fehler. Eine Antwort, die nur einen der beiden Fälle nennt, besteht nicht.", bloom: create }
socratic:
  - { trigger: "task:tool-substance:failed", question: { en: "Four things are checked at once. Is it the handler's own file, the dispatch case, the symbol, or the board build?", de: "Vier Dinge werden auf einmal geprüft. Ist es die eigene Datei des Handlers, der Dispatch-Case, das Symbol oder der Board-Build?" }, hints: [ { en: "A handler that never polls passes the linker but not this check - the same file must call both poll and status.", de: "Ein Handler, der nie pollt, besteht den Linker, aber nicht diesen Check - dieselbe Datei muss poll und status aufrufen." }, { en: "The dispatch is the switch on line[0] in apps/bringup/explorer.c; the check wants a real case line, not a mention.", de: "Das Dispatch ist das switch über line[0] in apps/bringup/explorer.c; der Check will eine echte case-Zeile, keine Erwähnung." }, { en: "Pick a letter that is still free - the help listing in cads_help() shows every one already taken.", de: "Wähle einen noch freien Buchstaben - die Hilfeliste in cads_help() zeigt jeden bereits vergebenen." } ] }
  - { trigger: "task:both-targets:failed", question: { en: "The board build passed and the host build did not. Which call in your tool exists on only one of the two sides?", de: "Der Board-Build lief durch, der Host-Build nicht. Welcher Aufruf in deinem Werkzeug existiert nur auf einer der beiden Seiten?" }, hints: [ { en: "modules/net has a board file and a sim file; only what both export is safe to call from portable code.", de: "modules/net hat eine Board-Datei und eine Sim-Datei; nur was beide exportieren, darf portabler Code aufrufen." }, { en: "Board-only hardware code belongs behind the same _demo.c / _sim.c split the existing explorer commands use.", de: "Board-only-Hardwarecode gehört hinter dieselbe _demo.c / _sim.c-Trennung, die die vorhandenen Explorer-Befehle benutzen." }, { en: "Read the first error of the host build, not the last; the later ones are usually consequences of it.", de: "Lies den ersten Fehler des Host-Builds, nicht den letzten; die späteren sind meist seine Folgen." } ] }
  - { trigger: "question:defend:weak", question: { en: "Two failures look the same from the outside: no link at all, and a link with nobody answering. How does your tool tell them apart, and should it?", de: "Zwei Fehler sehen von außen gleich aus: gar kein Link und ein Link, an dem niemand antwortet. Wie unterscheidet dein Werkzeug sie, und sollte es das?" }, hints: [ { en: "One of the two is visible in cads_net_status(); the other is only visible as a timeout you chose.", de: "Einer der beiden ist in cads_net_status() sichtbar; der andere nur als ein Zeitlimit, das du gewählt hast." }, { en: "The send function has no return value, so silence after a send tells you nothing on its own.", de: "Die Sendefunktion hat keinen Rückgabewert, Stille nach dem Senden sagt für sich also nichts." }, { en: "State what your tool prints in each case - a well-formed negative result is a result, not a failure.", de: "Sag, was dein Werkzeug in jedem Fall druckt - ein wohlgeformtes negatives Ergebnis ist ein Ergebnis, kein Fehler." } ] }
---
## Ziel

Baue ein kleines, echtes Netzwerk-Werkzeug auf dem lwIP-Stack des Boards — etwas, das auf der Leitung spricht und sich vernünftig verhält, wenn das Netz nicht antwortet.

## Worauf du aufbaust

Dieses Projekt setzt das Grundlagen-Modul M7 voraus, besonders den UDP-Hello-Step (m7-02-udp-hello) und die Recon-Befehle (m7-04-recon-tools). Die öffentliche API ist `modules/net/include/cads/net/net.h`; das durchgearbeitete Beispiel ist `docs/tutorials/lwip-udp-hello.md`.

## Anforderungen

- Wähle eine ehrliche Aufgabe: einen UDP-Responder, der auf eine Anfrage antwortet, einen periodischen Telemetrie-Sender oder einen passiven Beobachter auf den Toolbox-Parsern (`modules/toolbox`).
- Stelle einen Handler mit genau dem Namen **`cads_project_nettool`** bereit und mache ihn erreichbar, indem du einen Case zum Explorer-Dispatch (`switch(line[0])` in `apps/bringup/explorer.c`) hinzufügst, sodass er von der Konsole aus gefahren werden kann.
- Nutze nur die portable API: `cads_net_init()`, `cads_net_poll()`, `cads_net_status()` und `cads_net_udp_send()` zum Senden. Beachte den Vertrag: nichts erkennt Link-up von selbst, also polle auf `link_up`, bevor du sendest, und `cads_net_udp_send()` tut ohne Link oder mit Ziel 0 stillschweigend nichts.
- Baue für beide Targets. Der Simulator hat einen ehrlichen „kein Link"-Stub, dein Werkzeug muss dort also kompilieren und linken, auch wenn es nicht sendet.
- Bleibe passiv oder harmlos: dies ist ein Laborwerkzeug, kein Angriff. Die offensive M9-Suite ist hier außerhalb des Rahmens.

## Abnahme

Die Checks prüfen Substanz. Ein Handler mit dem richtigen Namen und leerem Rumpf besteht keinen davon.

1. **Substanz und Erreichbarkeit.** Die Datei, die `cads_project_nettool` *definiert*, muss `cads_net_poll()` **und** `cads_net_status()` aufrufen — das ist die maschinelle Fassung des Vertrags, dass nichts Link-up von allein erkennt. Dazu muss `apps/bringup/explorer.c` eine echte `case`-Zeile für deinen Buchstaben enthalten (eine Erwähnung im Kommentar genügt nicht), das Symbol in der ELF sein und das Board-Image bauen.
2. **Beide Targets.** Der Host-Build wird konfiguriert und gebaut. Er linkt gegen den ehrlichen „kein Link"-Stub; hängt dein Werkzeug dort in einer unbegrenzten Warteschleife, ist der Entwurf falsch, nicht der Stub.
3. **Verteidigung.** Du erklärst, was am toten Link geschieht und was das Werkzeug dann ausgibt.

## Liefern

Ein Befehl, der eine Netzwerkaufgabe erfüllt, plus eine Notiz, was er sendet oder beobachtet und wie er sich bei fehlendem Link verhält.
