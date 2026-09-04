---
id: m7-04-recon-tools
title: Passive reconnaissance tools
bloom: analyze
objectives: [cz.net.recon]
requires: [m7-03-dhcp-stack-lesson]
estimatedMinutes: 20
scaffold: independent
links:
  - { step: m7-05-pa7-network-eval }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "modules/toolbox/include/cads/toolbox/dhcpwatch.h", line: 102 }
  - { file: "modules/toolbox/include/cads/toolbox/arpwatch.h", line: 39 }
sources: [docs/reference/explorer-console.md, modules/toolbox/include/cads/toolbox/dhcpwatch.h, modules/toolbox/include/cads/toolbox/arpwatch.h, docs/ROADMAP.md]
misconceptions:
  - { pattern: "not available in the simulator", question: { en: "You ran the watch against the host build. What would it even have to listen to there?", de: "Du hast die Wache gegen den Host-Build laufen lassen. Worauf sollte sie dort überhaupt lauschen?" }, hints: [ { en: "These commands read frames off a real netif; the simulator has no RMII hardware behind one.", de: "Diese Befehle lesen Frames von einem echten netif; der Simulator hat keine RMII-Hardware dahinter." }, { en: "The sim variants exist so the host build still links, and they say so honestly instead of inventing traffic.", de: "Die Sim-Varianten existieren, damit der Host-Build weiter linkt, und sie sagen das ehrlich, statt Verkehr zu erfinden." }, { en: "Flash the board image and run the command from the board console.", de: "Flashe das Board-Image und führ den Befehl von der Board-Konsole aus." } ] }
  - { pattern: "unknown, .[?]. for help", question: { en: "The console did not recognise what you sent. Is the letter wrong, or did the board never see a complete line?", de: "Die Konsole hat nicht erkannt, was du gesendet hast. Ist der Buchstabe falsch, oder hat das Board nie eine vollständige Zeile gesehen?" }, hints: [ { en: "The dispatch is on the first character of a line and the commands are case sensitive.", de: "Das Dispatch läuft über das erste Zeichen einer Zeile, und die Befehle unterscheiden Groß- und Kleinschreibung." }, { en: "Send the help command once and read the list; every letter is documented there with its argument and default.", de: "Sende einmal den Hilfebefehl und lies die Liste; jeder Buchstabe steht dort mit Argument und Standardwert." }, { en: "If the board is inside the app tree it is not reading the console at all - leave it first.", de: "Sitzt das Board im App-Baum, liest es die Konsole gar nicht - verlass ihn zuerst." } ] }
tasks:
  - id: run-a-watch
    title: Run the rogue-DHCP watch on the console
    check: { type: serialExpect, send: "R 20\n", pattern: "dhcpwatch: done,", timeoutMs: 45000, bloom: analyze }
  - id: dhcp-condition
    title: The condition the DHCP watch flags
    check: { type: question, prompt: { en: "What exact condition does the rogue-DHCP watch report as suspicious?", de: "Welche genaue Bedingung meldet die Rogue-DHCP-Wache als verdächtig?" }, rubric: "More than one distinct source of server-to-client traffic. The watch keys only on UDP source port 67 to destination 68 and only on frames whose DHCP message type is OFFER, ACK or NAK - so a client DISCOVER can never be mistaken for a server. Each distinct server source lands in a fixed-capacity table, and cads_dhcpwatch_table_multiple_servers() returns true once more than one is present. Names what that can mean: an accidental second router, or a deliberate DHCP-starvation or man-in-the-middle setup. An answer without the direction and message-type conditions does not pass.", bloom: analyze }
  - id: indicator-not-proof
    title: Indicator rather than proof
    check: { type: question, prompt: { en: "Why does the ARP watch call a changed binding an indicator rather than proof?", de: "Warum nennt die ARP-Wache eine geänderte Bindung einen Indikator und keinen Beweis?" }, rubric: "Because the same observation can have an honest cause. The watch increments when an ARP claim asserts an IP already bound to a different MAC - the signature of arpspoof- or ettercap-style cache poisoning. But DHCP churn, or a legitimate NIC or failover swap, changes the same binding for honest reasons, and passively observed frames contain nothing that separates the two cases. Names the design consequence: a tool that called every rebind an attack would be worse than none.", bloom: analyze }
socratic:
  - { trigger: "task:run-a-watch:stuck", question: { en: "The command runs for a bounded time and prints a summary at the end. Did you leave the app tree, and did you wait for it to finish?", de: "Der Befehl läuft eine begrenzte Zeit und druckt am Ende eine Zusammenfassung. Hast du den App-Baum verlassen und auf das Ende gewartet?" }, hints: [ { en: "Send scripts/board_key.py quit first, then the watch command with a duration in seconds.", de: "Sende zuerst scripts/board_key.py quit, dann den Wachbefehl mit einer Dauer in Sekunden." }, { en: "A report of zero frames on a quiet cable is a correct, well-formed result - the check waits for the summary line, not for entries.", de: "Ein Bericht über null Frames an einem stillen Kabel ist ein korrektes, wohlgeformtes Ergebnis - der Check wartet auf die Zusammenfassungszeile, nicht auf Einträge." }, { en: "Plug the board into a segment with a real DHCP server if you want entries to populate.", de: "Hänge das Board an ein Segment mit echtem DHCP-Server, wenn Einträge erscheinen sollen." } ] }
  - { trigger: "question:dhcp-condition:weak", question: { en: "A client sends DISCOVER and a server sends OFFER. How could a watcher tell the two apart from the frames alone?", de: "Ein Client sendet DISCOVER, ein Server sendet OFFER. Woran könnte eine Wache die beiden allein an den Frames unterscheiden?" }, hints: [ { en: "Two things distinguish them: the direction of the UDP port pair, and the DHCP message type inside.", de: "Zwei Dinge unterscheiden sie: die Richtung des UDP-Portpaars und der DHCP-Nachrichtentyp darin." }, { en: "The watch keeps a table of what it saw; the alarm is a property of that table, not of any single frame.", de: "Die Wache führt eine Tabelle über das Gesehene; der Alarm ist eine Eigenschaft dieser Tabelle, nicht eines einzelnen Frames." }, { en: "Read the function named in dhcpwatch.h around line 102 and say in words what it returns true for.", de: "Lies die in dhcpwatch.h um Zeile 102 genannte Funktion und sag in Worten, wofür sie wahr liefert." } ] }
  - { trigger: "question:indicator-not-proof:weak", question: { en: "Think of a network where an IP legitimately changes its MAC. Name one, and the tool cannot tell it from an attack.", de: "Denk an ein Netz, in dem eine IP legitim ihre MAC wechselt. Nenne eines, und das Werkzeug kann es nicht von einem Angriff unterscheiden." }, hints: [ { en: "Addresses are handed out with a lease, and a lease can move to a different machine.", de: "Adressen werden mit einer Lease vergeben, und eine Lease kann auf eine andere Maschine wandern." }, { en: "Redundant hardware exists precisely so that one address survives a device failing over to another.", de: "Redundante Hardware existiert gerade dafür, dass eine Adresse überlebt, wenn ein Gerät auf ein anderes umschaltet." }, { en: "State the design consequence too: what would a tool be worth that called every rebind an attack?", de: "Nenne auch die Entwurfsfolge: was wäre ein Werkzeug wert, das jede Neubindung einen Angriff nennt?" } ] }
---
## Learning goal

Analyse how the explorer's passive reconnaissance commands work below the IP layer, and what exactly each one is entitled to conclude from the frames it observes.

## What the board can see without sending anything

Everything in this step is passive: the board listens on its netif and never injects a frame. The active, forged-traffic counterpart (M9 in `docs/ROADMAP.md`) is deliberately unbuilt until its confirmation UX is decided — those tools can take other devices on a LAN offline, so "observe only" is the safe default this suite keeps.

The commands, from `docs/reference/explorer-console.md`, all run for a bounded number of seconds and then print a summary:

| Cmd | Watches | Flags |
|---|---|---|
| `B <sec>` | ARP watch: IP→MAC bindings | any MAC change on an existing binding — a spoofing tell |
| `R <sec>` | Rogue-DHCP watch | more than one distinct DHCPOFFER/ACK/NAK source |
| `N <sec>` | L2 discovery: passive CDP/LLDP/STP, 802.1Q VLAN ids seen | — |
| `O <sec>` | Traffic overview: broadcast/multicast/unicast and EtherType mix | — |
| `M <sec>` | MAC address table, switch-style learning with aging | — |
| `U <sec>` | SSDP/UPnP watch on UDP 1900 | — |

## How the DHCP watch decides

`modules/toolbox/src/dhcpwatch.c` walks Ethernet → IPv4 (reading the IHL rather than assuming 20 bytes) → UDP → BOOTP/DHCP. It is **selective twice over**: it checks the direction from the UDP port pair and, on top of that, the DHCP message type inside the packet. Both conditions are stated in `modules/toolbox/include/cads/toolbox/dhcpwatch.h`; together they ensure a client's request is never taken for a server's reply. Each distinct server source lands in a fixed-capacity table, and `cads_dhcpwatch_table_multiple_servers()` (line 102 of that header) reduces that table to a single boolean.

Open the header and read the function: press `Ctrl`/`Cmd`+`P`, type `modules/toolbox/include/cads/toolbox/dhcpwatch.h` and press Enter. Without the keyboard: the top icon in the narrow icon bar on the far left (the file explorer), then click through the tree. The file opens as a tab in the middle, next to the step-text tab `CaDS Tutor: <title>`. Then say in words what the function returns true for — that is the second task. The parser itself has 15 host unit-test cases (`tests/unit/test_dhcpwatch.c`) built from hand-constructed frames.

## How the ARP watch decides

`modules/toolbox/src/arpwatch.c` parses ARP claims and keeps an IP→MAC binding table. When a frame claims an IP that is already bound to a *different* MAC, the entry's `mac_changes` counter increments — that is the signature of arpspoof/ettercap-style cache poisoning. The header is conspicuously careful about what this means (`modules/toolbox/include/cads/toolbox/arpwatch.h` line 39): a changed binding is a **strong indicator, not proof**. Why that restraint is necessary — and what a tool that did not exercise it would be worth — is the third task of this step.

## What the bench actually saw

This is worth knowing before you expect drama: the development bench has no DHCP server and near-zero ambient traffic. `R 8` ran clean and reported `0 frame(s) seen`, `0 DHCP server repl(y/ies)`, `0 distinct server(s)` and `one or zero servers, nothing suspicious`. On a quiet cable that is the correct, well-formed result, not a failure of the command. Entries populate only on a segment where something is talking.

## Task 1 — run the rogue-DHCP watch

You do not type the console command `R 20` yourself: the check button sends it, you only read the answer. The **Check** button sits on this task at the bottom of the step text, the tab in the middle; **Run all checks** at the top of that same tab starts all three tasks of this step.

A freshly flashed board starts in the touchscreen app tree and mishears single letters. So open a terminal first — click the icon with the three bars (**☰**) at the very top left, then **`Terminal` → `New Terminal`**; if the terminal area is folded away, `Ctrl`/`Cmd`+`J` opens it and folds it back. The working directory is the project root. Run once:

```
python3 scripts/board_key.py quit
```

In the lab the scripts reach the board through the bridge's console PTY; if the call finds no port, name it explicitly (`docs/SPEC.md`):

```
python3 scripts/board_key.py quit --port /home/coder/board-console
```

To watch while it sends, also open the board console: press **`F1`**, type `CaDS Board: Konsole öffnen` and press Enter. **If the palette does not react at all, the browser swallowed `Ctrl`/`Cmd`+`Shift`+`P`** — press `F1`, or go through **☰ → `Terminal`**.

Then click **Check** and **wait twenty seconds**: the watch listens for the full duration and only then prints its summary line, which starts `# dhcpwatch: done,`. The check waits for exactly that line, not for entries — zero frames on a quiet cable passes it.

<!-- SHOT: m7-dhcpwatch-summary | Board console after R 20: the line # dhcpwatch: done, N frame(s) seen, ... distinct server(s) - one or zero servers, nothing suspicious | HARDWARE -->

**Do not close the terminal while the watch is running.** The cross on a terminal kills the process inside it and cuts the summary off; use `Ctrl`/`Cmd`+`J` to fold it away instead, which leaves it running. **And do not look for the line in the wrong window:** it is not in the step text and not in the editor, but in the board console; the output of a terminal command is at the bottom in the terminal you started it from — `Ctrl`/`Cmd`+`J` opens the area, and the list on the right selects the right terminal.

## Tasks 2 and 3 — the two analysis questions

One free-text answer each in the field on the task, then **Check** beside it: which condition the DHCP watch flags, and why the ARP watch calls its finding an indicator. If a task stays red, the **Show hint** button on that same task helps.

The interface is in English while the course text is German — so the menu item is called `New Terminal`.
