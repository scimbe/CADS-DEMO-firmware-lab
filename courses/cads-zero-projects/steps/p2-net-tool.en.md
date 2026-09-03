---
id: p2-net-tool
title: "Project: a network tool on lwIP"
bloom: create
objectives: [cz.net.recon]
requires: []
estimatedMinutes: 120
creates: [cads_project_nettool]
links:
  - { file: "modules/net/include/cads/net/net.h" }
  - { doc: "docs/tutorials/lwip-udp-hello.md" }
  - { doc: "docs/reference/explorer-console.md" }
sources: [modules/net/include/cads/net/net.h, docs/tutorials/lwip-udp-hello.md, apps/bringup/explorer.c]
tasks:
  - id: tool-builds
    title: The tool exists, is reachable, and builds
    check: { type: all, checks: [ { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "cads_project_nettool" }, { type: fileMatches, file: "apps/bringup/explorer.c", pattern: "cads_project_nettool" }, { type: task, label: "CaDS: Build", expectExitCode: 0 } ] }
  - id: defend
    title: Defend the tool
    check: { type: question, prompt: { en: "What does your tool do on the wire, and how does it behave when the link is down or no host answers? Why is fire-and-forget acceptable, or why did you need to poll for a reply instead?", de: "Was tut dein Werkzeug auf der Leitung, und wie verhält es sich, wenn der Link unten ist oder kein Host antwortet? Warum ist Fire-and-Forget vertretbar, oder warum musstest du stattdessen auf eine Antwort pollen?" }, rubric: "States a concrete on-wire behaviour; explains that cads_net_udp_send no-ops with no link or dst_ip 0; and shows awareness that nothing detects link-up on its own, so a caller polls cads_net_status()/cads_net_poll() rather than assuming.", bloom: create }
socratic:
  - { trigger: "task:tool-builds:failed", question: { en: "The build cannot see cads_project_nettool, or nothing calls it. Is it defined in a source that is actually compiled and reached from a dispatch case?", de: "Der Build sieht cads_project_nettool nicht, oder nichts ruft es auf. Ist es in einer Quelle definiert, die wirklich kompiliert und aus einem Dispatch-Case erreicht wird?" }, hints: [ { en: "The explorer dispatch is the switch on line[0] in apps/bringup/explorer.c; add a case that calls cads_project_nettool.", de: "Das Explorer-Dispatch ist das switch über line[0] in apps/bringup/explorer.c; ergänze einen Case, der cads_project_nettool aufruft." }, { en: "cads_net_udp_send(dst_ip, dst_port, payload, len) takes host byte order and no socket object; it no-ops with no link.", de: "cads_net_udp_send(dst_ip, dst_port, payload, len) nimmt Host-Bytereihenfolge und kein Socket-Objekt; ohne Link tut es nichts." }, { en: "Follow the link-wait pattern from the UDP-hello tutorial: poll cads_net_poll()/cads_net_status() until link_up before sending.", de: "Folge dem Link-Wait-Muster aus dem UDP-Hello-Tutorial: polle cads_net_poll()/cads_net_status(), bis link_up, bevor du sendest." } ] }
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

The first check confirms `cads_project_nettool` is in the ELF, that `apps/bringup/explorer.c` references it, and that the board image builds. The second is a defence of the tool's on-wire behaviour and its handling of a dead link.

## Deliver

One command that does one networking job, plus a note on what it sends or watches and how it degrades when the link is down.
