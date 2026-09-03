---
id: m7-01-lwip-netif
title: Das lwIP-netif und die statische Adressierung
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
    title: Führe das Netz-Gate aus und lies seine Zähler
    check: { type: serialExpect, send: "h 10\n", pattern: "net: link=", timeoutMs: 40000, bloom: understand }
  - id: pool-arithmetic
    title: Sage den RAM-Preis des Netzstacks voraus
    check: { type: predict, prompt: { en: "lwIP gets a heap of its own and a pool of receive buffers on this board. Predict roughly how many kilobytes of RAM the two together cost.", de: "lwIP bekommt auf diesem Board einen eigenen Heap und einen Pool von Empfangspuffern. Sage voraus, wie viele Kilobyte RAM die beiden zusammen ungefähr kosten." }, then: { type: command, cwd: ".", command: "grep -n -B4 -E '^#define (MEM_SIZE|PBUF_POOL_SIZE)' modules/net/include/lwipopts.h", expectExitCode: 0 }, rubric: "Der Vergleich zeigt MEM_SIZE (4 * 1024), also 4 KB lwIP-Heap, und PBUF_POOL_SIZE 10 Slots. Die Kommentare daneben nennen die aus der Linker-Map gemessene Slotgröße von rund 608 B, der Pool kostet also rund 6 KB; zusammen liegt der Netzstack bei etwa 10 KB. Bestanden, wenn die Antwort nach dem Vergleich beide Posten getrennt benennt und die Anzahl mit der Slotgröße multipliziert; wer nur eine der beiden Zahlen abliest, besteht nicht. Eine falsche Schätzung mit richtiger Rechnung besteht.", bloom: understand }
  - id: link-detection
    title: Wie Link-up erfahren wird
    check: { type: question, prompt: { en: "How does a caller learn that the Ethernet link has come up?", de: "Wie erfährt ein Aufrufer, dass der Ethernet-Link hochgekommen ist?" }, rubric: "Gar nicht von allein. cads_net_status() liefert nur das zwischengespeicherte Ergebnis des letzten Polls, es fragt die Hardware nicht. Jeder echte Aufrufer fährt deshalb dieselbe Schleife: cads_net_poll() aufrufen, dann cads_net_status() lesen, bei link_up abbrechen, kurz schlafen, wiederholen, mit Zeitlimit. Wer nie pollt, sieht link_up nie wahr werden. Eine Antwort, die nur cads_net_status() nennt, besteht nicht.", bloom: understand }
socratic:
  - { trigger: "task:net-gate:failed", question: { en: "The gate needs three things before it can report counters: a console prompt, a link, and enough seconds. Which of the three is missing?", de: "Das Gate braucht drei Dinge, bevor es Zähler melden kann: einen Konsolen-Prompt, einen Link und genug Sekunden. Welches der drei fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "The command takes a duration in seconds and reports only after it elapses; too short a run reports nothing useful.", de: "Der Befehl nimmt eine Dauer in Sekunden und meldet erst danach; ein zu kurzer Lauf meldet nichts Brauchbares." }, { en: "If the report says the link is down, the fault is below this firmware - cable, peer, or a PHY that is not answering.", de: "Meldet der Bericht den Link als unten, liegt der Fehler unterhalb dieser Firmware - Kabel, Gegenstelle oder eine PHY, die nicht antwortet." } ] }
  - { trigger: "task:pool-arithmetic:stuck", question: { en: "Two numbers in the options header decide this. One is a size in bytes; the other is a count. What has to be true of the second before it becomes bytes?", de: "Zwei Zahlen im Options-Header entscheiden das. Die eine ist eine Größe in Byte, die andere eine Anzahl. Was muss über die zweite bekannt sein, damit sie zu Bytes wird?" }, hints: [ { en: "A pool of N buffers costs N times the size of one buffer, and that size is not a round number here.", de: "Ein Pool aus N Puffern kostet N mal die Größe eines Puffers, und diese Größe ist hier keine runde Zahl." }, { en: "The comments in modules/net/include/lwipopts.h state the per-slot size the project measured from the linker map.", de: "Die Kommentare in modules/net/include/lwipopts.h nennen die Größe je Slot, die das Projekt aus der Linker-Map gemessen hat." }, { en: "Guess and write it down - the comparison against the real values is where this task teaches.", de: "Rate und schreib es hin - der Vergleich mit den echten Werten ist die Stelle, an der diese Aufgabe lehrt." } ] }
  - { trigger: "question:link-detection:weak", question: { en: "Read the doc comments on cads_net_status() and cads_net_poll(). Which of the two does the actual work, and which merely reports?", de: "Lies die Doku-Kommentare zu cads_net_status() und cads_net_poll(). Welche der beiden erledigt die eigentliche Arbeit, und welche berichtet nur?" }, hints: [ { en: "One of the two functions has no effect at all on the hardware; it only copies out what was already known.", de: "Eine der beiden Funktionen wirkt gar nicht auf die Hardware; sie kopiert nur heraus, was schon bekannt war." }, { en: "Ask what happens to link_up in a program that calls only the reporting function, in a loop, forever.", de: "Frag dich, was mit link_up in einem Programm geschieht, das in einer Schleife ausschließlich die berichtende Funktion aufruft." }, { en: "Your answer has to describe a loop with a shape, not a single call - name what runs in it and what ends it.", de: "Deine Antwort muss eine Schleife mit einer Gestalt beschreiben, nicht einen einzelnen Aufruf - nenne, was darin läuft und was sie beendet." } ] }
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

Der Vertrag, über den man stolpert: **nichts erkennt Link-up von allein.** `cads_net_status()` liefert das zwischengespeicherte Ergebnis des letzten Polls und fragt die Hardware nicht. Welche Gestalt ein Aufrufer daraus ableiten muss, ist die dritte Frage dieses Steps; genau diese Gestalt übernimmst du im nächsten Step als Code.

`cads_net_status_t` verrät dir außerdem `ip_addr`, `gw_addr`, `dns_addr` (Host-Byte-Order, 0 wenn ungesetzt), `dhcp_bound`, Geschwindigkeit und Duplex sowie Frame-Zähler. Die Statusleisten-Anzeige im App-Baum liest diese Felder, um „no link", „no lease" oder „100M" auszugeben.

## Adressierung ab Werk

Das Board ist standardmäßig **statisch, nicht DHCP**. `cads_net_board.c` trägt die eingebaute Vorgabe `192.168.33.99/24`, Gateway `192.168.33.1`, und `/config.txt` stellt sie als `net.dhcp = 0`, `net.ip`, `net.netmask`, `net.gateway` bereit (`docs/reference/config-file.md`). `net.dhcp = 1` startet den lwIP-DHCP-Client, sobald der Link steht; bei Link-down ruft der Treiber `dhcp_stop()` statt eines Release, weil dann kein Träger mehr da ist, über den ein Release gesendet werden könnte. Diese statische Vorgabe ist der Grund, warum das Labor mit einem einfachen Kabel zwischen Board und Laptop und ohne jeden DHCP-Server funktioniert.

## Was der Stack an RAM kostet

Ein Netzstack ist kein Gedanke, sondern Speicher. lwIP bekommt hier zwei getrennte Töpfe, und beide stehen in `modules/net/include/lwipopts.h`: einen **eigenen Heap** für die Strukturen des Stacks und einen **Pool von Empfangspuffern**, aus dem jedes ankommende Frame bedient wird. Der Heap ist als Byte-Zahl notiert, der Pool als Anzahl von Slots — Slots werden erst zu Bytes, wenn man weiß, wie groß einer ist, und genau diese Größe hat das Projekt aus der Linker-Map gemessen und in den Kommentar daneben geschrieben.

Warum das jede Zeile in dieser Datei kommentiert ist: derselbe RAM trägt den 48-KB-Boden, den `scripts/check_ram_budget.py` bewacht (M4-02). Jede Vergrößerung eines lwIP-Puffers ist eine Entscheidung gegen etwas anderes. Die zweite Aufgabe dieses Steps lässt dich die Summe erst schätzen und dann nachlesen.

## Deine Aufgabe

Bringe das Board bei Bedarf zum Konsolen-Prompt zurück, führe das M5-Netz-Gate `h 10` aus und lies, was es meldet: Link-Zustand, Geschwindigkeit sowie Paket- und Byte-Zähler. Sage dann den RAM-Preis des Stacks voraus und vergleiche mit den beiden Konstanten. Beantworte zuletzt die Frage, wie ein Aufrufer von Link-up erfährt.
