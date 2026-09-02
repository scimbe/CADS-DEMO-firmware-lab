---
id: m7-01-lwip-netif
title: The lwIP netif and static addressing
bloom: understand
objectives: [cz.net.lwip]
requires: [m6-04-build-profiles]
estimatedMinutes: 15
links:
  - { step: m7-02-udp-hello }
  - { file: "modules/net/include/cads/net/net.h", line: 56 }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/HARDWARE.md" }
sources: [modules/net/include/cads/net/net.h, modules/net/src/cads_net_board.c, docs/reference/config-file.md, docs/reference/explorer-console.md]
tasks:
  - id: net-gate
    title: Run the net gate and read its counters
    check: { type: manual }
  - id: link-detection
    title: How link-up is detected, and where the address comes from
    check: { type: question, prompt: { en: "Nothing in this firmware detects link-up on its own. How does a caller learn that the Ethernet link came up, and what address does the board use out of the box?", de: "Nichts in dieser Firmware erkennt Link-up von allein. Wie erfährt ein Aufrufer, dass der Ethernet-Link hochgekommen ist, und welche Adresse benutzt das Board ab Werk?" }, rubric: "Explains that cads_net_poll() must be called repeatedly and that cads_net_status() only reports the last poll's cached result (so callers loop poll + status until link_up); names the static default 192.168.33.99/24 with gateway 192.168.33.1 and that net.dhcp defaults to 0.", bloom: understand }
socratic:
  - { trigger: "question:link-detection:weak", question: { en: "Read the doc comment on cads_net_status() and cads_net_poll(). Which of the two does the actual work, and which merely reports?", de: "Lies den Doku-Kommentar zu cads_net_status() und cads_net_poll(). Welche der beiden erledigt die eigentliche Arbeit, und welche berichtet nur?" }, hints: [ { en: "cads_net_poll() pumps receive, transmit and lwIP's timeouts; call it every loop iteration.", de: "cads_net_poll() treibt Empfang, Senden und die lwIP-Timeouts; rufe es in jeder Schleifeniteration auf." }, { en: "cads_net_status() fills a struct from the last poll - if you never poll, link_up never becomes true.", de: "cads_net_status() füllt eine Struktur aus dem letzten Poll - pollst du nie, wird link_up nie wahr." }, { en: "The default addressing lives in cads_net_board.c (192.168.33.99/24, gateway .1) and in the config reference under net.*.", de: "Die Standardadressierung steht in cads_net_board.c (192.168.33.99/24, Gateway .1) und in der Konfigurationsreferenz unter net.*." } ] }
---
## Learning goal

Understand how CaDS Zero brings up its network interface, why a caller has to poll for link state, and which address the board uses when nothing has been configured.

## The hardware advantage, in one module

Ethernet is what this board has that a Flipper Zero does not: a LAN8742A PHY over RMII, at 100 Mbit. `modules/net` wraps lwIP around that MAC behind a deliberately small portable API in `modules/net/include/cads/net/net.h`. Two implementations exist, on the same pattern as storage: `cads_net_board.c` owns a real lwIP netif over the RMII MAC; `cads_net_sim.c` is an honest stub that reports "no link, ever" — there is no RMII hardware to simulate, and pretending otherwise would let an app hide a dependency on network behaviour until it hits the board.

## Three calls

```c
void cads_net_init(const uint8_t mac_address[6]);   /* idempotent: first call wins */
void cads_net_poll(void);                            /* rx, tx, lwIP timeouts */
void cads_net_status(cads_net_status_t* status);     /* the LAST poll's result */
```

`cads_net_init()` is idempotent on purpose: any caller that wants networking "on" — a diagnostic command, the real app tree — calls it, and only the first call across the whole image does anything. `cads_net_poll()` pumps receive, transmit and lwIP's internal timeouts; it is cheap when idle and must run every iteration of the loop that owns it.

The contract that trips people up: **nothing detects link-up on its own.** `cads_net_status()` reports the cached result of the last poll. Every real caller in this codebase therefore runs the same loop — poll, read status, break on `link_up`, sleep a little, repeat, with a deadline. You will copy exactly that loop in the next step.

`cads_net_status_t` also tells you `ip_addr`, `gw_addr`, `dns_addr` (host byte order, 0 when unset), `dhcp_bound`, speed and duplex, and frame counters. The status-bar indicator in the app tree reads these to print "no link", "no lease" or "100M".

## Addressing out of the box

The board is **static, not DHCP**, by default. `cads_net_board.c` carries the built-in default `192.168.33.99/24`, gateway `192.168.33.1`, and `/config.txt` exposes it as `net.dhcp = 0`, `net.ip`, `net.netmask`, `net.gateway` (`docs/reference/config-file.md`). Setting `net.dhcp = 1` starts lwIP's DHCP client once the link is up; on link-down the driver calls `dhcp_stop()` rather than releasing, because by then there is no carrier to send a release over. That static default is why the lab works with a plain cable between board and laptop and no DHCP server anywhere.

## Your task

Return the board to the console prompt if needed, run the M5 net gate `h 10`, and read what it reports: link state, speed, and the packet and byte counters. Then answer the question on how link-up is learned and where the address comes from.
