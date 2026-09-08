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
| **Weiter als gedacht** | Der Satz steht nicht erst auf dem Ablehnungspfad. `startWaiting()` (`webview.ts:948`) schreibt `S.gradingWait` **sofort bei jeder Bewertungsanfrage** in den Kasten, bevor irgendeine Antwort vorliegt, also auch bei jeder Anfrage, die gleich abgewiesen wird. Das Versprechen wird demnach ausgesprochen, bevor irgendjemand wissen kann, ob es zutrifft. Der Fix wird dadurch groesser: Der Anfangstext darf nur sagen, was in diesem Moment bekannt ist (die Bewertung laeuft); alles ueber Warteschlange und Nichtverwerfen gehoert hinter die Antwort, auf den Pfad, wo es stimmt. |
| **Fluchtweg strukturell nicht betroffen** | Die 20-Sekunden-Schaltflaeche kann bei einer Ablehnung nie erscheinen: Sie wird nur in einem Takt eingefuegt, in dem 20 s vergangen sind (`webview.ts:952-954`), und `stopWaiting()` raeumt den Kasten ab, sobald die Zusage sich aufloest. Sie ist fuer eine langsame **zugelassene** Anfrage gedacht, nicht fuer eine Abweisung; bei rund 1,4 s je Anfrage kommt derzeit keine zugelassene Anfrage in ihre Naehe. Sie ist damit live nicht pruefbar, sondern nur im Test mit gestellter Uhr. Nicht beobachtbar, weil die Bedingung derzeit nicht eintreten kann, ist ein Befund; "ungeprueft" waere keiner. |
| **Warum das schlimmer ist als eine Ungenauigkeit** | Drei Aussagen auf einmal falsch, und die mittlere ist ein **Versprechen**: Die Anfrage wurde sehr wohl verworfen. Der Studierende wartet auf einen Platz, den niemand für ihn freihält. Dieselbe Form wie PB-01 und PB-02 — eine selbstsichere Anzeige für etwas, das das System nicht tut. |
| **Entscheidung** | **Kein Vertragswechsel.** Sofortige Ablehnung ist das bessere Verhalten: „jetzt nicht, in N Sekunden wieder" schlägt einen Wartekringel, und eine echte Warteschlange erkaufte den Platz mit gehaltenen Verbindungen. Wir lesen Position/Länge als **Auslastungsangabe**, nicht als Platz, und formulieren entsprechend. Das Versprechen „nicht verworfen" verschwindet vom Ablehnungspfad. |
| **Schweregrad** | blockiert (der Studierende wartet auf etwas, das nicht kommt) |
| **Exakt prüfbar?** | Teilweise: Dass die Zeichenkette mit „Warteschlange"/„Wartenden" nur auf einem Pfad erscheint, auf dem tatsächlich gewartet wird, lässt sich im Test festhalten. Ob die neue Formulierung *stimmt*, entscheidet die Messung. |
| **Stand** | Messung läuft (Relay-Antwort und gerendeter Text je Fall nebeneinander). Fix erst nach der Messung — die neue Formulierung muss gegen den beobachteten Text prüfbar sein. |
| **Nebenbefund zur Arbeitsweise** | Ich hatte 68/20/48 Anfragen als Messung *unseres* Panels weitergegeben; es war der reine Relay-Test der llm2-Sitzung, unsere Seite hatte noch keine einzige Anfrage gefahren. Die Tutor-Sitzung hat nachgefragt statt den Bericht um eine fremde Zahl herum zu schreiben. Zahlen tragen ihre Herkunft, sonst tragen sie nichts. |

### PB-07 — Ein Verbindungsabbruch umgeht den gesamten Notpfad

| | |
|---|---|
| **Ort** | `extensions/cads-tutor/src/llmClient.ts:144-149` |
| **Beobachtung** | `post()` fängt genau eine Sache ab: den eigenen `AbortError` bei Zeitüberschreitung. Alles andere fliegt roh weiter. Ein Abbruch auf Socketebene (`UND_ERR_SOCKET`, keine HTTP-Antwort, kein 429) wird damit **nicht wiederholt** und ist **kein `LlmRateLimitError`** — und der gesamte Notpfad hängt an genau diesem Fehlertyp: Warteschlangenmeldung, 20-Sekunden-Fluchtweg, Rückfall auf Selbstkontrolle. |
| **Wann das eintritt** | Beim Lastversuch am 08.09.2026 brachen Verbindungen oberhalb von sechs gleichzeitigen auf Socketebene ab, bevor eine HTTP-Antwort kam. |
| **Reichweite jetzt gemessen** | Die urspruengliche Formulierung hier stammte von mir und war unbelegt; ich hatte sie als offen markiert. Der entscheidende Test ist inzwischen gelaufen, **aus einem echten tutor-lab-Behaelter auf dem Laborrechner**, also auf dem Pfad, den auch die Anfrage eines Studierenden nimmt: n=10 dreimal 6/10, 5/10, 4/10; n=6 einmal 6/6, dann **1/6**. Damit ist die Sandkasten-Erklaerung widerlegt - der Behaelter trifft dieselbe Wand und schlechter als der Sandkasten. Die Aussage steht also, mit einer Verschaerfung: Es ist keine saubere Schranke bei sechs, sondern **Verdraengung**, die schon bei sechs auf eine einzige durchkommende Anfrage einbrechen kann. |
| **Wo es NICHT liegt** | Nicht im Client-Code (billige `GET /models`-Sonde ohne Modellkosten), nicht im Agenten-Sandkasten (der Behaelter ist schlechter), nicht am Prozess (drei Prozesse ergaben zusammen 6/24), und nicht am Server des Relays (dort 10/10, direkt und durch den Tunnel). Es bleibt der gemeinsame Pfad: Wirtsausgang, Tunnel, oder die Gegenseite unter echter Gleichzeitigkeit. |
| **Unabhaengig davon gueltig** | Der Fix steht so oder so: Ein Verbindungsabbruch, woher auch immer, darf den Studierenden nicht am Notpfad vorbeifuehren. |
| **Warum das schwerer wiegt als die Grenze selbst** | Wo die Grenze sitzt (Relay, Tunnel, Client), ist noch offen und gehört anderen. Dass wir sie ungefedert an den Studierenden durchreichen, gehört uns und ist unabhängig davon zu beheben. |
| **Fixrichtung** | Einen Verbindungsfehler behandeln wie das, was er aus Sicht des Studierenden ist: Das Modell ist gerade nicht erreichbar. Einmal mit kurzer Pause wiederholen, bei Fortbestehen über denselben Pfad wie eine Ratenbegrenzung melden, damit der Rückfall greift. **Nicht** stillschweigend schlucken: Das Protokoll muss weiterhin sagen, dass es ein Socketfehler war, sonst verlieren wir die Unterscheidung „beschäftigt" gegen „kaputt". |
| **Schweregrad** | blockiert |
| **Exakt prüfbar?** | Ja, im Test: erster Versuch scheitert am Socket und die Wiederholung gelingt; beide scheitern und der Studierende landet im Rückfall. |
| **Offen, nicht bei uns** | Die Grenze selbst. Die gemessenen Zahlen (n=6 → 6/6, n=7 → 2/7, n=8 → 6/8, n=10 → 6/10) tragen **keine** saubere Schranke bei sechs — bei einer konfigurierten Grenze müssten bei n=7 sechs durchkommen, nicht zwei. Vor der Meldung an die Gegenseite jedes n dreimal wiederholen; eine falsche Konstante kostet den Empfänger einen Nachmittag in der falschen Datei. |

### PB-08 — Der Arbeitsbereich wird einmal befüllt und nie wieder aktualisiert

| | |
|---|---|
| **Ort** | `image/entrypoint.d/10-seed-workspace.sh`, `seed_workspace()` |
| **Beobachtung** | `seed_workspace()` bricht ab, sobald `$WS/.git` existiert („workspace exists, keeping it"). Auf dem Services-Host gemessen: Der laufende Arbeitsbereich steht auf `e882fab`, das frische Abbild bringt in `/opt/cads-seed/cads-zero` korrekt `a4ebc909` mit. Das Abbild ist also richtig — es erreicht den Arbeitsbereich nur nie. |
| **Was das bedeutet** | **Jede Korrektur auf der Firmware-Seite erreicht nur Umgebungen, deren Datenträger nach der Korrektur angelegt wurde.** Wer im September anfängt, behält einen September-Stand für immer, während der Kurstext um ihn herum weiter aktualisiert wird. Nur `.vscode/*` wird bei jedem Start neu geschrieben — der Kommentar dort sagt ausdrücklich „so image updates reach existing workspaces", die Lücke war also bekannt und nur für diese vier Dateien geschlossen. |
| **Wie es aufgefallen ist** | Beim Rollout von `next-895faf3`: Die beiden Prüfungen, die ich statt eines Tag-Vergleichs verlangt hatte, schlugen fehl — und die Services-Sitzung hat die Ursache gesucht, bevor sie berichtete. Ein reiner Digest-gegen-Tag-Vergleich hätte „erfolgreich ausgeliefert" gemeldet. |
| **Sofortige Verschärfung durch diese Auslieferung** | Der Kurstext dieses Abbilds verspricht `| sent: quit`, während ein alter Arbeitsbereich weiterhin das Skript trägt, das nur „no ST-Link VCP found" sagen kann. Neues Versprechen, altes Verhalten — dieselbe Form wie PB-01, diesmal von uns erzeugt, weil Text und Skript in verschiedenen Schichten liegen. |
| **Sofortmaßnahme (kein Löschen)** | Drei Dateien einzeln aus `/opt/cads-seed/cads-zero/scripts/` überschreiben, und nur, wenn `git status --porcelain` sie als unverändert ausweist. Kein `git reset`, kein `checkout`, kein Wischen des Datenträgers — dort liegt möglicherweise die einzige Kopie fremder Arbeit. Der `HEAD` bleibt danach ehrlich alt. |
| **Entwurf für die dauerhafte Lösung** | Nicht „immer überschreiben" und nicht „nie anfassen", sondern **nur anfassen, was nachweislich unberührt ist**: beim Start die Blobs des alten und des neuen Seeds vergleichen und genau die Dateien aktualisieren, die (a) sich zwischen altem und neuem Seed unterscheiden **und** (b) im Arbeitsbereich bitgleich mit dem alten Seed sind. Alles andere bleibt liegen und wird gemeldet, nicht überschrieben. Dazu gehört ein Vermerk im Arbeitsbereich, welcher Seed-Commit zuletzt angewandt wurde — ohne den ist (a) nicht entscheidbar. Wo eine Datei abweicht, sieht der Studierende einen Hinweis statt einer stillen Änderung. |
| **Schweregrad** | blockiert |
| **Exakt prüfbar?** | Ja, und das ist die eigentliche Lehre: Ein Deploy gilt erst als geprüft, wenn **im laufenden Behälter** nachgesehen wurde, nicht wenn Tag und Digest zusammenpassen. Das Abbild war die ganze Zeit richtig. |
| **Nachgeprüft** | Das Einfrierfenster ist rund eine Woche, nicht länger: Die losen Dateien im Wurzelverzeichnis des Arbeitsbereichs (`linker.ld`, `Makefile`, `openocd.cfg`, `startup.s` vom 31.08., `main.c` vom 02.09.) stammen **nicht** aus dem Seed — die Namen existieren im Seed-Baum überhaupt nicht — sondern sind eigene Arbeit. |
| **Getrennter Befund, an den Operator** | Dieses Wurzelverzeichnis steht **unter keiner Versionsverwaltung** (`git status` dort: „not a git repository") und hat keine Sicherung. Darin liegt inhaltliche Arbeit — STM32F429ZI-GPIO-Inbetriebnahme mit einer Notiz zur Board-Familien-Korrektur — plus ein Übersetzungsstand und ein Tutor-Sitzungsprotokoll ab dem 31.08. Solange nur Behälter neu erzeugt werden, überlebt das im benannten Datenträger; ein Wischen des Datenträgers wäre unwiederbringlich. |
| **Stand** | Sofortmaßnahme auf dem Services-Host durchgeführt und geprüft. Dauerhafte Lösung in `5933d3f` (`refresh_tooling()`), wirkt ab dem nächsten Abbild. |

### PB-09 - Ein Prozess, der sechs Studierende nachahmt, ist nicht sechs Studierende

| | |
|---|---|
| **Anlass** | Die Erfassung fuer PB-06 (welchen Text sieht eine abgewiesene Anfrage?) liess sich dreimal nicht ausloesen, obwohl der Relay-Betreuer die Schwelle eigens gesenkt und die Ablehnung auf seiner Seite verifiziert hatte. |
| **Messung** | Drei Durchlaeufe mit je sechs gleichzeitigen, realistisch langen Anfragen: jedes Mal 6 von 6 zugelassen, 0 abgewiesen. Fertigstellungsabstaende in allen drei Durchlaeufen rund 1,4 s (z.B. 1856, 3225, 4665, 5998, 7372, 8768 ms). Der Relay selbst erreichte mit sechs echt parallelen Anfragen 1x200 und 5x429. |
| **Was daraus folgt** | Die Zulassungskontrolle schaetzt die Wartezeit als Warteschlangentiefe mal `AVG_REQUEST_S` (7 s) und weist bei `MAX_WAIT_S=3` alles ab, was eintrifft, waehrend etwas anderes laeuft. Dass **alle** unsere Anfragen zugelassen wurden, heisst also: Die Tiefe war jedes Mal null, unsere sechs Anfragen kamen **einzeln nacheinander** an. Der Abstand von 1,4 s ist genau die Bedienzeit. Die Serialisierung liegt zwischen unserem Prozess und dem Socket der Gegenseite, also in derselben ungeklaerten Zone wie die Verbindungsgrenze aus PB-07. Ein Phaenomen, nicht zwei. |
| **Der Denkfehler, der wichtiger ist als die Messung** | Sechs Studierende sind sechs Behaelter auf sechs Netzpfaden. Unser Test war **ein** Prozess, der sechs Studierende nachahmt - und wir haben jetzt gemessen, dass die Nachahmung nicht traegt. Ein nicht reproduzierter Ueberlastfall aus einem Sandkasten sagt daher wenig ueber einen Hoersaal. Drei Prozesse auf demselben Rechner halfen auch nicht (6 von 24), die Grenze verlaeuft also nicht am Prozess. |
| **Naechster Schritt** | Derselbe Test **aus einem Behaelter auf dem Laborrechner** - der Pfad, den auch die Anfrage eines Studierenden nimmt. Er beantwortet beide offenen Fragen auf einmal: die Reichweite der Verbindungsgrenze (PB-07) und ob die PB-06-Erfassung ueberhaupt herstellbar ist. Erst mit einem Nachweis echter Gleichzeitigkeit wird ein weiteres Messfenster beim Relay erbeten, nicht vorher. |
| **Stand** | PB-06 bleibt unerfasst - nicht als Nullergebnis, sondern als Befund: **Diese Umgebung kann den Fall nicht erzeugen.** Das Messfenster wurde zurueckgegeben, die produktiven Werte sind wiederhergestellt. |
| **Kennzahl mit Verfallsdatum** | Unsere 5,1 s je Anfrage waren veraltet; aktuell sind es rund 1,4 s seriell. Aus der alten Zahl haben Relay-Betreuer und ich **dieselbe** falsche Vorhersage abgeleitet. Eine Rate ohne Messzeitpunkt und Messbedingung gehoert nicht mehr zitiert. |

### PB-10 - Die Einengung: es liegt am Pfad zum Sprachmodell, an nichts sonst

| | |
|---|---|
| **Messung (08.09.2026, aus einem Behaelter auf dem Laborrechner, je n=10, drei Wiederholungen)** | Ziel **llm2** (Ausgang, Tunnel): 6/10, dann 0/10, 0/10 - **verschlechtert sich ueber die Wiederholungen**, alle Fehlschlaege `UND_ERR_SOCKET`. Ziel **firmware-lab** (Ausgang, andere Unteradresse, dieselbe Tunnel-Infrastruktur): 10/10, 10/10, 10/10. Ziel **eigener Behaelter ueber Loopback** (kein Ausgang): 10/10, 10/10, 10/10. Wirtslast waehrenddessen stabil (4,0 / 3,7 / 4,0). |
| **Damit ausgeschlossen** | Wirtsausgang (Ziel 2 laeuft sauber), Behaelter- und Namensschicht (Ziel 3 sauber), Tunnel-Infrastruktur im Allgemeinen (Ziel 2 nutzt sie). Der Tunnel-Betreuer hatte zuvor seine Kappungszaehler geprueft: 8192/4096 konfiguriert, **null** verworfene Verbindungen in 26 Stunden. |
| **Meine DNS-Hypothese ist widerlegt** | Sie erklaerte alle Beobachtungen und war trotzdem falsch. Der Test: Name im Wegwerf-Behaelter fest auf die Adresse gelegt, identische Messung. Ergebnis **schlechter** statt sauber (n=10: 6/10, 2/10, 2/10; n=6: 3/6, 1/6, 1/6). Eine Hypothese, die zu allen Daten passt, ist damit noch nicht wahr - sie war billig zu pruefen, und genau deshalb wurde sie zuerst geprueft. |
| **Was bleibt** | Etwas auf dem **spezifischen Pfad zum Sprachmodell**: die Tunnelstrecke dieses einen Hostnamens oder die Gegenstelle selbst unter echter Gleichzeitigkeit. Dass es sich ueber Wiederholungen verschlechtert (6/10 dann zweimal 0/10) deutet auf etwas Erschoepfbares, das sich nicht schnell erholt. Einzelabfragen der Gegenseite zeigen das nicht - ihre eigenen Tests waren 10/10. |
| **Offene Frage an die Architektur** | Auf dem Laborrechner laeuft ausweislich der Behaelterliste unter anderem ein `litellm-proxy`. Falls die Gegenstelle **auf demselben Rechner** liegt, geht die Anfrage eines Studierenden aus dem Behaelter hinaus durch einen Tunnel und wieder auf denselben Rechner zurueck. Ein direkter lokaler Weg wuerde die gesamte strittige Strecke ueberspringen. Zu klaeren, nicht zu behaupten. |
| **Schweregrad** | blockiert (fuer den Kursbetrieb mit mehreren Gleichzeitigen) |
| **Stand** | Messung abgeschlossen und uebergeben: Tunnel-Betreuer fuer die Sicht der Gegenstelle auf diese eine Strecke, Relay-Betreuer fuer Verbindungsgrenzen an seinem Anschluss. Von unserer Seite ist nichts mehr zu messen. |
