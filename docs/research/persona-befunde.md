# Persona-Befunde

Auftrag und Zuschnitt: [`docs/PERSONA-REVIEW.md`](../PERSONA-REVIEW.md). Ein Befund nennt Step-Id,
Handlung, Beobachtung, Regel oder Regelvorschlag, Schweregrad und ob er exakt prüfbar ist.

Schweregrade: **blockiert** (Studierende kommen nicht weiter oder können den Erfolg nicht
feststellen) · **verfälscht die Bewertung** · **kosmetisch**.

## Vorlauf: Hardware-Durchgang am 07.09.2026

Vor Beginn der Persona-Durchsicht lief der komplette Kurspfad M0 → M3-02 einmal an echter Hardware
(Sitzung „Maintainer cads zero", nach manueller WebUSB-Freigabe durch den Operator). Alle fünf
geplanten Punkte PASS, keine Sicherheitsvorfälle; ein SWD-Desync (`chipid 0x000`) wurde regelkonform
sofort gestoppt und per physischem Replug behoben (danach `chipid 0x419`).

Der Durchgang brachte drei Befunde. **Alle drei liegen in der Nachweis- und Wiederanlaufschicht,
keiner in der Lehrschicht** — dieselbe Klasse wie die vier Fehler desselben Tages (totes Panel,
abgelehnte Orientierungsfrage, nie gesetzter Selbstkontroll-Pfad, eingefrorene Teilaktualisierung).
Der Kurs erklärt gut und weist schlecht nach. Das ist die Arbeitshypothese, mit der die drei Personas
starten.

### PB-01 — Der Flash-Erfolg verschwindet nach sechs Sekunden

| | |
|---|---|
| **Steps** | `m0-04-flash-console` (de/en, `> expect:`), `m5-01-canvas-draw` (de/en, `> expect:`), `m7-02-udp-hello` (de/en, Fließtext), Bild `flash-ok.png` samt Alt-Text |
| **Handlung** | Firmware flashen, danach die Statusleiste ansehen |
| **Beobachtung** | Die Statusleiste zeigt dauerhaft `Board: verbunden · läuft`; der Flash-Ausgang steht nur im Tooltip (`Letzter Flash: cads-zero.bin ok (…)`). Der Text, den vier `> expect:`-Zeilen als Erfolgsnachweis nennen — `Flash ok: 327088 Bytes in 15973 ms` — existiert zwar (`extensions/cads-board-bridge/src/extension.ts:250`), aber als `setStatusBarMessage(…, 6000)`: er löscht sich nach sechs Sekunden selbst. Wer den Schritt liest, bevor er hinsieht, sieht ihn nicht mehr. |
| **Nicht der Befund** | Die Meldung fehlt nicht im Produkt, und das im Terminal sichtbare `Flash written and verified! jolly good!` ist die Ausgabe des st-flash-Shims — der Kurstext sagt ausdrücklich, dass die Ausgabe *nicht* im Terminal steht. Insoweit stimmt er. |
| **Regel** | Vorschlag: *Ein `> expect:` darf nur auf Belege zeigen, die noch da sind, wenn der Studierende hinsieht.* Spiegelbild zu R11a.2a (der `recover:` muss einen herstellbaren Fehler beschreiben). |
| **Schweregrad** | blockiert (Selbstkontrolle) |
| **Exakt prüfbar?** | Teilweise: Ein Validator kann `> expect:`-Zeilen gegen die Liste der flüchtigen UI-Meldungen (`setStatusBarMessage`) prüfen, sobald diese Liste aus den Erweiterungen extrahiert wird. |
| **Fixrichtung** | Den Flash-Ausgang dauerhaft machen (Statusleisten-Eintrag statt flüchtiger Meldung), dann bleibt der Kurstext gültig. Sonst alle vier `> expect:` auf den Tooltip umschreiben und `flash-ok.png` neu aufnehmen. Die erste Richtung ist die bessere: Ein Erfolgsnachweis, der sich selbst löscht, ist auch ohne Kurstext falsch. |

### PB-02 — „Stop" lässt das Board angehalten, der Kurs behauptet das Gegenteil

| | |
|---|---|
| **Steps** | `m3-02-registers-svd` (de/en), Bild `debug-after-stop.png` samt Alt-Text |
| **Handlung** | `F5`, am Haltepunkt anhalten, danach „Stop" drücken, Statusleiste ansehen |
| **Beobachtung** | Der Kern bleibt `Core: halted`. Der Kurs behauptet „Nach Stop läuft das Board weiter, die Statusleiste zeigt wieder `Board: verbunden · läuft`". Reproduzierbar. Was tatsächlich weiterlaufen lässt: **„Weiterlaufen lassen"** im Menü der Board-Statusleiste. |
| **Regel** | R1.3-verwandt, aber schärfer: Eine Zusage über den Zustand *nach* einer Handlung ist eine Aussage über das System, keine Formulierungsfrage. Vorschlag: *Jede Zustandszusage im Kurstext muss einmal am Gerät beobachtet worden sein.* |
| **Schweregrad** | blockiert |
| **Exakt prüfbar?** | Nein, nur am Gerät. Deshalb gehört sie in die Persona-Durchsicht und nicht in den Validator. |
| **Sequenz (protokolliert)** | `Shift`+`F5` beendet die cortex-debug-Sitzung; die Statusleiste bleibt `Board: verbunden · angehalten · Konsole`, der Kern bleibt auf Hardwareebene angehalten. Erst `CaDS Board: Weiterlaufen lassen` (`cads.board.run`, angeboten vom Statusleistenmenü, solange `core === 'halted'`, `extension.ts:296`) behebt es. „Stop" ist die VS-Code-eigene Schaltfläche — in der Tutor-Erweiterung gibt es keinen Stop-Befehl, `debugStop` ist dort ein *Prüftyp*, der auf das Anhalten wartet. |
| **Fixrichtung** | **Nicht** den Kurstext anpassen. Die Bridge hat bereits einen Wiederanlauf beim Trennen: `extension.ts:188-203` ruft beim Schließen des GDB-Sockets `session.releaseTarget(true)` — ausdrücklich, „so closing the debugger never freezes the student's board", mit Verweis auf cads-zero („a bare write/attach left halted looks like a crash"). Der Kurstext beschreibt also das *beabsichtigte* Verhalten, und die Messung zeigt, dass die Absicht nicht eintritt. Wer jetzt den Text umschreibt, dokumentiert einen Defekt als Eigenschaft. Drei Kandidaten: der Wiederanlauf warf und wurde in eine Logwarnung verschluckt, der Socket schloss nie (also lief `done()` nicht), oder etwas hielt danach erneut an. Entschieden wird das durch `GET /log` (letzte 400 Zeilen) unmittelbar nach `Shift`+`F5`: steht dort `GDB client disconnected`, und steht davor ein `resume-on-disconnect: …`? Zusätzlich `GET /status` direkt danach — ist `core` bereits `running`, während die Leiste `angehalten` zeigt, ist es nur die Anzeige. |
| **Messung (Rohdaten, 07.09.2026 20:52)** | Vor `Shift`+`F5`: `core: halted`, `probe.core: halted`, `gdbClients: 1`. Unmittelbar danach: **`core: halted`, aber `probe.core: running`**, `gdbClients: 0`. Log: `event debug-end` → `GDB client disconnected` → 113 ms später `event debug-stop {"reason":"halt","pc":3758157104}`. Keine `resume-on-disconnect`-Fehlerzeile. Nach „Weiterlaufen lassen": `core: running`. Zwei Durchgänge, bitgleicher pc. |
| **Was damit feststeht** | (1) Der Wiederanlauf **funktioniert** — die Sonde meldet den Kern zwei Sekunden nach dem Trennen als laufend. (2) Die Statusantwort trägt **zwei Kopien derselben Tatsache**: `status.core` wird aus Ereignissen fortgeschrieben (`board.ts:323`), `probe.core` kommt aus `probe.lastStatus`, und `getStatus()` (`board.ts:74`) liefert beide nebeneinander aus. Genau diese Divergenz ist sichtbar. (3) `pc = 3758157104` ist `0xE000ED30` — die Adresse des DFSR, ein Systemregister; **das kann kein Programmzähler sein**. Das Ereignis ist also mindestens teilweise unglaubwürdig. |
| **Was „Weiterlaufen lassen" wirklich tut** | `cads.board.run` setzt `core: running` (`board.ts:198`). Es repariert also die Anzeige, nicht den Kern — der lief bereits. |
| **Fixe, in dieser Reihenfolge** | (a) **Eine Tatsache, ein Besitzer**: `status.core` darf `probe.core` nicht widersprechen. Ein Ereignis ist ein schneller Hinweis, kein Eigentümer — nach einem `halted`-Ereignis eine entprellte `refresh()` planen, dann korrigiert sich ein falscher Hinweis binnen einer Sondenrunde (~0,8 s laut `rtt`). (b) Ein `halted`-Ereignis mit einem pc außerhalb des Flash/SRAM-Bereichs gehört nicht weitergereicht. (c) Sondenseitig klären, warum nach dem Freigeben überhaupt ein Halt gemeldet wird. |
| **Entschieden (07.09.2026, 23:0x)** | **Der Kern lief die ganze Zeit.** Unmittelbar nach `Shift`+`F5` und vor jedem Klick lieferte `board_key.py quit` → `board_cmd.py '?'` über die Bridge-PTY den vollständigen Explorer-Hilfetext zurück, samt des in M2 hinzugefügten eigenen Befehls. Ein angehaltener Kern kann das nicht. Damit ist PB-02 **vollständig ein Zustands-/Ereignis-Zwischenspeicherfehler**, kein Wiederanlauf-Fehler: Die Hardware setzt bei `Shift`+`F5` zuverlässig fort. Der Weg über die Bridge vermied den zweiten ST-Link-Halter; die Kamera wäre dafür nie nötig gewesen. |
| **Warum nicht per Kamera** | Der optische Weg wurde versucht und richtig abgebrochen: Die Bench-Kamera ist nicht erreichbar, der hartkodierte Vorgabetyp fehlt in der Geräteliste, ein Rateversuch hätte den Raum fotografiert. |
| **Behoben** | `10497cb`. Zwei Maßnahmen: (1) nach **jedem** `halted`-Ereignis eine entprellte `refresh()` (0,8 s) — das Ereignis ist ein Hinweis, die Sonde bleibt Eigentümerin; (2) ein `halted` mit einem pc außerhalb Flash/SRAM/CCM wird verworfen, bevor es Zustand ändert oder `debug-stop` feuert. Die Reihenfolge stimmt: Die Auffrischung wird **vor** der Plausibilitätsprüfung geplant, ein verworfenes Ereignis lässt den Zustand also nicht stehen. Die drei Adressbereiche lagen doppelt vor (`rsp/server.ts`) und sind jetzt in `memoryRanges.ts` geteilt. |
| **Bleibt offen, und zwar bei uns** | Warum der Sondentreiber nach dem Freigeben überhaupt ein `halted` mit `pc = 0xE000ED30` erzeugt. Zuständig ist **`extensions/cads-probe/src/driver/` in diesem Repo**, nicht `cads-zero` — dort liegt nur die STM32-Firmware, kein Treibercode. (Ich hatte das zunächst falsch zugeordnet; die cads-zero-Sitzung hat korrigiert.) Der Filter unterdrückt die Folge, nicht die Ursache. Sticky-DFSR-Bits sind als Erklärung ausgeschlossen (`cortexm.ts:199` liest DFSR write-1-to-clear). |
| **Stand** | Wirkung behoben und geprüft (44/44 im eigenen Suite, nicht am Board), Ursache im Sondentreiber offen. Der Kurstext bleibt unverändert — er hat von Anfang an das richtige Verhalten beschrieben. |

### PB-03 — `board_key.py` läuft im Container ins Leere, ist aber der dokumentierte Ausweg

| | |
|---|---|
| **Steps** | `m0-05-explorer` (Hinweise + Fließtext + Codeblock), `m3-03-fault-forensics` (Hinweis, Codeblock, `> recover:`), `m4-05-stack-sizing` (`> recover:`), `m5-03-own-app` (drei Codeblöcke), `p6-perf-measurement` (Hinweis) — beide Sprachen |
| **Handlung** | `python3 scripts/board_key.py quit` im Container-Terminal, so wie es die Schritte empfehlen |
| **Beobachtung** | `no ST-Link VCP found`. Im Container gibt es kein `/dev/cu.usbmodem*`: Das Board hängt per WebUSB am Browser des Studierenden, nicht am Host. Das Skript sucht ein Gerät, das dort nie auftaucht. |
| **Warum das teuer ist** | Es ist nicht irgendein Befehl, sondern der Ausweg, den mehrere `> recover:`-Zeilen anbieten, wenn die Board-Konsole nicht antwortet. Der Wiederanlauf ist also genau dort kaputt, wo er gebraucht wird. |
| **Regel** | R11a.2a gilt sinngemäß auch für den Ausweg: Ein `> recover:` muss in *dieser* Umgebung ausführbar sein, nicht nur auf einem Entwicklungsrechner. |
| **Schweregrad** | blockiert |
| **Exakt prüfbar?** | Ja, und das ist der Kern: Der Validator prüft `::: do command=` bereits gegen die vorhandenen Werkzeuge. `> recover:`-Zeilen mit einem Befehl darin werden noch nicht geprüft. |
| **Fixrichtung** | **Nicht** über `POST /serial` — der Endpunkt ist schreibend und hat kein Gegenstück zum Lesen, ein `read_lines()` kann darauf nicht stehen (erste Einschätzung hier war falsch und wurde korrigiert, bevor die cads-zero-Seite darauf gebaut hat). Richtig ist ein Pfadwechsel: die Bridge betreibt bereits eine beidseitige Konsole — `127.0.0.1:3334` (`SerialTcpServer`, schreibt zum Board und streamt zurück) und daran per `socat pty,raw,echo=0,link=…` das **PTY `/home/coder/board-console`** (Einstellung `cads.board.consoleLink`). Weil das ein echtes tty ist, bleiben `os.open()` + `termios` in `cads_serial.py` unverändert; nur der Gerätepfad wechselt. |
| **Falle beim Bauen** | `/flash`, `/reset`, `/halt` prüfen die Verbindung und antworten mit 503 samt `reason`. `/serial` prüft sie **nicht**: Ohne Board gelingt der Schreibvorgang lokal, das abgelehnte `sendSerial` wird als Logwarnung verschluckt, und das Skript sieht Erfolg, während nichts ankommt. Ein Ausweg, der Erfolg meldet und nichts tut, ist schlimmer als einer, der scheitert — also vorher `GET /status` (`connected`, sonst `probe.blockReason`) auswerten. |

### PB-04 — Kein `> recover:` sagt, woran der Wiederanlauf erkennbar ist

| | |
|---|---|
| **Steps** | Alle zwölf `> recover:`-Zeilen, die `python3 scripts/board_key.py quit` anbieten: `m0-05-explorer`, `m2-02-mmio-gpio`, `m2-03-buttons`, `m3-03-fault-forensics`, `m4-05-stack-sizing`, `m6-01-littlefs` — je de/en. Der Befund gilt aber allgemein. |
| **Handlung** | Die zwölf Zeilen daraufhin gelesen, ob sie ein Erfolgsbild nennen |
| **Beobachtung** | Keine einzige tut es. Jede sagt „führ das aus" und hört auf. Das Skript druckt bei Erfolg genau `  \| sent: quit` (eine Zeile je gesendetem Zeichen, Quelle: `scripts/board_key.py` in cads-zero) — im Kurs steht das nirgends. |
| **Warum das der Kern von PB-03 ist** | Genau diese Lücke hat PB-03 verstecken können. Das Skript tat in dieser Umgebung *gar nichts*, und weil keine Zeile sagte, was zu sehen sein müsste, konnte weder ein Studierender noch eine Durchsicht den Unterschied zwischen „lief durch" und „lief ins Leere" bemerken. Sichtbar wurde es erst bei einem Hardware-Durchgang. |
| **Regel** | Vorschlag **R11a.2b — Ein `recover` nennt das Zeichen, an dem der Wiederanlauf erkennbar ist.** R11a.2 verlangt, dass es einen `recover` gibt; R11a.2a, dass sein Fehlerbild echt ist. Beides sagt nichts darüber, woran die Studierende merkt, dass die Rettung gewirkt hat — und ein Wiederanlauf ohne Erfolgszeichen ist eine zweite Sackgasse hinter der ersten. |
| **Schweregrad** | blockiert |
| **Exakt prüfbar?** | Nein. Ob eine Zeile ein *echtes* Erfolgszeichen nennt, entscheidet nur Lesen; eine Kennzahl („enthält der recover einen Backtick-Block?") würde Textbausteine belohnen. Nach der Methodenregel bleibt das aus dem Validator draußen. |
| **Wie groß ist das?** | 274 `> recover:`-Zeilen in vier Paketen. Eine Vorsortierung („enthält die Zeile überhaupt ein Ergebniswort — zeigt/steht/meldet/druckt/shows/prints/…") findet 20 Zeilen ohne jedes Ergebnisvokabular: 18 im Firmware-Kurs, 2 in Rust, 0 in JavaScript und in den Projekten. **Diese 20 sind eine Untergrenze, keine Fallzahl** — die zwölf bekannten `board_key`-Zeilen sind NICHT darunter, weil sie ein Ergebniswort für den *Fehlerfall* tragen („Zeigt die Konsole einen gelben Hinweis…") und trotzdem kein Zeichen für die Rettung selbst. Die Kennzahl sortiert vor, entschieden wird durch Bedienen. |
| **Wer macht es** | Die Persona „fehleranfälliger Student" — ihr erster Punkt ist genau das: den Fehlerfall herstellen, `recover` befolgen, prüfen, ob man zurückkommt. Nicht vorab durch Lesen erledigen; Lesen hat die zwölf Zeilen zwei Wochen lang passieren lassen. |
| **Stand** | Text vorbereitet, **bewusst nicht committet**: Die zwölf Zeilen dürfen erst dann `  \| sent: quit` versprechen, wenn der reparierte `board_key.py` im ausgelieferten Abbild steckt. Ein Kurstext, der ein Verhalten zusagt, das die Umgebung noch nicht hat, ist genau PB-01 noch einmal. |

### PB-05 — Die Sonde meldet einen Halt mit einer Systemregister-Adresse als Programmzähler

| | |
|---|---|
| **Ort** | `extensions/cads-probe/src/driver/` in diesem Repo (nicht `cads-zero` — dort liegt nur die Firmware). Poller: `probe.ts:494-501`. |
| **Beobachtung** | Nach dem Freigeben der Debug-Sitzung meldet der Poller `halted` mit `pc = 0xE000ED30`, der Adresse des DFSR. Zweimal gemessen, bitgleich. Der Kern lief nachweislich weiter (PB-02). Die Wirkung ist seit `10497cb` unterdrückt; die Ursache steht. |
| **Ausgeschlossen** | Klebengebliebene DFSR-Bits: `haltReason()` (`cortexm.ts:199-201`) liest DFSR und schreibt es sofort zurück (write-1-to-clear). |
| **Arbeitshypothese** | Der Poller ruft in dieser Reihenfolge `core.getState()` (liest DHCSR), dann `core.haltReason()` — das **liest DFSR und schreibt es zurück** (`setDebugReg32`, 10-Byte-Kommando mit der Adresse `0xE000ED30` an Offset 2, Antwort nur 2 Byte erwartet) — und erst danach `core.readReg(REG_PC)` (`getReg`, erwartet 8 Byte und nimmt das Wort ab Offset 4). Wenn die kurze Antwort des Schreibbefehls den Endpunkt nicht sauber leert, liefert der folgende Lesevorgang den Rest der **vorherigen** Übertragung — und darin steht genau die Adresse, die gerade geschrieben wurde. Das erklärt, warum der „Programmzähler" die Adresse des Registers ist, das einen Schritt vorher angefasst wurde, und warum der Wert deterministisch derselbe ist. |
| **Billiges Unterscheidungsexperiment** (braucht ein Board, eine Minute) | Im Poller den Programmzähler **vor** `haltReason()` lesen, oder ihn zweimal hintereinander lesen und vergleichen. Ändert sich der Wert beim zweiten Lesen, ist es Rest aus der vorherigen Übertragung und keine echte Meldung. Bleibt er, ist die Hypothese falsch und die Ursache liegt tiefer. |
| **Kandidat für die Behebung** | Wenn das Experiment die Hypothese stützt: die Reihenfolge im Poller umdrehen (erst Programmzähler, dann Haltegrund) **und** die Antwortlänge des Schreibbefehls prüfen. Die Reihenfolge allein wäre eine Umgehung; sie behebt den Fall, aber nicht die Klasse. |
| **Schweregrad** | verfälscht die Bewertung (nicht mehr: die Wirkung ist gefiltert) — aber ein Treiber, der einen falschen Programmzähler liefern kann, tut es irgendwann an einer Stelle, an der es niemand filtert. |
| **Stand** | Offen, wartet auf das nächste Hardware-Fenster. Nicht dringend, seit `10497cb` nichts mehr darauf reagiert. |

### PB-06 — Das Panel verspricht einer abgewiesenen Anfrage einen Platz in einer Warteschlange, die es nicht gibt

| | |
|---|---|
| **Ort** | `extensions/cads-tutor/src/i18n.ts:140-141` (en) und `:352-353` (de), gespeist aus `llmClient.ts:160` und `webview.ts:971`. |
| **Vertrag der Gegenseite** (im Code der Relay-Sitzung geprüft, nicht aus dem Gedächtnis) | Bei `reason: "queue_full"` sendet der Relay **beide** Kopfzeilen `X-Queue-Position` und `X-Queue-Length` — auch bei sofortiger Ablehnung. Bei `reason: "per_user"` nur `X-Queue-Length`. Entscheidend: **Bei einer Ablehnung wird niemand eingereiht.** Die Position bedeutet „wärst du in diesem Augenblick hineingekommen, wärst du Nummer X gewesen" — eine kontrafaktische Momentaufnahme, kein laufender Platz. |
| **Was das Panel daraus macht** | „Die Bewertung steht in einer Warteschlange – Anfragen werden nacheinander bearbeitet, **nicht verworfen**." und „Du bist Nummer 7 von 12 **Wartenden**." |
| **Warum das schlimmer ist als eine Ungenauigkeit** | Drei Aussagen auf einmal falsch, und die mittlere ist ein **Versprechen**: Die Anfrage wurde sehr wohl verworfen. Der Studierende wartet auf einen Platz, den niemand für ihn freihält. Dieselbe Form wie PB-01 und PB-02 — eine selbstsichere Anzeige für etwas, das das System nicht tut. |
| **Entscheidung** | **Kein Vertragswechsel.** Sofortige Ablehnung ist das bessere Verhalten: „jetzt nicht, in N Sekunden wieder" schlägt einen Wartekringel, und eine echte Warteschlange erkaufte den Platz mit gehaltenen Verbindungen. Wir lesen Position/Länge als **Auslastungsangabe**, nicht als Platz, und formulieren entsprechend. Das Versprechen „nicht verworfen" verschwindet vom Ablehnungspfad. |
| **Schweregrad** | blockiert (der Studierende wartet auf etwas, das nicht kommt) |
| **Exakt prüfbar?** | Teilweise: Dass die Zeichenkette mit „Warteschlange"/„Wartenden" nur auf einem Pfad erscheint, auf dem tatsächlich gewartet wird, lässt sich im Test festhalten. Ob die neue Formulierung *stimmt*, entscheidet die Messung. |
| **Stand** | Messung läuft (Relay-Antwort und gerendeter Text je Fall nebeneinander). Fix erst nach der Messung — die neue Formulierung muss gegen den beobachteten Text prüfbar sein. |
| **Nebenbefund zur Arbeitsweise** | Ich hatte 68/20/48 Anfragen als Messung *unseres* Panels weitergegeben; es war der reine Relay-Test der llm2-Sitzung, unsere Seite hatte noch keine einzige Anfrage gefahren. Die Tutor-Sitzung hat nachgefragt statt den Bericht um eine fremde Zahl herum zu schreiben. Zahlen tragen ihre Herkunft, sonst tragen sie nichts. |
