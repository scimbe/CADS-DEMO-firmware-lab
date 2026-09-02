---
id: m7-04-recon-tools
title: Passive reconnaissance tools
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
    title: Run an ARP watch or a rogue-DHCP watch on the console
    check: { type: manual }
  - id: what-they-flag
    title: Explain what the two watches flag, and why it is an indicator rather than proof
    check: { type: question, prompt: { en: "Both the rogue-DHCP watch (R) and the ARP watch (B) are passive. What exact condition does each one flag, how does it recognise it in the frames it sees, and why does the ARP watch's own header call its finding an indicator rather than proof?", de: "Sowohl die Rogue-DHCP-Wache (R) als auch die ARP-Wache (B) sind passiv. Welche genaue Bedingung meldet jede, wie erkennt sie sie in den gesehenen Frames, und warum nennt der eigene Header der ARP-Wache ihren Befund einen Indikator statt eines Beweises?" }, rubric: "R: walks Ethernet -> IPv4 -> UDP -> BOOTP/DHCP and records the source of server->client traffic (UDP src 67, dst 68) whose DHCP message type is OFFER/ACK/NAK; cads_dhcpwatch_table_multiple_servers() flags more than one distinct server source (an accidental second router or a DHCP-starvation/MITM setup). B: tracks IP->MAC bindings from ARP claims and counts mac_changes when the bound MAC for an existing IP changes - the spoofing tell for arpspoof/ettercap-style MITM. Indicator not proof: DHCP churn or a legitimate NIC/failover swap can legitimately change a binding.", bloom: analyze }
socratic:
  - { trigger: "task:run-a-watch:stuck", question: { en: "These commands run for a bounded duration and then print a summary. Did you leave the app tree first, and did you give the command enough seconds to see any traffic at all?", de: "Diese Befehle laufen eine begrenzte Zeit und drucken dann eine Zusammenfassung. Hast du zuerst den App-Baum verlassen und dem Befehl genug Sekunden gegeben, um überhaupt Verkehr zu sehen?" }, hints: [ { en: "Send scripts/board_key.py quit first, then e.g. 'B 20' or 'R 20'.", de: "Sende zuerst scripts/board_key.py quit, dann z. B. 'B 20' oder 'R 20'." }, { en: "'0 frame(s) seen' on a quiet cable is a correct, well-formed report - it is what the bench itself recorded.", de: "'0 frame(s) seen' an einem stillen Kabel ist ein korrekter, wohlgeformter Bericht - genau das hat auch die Werkbank protokolliert." }, { en: "Plug the board into a segment with a real DHCP server or some ARP chatter to see entries populate.", de: "Hänge das Board an ein Segment mit echtem DHCP-Server oder etwas ARP-Verkehr, damit Einträge erscheinen." } ] }
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

`modules/toolbox/dhcpwatch.c` walks Ethernet → IPv4 (reading the IHL rather than assuming 20 bytes) → UDP → BOOTP/DHCP. It keys only on **server-to-client** traffic, UDP source port 67 to destination 68, and only on frames whose DHCP message type is OFFER, ACK or NAK — so a client's own DISCOVER can never be mistaken for a server. Each distinct server source lands in a fixed-capacity table; `cads_dhcpwatch_table_multiple_servers()` (`dhcpwatch.h` line 102) returns true once more than one is present. That single boolean is the alarm: an accidental second router, or a deliberate DHCP-starvation / man-in-the-middle setup. The parser has 15 host unit-test cases (`tests/unit/test_dhcpwatch.c`) built from hand-constructed frames.

## How the ARP watch decides

`modules/toolbox/arpwatch.c` parses ARP claims and keeps an IP→MAC binding table. When a frame claims an IP that is already bound to a *different* MAC, the entry's `mac_changes` counter increments — that is the signature of arpspoof/ettercap-style cache poisoning. The header is careful about what this means (`arpwatch.h` line 39): a changed binding is a **strong indicator, not proof**. DHCP churn, or a legitimate NIC or failover swap, changes a binding for honest reasons. A recon tool that reports "attack" for every rebind would be worse than none.

## What the bench actually saw

This is worth knowing before you expect drama: the development bench has no DHCP server and near-zero ambient traffic. `R 8` ran clean — `0 frame(s) seen, 0 DHCP servers` — and that is the correct, well-formed result on a quiet cable, not a failure of the command. Entries populate only on a segment where something is talking.

## Your task

Leave the app tree, run `B 20` or `R 20` on the console and read the summary. Then answer the analysis question on what each watch flags, how it recognises it, and why the result is an indicator rather than proof.
