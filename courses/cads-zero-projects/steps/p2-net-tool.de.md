---
id: p2-net-tool
title: "Projekt: ein Netzwerk-Werkzeug auf lwIP"
bloom: create
objectives: [cz.net.recon]
requires: []
estimatedMinutes: 120
links:
  - { file: "modules/net/include/cads/net/net.h" }
  - { doc: "docs/tutorials/lwip-udp-hello.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [modules/net/include/cads/net/net.h, docs/tutorials/lwip-udp-hello.md, apps/bringup/explorer.c]
tasks:
  - id: tool-builds
    title: Das Werkzeug existiert, ist erreichbar und baut
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_nettool" }, { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_project_nettool" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Verteidige das Werkzeug
    check: { type: question, prompt: { en: "What does your tool do on the wire, and how does it behave when the link is down or no host answers? Why is fire-and-forget acceptable, or why did you need to poll for a reply instead?", de: "Was tut dein Werkzeug auf der Leitung, und wie verhält es sich, wenn der Link unten ist oder kein Host antwortet? Warum ist Fire-and-Forget vertretbar, oder warum musstest du stattdessen auf eine Antwort pollen?" }, rubric: "Nennt ein konkretes Verhalten auf der Leitung; erklärt, dass cads_net_udp_send ohne Link oder mit dst_ip 0 nichts tut; und zeigt Bewusstsein, dass nichts von selbst Link-up erkennt, ein Aufrufer also cads_net_status()/cads_net_poll() pollt statt anzunehmen.", bloom: create }
socratic:
  - { trigger: "task:tool-builds:failed", question: { en: "The build cannot see cads_project_nettool, or nothing calls it. Is it defined in a source that is actually compiled and reached from a dispatch case?", de: "Der Build sieht cads_project_nettool nicht, oder nichts ruft es auf. Ist es in einer Quelle definiert, die wirklich kompiliert und aus einem Dispatch-Case erreicht wird?" }, hints: [ { en: "The explorer dispatch is the switch on line[0] in apps/bringup/explorer.c; add a case that calls cads_project_nettool.", de: "Das Explorer-Dispatch ist das switch über line[0] in apps/bringup/explorer.c; ergänze einen Case, der cads_project_nettool aufruft." }, { en: "cads_net_udp_send(dst_ip, dst_port, payload, len) takes host byte order and no socket object; it no-ops with no link.", de: "cads_net_udp_send(dst_ip, dst_port, payload, len) nimmt Host-Bytereihenfolge und kein Socket-Objekt; ohne Link tut es nichts." }, { en: "Follow the link-wait pattern from the UDP-hello tutorial: poll cads_net_poll()/cads_net_status() until link_up before sending.", de: "Folge dem Link-Wait-Muster aus dem UDP-Hello-Tutorial: polle cads_net_poll()/cads_net_status(), bis link_up, bevor du sendest." } ] }
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

Der erste Check bestätigt, dass `cads_project_nettool` in der ELF ist, dass `apps/bringup/explorer.c` es referenziert und dass das Board-Image baut. Der zweite verteidigt das Verhalten des Werkzeugs auf der Leitung und seinen Umgang mit einem toten Link.

## Liefern

Ein Befehl, der eine Netzwerkaufgabe erfüllt, plus eine Notiz, was er sendet oder beobachtet und wie er sich bei fehlendem Link verhält.
