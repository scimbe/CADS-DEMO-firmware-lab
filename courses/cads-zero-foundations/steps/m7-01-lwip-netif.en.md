---
id: m7-01-lwip-netif
title: The lwIP netif and static addressing
bloom: understand
objectives: [cz.net.lwip]
requires: [m6-04-build-profiles]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: m7-02-udp-hello }
  - { file: "modules/net/include/cads/net/net.h", line: 56 }
  - { file: "modules/net/include/lwipopts.h", line: 47 }
  - { doc: "docs/reference/config-file.md" }
  - { doc: "docs/HARDWARE.md" }
sources: [modules/net/include/cads/net/net.h, modules/net/src/cads_net_board.c, modules/net/include/lwipopts.h, docs/reference/config-file.md, docs/reference/explorer-console.md]
misconceptions:
  - { pattern: "not available in the simulator", question: { en: "You are talking to the host build, not the board. What does the simulator honestly report about the link, and why does it not fake one?", de: "Du sprichst mit dem Host-Build, nicht mit dem Board. Was meldet der Simulator ehrlich über den Link, und warum täuscht er keinen vor?" }, hints: [ { en: "There are two implementations of the same header; only one of them owns an RMII MAC.", de: "Es gibt zwei Implementierungen desselben Headers; nur eine besitzt einen RMII-MAC." }, { en: "The sim stub reports no link, ever, so an app cannot hide a dependency on network behaviour until it hits the board.", de: "Der Sim-Stub meldet nie einen Link, damit eine App keine Abhängigkeit vom Netzverhalten verstecken kann, bis sie auf dem Board landet." }, { en: "Flash the board image and run the command from the board console instead of the host binary.", de: "Flashe das Board-Image und führ den Befehl von der Board-Konsole aus statt vom Host-Binary." } ] }
  - { pattern: "net: link DOWN", question: { en: "The stack came up but the PHY reports no carrier. What is between the two that you can check without any code?", de: "Der Stack kam hoch, aber die PHY meldet keinen Träger. Was liegt dazwischen, das du ohne jeden Code prüfen kannst?" }, hints: [ { en: "Link is a physical-layer fact: a cable, a peer that is powered, and a negotiated speed.", de: "Link ist eine Tatsache der Bitübertragungsschicht: ein Kabel, eine eingeschaltete Gegenstelle und eine ausgehandelte Geschwindigkeit." }, { en: "The console has separate PHY commands that read identity and link state over MDIO without touching lwIP.", de: "Die Konsole hat eigene PHY-Befehle, die Identität und Link-Zustand über MDIO lesen, ohne lwIP anzufassen." }, { en: "If the PHY answers but stays down, the peer or the cable is the suspect - not this firmware.", de: "Antwortet die PHY, bleibt aber unten, sind Gegenstelle oder Kabel verdächtig - nicht diese Firmware." } ] }
tasks:
  - id: net-gate
    title: Run the net gate and read its counters
    check: { type: serialExpect, send: "h 10\n", pattern: "net: link=", timeoutMs: 40000, bloom: understand }
  - id: pool-arithmetic
    title: Predict the RAM price of the network stack
    check: { type: predict, prompt: { en: "lwIP gets a heap of its own and a pool of receive buffers on this board. Predict roughly how many kilobytes of RAM the two together cost.", de: "lwIP bekommt auf diesem Board einen eigenen Heap und einen Pool von Empfangspuffern. Sage voraus, wie viele Kilobyte RAM die beiden zusammen ungefähr kosten." }, then: { type: command, cwd: ".", command: "grep -n -B24 -E '^#define (MEM_SIZE|PBUF_POOL_SIZE)' modules/net/include/lwipopts.h", expectExitCode: 0 }, rubric: "The comparison shows MEM_SIZE (4 * 1024), so a 4 KB lwIP heap, and PBUF_POOL_SIZE 10 slots. The comments next to them give the per-slot size the project measured from the linker map, about 608 B, so the pool costs roughly 6 KB; these two items together come to about 10 KB. That is explicitly not the network stack total: the MEMP_NUM_* pools, the ARP table, the TCP PCBs and the MAC descriptor rings are not in it. Passes if the answer, after the comparison, names both items separately and multiplies the count by the slot size; reading off only one of the two numbers does not pass. A wrong estimate with the right arithmetic passes.", bloom: understand }
  - id: link-detection
    title: How link-up is learned
    check: { type: question, prompt: { en: "How does a caller learn that the Ethernet link has come up?", de: "Wie erfährt ein Aufrufer, dass der Ethernet-Link hochgekommen ist?" }, rubric: "Not on its own at all. cads_net_status() only reports the cached result of the last poll; it does not ask the hardware. Every real caller therefore runs the same loop: call cads_net_poll(), then read cads_net_status(), break on link_up, sleep a little, repeat, with a deadline. A program that never polls never sees link_up become true. An answer that names only cads_net_status() does not pass.", bloom: understand }
socratic:
  - { trigger: "task:net-gate:failed", question: { en: "The gate needs three things before it can report counters: a console prompt, a link, and enough seconds. Which of the three is missing?", de: "Das Gate braucht drei Dinge, bevor es Zähler melden kann: einen Konsolen-Prompt, einen Link und genug Sekunden. Welches der drei fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "The command takes a duration in seconds and reports only after it elapses; too short a run reports nothing useful.", de: "Der Befehl nimmt eine Dauer in Sekunden und meldet erst danach; ein zu kurzer Lauf meldet nichts Brauchbares." }, { en: "If the report says the link is down, the fault is below this firmware - cable, peer, or a PHY that is not answering.", de: "Meldet der Bericht den Link als unten, liegt der Fehler unterhalb dieser Firmware - Kabel, Gegenstelle oder eine PHY, die nicht antwortet." } ] }
  - { trigger: "task:pool-arithmetic:stuck", question: { en: "Two numbers in the options header decide this. One is a size in bytes; the other is a count. What has to be true of the second before it becomes bytes?", de: "Zwei Zahlen im Options-Header entscheiden das. Die eine ist eine Größe in Byte, die andere eine Anzahl. Was muss über die zweite bekannt sein, damit sie zu Bytes wird?" }, hints: [ { en: "A pool of N buffers costs N times the size of one buffer, and that size is not a round number here.", de: "Ein Pool aus N Puffern kostet N mal die Größe eines Puffers, und diese Größe ist hier keine runde Zahl." }, { en: "The comments in modules/net/include/lwipopts.h state the per-slot size the project measured from the linker map.", de: "Die Kommentare in modules/net/include/lwipopts.h nennen die Größe je Slot, die das Projekt aus der Linker-Map gemessen hat." }, { en: "Guess and write it down - the comparison against the real values is where this task teaches.", de: "Rate und schreib es hin - der Vergleich mit den echten Werten ist die Stelle, an der diese Aufgabe lehrt." } ] }
  - { trigger: "question:link-detection:weak", question: { en: "Read the doc comments on cads_net_status() and cads_net_poll(). Which of the two does the actual work, and which merely reports?", de: "Lies die Doku-Kommentare zu cads_net_status() und cads_net_poll(). Welche der beiden erledigt die eigentliche Arbeit, und welche berichtet nur?" }, hints: [ { en: "One of the two functions has no effect at all on the hardware; it only copies out what was already known.", de: "Eine der beiden Funktionen wirkt gar nicht auf die Hardware; sie kopiert nur heraus, was schon bekannt war." }, { en: "Ask what happens to link_up in a program that calls only the reporting function, in a loop, forever.", de: "Frag dich, was mit link_up in einem Programm geschieht, das in einer Schleife ausschließlich die berichtende Funktion aufruft." }, { en: "Your answer has to describe a loop with a shape, not a single call - name what runs in it and what ends it.", de: "Deine Antwort muss eine Schleife mit einer Gestalt beschreiben, nicht einen einzelnen Aufruf - nenne, was darin läuft und was sie beendet." } ] }
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

The contract that trips people up: **nothing detects link-up on its own.** `cads_net_status()` reports the cached result of the last poll and does not ask the hardware. What shape a caller has to derive from that is the third question of this step; you will write exactly that shape as code in the next one.

`cads_net_status_t` also tells you `ip_addr`, `gw_addr`, `dns_addr` (host byte order, 0 when unset), `dhcp_bound`, speed and duplex, and frame counters. The status-bar indicator in the app tree reads these to print "no link", "no lease" or "100M".

## Addressing out of the box

The board is **static, not DHCP**, by default. `cads_net_board.c` carries the built-in default `192.168.33.99/24`, gateway `192.168.33.1`, and `/config.txt` exposes it as `net.dhcp = 0`, `net.ip`, `net.netmask`, `net.gateway` (`docs/reference/config-file.md`). Setting `net.dhcp = 1` starts lwIP's DHCP client once the link is up; on link-down the driver calls `dhcp_stop()` rather than releasing, because by then there is no carrier to send a release over. That static default is why the lab works with a plain cable between board and laptop and no DHCP server anywhere.

## What the stack costs in RAM

A network stack is not an idea, it is memory. lwIP gets two separate pots here, and both are in `modules/net/include/lwipopts.h`: a **heap of its own** for the stack's structures, and a **pool of receive buffers** every arriving frame is served from. The heap is written as a byte count, the pool as a number of slots — and slots only become bytes once you know how big one is, which is exactly the figure the project measured from the linker map and wrote into the comment beside it.

Why every line in that file is commented: the same RAM carries the 48 KB floor `scripts/check_ram_budget.py` guards (M4-02). Growing any lwIP buffer is a decision against something else. The second task of this step has you estimate these two items first and look them up afterwards. They are not the whole price of the stack — the `MEMP_NUM_*` pools, the ARP table, the TCP PCBs and the MAC descriptor rings sit beside them — but they are the two largest single items and the ones this project actually made decisions about.

## Your task

Open the board console so you can read along — you do not have to send anything: the **Check** button on this task sends `h 10` itself and waits for the answer. If the board is sitting in the app tree, run `python3 scripts/board_key.py quit` once in a terminal first. Read what the gate reports: link state, speed, and the packet and byte counters. Then predict the RAM price of those two items and compare against the constants in `modules/net/include/lwipopts.h`. Finally answer the question on how a caller learns about link-up.

**Where you do this:**
- Open a file: `Ctrl`/`Cmd`+`P`.
- Open a terminal: menu *Terminal → New Terminal*.
- Open the board console: `F1`, then *CaDS Board: Konsole öffnen*.
- Build: menu *Terminal → Run Build Task…*.
