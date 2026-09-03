---
id: m7-03-dhcp-stack-lesson
title: Fallstudie - der DHCP-Stack-Überlauf
bloom: analyze
objectives: [cz.net.dhcp-lesson]
requires: [m7-02-udp-hello]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m3-04-stack-guard, m4-05-stack-sizing]
links:
  - { step: m7-04-recon-tools }
  - { step: m3-04-stack-guard }
  - { step: m4-05-stack-sizing }
  - { doc: "docs/ROADMAP.md" }
  - { file: "apps/bringup/tasks.c", line: 74 }
  - { file: "lib/lwip/src/core/ipv4/dhcp.c", line: 176 }
sources: [docs/ROADMAP.md, apps/bringup/tasks.c, lib/lwip/src/core/ipv4/dhcp.c, modules/net/src/cads_net_board.c, docs/how-to/debug.md]
tasks:
  - id: why-deeper
    title: Erkläre die Tiefe des DHCP-Pfads
    check: { type: question, prompt: { en: "Why is lwIP's DHCP path deeper on the stack than the static-address path?", de: "Warum ist der DHCP-Pfad von lwIP auf dem Stack tiefer als der Pfad mit statischer Adresse?" }, rubric: "Der statische Pfad schreibt beim Init Adresse, Maske und Gateway in das netif und ist danach fertig; er hat keine Arbeit je Frame. Der DHCP-Client ist eine Zustandsmaschine, die für jede ankommende Antwort die BOOTP-Optionen aus einer empfangenen pbuf-Kette herausparst (Optionstabelle und Antwortparser in lib/lwip/src/core/ipv4/dhcp.c) und im selben Zug eigene Nachrichten zusammenbaut und sendet - lauter verschachtelte Aufrufe auf dem Stack dessen, der gepollt hat. Zweite Hälfte der Antwort: gepollt wird aus cads_net_poll() heraus auf der Konsolen-Task, deren Stack bereits die gesamte App-Tree-Tick-Kette trägt. Eine Antwort, die nur sagt, DHCP sei komplizierter, besteht nicht.", bloom: analyze }
  - id: read-headroom
    title: Lies die Höchststände der drei Task-Stacks
    check: { type: serialExpect, send: "k\n", pattern: "console_free=", timeoutMs: 15000, bloom: analyze }
socratic:
  - { trigger: "question:why-deeper:weak", question: { en: "A static address is assigned once. What does a DHCP client have to do for every single reply frame that arrives?", de: "Eine statische Adresse wird einmal zugewiesen. Was muss ein DHCP-Client für jeden einzelnen ankommenden Antwort-Frame tun?" }, hints: [ { en: "One of the two paths only writes fields into a netif; the other reads a protocol out of a received buffer.", de: "Einer der beiden Pfade schreibt nur Felder in ein netif; der andere liest ein Protokoll aus einem empfangenen Puffer." }, { en: "lib/lwip/src/core/ipv4/dhcp.c has an option table and a reply parser; look at how a reply is walked and what it is walked over.", de: "lib/lwip/src/core/ipv4/dhcp.c hat eine Optionstabelle und einen Antwortparser; sieh dir an, wie eine Antwort abgelaufen wird und worüber." }, { en: "The answer has a second half: on whose stack all of that runs, and what was already on that stack before DHCP was switched on.", de: "Die Antwort hat eine zweite Hälfte: auf wessen Stack das alles läuft und was auf diesem Stack schon lag, bevor DHCP eingeschaltet wurde." } ] }
  - { trigger: "task:read-headroom:failed", question: { en: "The report comes from the scheduler, so it needs a running scheduler and a console prompt. Which of the two is missing?", de: "Der Bericht kommt vom Scheduler, er braucht also einen laufenden Scheduler und einen Konsolen-Prompt. Welches der beiden fehlt?" }, hints: [ { en: "Send scripts/board_key.py quit first if the board is sitting in the app tree.", de: "Sende zuerst scripts/board_key.py quit, wenn das Board im App-Baum sitzt." }, { en: "This command reports nothing at all on the host build - there are no FreeRTOS tasks there to report about.", de: "Auf dem Host-Build meldet dieser Befehl gar nichts - dort gibt es keine FreeRTOS-Tasks, über die zu berichten wäre." }, { en: "The numbers are free headroom in bytes, not used bytes; a small number is the alarming one.", de: "Die Zahlen sind freier Spielraum in Byte, nicht verbrauchte Byte; die kleine Zahl ist die beunruhigende." } ] }
---
## Lernziel

Erkläre die netzspezifische Hälfte eines echten Absturzes: warum ausgerechnet das Einschalten von DHCP einen Task-Stack tiefer machte, den die statische Adressierung nie belastet hatte.

## Was du schon weißt, und was hier neu ist

Die Fallstudie selbst — der Wächter im Idle-Hook, der Müll-PC `0xF7FF0FF0`, `CADS_CONSOLE_STACK` 512 → 1024 Worte, die Kosten in CCM statt im SRAM-Heap — steht vollständig in **M3-04** und wird in **M4-05** zur Dimensionierungsregel. Sie wird hier **nicht** noch einmal erzählt.

Was dort offengeblieben ist, ist die Frage dieses Steps: `net.dhcp = 1` sprengte den Stack der Konsolen-Task, `net.dhcp = 0` nicht. Beide laufen durch denselben `cads_net_poll()`-Aufruf, in derselben Schleife, auf derselben Task. Der Unterschied liegt also im Netzstack selbst.

## Zwei Pfade durch dieselbe Funktion

Mit `net.dhcp = 0` ist die Adresse **Konfiguration**: `modules/net/src/cads_net_board.c` schreibt beim Anwenden der Konfiguration Adresse, Maske und Gateway in das netif, und danach gibt es dazu keine Arbeit mehr. Jeder spätere `cads_net_poll()` bewegt nur noch Frames.

Mit `net.dhcp = 1` startet derselbe Code `dhcp_start()` auf dem netif, und ab da ist die Adresse ein **Protokoll**. Der Client von lwIP (`lib/lwip/src/core/ipv4/dhcp.c`) hält eine Zustandsmaschine; für jede ankommende Antwort läuft er die Optionen eines BOOTP-Pakets ab — die Datei führt dafür eine eigene Optionstabelle und einen Antwortparser —, und die Nutzlast, über die er dabei läuft, ist eine **pbuf-Kette**, kein flacher Puffer. Im selben Durchlauf baut er die nächste eigene Nachricht zusammen und übergibt sie zum Senden.

Gepollt wird aus der Hauptschleife von `apps/bringup/explorer_app_demo.c` heraus — auf der **Konsolen-Task**, die zu diesem Zeitpunkt schon die gesamte App-Tree-Tick-Kette fuhr (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`). Verfolge, wo die Arbeit aus `dhcp.c` landet, wenn `cads_net_poll()` aus dieser Schleife heraus gerufen wird — das ist die Frage dieses Steps, und die Antwort hat zwei Hälften.

## Warum die Konsolenstille kein Beleg war

Der Log-Eintrag in `docs/ROADMAP.md` zum 2026-08-28 hält zwei Sackgassen fest — Dateisystemschaden und wacklige Debug-Sitzung —, damit sie nicht blind wiederholt werden, und eine dritte, selbstverschuldete: dieses Nucleo meldet zwei `/dev/cu.usbmodem*`-Geräte, und mehrere „stürzt immer noch ab"-Lesungen waren in Wahrheit ein auf den falschen Port gepinntes `board_cmd.py`, das ins Leere fragte. Die festgehaltene Lehre: einem Live-GDB-Attach mehr trauen als der Konsolenstille, wenn beide widersprechen.

## Deine Aufgabe

Beantworte die Frage, warum der DHCP-Pfad tiefer ist als der statische — mit dem, was `dhcp.c` je Antwort tut, und mit dem, was auf demselben Stack schon lag. Führe dann auf der Board-Konsole `k` aus und lies die freien Höchststände der drei Tasks. Das ist das Werkzeug, mit dem sich diese Klasse von Fehler *vor* dem Absturz sehen lässt — und der Grund, warum M4-05 nach einem Beleg statt nach einem Faktor fragt.
