# Arbeitsregeln für dieses Repository

Verbindlich für alle Stränge. Kurz halten: hier steht nur, was sonst jemand schmerzhaft neu lernt.
Fachliches gehört in `docs/SPEC.md`, Befunde in `docs/*-NOTES.md` und `docs/research/`.

## Systemhygiene: fremde Prozesse

Auf den Entwicklungsrechnern laufen **fremde produktive Prozesse** neben unseren Tests — cloudflared-Tunnel,
Container anderer Projekte, MCP-Server, die sich mehrere Stränge teilen. Ein Mustertreffer ist keine
Zielauswahl.

- **Eigene Hintergrundprozesse über die PID beenden, die beim Starten notiert wurde** — nie über den
  Binärnamen. Das gilt für `node`, `caddy`, `cloudflared`, `python` und jeden anderen Namen, den auch
  etwas Produktives trägt.
- **`pkill -9` auf einen Namen gar nicht.** Wenn ein `pkill -f` unvermeidlich scheint, vorher
  `pgrep -fl <muster>` ansehen und prüfen, was sonst noch trifft.
- Dasselbe für Container und Volumes: `docker rm`/`docker volume rm` nur mit vollständigem, selbst
  vergebenem Namen, nie über `--filter` oder Präfixe.

**Anlass (2026-09-06, Strang copilot):** Ein `pkill -9 -f cloudflared` zum Aufräumen eines eigenen
Wegwerf-Tunnels hätte den produktiven ct-agent-Tunnel getroffen, über den die Laborinstanz erreichbar
ist. Er hat überlebt — zufällig, nicht durch Sorgfalt. Belege: `docs/research/copilot-machbarkeit.md`,
Abschnitt „Messumgebung und Hygiene".

## Aufräumen gehört zur Messung

Was eine Messung startet, räumt sie auch ab, und der Bericht sagt womit geprüft wurde
(`docker ps -a`, `docker volume ls`, `lsof`, ein Abruf der Adresse). Eine Messung ohne Abbau ist nicht
fertig, sondern liegen gelassen.

## Nicht gegen laufende Instanzen messen

Für Messungen einen Wegwerf-Aufbau nehmen, nicht die Laborinstanz. Wo ein öffentlicher Ursprung
gebraucht wird, reicht ein kurzlebiger eigener Tunnel auf eine Wegwerf-Seite — und exponiert wird nur
diese Seite, nie code-server.

## Eingebettete Client-Skripte werden geparst, nicht nur typgeprüft

`webview.ts` erzeugt das Panel-HTML als Zeichenkette; der `<script>`-Rumpf darin ist für `tsc` nur Text.
Ein regulärer Ausdruck oder ein Fluchtzeichen in diesem Text wird beim Übersetzen der **äußeren**
Zeichenkette verbraucht: `\/` und `\w` sind keine gültigen String-Escapes, der Rückstrich fällt
stillschweigend weg, und der Browser bekommt ungültiges JavaScript. Ein einziger Syntaxfehler bricht die
gesamte Datei ab, bevor irgendein Ereignisbehandler registriert wird — das Panel rendert, aber **keine
Schaltfläche reagiert mehr**, und der Container meldet nichts.

- Jede Änderung am eingebetteten Client-Skript wird vor dem Commit **zu statischem HTML gerendert und der
  `<script>`-Inhalt mit `new Function()` geparst**. `npm test` und `tsc` prüfen nur die TypeScript-Seite.
- Im Skriptrumpf jedes Fluchtzeichen doppeln (`\\/`, `\\w`, `\\d`, `\\s`) oder den regulären Ausdruck über
  `new RegExp('…')` bilden.
- Der Regressionstest dafür steht in `extensions/cads-tutor/test/` und muss bestehen bleiben.

**Anlass (2026-09-07, Commit 429c2f9, behoben in 529d733):** Der Operator meldete „alle Schaltflächen
tot" in M0.2. Ursache war genau dieser Fall in der Client-Kopie von `renderCitations`. Kein Test hatte je
geprüft, ob das ausgelieferte Skript überhaupt gültiges JavaScript ist.
