---
id: m7-03-dhcp-stack-lesson
title: Fallstudie - der DHCP-Stack-Überlauf
bloom: analyze
objectives: [cz.net.dhcp-lesson]
requires: [m7-02-udp-hello]
estimatedMinutes: 15
links:
  - { step: m7-04-recon-tools }
  - { step: m3-04-stack-guard }
  - { doc: "docs/ROADMAP.md" }
  - { doc: "docs/reference/config-file.md" }
  - { file: "apps/bringup/tasks.c", line: 74 }
sources: [docs/ROADMAP.md, apps/bringup/tasks.c, docs/reference/config-file.md, docs/how-to/debug.md]
tasks:
  - id: trace-the-crash
    title: Erkläre den Absturz, die Diagnose und die Kosten der Korrektur
    check: { type: question, prompt: { en: "Setting net.dhcp = 1 crashed the board on every reset. Explain (a) why enabling DHCP deepened the console task's stack in particular, (b) what evidence from a live GDB attach proved it was a stack overflow rather than a corrupt filesystem or a flaky debug session, and (c) why doubling CADS_CONSOLE_STACK cost nothing from the tight SRAM heap margin.", de: "net.dhcp = 1 ließ das Board bei jedem Reset abstürzen. Erkläre (a) warum DHCP ausgerechnet den Stack der Konsolen-Task vertieft hat, (b) welcher Beleg aus einem Live-GDB-Attach bewies, dass es ein Stack-Überlauf war und kein defektes Dateisystem und keine wacklige Debug-Sitzung, und (c) warum die Verdopplung von CADS_CONSOLE_STACK die knappe SRAM-Heap-Marge nichts gekostet hat." }, rubric: "(a) cads_net_poll() läuft auf der Konsolen-Task (Hauptschleife von explorer_app_demo) und führt mit net.dhcp=1 die lwIP-DHCP-Client-Zustandsmaschine aus, tiefer als der statische Pfad, auf demselben Stack, der bereits die GUI-/Marauder-/Settings-Aufrufkette trägt; (b) st-util --no-reset + GDB zeigten die CPU im Fault-Handler gefangen, den SP auf einen absurden Wert zerstört und vApplicationIdleHook (den Stack-Guard-Sentinel) mit einem Müll-PC 0xF7FF0FF0 (Instruction-Fetch-Verletzung) gefaultet - die Lehrbuchsignatur eines Überlaufs; Config zurücksetzen, littlefs neu formatieren und ein echter Power-Cycle änderten nichts und schlossen diese Ursachen aus; (c) Task-Stacks liegen im CCM (etwa 59 KB von 64 KB frei), nicht im SRAM-Heap, den check_ram_budget.py bewacht, also kosteten 512->1024 Worte 2 KB CCM und ließen die 256-B-Marge unberührt.", bloom: analyze }
socratic:
  - { trigger: "question:trace-the-crash:weak", question: { en: "Which task runs cads_net_poll() in the app tree, and what extra work does that call do once DHCP is enabled?", de: "Welche Task führt cads_net_poll() im App-Baum aus, und welche zusätzliche Arbeit erledigt dieser Aufruf, sobald DHCP aktiv ist?" }, hints: [ { en: "explorer_app_demo.c's main loop calls cads_net_poll() every tick on the console task - the same stack that also runs cads_gui_tick and cads_marauder_tick.", de: "Die Hauptschleife von explorer_app_demo.c ruft cads_net_poll() jeden Tick auf der Konsolen-Task auf - derselbe Stack, der auch cads_gui_tick und cads_marauder_tick trägt." }, { en: "Look for the register signature: a garbage PC and a clobbered SP inside the fault handler are what an overflow looks like from GDB.", de: "Achte auf die Registersignatur: ein Müll-PC und ein zerstörter SP im Fault-Handler sind das, wonach ein Überlauf aus GDB aussieht." }, { en: "Read tasks.c line 34 onward: stacks are CCM_SECTION arrays; CCM is a separate 64 KB region, so growing them never touches __cads_heap_size.", de: "Lies tasks.c ab Zeile 34: die Stacks sind CCM_SECTION-Arrays; CCM ist eine eigene 64-KB-Region, ihr Wachstum berührt __cads_heap_size nie." } ] }
---
## Lernziel

Analysiere einen echten Absturz aus dem eigenen Protokoll des Projekts: wie das Aktivieren von DHCP einen Task-Stack überlaufen ließ, wie ein Live-Debugger-Attach die wahre Ursache von zwei plausiblen Irrwegen trennte, und warum die Korrektur billig war.

## Das Symptom

Am 2026-08-28 wollte die Projektleitung echtes Internet auf dem Board über die Internetfreigabe eines Macs. `net.dhcp = 1` in `/config.txt` und ein Reset ließen das Board jedes Mal abstürzen. Die Konsole verstummte — was, wie du in M0 gelernt hast, für sich genommen kein Beleg für irgendetwas ist.

## Zwei Irrwege, sauber ausgeschlossen

Der Log-Eintrag in `docs/ROADMAP.md` zu diesem Tag hält die Sackgassen fest, damit sie nicht blind wiederholt werden:

1. **Dateisystem- oder Konfigurationsschaden.** `net.dhcp` auf 0 zurückzusetzen stoppte den Absturz nicht; ein frisches `cads_config.py pull` las sauberen Inhalt zurück; ein von Grund auf neu formatiertes littlefs-Volume stürzte identisch ab. Eindeutig ausgeschlossen.
2. **Wackliger SWD- oder Debug-Sitzungszustand.** Ein echter Power-Cycle (`reset cause: power-on`, Forensik-Ring tatsächlich auf null Einträge geleert — CCM überlebt einen einfachen Reset, aber keinen Stromverlust) stürzte weiterhin ab. Ebenfalls ausgeschlossen.

Ein dritter Aufwand war selbstverschuldet: dieses Nucleo meldet zwei `/dev/cu.usbmodem*`-Geräte, und mehrere „stürzt immer noch ab"-Lesungen waren in Wahrheit ein auf den falschen Port gepinntes `board_cmd.py`, das ins Leere fragte. Die festgehaltene Lehre: einem Live-GDB-Attach mehr trauen als der Konsolenstille, wenn beide widersprechen.

## Die wahre Ursache

Die Hauptschleife von `apps/bringup/explorer_app_demo.c` ruft `cads_net_poll()` jeden Tick auf der **Konsolen-Task** auf (`apps/bringup/tasks.c`, damals ein Stack von 512 Worten / 2048 B). Mit `net.dhcp = 1` führt dieser Aufruf die DHCP-Client-Zustandsmaschine von lwIP aus — sichtbar tiefer als der statische Pfad — auf demselben Stack, den die gesamte an diesem Abend hinzugekommene Aufrufkette bereits nutzte: die PCAP- und Join-Tiefe von `cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`.

Live gefangen mit `st-util --no-reset` und GDB: die CPU steckte im Fault-Handler, der SP war auf einen absurd niedrigen Wert zerstört, und `vApplicationIdleHook()` — die projekteigene Stack-Guard-Sentinel-Prüfung — hatte mit einem Müll-PC von `0xF7FF0FF0` gefaultet, einer Instruction-Fetch-Verletzung. Das ist die Lehrbuchsignatur eines Stack-Überlaufs, der so schwer ist, dass er genau den Code zerstört, der ihn erkennen soll.

## Die Korrektur, und warum sie billig war

`CADS_CONSOLE_STACK` wurde von 512 auf 1024 Worte verdoppelt. Sieh dir `apps/bringup/tasks.c` in Zeile 74 und die Arrays direkt darunter an: jeder Task-Stack ist ein `CADS_CCM_SECTION`-Array. CCM ist eine eigene 64-KB-Region mit damals etwa 59 KB frei, die Verdopplung kostete also 2 KB CCM und **nichts** aus dem SRAM-Heap, den `scripts/check_ram_budget.py` bewacht (256-B-Untergrenze, damals 704 B Marge, unverändert). Verifiziert: ein echter DHCP-Lease auf `192.168.2.3` über zwei vollständige Läufe, ohne dass der Forensik-Ring dazwischen wuchs.

Zwei Tage später traf dieselbe Fehlerklasse `CADS_INPUT_STACK` (256 Worte, auf 1024 vervierfacht) beim Navigieren im Marauder-Menü — die Input-Task führt den Eingabe-Handler jeder App synchron aus. Das Muster verallgemeinert sich: eine Task, deren Stack beliebige app-spezifische Tiefe trägt, lässt sich nicht anhand ihrer eigenen Schleife dimensionieren.

## Deine Aufgabe

Beantworte die dreiteilige Analysefrage. Stütze dich auf den ROADMAP-Log-Eintrag und auf den Kommentarblock in `tasks.c`, der diese Geschichte im Code selbst erzählt.
