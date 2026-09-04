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
    check: { type: predict, prompt: { en: "lwIP gets a heap of its own and a pool of receive buffers on this board. Predict roughly how many kilobytes of RAM the two together cost.", de: "lwIP bekommt auf diesem Board einen eigenen Heap und einen Pool von Empfangspuffern. Sage voraus, wie viele Kilobyte RAM die beiden zusammen ungefähr kosten." }, then: { type: command, cwd: ".", command: "grep -n -B24 -E '^#define (MEM_SIZE|PBUF_POOL_SIZE)' modules/net/include/lwipopts.h", expectExitCode: 0 }, rubric: "Der Vergleich zeigt MEM_SIZE (4 * 1024), also 4 KB lwIP-Heap, und PBUF_POOL_SIZE 10 Slots. Die Kommentare daneben nennen die aus der Linker-Map gemessene Slotgröße von rund 608 B, der Pool kostet also rund 6 KB; diese beiden Posten zusammen liegen bei etwa 10 KB. Das ist ausdrücklich nicht der Gesamtpreis des Netzstacks: die MEMP_NUM_*-Pools, die ARP-Tabelle, die TCP-PCBs und die Deskriptorringe des MAC sind darin nicht enthalten. Bestanden, wenn die Antwort nach dem Vergleich beide Posten getrennt benennt und die Anzahl mit der Slotgröße multipliziert; wer nur eine der beiden Zahlen abliest, besteht nicht. Eine falsche Schätzung mit richtiger Rechnung besteht.", bloom: understand }
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

Ethernet ist das, was dieses Board hat und ein Flipper Zero nicht: eine LAN8742A-PHY über RMII mit 100 Mbit. `modules/net` legt lwIP um diesen MAC, hinter eine bewusst kleine portable API. Es gibt zwei Implementierungen: `cads_net_board.c` besitzt ein echtes lwIP-netif über den RMII-MAC; `cads_net_sim.c` ist ein ehrlicher Stub, der nie einen Link meldet. Etwas anderes vorzutäuschen ließe eine App ihre Abhängigkeit vom Netzverhalten verstecken, bis sie auf dem Board landet.

Öffne den Header, um mitzulesen: drücke `Strg`/`Cmd`+`P`, tippe `modules/net/include/cads/net/net.h` und drücke Enter. Ohne Tastatur: ganz links in der schmalen Symbolleiste das oberste Symbol (der Datei-Explorer), dann durch den Baum klicken. Die Datei öffnet sich als Reiter in der Mitte, neben dem Steptext-Reiter `CaDS Tutor: <Titel>`.

## Drei Aufrufe

```c
void cads_net_init(const uint8_t mac_address[6]);   /* idempotent: der erste Aufruf gewinnt */
void cads_net_poll(void);                            /* RX, TX, lwIP-Timeouts */
void cads_net_status(cads_net_status_t* status);     /* das Ergebnis des LETZTEN Polls */
```

`cads_net_init()` ist absichtlich idempotent: nur der erste Aufruf im gesamten Image tut etwas. `cads_net_poll()` treibt Empfang, Senden und die internen lwIP-Timeouts; es ist billig im Leerlauf und muss in jeder Iteration der Schleife laufen, die es besitzt.

Der Vertrag, über den man stolpert: **nichts erkennt Link-up von allein.** `cads_net_status()` liefert das zwischengespeicherte Ergebnis des letzten Polls und fragt die Hardware nicht. Welche Gestalt ein Aufrufer daraus ableiten muss, ist die dritte Frage dieses Steps. `cads_net_status_t` verrät außerdem Adresse, Gateway, DNS, `dhcp_bound`, Geschwindigkeit, Duplex und Frame-Zähler.

## Adressierung ab Werk

Das Board ist standardmäßig **statisch, nicht DHCP**. `cads_net_board.c` trägt die eingebaute Vorgabe `192.168.33.99/24`, Gateway `192.168.33.1`, und `/config.txt` stellt sie als `net.dhcp = 0`, `net.ip`, `net.netmask`, `net.gateway` bereit. `net.dhcp = 1` startet den lwIP-DHCP-Client, sobald der Link steht. Diese statische Vorgabe ist der Grund, warum das Labor mit einem einfachen Kabel zwischen Board und Rechner und ohne jeden DHCP-Server funktioniert.

## Was der Stack an RAM kostet

Ein Netzstack ist kein Gedanke, sondern Speicher. lwIP bekommt hier zwei getrennte Töpfe, beide in `modules/net/include/lwipopts.h`: einen **eigenen Heap** für die Strukturen des Stacks und einen **Pool von Empfangspuffern**, aus dem jedes ankommende Frame bedient wird. Der Heap ist als Byte-Zahl notiert, der Pool als Anzahl von Slots — Slots werden erst zu Bytes, wenn man weiß, wie groß einer ist, und genau diese Größe hat das Projekt aus der Linker-Map gemessen und daneben notiert. Derselbe RAM trägt den 48-KB-Boden, den `scripts/check_ram_budget.py` bewacht.

## Aufgabe 1 — das Netz-Gate laufen lassen

Den Konsolenbefehl `h 10` tippst du **nicht** selbst: der Pruefknopf sendet ihn, du liest nur die Antwort mit. Der Knopf **Prüfen** sitzt an dieser Aufgabe unten im Steptext, dem Reiter in der Mitte; **Run all checks** oben im selben Reiter startet alle Aufgaben dieses Steps.

Ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne darum vorher ein Terminal — klicke auf das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `New Terminal`**; ist der Terminal-Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und wieder zu. Das Arbeitsverzeichnis ist die Projektwurzel. Führe dort einmal aus:

```
python3 scripts/board_key.py quit
```

Im Labor erreichen die Skripte das Board über den Konsolen-PTY des Bridge; findet der Aufruf keinen Port, gib ihn ausdrücklich an (`docs/SPEC.md`):

```
python3 scripts/board_key.py quit --port /home/coder/board-console
```

Willst du beim Senden zusehen, öffne zusätzlich die Board-Konsole: drücke **`F1`**, tippe `CaDS Board: Konsole öffnen` und drücke Enter. `Strg`/`Cmd`+`Umschalt`+`P` öffnet die Palette auch, wird im Browser aber oft abgefangen; `F1` ist der zuverlässige Weg. **Reagiert die Palette gar nicht, hat der Browser das Tastenkürzel abgefangen** — nimm `F1` oder den Weg über **☰ → `Terminal`**.

Klicke dann **Prüfen**. Das Gate bringt das netif hoch, pollt zehn Sekunden und meldet zwei Zeilen, die mit `# net: link=` und `# net: mmc delta rx_unicast=` beginnen: Link-Zustand, Geschwindigkeit, Paket- und Byte-Zähler. Rechne mit zehn bis fünfzehn Sekunden; grün wird die Aufgabe, sobald die erste Zeile kommt.

<!-- SHOT: m7-net-gate-output | Board-Konsole nach dem Netz-Gate: die Zeile # net: link=UP netif rx=.. tx=.. rx_dropped=.. und darunter die mmc-delta-Zeile | HARDWARE -->

## Aufgabe 2 — den RAM-Preis vorhersagen

Schreibe deine Schätzung in das Feld an der Aufgabe und schicke sie ab, **bevor** du nachsiehst — die Enthüllung ist der Vergleich. Der Knopf **Prüfen** führt dafür selbst einen Befehl aus, der die beiden Konstanten samt ihrer Kommentare aus `modules/net/include/lwipopts.h` holt:

```
grep -n -B24 -E '^#define (MEM_SIZE|PBUF_POOL_SIZE)' modules/net/include/lwipopts.h
```

Seine Ausgabe erscheint unter einer Sekunde später **unten im Terminal-Bereich**. **Suchst du sie im falschen Fenster:** sie steht nicht im Steptext und nicht im Editor, sondern unten in dem Terminal, das den Namen des Befehls trägt — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das Terminal. Du kannst die Datei auch selbst lesen: `Strg`/`Cmd`+`P`, dann `modules/net/include/lwipopts.h`, Enter.

## Aufgabe 3 — wie Link-up erfahren wird

Eine Freitextantwort in das Feld an der Aufgabe, dann **Prüfen**. Bleibt eine Aufgabe rot, hilft der Knopf **Hinweis anzeigen** an derselben Aufgabe weiter.

**Wo du in diesem Step arbeitest.** Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `New Terminal`, nicht „Neues Terminal“. Es gibt keine sichtbare Menüleiste: die Menüs `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help` stecken hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links. Der Kursbaum steht links in der Seitenleiste, hinter dem Doktorhut-Symbol der Leiste ganz außen. Datei öffnen: `Strg`/`Cmd`+`P`. Terminal auf- und zuklappen: `Strg`/`Cmd`+`J`. Befehlspalette: `F1`. Task starten: **☰ → `Terminal` → `Run Task...`**.
