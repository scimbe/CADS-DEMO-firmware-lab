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
| **Fixrichtung** | Geklärt: In der Tutor-Erweiterung gibt es keinen eigenen Stop-Befehl — `debugStop` ist dort ein *Prüftyp*, der auf das Anhalten wartet, keine Schaltfläche. „Stop" ist also die VS-Code-eigene Schaltfläche, ihr Verhalten nicht unseres. Damit muss der Kurstext in beiden Sprachen „Weiterlaufen lassen" ausdrücklich nennen, und `debug-after-stop.png` wird neu aufgenommen. |

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
