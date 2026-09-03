# Auswertungsregeln des Lehrenden-Portals

Diese Datei beschreibt **jede** Regel, die das Portal auf Telemetriedaten anwendet: was gerechnet wird,
mit welchem Schwellwert, warum dieser Schwellwert, und – am wichtigsten – **was ein Ergebnis nicht
beweist**. Die Schwellwerte stehen als Vorgabe in `analytics.py` (`DEFAULT_THRESHOLDS`) und lassen sich
in `portal.json` unter `thresholds` überschreiben. Die Seite **Regeln** im Portal zeigt immer die
tatsächlich wirksamen Werte an; diese Datei erklärt sie.

Alle Berechnungen sind deterministisch: dieselben Ereignisse ergeben dieselben Zahlen. Es ist kein
Sprachmodell beteiligt, keine Zufallszahl, kein Lernverfahren, das sich über die Zeit verändert.

---

## 0. Grundsatz: Was ein Flag NICHT beweist

Ein Flag ist ein Hinweis auf ein **Muster in Ereignisdaten**. Es ist kein Nachweis und keine Note.

* **„Betrugsverdacht" beweist keine Täuschung.** Ein hoher Paste-Anteil entsteht auch, wenn jemand
  ein Codegerüst aus dem Kursmaterial übernimmt, wie es die Aufgabe verlangt. Eine kurze Bearbeitungszeit
  entsteht auch durch Vorwissen aus einem früheren Studium oder Beruf. Identische Reflexionstexte
  entstehen auch, wenn zwei Personen erlaubt zusammengearbeitet und ihr Ergebnis gemeinsam formuliert haben.
* **„Tut sich schwer" beweist keine mangelnde Eignung.** Lange Zeiten entstehen auch durch Pausen am
  offenen Editor, durch eine defekte Hardware am Arbeitsplatz oder durch eine Sprachbarriere im Material.
* **„Sehr gut" beweist keine besondere Leistung.** Die Regel ist im Kern ein Perzentil: Sie findet die
  obere Gruppe *dieser* Kohorte. In einer schwachen oder sehr kleinen Kohorte ist das wenig aussagekräftig
  (siehe Abschnitt 7).
* **„Abgebrochen?" beweist keinen Abbruch.** Wer krank war, im Praktikum steckte oder offline gearbeitet
  hat, sieht in den Daten genauso aus.

Deshalb: **Vor jeder Konsequenz steht das Gespräch mit der studierenden Person.** Das Portal nennt zu
jedem Flag die konkreten Belege (Step, Zeit, Zahlen), damit dieses Gespräch auf Fakten und nicht auf
einem farbigen Etikett beruht. Die Belege sind zum Vorzeigen gedacht, nicht zum Verstecken.

Wer nur eine Zahl aus dem Portal in eine Prüfungsentscheidung übernimmt, benutzt es falsch.

---

## 1. Datengrundlage

Ein Ereignis (`events.py`, Schema `v: 1`) hat Zeitstempel, Pseudonym, Kurs, Modul, Step, Typ und ein
`data`-Objekt. Studierende erscheinen ausschließlich als `slug` = `sha256(lower(E-Mail))[:12]`, dasselbe
Pseudonym wie im Broker. Vor dem Speichern werden Freitexte bereinigt: E-Mail-Adressen werden zu
`[email]`, URLs mit eingebetteten Zugangsdaten zu `[url]`, Token-Query-Parameter zu `[redacted]`, und
jeder Text wird auf 2000 Zeichen gekürzt.

Ein Ereignis wird genau einmal gespeichert. Der Idempotenzschlüssel ist
`(student, ts, type, step, attempt)` (so in SPEC A5 festgelegt). Er enthält **nicht** den Kurs: zwei
Ereignisse, die sich nur im Kurs unterscheiden, aber in Pseudonym, Sekunde, Typ, Step-ID und Versuch
übereinstimmen, gelten als dasselbe Ereignis. In echten Kursen sind Step-IDs kursspezifisch, sodass
dieser Fall nicht auftritt.

Fehlende Ereignisse verzerren jede Auswertung. Wenn ein Container ohne
`CADS_TUTOR_TELEMETRY_URL` läuft oder das Portal offline war, fehlen Daten, und die Auswertung sagt
dann nichts über die Person, sondern über die Erfassung.

---

## 2. Fragen-Cluster

**Was:** Alle `question.asked`-Ereignisse werden zu Clustern zusammengefasst, damit „diese eine Frage
kam 23-mal" sichtbar wird.

**Wie:** Der Text wird normalisiert (Kleinschreibung, `ß`→`ss`, Interpunktion weg, deutsche und englische
Stoppwörter entfernt). Gleich normalisierte Texte bilden eine Gruppe. Gruppen werden – häufigste zuerst –
zu einem Cluster verschmolzen, wenn die **Token-Jaccard-Ähnlichkeit** zum Cluster mindestens
`questionJaccard` beträgt.

| Schwellwert | Vorgabe | Begründung |
|---|---|---|
| `questionJaccard` | `0.6` | Aus SPEC A5. Bei 0,6 verschmelzen „Warum ist der Borrow-Checker so streng?" und „Wieso ist der Borrow-Checker streng?", während thematisch andere Fragen getrennt bleiben. |

Als Repräsentant zeigt das Portal die **häufigste Originalformulierung**, nicht den normalisierten Text.
Die Reihenfolge ist unabhängig von der Eingabereihenfolge.

**Grenzen:** Jaccard kennt keine Bedeutung. Zwei Fragen mit denselben Wörtern und gegenteiliger Aussage
landen im selben Cluster; dieselbe Frage auf Deutsch und Englisch landet in zwei Clustern.

**Ungrounded-Quote:** Anteil der Fragen mit `grounded: false`, also solcher, die der Tutor nicht aus dem
Kursmaterial beantworten konnte. Eine hohe Quote an einer Stelle ist ein Hinweis auf eine **Lücke im
Material**, nicht auf schwache Studierende.

---

## 3. Schwierige Stellen (je Step)

| Kennzahl | Definition |
|---|---|
| Fehlschlag beim ersten Versuch | Anteil der Studierenden mit Checks, deren erster Check-Ausgang `check.fail` war |
| Ø Versuche | Mittelwert der Versuche bis zum Bestehen (ohne Bestehen: alle Versuche) |
| Hinweise T1/T2/T3 | Summe der gezeigten Hinweise je Tier |
| Median-Zeit bis bestanden | Median von `check.pass` − `step.open`, nur bestandene Steps |
| Abbruchquote | Anteil der Studierenden, die den Step geöffnet, aber nie `step.done` erreicht haben |

**Schwierigkeits-Score** zum Sortieren:

```
0.4 · Fehlschlagquote(1. Versuch)
+ 0.2 · min(1, (Ø Versuche − 1) / 4)
+ 0.2 · Anteil Tier-3 an allen Hinweisen
+ 0.2 · Abbruchquote
```

Die Gewichte sind eine **Setzung**, keine Messung: Der erste Versuch wiegt am schwersten, weil er am
direktesten zeigt, ob das Material auf die Aufgabe vorbereitet hat. Wer andere Gewichte für richtig
hält, ändert `difficulty_score` in `analytics.py`; die Tests dokumentieren das erwartete Verhalten.

Ein hoher Score heißt **nicht**, dass ein Step schlecht ist. Ein bewusst schwerer Step am Ende eines
Moduls soll schwer sein. Der Score zeigt, wo man hinschauen sollte.

---

## 4. Kennzahlen je Studierendem und z-Werte

Je Person und Kurs: geöffnete und abgeschlossene Steps, Fortschritt, Erstversuch-Quote, mittlere
Versuche, Hinweise je Step (und Tier-3 je Step), Median-Step-Zeit, Fragen je Step, Ungrounded-Fragen,
Abbrüche, getippte gegen eingefügte Zeichen, Vorhersagen, Antworten nach Urteil, Reflexionen, Sessions.

Für fünf davon (`first_pass_rate`, `mean_attempts`, `hints_per_step`, `median_step_time_s`,
`question_rate`) rechnet das Portal **z-Werte gegen die Kohorte**: `(Wert − Mittelwert) / Standardabweichung`.
z = 0 ist Kohortenmittel, z = +1 eine Standardabweichung darüber. Bei Standardabweichung 0 ist z = 0.

z-Werte sind **relativ**. In einer Kohorte, in der alle viel Zeit brauchen, hat niemand ein hohes z für
Zeit. Das ist beabsichtigt (der Vergleich ist die Kohorte), aber es heißt auch: z-Werte aus zwei Kursen
sind nicht vergleichbar.

---

## 5. Flags

Jedes Flag trägt **Begründungen** mit Belegen (`reasons`), jede Begründung ist `strong` oder `weak`.
Das Portal zeigt beides an; nichts wird zusammengefasst, ohne die Zahl dazu zu nennen.

### 5.1 „Sehr gut" (`excellent`)

Alle Bedingungen zusammen:

| Bedingung | Vorgabe | Begründung |
|---|---|---|
| Erstversuch-Quote ≥ Kohorten-Perzentil | `firstPassPercentile: 90` | Aus SPEC A5: obere 10 %. |
| Erstversuch-Quote ≥ absolute Untergrenze | `firstPassFloor: 0.85` | Ohne Untergrenze bekäme in einer schwachen Kohorte die beste Person das Etikett „sehr gut", obwohl die Leistung es nicht trägt. |
| Hinweise je Step ≤ Kohorten-Perzentil | `hintPercentileMax: 50` | Wer die Aufgaben mit wenig Hilfe löst. |
| Median-Step-Zeit ≥ | `minMedianStepSeconds: 90` | Plausibilität: unter anderthalb Minuten je Step ist keine Bearbeitung, sondern ein Durchklicken. |
| Steps mit Checks ≥ | `minStepsWithChecks: 5` | Aus fünf Checks lässt sich ein Trend ablesen, aus dreien nicht. |
| kein starker Betrugsbeleg | – | Wer sehr schnell und mit hohem Paste-Anteil besteht, ist nicht „sehr gut", sondern auffällig. |

### 5.2 „Tut sich schwer" (`struggling`)

Mindestens `minIndicators: 2` der folgenden Indikatoren, und mindestens `minStepsWithChecks: 5`
Steps mit Checks:

| Indikator | Vorgabe |
|---|---|
| Erstversuch-Quote ≤ 10. Perzentil **oder** ≤ absolute Grenze | `firstPassPercentile: 10`, `firstPassFloor: 0.4` |
| Tier-3-Hinweise je Step ≥ | `tier3PerStep: 0.25` |
| z-Wert der Median-Step-Zeit ≥ | `timeZ: 1.0` |
| Abbruchquote ≥ **und** Anzahl Abbrüche ≥ | `abandonRate: 0.3`, `abandonMin: 2` |

Zwei Indikatoren statt einem, weil jeder einzelne eine harmlose Erklärung hat: Ein einzelner langer Step
ist eine Kaffeepause, zwei zusammentreffende Signale sind ein Muster. Die **absolute** Untergrenze steht
neben dem Perzentil, damit in einer starken Kohorte niemand übersehen wird, nur weil alle anderen noch
besser sind.

### 5.3 „Betrugsverdacht" (`cheat`) und „Prüfen" (`review`)

**Starke** Belege – einer genügt für `cheat`:

1. **Schnell bestanden mit hohem Paste-Anteil.** Ein Check besteht **ohne vorherigen Fehlschlag**,
   die Zeit von `step.open` bis `check.pass` liegt unter `fastPassSeconds: 60`, und der Paste-Anteil
   dieses Steps liegt über `pasteShare: 0.8`. Alle drei Bedingungen zusammen; einzeln ist jede harmlos.
   Der Paste-Anteil kommt aus `edit.metrics` (Einfügungen > 200 Zeichen zählen als Paste).
2. **Identische Freitexte.** Zwei Personen geben im selben Step und derselben Ereignisart einen Text mit
   Token-Jaccard ≥ `textJaccard: 0.9` ab, bei mindestens `textMinTokens: 8` Tokens. Das Portal nennt beide
   Pseudonyme und wer zuerst abgegeben hat. Die Mindestlänge verhindert, dass „ja, verstanden" als
   Übereinstimmung zählt.
3. **Vorhersage gleich der Ausgabe, nachträglich geändert.** Eine `predict.compared`-Vorhersage stimmt
   **exakt** mit der Ausgabe überein, und die Vorhersage wurde erst **nach** dem ersten Lauf geschrieben.
   Eine richtige Vorhersage vor dem Lauf ist das Gegenteil davon und wird nicht angezeigt.

**Schwacher** Beleg – führt allein nur zu `review` („Prüfen"):

4. **Aktivität außerhalb einer Session.** Mindestens `outsideSessionMin: 3` Ereignisse liegen außerhalb
   jedes `session.start`/`session.end`-Fensters (mit `outsideSessionGraceSeconds: 120` Toleranz).
   Das ist schwach, weil abgestürzte Sessions und fehlende `session.end` dasselbe Bild erzeugen.
   Wer keine Session-Ereignisse sendet, wird hier gar nicht bewertet.

Ein `review` ist ausdrücklich **kein** Betrugsverdacht. Es heißt: hier ist etwas ungewöhnlich, das
sich mit einem Blick klären lässt.

### 5.4 „Abgebrochen?" (`dropped`)

Fortschritt < 100 %, mindestens `minStepsOpened: 1` Step geöffnet und seit `inactiveDays: 14` Tagen kein
Ereignis. Das Fragezeichen im Namen ist Absicht: Semesterferien, Krankheit und Praktika sehen genauso aus.

---

## 6. Mastery, Bloom und Empfehlung

**Mastery je Lernziel** (0…1) aus drei Quellen, gewichtet (`mastery.weights`):

| Quelle | Gewicht | Punktwert |
|---|---|---|
| Checks | `0.5` | bestanden: `max(0.4, 1 − 0.15·(Versuche−1))`; nicht bestanden: `0.1` |
| Beantwortete Fragen / Recall | `0.3` | `pass` = 1,0 · `weak` = 0,5 · `fail` = 0,0 |
| Vorhersagen | `0.2` | dieselbe Skala |

Ein Lernziel ohne Belege bleibt leer (`null`) und wird **nicht** als 0 dargestellt: keine Daten ist nicht
dasselbe wie keine Beherrschung. Die Anzahl der Belege steht neben jedem Wert, weil ein Wert aus einem
einzigen Check nichts wert ist.

**Bloom-Abdeckung**: je Bloom-Stufe die Anzahl der Steps im Kurs, die davon abgeschlossenen und die
bestandenen. Die Stufe kommt aus dem Front-Matter des Steps.

**Empfehlung**: regelbasierte Sätze aus den Flags und den Kennzahlen (Sprechstunde anbieten, Material
ergänzen, Vorhersagen üben, Kontakt aufnehmen …). Kein Sprachmodell, keine Note, keine Automatik –
Vorschläge für die Lehrperson, die entscheidet.

---

## 7. Grenzen der Verfahren

* **Kohortengröße.** Perzentil-Flags brauchen eine Kohorte. Der Simulator erreicht bei 40 Studierenden
  je Kurs alle Zielwerte über zwölf geprüfte Seeds; bei 20 Studierenden je Kurs verfehlt er in zwei von
  fünf Seeds ein Ziel. Unter etwa 20 Personen sind „sehr gut" und „tut sich schwer" nicht belastbar.
* **Kurslänge.** Erstversuch-Quoten aus wenigen Checks sind grob gerastert; bei fünf Checks ist der
  Unterschied zwischen 80 % und 100 % ein einziger Versuch. Deshalb `minStepsWithChecks`.
* **Zeitmessung.** „Zeit bis bestanden" ist Wanduhrzeit zwischen zwei Ereignissen. Pausen, Abstürze und
  parallele Arbeit sind nicht unterscheidbar. Deshalb Median statt Mittelwert und deshalb die
  Plausibilitätsuntergrenze bei „sehr gut".
* **Paste-Anteil.** `edit.metrics` misst Zeichen, nicht Herkunft. Zwischen „aus dem Kursmaterial kopiert"
  und „von woanders kopiert" kann das Portal nicht unterscheiden.
* **Unvollständige Daten.** Alles hier setzt voraus, dass die Ereignisse vollständig ankommen.

---

## 8. Nachweise (Organisations-Board)

Kriterien je Kurs (`credit` in `portal.json`, überschreibbar je Kurs über `creditPerCourse`):

| Kriterium | Vorgabe |
|---|---|
| Anteil abgeschlossener Steps | `minStepShare: 0.8` |
| Anteil bestandener Checks | `minCheckShare: 0.8` |
| Reflexionen | `minReflections: 2` |
| Projekt (letzter Step des Kurses) | `requireProject: true` |

Status: **offen** → **erreicht** (alle Kriterien erfüllt, automatisch) → **bestätigt** (Lehrenden-Sign-off).
Nur der Sign-off ist eine Entscheidung; „erreicht" ist eine Rechnung. Der Sign-off speichert die
**E-Mail der Lehrperson**, den Zeitstempel und eine Notiz – Lehrende werden hier bewusst nicht
pseudonymisiert, weil eine Prüfungsentscheidung zurechenbar sein muss. Ein Sign-off kann jederzeit
zurückgenommen werden; der Export (CSV/JSON) enthält beides.
