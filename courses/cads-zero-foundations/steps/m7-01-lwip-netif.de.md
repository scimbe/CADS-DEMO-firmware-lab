---
id: m7-01-lwip-netif
title: Das lwIP-netif und die statische Adressierung
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
    title: Führe das Netz-Gate aus und lies seine Zähler
    check: { type: manual }
  - id: link-detection
    title: Wie Link-up erkannt wird und woher die Adresse kommt
    check: { type: question, prompt: { en: "Nothing in this firmware detects link-up on its own. How does a caller learn that the Ethernet link came up, and what address does the board use out of the box?", de: "Nichts in dieser Firmware erkennt Link-up von allein. Wie erfährt ein Aufrufer, dass der Ethernet-Link hochgekommen ist, und welche Adresse benutzt das Board ab Werk?" }, rubric: "Erklärt, dass cads_net_poll() wiederholt aufgerufen werden muss und cads_net_status() nur das zwischengespeicherte Ergebnis des letzten Polls liefert (Aufrufer schleifen poll + status bis link_up); nennt die statische Vorgabe 192.168.33.99/24 mit Gateway 192.168.33.1 und net.dhcp = 0 als Standard.", bloom: understand }
socratic:
  - { trigger: "question:link-detection:weak", question: { en: "Read the doc comment on cads_net_status() and cads_net_poll(). Which of the two does the actual work, and which merely reports?", de: "Lies den Doku-Kommentar zu cads_net_status() und cads_net_poll(). Welche der beiden erledigt die eigentliche Arbeit, und welche berichtet nur?" }, hints: [ { en: "cads_net_poll() pumps receive, transmit and lwIP's timeouts; call it every loop iteration.", de: "cads_net_poll() treibt Empfang, Senden und die lwIP-Timeouts; rufe es in jeder Schleifeniteration auf." }, { en: "cads_net_status() fills a struct from the last poll - if you never poll, link_up never becomes true.", de: "cads_net_status() füllt eine Struktur aus dem letzten Poll - pollst du nie, wird link_up nie wahr." }, { en: "The default addressing lives in cads_net_board.c (192.168.33.99/24, gateway .1) and in the config reference under net.*.", de: "Die Standardadressierung steht in cads_net_board.c (192.168.33.99/24, Gateway .1) und in der Konfigurationsreferenz unter net.*." } ] }
---
## Lernziel

Verstehe, wie CaDS Zero seine Netzwerkschnittstelle hochbringt, warum ein Aufrufer den Link-Zustand pollen muss, und welche Adresse das Board benutzt, wenn nichts konfiguriert wurde.

## Der Hardware-Vorteil in einem Modul

Ethernet ist das, was dieses Board hat und ein Flipper Zero nicht: eine LAN8742A-PHY über RMII mit 100 Mbit. `modules/net` legt lwIP um diesen MAC, hinter eine bewusst kleine portable API in `modules/net/include/cads/net/net.h`. Es gibt zwei Implementierungen, nach demselben Muster wie beim Storage: `cads_net_board.c` besitzt ein echtes lwIP-netif über den RMII-MAC; `cads_net_sim.c` ist ein ehrlicher Stub, der „nie ein Link" meldet — es gibt keine RMII-Hardware zu simulieren, und etwas anderes vorzutäuschen ließe eine App eine Abhängigkeit vom Netzwerkverhalten verstecken, bis sie auf dem Board landet.

## Drei Aufrufe

```c
void cads_net_init(const uint8_t mac_address[6]);   /* idempotent: der erste Aufruf gewinnt */
void cads_net_poll(void);                            /* RX, TX, lwIP-Timeouts */
void cads_net_status(cads_net_status_t* status);     /* das Ergebnis des LETZTEN Polls */
```

`cads_net_init()` ist absichtlich idempotent: jeder Aufrufer, der Netzwerk „an" haben will — ein Diagnosebefehl, der echte App-Baum — ruft es auf, und nur der erste Aufruf im gesamten Image tut etwas. `cads_net_poll()` treibt Empfang, Senden und die internen lwIP-Timeouts; es ist billig im Leerlauf und muss in jeder Iteration der Schleife laufen, die es besitzt.

Der Vertrag, über den man stolpert: **nichts erkennt Link-up von allein.** `cads_net_status()` liefert das zwischengespeicherte Ergebnis des letzten Polls. Jeder echte Aufrufer in dieser Codebasis fährt deshalb dieselbe Schleife — pollen, Status lesen, bei `link_up` abbrechen, kurz schlafen, wiederholen, mit Zeitlimit. Genau diese Schleife übernimmst du im nächsten Step.

`cads_net_status_t` verrät dir außerdem `ip_addr`, `gw_addr`, `dns_addr` (Host-Byte-Order, 0 wenn ungesetzt), `dhcp_bound`, Geschwindigkeit und Duplex sowie Frame-Zähler. Die Statusleisten-Anzeige im App-Baum liest diese Felder, um „no link", „no lease" oder „100M" auszugeben.

## Adressierung ab Werk

Das Board ist standardmäßig **statisch, nicht DHCP**. `cads_net_board.c` trägt die eingebaute Vorgabe `192.168.33.99/24`, Gateway `192.168.33.1`, und `/config.txt` stellt sie als `net.dhcp = 0`, `net.ip`, `net.netmask`, `net.gateway` bereit (`docs/reference/config-file.md`). `net.dhcp = 1` startet den lwIP-DHCP-Client, sobald der Link steht; bei Link-down ruft der Treiber `dhcp_stop()` statt eines Release, weil dann kein Träger mehr da ist, über den ein Release gesendet werden könnte. Diese statische Vorgabe ist der Grund, warum das Labor mit einem einfachen Kabel zwischen Board und Laptop und ohne jeden DHCP-Server funktioniert.

## Deine Aufgabe

Bringe das Board bei Bedarf zum Konsolen-Prompt zurück, führe das M5-Netz-Gate `h 10` aus und lies, was es meldet: Link-Zustand, Geschwindigkeit sowie Paket- und Byte-Zähler. Beantworte dann die Frage, wie Link-up erfahren wird und woher die Adresse kommt.
