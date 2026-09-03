---
id: m7-04-recon-tools
title: Passive Aufklärungswerkzeuge
bloom: analyze
objectives: [cz.net.recon]
requires: [m7-03-dhcp-stack-lesson]
estimatedMinutes: 15
links:
  - { step: m7-05-pa7-network-eval }
  - { doc: "docs/reference/explorer-console.md" }
  - { file: "modules/toolbox/include/cads/toolbox/dhcpwatch.h", line: 102 }
  - { file: "modules/toolbox/include/cads/toolbox/arpwatch.h", line: 39 }
sources: [docs/reference/explorer-console.md, modules/toolbox/include/cads/toolbox/dhcpwatch.h, modules/toolbox/include/cads/toolbox/arpwatch.h, docs/ROADMAP.md]
tasks:
  - id: run-a-watch
    title: Führe eine ARP-Wache oder eine Rogue-DHCP-Wache auf der Konsole aus
    check: { type: manual }
  - id: what-they-flag
    title: Erkläre, was die beiden Wachen melden, und warum es ein Indikator und kein Beweis ist
    check: { type: question, prompt: { en: "Both the rogue-DHCP watch (R) and the ARP watch (B) are passive. What exact condition does each one flag, how does it recognise it in the frames it sees, and why does the ARP watch's own header call its finding an indicator rather than proof?", de: "Sowohl die Rogue-DHCP-Wache (R) als auch die ARP-Wache (B) sind passiv. Welche genaue Bedingung meldet jede, wie erkennt sie sie in den gesehenen Frames, und warum nennt der eigene Header der ARP-Wache ihren Befund einen Indikator statt eines Beweises?" }, rubric: "R: läuft Ethernet -> IPv4 -> UDP -> BOOTP/DHCP ab und merkt sich die Quelle von Server->Client-Verkehr (UDP Quelle 67, Ziel 68), dessen DHCP-Nachrichtentyp OFFER/ACK/NAK ist; cads_dhcpwatch_table_multiple_servers() meldet mehr als eine verschiedene Server-Quelle (ein versehentlicher zweiter Router oder eine DHCP-Starvation-/MITM-Anordnung). B: verfolgt IP->MAC-Bindungen aus ARP-Ansprüchen und zählt mac_changes, wenn sich die gebundene MAC einer bestehenden IP ändert - das Spoofing-Merkmal für arpspoof-/ettercap-artiges MITM. Indikator statt Beweis: DHCP-Wechsel oder ein legitimer NIC-/Failover-Tausch können eine Bindung ehrlich ändern.", bloom: analyze }
socratic:
  - { trigger: "task:run-a-watch:stuck", question: { en: "These commands run for a bounded duration and then print a summary. Did you leave the app tree first, and did you give the command enough seconds to see any traffic at all?", de: "Diese Befehle laufen eine begrenzte Zeit und drucken dann eine Zusammenfassung. Hast du zuerst den App-Baum verlassen und dem Befehl genug Sekunden gegeben, um überhaupt Verkehr zu sehen?" }, hints: [ { en: "Send scripts/board_key.py quit first, then e.g. 'B 20' or 'R 20'.", de: "Sende zuerst scripts/board_key.py quit, dann z. B. 'B 20' oder 'R 20'." }, { en: "'0 frame(s) seen' on a quiet cable is a correct, well-formed report - it is what the bench itself recorded.", de: "'0 frame(s) seen' an einem stillen Kabel ist ein korrekter, wohlgeformter Bericht - genau das hat auch die Werkbank protokolliert." }, { en: "Plug the board into a segment with a real DHCP server or some ARP chatter to see entries populate.", de: "Hänge das Board an ein Segment mit echtem DHCP-Server oder etwas ARP-Verkehr, damit Einträge erscheinen." } ] }
---
## Lernziel

Analysiere, wie die passiven Aufklärungsbefehle des Explorers unterhalb der IP-Schicht arbeiten, und was genau jeder aus den beobachteten Frames schließen darf.

## Was das Board sehen kann, ohne etwas zu senden

Alles in diesem Step ist passiv: das Board lauscht auf seinem netif und injiziert nie einen Frame. Das aktive Gegenstück mit gefälschtem Verkehr (M9 in `docs/ROADMAP.md`) ist absichtlich nicht gebaut, bis seine Bestätigungs-UX entschieden ist — diese Werkzeuge können andere Geräte in einem LAN vom Netz nehmen, „nur beobachten" ist deshalb die sichere Vorgabe, an der diese Suite festhält.

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

`modules/toolbox/dhcpwatch.c` läuft Ethernet → IPv4 (liest die IHL, statt 20 Bytes anzunehmen) → UDP → BOOTP/DHCP ab. Sie schlüsselt nur auf **Server-zu-Client**-Verkehr, UDP-Quellport 67 zu Zielport 68, und nur auf Frames, deren DHCP-Nachrichtentyp OFFER, ACK oder NAK ist — ein DISCOVER eines Clients kann also nie mit einem Server verwechselt werden. Jede verschiedene Server-Quelle landet in einer Tabelle fester Kapazität; `cads_dhcpwatch_table_multiple_servers()` (`dhcpwatch.h`, Zeile 102) liefert wahr, sobald mehr als eine vorhanden ist. Dieses eine Boolean ist der Alarm: ein versehentlicher zweiter Router oder eine gezielte DHCP-Starvation-/Man-in-the-Middle-Anordnung. Der Parser hat 15 Host-Unit-Test-Fälle (`tests/unit/test_dhcpwatch.c`) aus von Hand gebauten Frames.

## Wie die ARP-Wache entscheidet

`modules/toolbox/arpwatch.c` parst ARP-Ansprüche und hält eine IP→MAC-Bindungstabelle. Beansprucht ein Frame eine IP, die bereits an eine *andere* MAC gebunden ist, erhöht sich der Zähler `mac_changes` des Eintrags — das ist die Signatur von arpspoof-/ettercap-artiger Cache-Vergiftung. Der Header ist vorsichtig damit, was das bedeutet (`arpwatch.h`, Zeile 39): eine geänderte Bindung ist ein **starker Indikator, kein Beweis**. DHCP-Wechsel oder ein legitimer NIC- oder Failover-Tausch ändern eine Bindung aus ehrlichen Gründen. Ein Aufklärungswerkzeug, das bei jeder Neubindung „Angriff" meldet, wäre schlechter als keines.

## Was die Werkbank tatsächlich sah

Das solltest du wissen, bevor du Drama erwartest: die Entwicklungs-Werkbank hat keinen DHCP-Server und fast keinen Umgebungsverkehr. `R 8` lief sauber durch — `0 frame(s) seen, 0 DHCP servers` — und das ist an einem stillen Kabel das korrekte, wohlgeformte Ergebnis, kein Versagen des Befehls. Einträge erscheinen nur auf einem Segment, auf dem etwas spricht.

## Deine Aufgabe

Verlasse den App-Baum, führe `B 20` oder `R 20` auf der Konsole aus und lies die Zusammenfassung. Beantworte dann die Analysefrage, was jede Wache meldet, wie sie es erkennt und warum das Ergebnis ein Indikator und kein Beweis ist.
