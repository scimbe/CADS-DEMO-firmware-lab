# Lastversuch, 08.09.2026 — Rohdaten

Gemessen aus einem Wegwerf-Sandbox-Kontext (nicht der Laborinstanz, nicht der Studierendenumgebung)
gegen den echten llm2-Endpunkt (`llm-34a13a96.bunsenbrenner.org`, Modell `local-devstral-small2`).
Zusammenfassung und Einordnung: Nachricht an Firmware Tutor vom 08.09.2026 (Lastversuch-Bericht),
Bezug PB-07/PB-06 in `docs/research/persona-befunde.md`.

## Dateien

- **`loadtest-results.json`** — erster Durchlauf, 24 Hintergrund- + 2 gestaffelte Anfragen, direkter
  Import des kompilierten `RetryingLlmClient`. Zeigt den Verbindungsdeckel-Artefakt (6/24 admitted,
  18/24 `TypeError: fetch failed`), nicht das eigentliche Relay-Verhalten — der erste Hinweis auf den
  Deckel, noch mit dem Spielzeug-Prompt „Reply with the single word: ok".

- **`loadtest-sustained-toyprompt-results.json`** — 90 s, 6 gleichzeitige Werker, derselbe
  Spielzeug-Prompt. **Absichtlich als Gegenbeispiel aufbewahrt, nicht gelöscht**: 1142/1142
  angenommen, 0 abgelehnt, Dauer 308–4086 ms (Schnitt 475 ms) — gleichförmig billig und nicht
  repräsentativ für echte Rückseitenlast. Ein Bericht, der diese Zahl als „Warteschlange nie voll"
  weitergegeben hätte, wäre falsch gewesen; siehe Lastversuch-Bericht.

- **`loadtest-sustained-realistic-results.json`** — derselbe Aufbau (90 s, 6 gleichzeitige Werker),
  diesmal mit einem vollständigen, `gradeAnswer`-förmigen Prompt (Rubrik, Referenzauszüge,
  Studierendenantwort — siehe `REALISTIC_PROMPT` im Skript, das die Datei erzeugt hat). 70/70
  angenommen, 0 abgelehnt, Dauer 1872–11171 ms (Schnitt 8065 ms) — echte Rückseitenlast, deckt sich
  mit dem von llm2 genannten ~5,1-s-Wert je Anfrage.

- **`multiproc-check.js`** — das Werkzeug, nicht die Daten: billiger `GET /models`-Test (kein
  Modellaufruf, keine Token-Kosten), 8 gleichzeitige Anfragen je Prozessaufruf. Als drei getrennte
  Node-Prozesse gleichzeitig gefahren ergab das 3/8, 3/8, 0/8 = **6/24 insgesamt** — nicht ~18/24 —
  und belegt damit, dass der Verbindungsdeckel (~6 gleichzeitige Verbindungen zum llm2-Endpunkt)
  **hostweit** gilt, nicht je Prozess. Die reine Konsolenausgabe dieses Laufs wurde nicht gesondert
  gespeichert; die Zahlen stehen im Lastversuch-Bericht.

## Was diese Daten nicht zeigen

Keine der drei Anfrage-Dateien enthält je einen `queue_full`-Fall: Weder der Spielzeug- noch der
realistische Dauerlauf erreichte je eine Ablehnung, weil sechs Dauerwerker strukturell nie mehr als
sechs gleichzeitige Anfragen offen halten können — unabhängig von der Laufzeit. PB-06s Erfassung des
tatsächlich gerenderten Panel-Texts bei einer echten Ablehnung ist deshalb weiterhin offen.

## Offene Frage, die diese Daten nicht beantworten

Ob der ~6er-Verbindungsdeckel im Agenten-Sandbox liegt oder auf dem Netzwerkpfad, den ein
Studierenden-Container tatsächlich nutzt. Der nächste Schritt (in Arbeit) wiederholt den billigen
`GET /models`-Test aus einem Wegwerf-`tutor-lab`-Container auf dem Laborhost statt aus dieser Sandbox.
