---
id: m7-04-recon-tools
title: Passive Aufklärungswerkzeuge
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
    title: Führe die Rogue-DHCP-Wache auf der Konsole aus
    check: { type: serialExpect, send: "R 20\n", pattern: "dhcpwatch: done,", timeoutMs: 45000, bloom: analyze }
  - id: dhcp-condition
    title: Die Bedingung der DHCP-Wache
    check: { type: question, prompt: { en: "What exact condition does the rogue-DHCP watch report as suspicious?", de: "Welche genaue Bedingung meldet die Rogue-DHCP-Wache als verdächtig?" }, rubric: "Mehr als eine verschiedene Quelle von Server-zu-Client-Verkehr. Die Wache schlüsselt nur auf UDP-Quellport 67 zu Zielport 68 und nur auf Frames, deren DHCP-Nachrichtentyp OFFER, ACK oder NAK ist - ein DISCOVER eines Clients kann also nie mit einem Server verwechselt werden. Jede verschiedene Server-Quelle landet in einer Tabelle fester Kapazität, und cads_dhcpwatch_table_multiple_servers() liefert wahr, sobald mehr als eine vorhanden ist. Nennt, was das bedeuten kann: ein versehentlicher zweiter Router oder eine gezielte DHCP-Starvation- oder Man-in-the-Middle-Anordnung. Eine Antwort ohne die Richtungs- und Nachrichtentyp-Bedingung besteht nicht.", bloom: analyze }
  - id: indicator-not-proof
    title: Indikator statt Beweis
    check: { type: question, prompt: { en: "Why does the ARP watch call a changed binding an indicator rather than proof?", de: "Warum nennt die ARP-Wache eine geänderte Bindung einen Indikator und keinen Beweis?" }, rubric: "Weil dieselbe Beobachtung eine ehrliche Ursache haben kann. Die Wache zählt hoch, wenn ein ARP-Anspruch eine IP beansprucht, die bereits an eine andere MAC gebunden war - die Signatur von arpspoof- oder ettercap-artiger Cache-Vergiftung. Aber ein DHCP-Wechsel oder ein legitimer NIC- oder Failover-Tausch ändert dieselbe Bindung aus ehrlichen Gründen, und passiv beobachtete Frames enthalten nichts, was die beiden Fälle trennt. Nennt die Entwurfsfolge: ein Werkzeug, das jede Neubindung Angriff nennt, wäre schlechter als keines.", bloom: analyze }
socratic:
  - { trigger: "task:run-a-watch:stuck", question: { en: "The command runs for a bounded time and prints a summary at the end. Did you leave the app tree, and did you wait for it to finish?", de: "Der Befehl läuft eine begrenzte Zeit und druckt am Ende eine Zusammenfassung. Hast du den App-Baum verlassen und auf das Ende gewartet?" }, hints: [ { en: "Send scripts/board_key.py quit first, then the watch command with a duration in seconds.", de: "Sende zuerst scripts/board_key.py quit, dann den Wachbefehl mit einer Dauer in Sekunden." }, { en: "A report of zero frames on a quiet cable is a correct, well-formed result - the check waits for the summary line, not for entries.", de: "Ein Bericht über null Frames an einem stillen Kabel ist ein korrektes, wohlgeformtes Ergebnis - der Check wartet auf die Zusammenfassungszeile, nicht auf Einträge." }, { en: "Plug the board into a segment with a real DHCP server if you want entries to populate.", de: "Hänge das Board an ein Segment mit echtem DHCP-Server, wenn Einträge erscheinen sollen." } ] }
  - { trigger: "question:dhcp-condition:weak", question: { en: "A client sends DISCOVER and a server sends OFFER. How could a watcher tell the two apart from the frames alone?", de: "Ein Client sendet DISCOVER, ein Server sendet OFFER. Woran könnte eine Wache die beiden allein an den Frames unterscheiden?" }, hints: [ { en: "Two things distinguish them: the direction of the UDP port pair, and the DHCP message type inside.", de: "Zwei Dinge unterscheiden sie: die Richtung des UDP-Portpaars und der DHCP-Nachrichtentyp darin." }, { en: "The watch keeps a table of what it saw; the alarm is a property of that table, not of any single frame.", de: "Die Wache führt eine Tabelle über das Gesehene; der Alarm ist eine Eigenschaft dieser Tabelle, nicht eines einzelnen Frames." }, { en: "Read the function named in dhcpwatch.h around line 102 and say in words what it returns true for.", de: "Lies die in dhcpwatch.h um Zeile 102 genannte Funktion und sag in Worten, wofür sie wahr liefert." } ] }
  - { trigger: "question:indicator-not-proof:weak", question: { en: "Think of a network where an IP legitimately changes its MAC. Name one, and the tool cannot tell it from an attack.", de: "Denk an ein Netz, in dem eine IP legitim ihre MAC wechselt. Nenne eines, und das Werkzeug kann es nicht von einem Angriff unterscheiden." }, hints: [ { en: "Addresses are handed out with a lease, and a lease can move to a different machine.", de: "Adressen werden mit einer Lease vergeben, und eine Lease kann auf eine andere Maschine wandern." }, { en: "Redundant hardware exists precisely so that one address survives a device failing over to another.", de: "Redundante Hardware existiert gerade dafür, dass eine Adresse überlebt, wenn ein Gerät auf ein anderes umschaltet." }, { en: "State the design consequence too: what would a tool be worth that called every rebind an attack?", de: "Nenne auch die Entwurfsfolge: was wäre ein Werkzeug wert, das jede Neubindung einen Angriff nennt?" } ] }
---
## Lernziel

Analysiere, wie die passiven Aufklärungsbefehle des Explorers unterhalb der IP-Schicht arbeiten, und was genau jeder aus den beobachteten Frames schließen darf.

## Was das Board sehen kann, ohne etwas zu senden

Alles in diesem Step ist passiv: das Board lauscht auf seinem netif und injiziert nie einen Frame. Das aktive Gegenstück mit gefälschtem Verkehr (M9 in `docs/ROADMAP.md`) ist absichtlich nicht gebaut, bis seine Bestätigungs-UX entschieden ist — diese Werkzeuge können andere Geräte in einem LAN vom Netz nehmen, „nur beobachten“ ist deshalb die sichere Vorgabe, an der diese Suite festhält.

Die Befehle aus `docs/reference/explorer-console.md` laufen alle eine begrenzte Anzahl Sekunden und drucken dann eine Zusammenfassung:

| Cmd | Beobachtet | Meldet |
|---|---|---|
| `B <sec>` | ARP-Wache: IP→MAC-Bindungen | jede MAC-Änderung an einer bestehenden Bindung — ein Spoofing-Merkmal |
| `R <sec>` | Rogue-DHCP-Wache | mehr als eine verschiedene DHCPOFFER/ACK/NAK-Quelle |
| `N <sec>` | L2-Erkundung: passiv CDP/LLDP/STP, gesehene 802.1Q-VLAN-IDs | — |
| `O <sec>` | Verkehrsübersicht: Broadcast/Multicast/Unicast und EtherType-Mix | — |
| `M <sec>` | MAC-Adresstabelle, Switch-artiges Lernen mit Alterung | — |
| `U <sec>` | SSDP/UPnP-Wache auf UDP 1900 | — |

## Wie die DHCP-Wache entscheidet

`modules/toolbox/src/dhcpwatch.c` läuft Ethernet → IPv4 (liest die IHL, statt 20 Bytes anzunehmen) → UDP → BOOTP/DHCP ab. Sie ist dabei **zweifach wählerisch**: sie prüft die Richtung am UDP-Portpaar und zusätzlich den DHCP-Nachrichtentyp im Paket. Beide Bedingungen stehen in `modules/toolbox/include/cads/toolbox/dhcpwatch.h`; zusammen sorgen sie dafür, dass die Anfrage eines Clients nie für die Antwort eines Servers gehalten wird. Jede verschiedene Server-Quelle landet in einer Tabelle fester Kapazität, und `cads_dhcpwatch_table_multiple_servers()` (dort Zeile 102) fasst diese Tabelle zu einem einzigen Boolean zusammen.

Öffne den Header und lies die Funktion: drücke `Strg`/`Cmd`+`P`, tippe `modules/toolbox/include/cads/toolbox/dhcpwatch.h` und drücke Enter. Ohne Tastatur: ganz links in der schmalen Symbolleiste das oberste Symbol (der Datei-Explorer), dann durch den Baum klicken. Die Datei öffnet sich als Reiter in der Mitte, neben dem Steptext-Reiter `CaDS Tutor: <Titel>`. Sag dann in Worten, wofür die Funktion wahr liefert — das ist die zweite Aufgabe. Der Parser selbst hat 15 Host-Unit-Test-Fälle (`tests/unit/test_dhcpwatch.c`) aus von Hand gebauten Frames.

## Wie die ARP-Wache entscheidet

`modules/toolbox/src/arpwatch.c` parst ARP-Ansprüche und hält eine IP→MAC-Bindungstabelle. Beansprucht ein Frame eine IP, die bereits an eine *andere* MAC gebunden ist, erhöht sich der Zähler `mac_changes` des Eintrags — das ist die Signatur von arpspoof-/ettercap-artiger Cache-Vergiftung. Der Header ist auffallend vorsichtig damit, was das bedeutet (`modules/toolbox/include/cads/toolbox/arpwatch.h`, Zeile 39): eine geänderte Bindung ist ein **starker Indikator, kein Beweis**. Warum diese Zurückhaltung nötig ist — und was ein Werkzeug wert wäre, das sie nicht übt —, ist die dritte Aufgabe dieses Steps.

## Was die Werkbank tatsächlich sah

Das solltest du wissen, bevor du Drama erwartest: die Entwicklungs-Werkbank hat keinen DHCP-Server und fast keinen Umgebungsverkehr. `R 8` lief sauber durch und meldete `0 frame(s) seen`, `0 DHCP server repl(y/ies)`, `0 distinct server(s)` und `one or zero servers, nothing suspicious`. Das ist an einem stillen Kabel das korrekte, wohlgeformte Ergebnis, kein Versagen des Befehls. Einträge erscheinen nur auf einem Segment, auf dem etwas spricht.

## Aufgabe 1 — die Rogue-DHCP-Wache laufen lassen

Den Konsolenbefehl `R 20` tippst du **nicht** selbst: der Prüfknopf sendet ihn, du liest nur die Antwort mit. Der Knopf **Prüfen** sitzt an dieser Aufgabe unten im Steptext, dem Reiter in der Mitte; **Run all checks** oben im selben Reiter startet alle drei Aufgaben dieses Steps.

Ein frisch geflashtes Board startet im Touchscreen-App-Baum und überhört einzelne Buchstaben. Öffne darum vorher ein Terminal — klicke auf das Symbol mit den drei Strichen (**☰**) ganz oben links, dann **`Terminal` → `New Terminal`**; ist der Terminal-Bereich zugeklappt, klappt ihn `Strg`/`Cmd`+`J` auf und wieder zu. Das Arbeitsverzeichnis ist die Projektwurzel. Führe dort einmal aus:

```
python3 scripts/board_key.py quit
```

Im Labor erreichen die Skripte das Board über den Konsolen-PTY des Bridge; findet der Aufruf keinen Port, gib ihn ausdrücklich an (`docs/SPEC.md`):

```
python3 scripts/board_key.py quit --port /home/coder/board-console
```

Willst du beim Senden zusehen, öffne zusätzlich die Board-Konsole: drücke **`F1`**, tippe `CaDS Board: Konsole öffnen` und drücke Enter. **Reagiert die Palette gar nicht, hat der Browser `Strg`/`Cmd`+`Umschalt`+`P` abgefangen** — nimm `F1`, oder den Weg über **☰ → `Terminal`**.

Klicke dann **Prüfen** und **warte zwanzig Sekunden**: die Wache lauscht die volle Dauer und druckt erst danach ihre Zusammenfassungszeile, die mit `# dhcpwatch: done,` beginnt. Der Check wartet auf genau diese Zeile, nicht auf Einträge — null Frames an einem stillen Kabel bestehen ihn.

<!-- SHOT: m7-dhcpwatch-summary | Board-Konsole nach R 20: die Zeile # dhcpwatch: done, N frame(s) seen, ... distinct server(s) - one or zero servers, nothing suspicious | HARDWARE -->

**Schließe das Terminal nicht, solange die Wache läuft.** Das Kreuz am Terminal beendet den Prozess darin und schneidet die Zusammenfassung ab; zum Wegklappen nimm `Strg`/`Cmd`+`J`, das lässt ihn weiterlaufen. **Und suche die Zeile nicht im falschen Fenster:** sie steht nicht im Steptext und nicht im Editor, sondern in der Board-Konsole; die Ausgabe eines Terminalbefehls steht unten im Terminal-Bereich in dem Terminal, in dem du ihn gestartet hast — `Strg`/`Cmd`+`J` klappt den Bereich auf, rechts in der Liste wählst du das richtige Terminal.

## Aufgaben 2 und 3 — die beiden Analysefragen

Je eine Freitextantwort in das Feld an der Aufgabe, dann **Prüfen** daneben: welche Bedingung die DHCP-Wache meldet, und warum die ARP-Wache ihren Befund einen Indikator nennt. Bleibt eine Aufgabe rot, hilft der Knopf **Hinweis anzeigen** an derselben Aufgabe.

Die Bedienoberfläche ist englisch, der Kurstext deutsch — der Menüpunkt heißt also `New Terminal`, nicht „Neues Terminal“.
