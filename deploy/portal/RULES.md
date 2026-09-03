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

Ein Flag ist ein Hinweis auf ein **Muster in Ereignisdaten**. Es ist kein Nachweis, keine Note und
**niemals allein die Grundlage einer Bewertung**.

**Kein Flag behauptet eine Täuschung.** Es gibt in diesem Portal keine Kategorie „Betrug". Das stärkste
integritätsbezogene Signal heißt „Auffällig – Rückfrage empfohlen" – und genau das ist es:
ein Anlass, nachzufragen. Zu jeder einzelnen Begründung zeigt die Oberfläche die **Gegenhypothese**, also
die harmlose Erklärung desselben Musters, gleichberechtigt daneben.

* **„Auffälligkeit" rechtfertigt eine Frage, kein Urteil.** Ein hoher Paste-Anteil entsteht auch, wenn
  jemand ein Codegerüst aus dem Kursmaterial übernimmt – was dieser Kurs ausdrücklich anbietet
  (Abschnitt 5.3). Eine kurze Bearbeitungszeit entsteht auch durch Vorwissen. Identische Texte entstehen
  auch durch erlaubte Zusammenarbeit oder durch eine Aufgabe, die kaum andere Formulierungen zulässt.
* **„Kriterien noch nicht erreicht" beweist keine mangelnde Eignung.** Lange Zeiten entstehen auch durch
  Pausen am offenen Editor, defekte Hardware am Arbeitsplatz oder eine Sprachbarriere im Material.
* **„Kriterien sicher erfüllt" beweist kein tiefes Verständnis.** Schnelle, hinweisfreie Checks können
  auch Vorwissen aus einem früheren Studium abbilden.
* **„Längere Zeit ohne Aktivität" beweist keinen Abbruch.** Krankheit, Praktikum, eine Prüfungsphase in
  anderen Fächern oder Arbeit ohne Telemetrie sehen in den Daten identisch aus.

Deshalb: **Vor jeder Konsequenz steht das Gespräch mit der studierenden Person.** Das Portal nennt zu jedem
Flag die konkreten Belege (Step, Zeit, Zahlen) und die Gegenhypothese, damit dieses Gespräch auf Fakten und
auf beiden Lesarten beruht. Wer eine Zahl aus dem Portal in eine Prüfungsentscheidung übernimmt, benutzt es
falsch.

---

## 0a. Drei methodische Einwände und was aus ihnen folgt

Diese drei Punkte stammen aus einem fachlichen Review und haben das Regelwerk verändert. Sie stehen hier,
weil die Regeln ohne ihre Begründung wieder aufweichen würden.

### (1) Der Paste-Anteil ist als Betrugsindikator unbrauchbar, solange das System selbst Code ausgibt

**Einwand.** Die Hinweisstufe 3 enthält faktisch die Lösungszeile. Wer sie kopiert, verhält sich
system-konform. Ein Indikator, der genau dieses Verhalten misst, misst die Befolgung der Kursmechanik, nicht
die Redlichkeit.

**Befund im eigenen Material.** In `cads-zero-foundations` steht in **41 von 41 Steps** die Antwort im
Kursmaterial: entweder als `rubric:` im Step-Front-Matter oder als dritte Stufe einer Hinweisleiter, die die
Lösung ausspricht (`coursemeta.solution_in_material`).

**Konsequenz (umgesetzt).** Der Paste-Anteil löst **niemals allein** ein Flag aus. Er zählt nur, wenn
*nachweislich kein Hinweis der Stufe 2 oder 3 gezeigt wurde* **und** der Steptext die Lösung nicht nennt –
und selbst dann nur als **schwaches** Signal, das erst zusammen mit einem weiteren Signal zu einer Rückfrage
führt. Zu jedem Paste-Ereignis wird gespeichert, welche Hinweisstufe vorher auf dem Bildschirm stand
(`step_record.hint_tier_before_pass`). In einem Kurs wie diesem feuert das Signal daher praktisch nie – das
ist das gewünschte Ergebnis, nicht ein Fehler.

### (2) Der Ähnlichkeitstest ist unbrauchbar, solange die Rubrik-Antwort im Steptext steht

**Einwand.** Wenn die Musterantwort im Step steht, zitieren gerade die gewissenhaften Studierenden dieselbe
Quelle. Ein absoluter Ähnlichkeitsschwellwert bestraft dann Sorgfalt. (Im Review mit rund 72 % Token-Überlappung
zum Steptext im Median beziffert.)

**Konsequenz (umgesetzt).** Gewertet wird nicht die Ähnlichkeit, sondern der **Überschuss** über die
Ähnlichkeit zum Steptext selbst: `Ähnlichkeit(Paar) − max(Ähnlichkeit(A, Steptext), Ähnlichkeit(B, Steptext))`
muss mindestens `textMargin` betragen. Als Steptext gelten die Rubriken **und** der Fließtext des Steps
(`coursemeta.reference_text`). Verglichen werden außerdem nur Antwortarten, die **eigene Formulierung
verlangen** (`textTypes`, Vorgabe: `reflection.written`) – Antworten auf eine Rubrikfrage sind ausdrücklich
ausgenommen.

### (3) Quantils-Flags sind normbezogen, der Rest des Systems ist kriteriumsbezogen

**Einwand.** „Obere/untere 10 Prozent" bewertet gegen die Kohorte statt gegen das Lernziel. In einer starken
Kohorte wird jemand auffällig, der das Ziel erreicht; in einer schwachen wird jemand „sehr gut", der es nicht
erreicht. In kleinen Kohorten ist beides Rauschen.

**Konsequenz (umgesetzt).** Alle Flags hängen jetzt an **absoluten, begründeten Kriterien**: Anteil der beim
ersten Versuch bestandenen Checks, Hinweise je Step, Anzahl Steps ohne Fortschritt trotz mehrfacher Versuche,
Abbrüche, plausible Bearbeitungszeit. Perzentile und z-Werte erscheinen weiterhin, aber ausschließlich als
**ergänzende, als „normbezogen" gekennzeichnete Hinweise** (`notes`, Feld `kind: "norm"`); sie entscheiden
nie, ob ein Flag gesetzt wird. Ein Unit-Test hält das fest: dieselbe studierende Person bekommt in einer
starken und in einer schwachen Kohorte dieselben Flags.

Die Namen folgen dem: „Kriterien sicher erfüllt" statt „sehr gut", „Kriterien noch nicht erreicht" statt
„tut sich schwer".

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

z-Werte sind **relativ** und deshalb ausdrücklich **kein Kriterium**. In einer Kohorte, in der alle viel Zeit
brauchen, hat niemand ein hohes z für Zeit; in einer starken Kohorte bekommt jemand ein hohes z, der das
Lernziel längst erreicht. Sie stehen in der Oberfläche als normbezogene Zusatzinformation (Seite
„Auffälligkeiten"), damit eine Lehrperson die Kohorte einschätzen kann – über Flags entscheiden sie nicht
(Abschnitt 0a.3). z-Werte aus zwei Kursen sind nicht vergleichbar.

---

## 5. Flags

Jedes Flag trägt **Begründungen** mit Belegen (`reasons`) und – wo vorhanden – normbezogene
**Zusatzhinweise** (`notes`). Jede Begründung nennt ihre **Gegenhypothese**. Alle Kriterien sind absolut;
Perzentile und z-Werte entscheiden nichts (Abschnitt 0a.3).

### 5.1 „Kriterien sicher erfüllt" (`excellent`)

| Kriterium | Vorgabe | Begründung |
|---|---|---|
| Erstversuch-Quote ≥ | `firstPassFloor: 0.85` | Absolut, gegen das Lernziel: Wer die Checks überwiegend beim ersten Versuch besteht, hat die Aufgabe verstanden, unabhängig davon, wie die Kohorte abschneidet. |
| Hinweise je Step ≤ | `maxHintsPerStep: 0.35` | Höchstens ein Hinweis auf drei Steps. |
| Median-Step-Zeit ≥ | `minMedianStepSeconds: 90` | Plausibilität: unter anderthalb Minuten je Step ist keine Bearbeitung. |
| Steps mit Checks ≥ | `minStepsWithChecks: 5` | Aus fünf Checks lässt sich ein Trend ablesen, aus dreien nicht. |
| kein starkes Integritätssignal | – | Ein offener Punkt wird nicht mit einem Lob überschrieben. |
| *ergänzend* | `percentileNote: 90` | Perzentil der Kohorte, nur als Notiz. **Zählt nicht.** |

### 5.2 „Kriterien noch nicht erreicht" (`struggling`)

Mindestens `minIndicators: 2` der folgenden **absoluten** Indikatoren, bei mindestens
`minStepsWithChecks: 5` Steps mit Checks:

| Indikator | Vorgabe |
|---|---|
| Erstversuch-Quote ≤ | `firstPassFloor: 0.4` |
| Hinweise der Stufe 3 je Step ≥ | `tier3PerStep: 0.25` |
| Steps mit ≥ 3 Versuchen und ohne Bestehen ≥ | `stuckSteps: 2` |
| Abbruchquote ≥ **und** Anzahl Abbrüche ≥ | `abandonRate: 0.3`, `abandonMin: 2` |

Zwei Indikatoren statt einem, weil jeder einzelne eine harmlose Erklärung hat. Der z-Wert der Step-Zeit
(`timeZNote`) und das untere Perzentil (`percentileNote`) erscheinen als **Notiz**, nicht als Kriterium.

### 5.3 „Auffällig – Rückfrage empfohlen" (`followup`) und „Schwaches Signal" (`notice`)

`followup` entsteht aus **einem starken** Signal **oder** aus `weakForFollowup: 2` schwachen. Ein einzelnes
schwaches Signal ergibt nur `notice` – zur Kenntnis, ohne Handlungsbedarf.

**Starke** Signale:

1. **Freitexte, die einander deutlich ähnlicher sind als dem Steptext.** Paar-Ähnlichkeit ≥
   `textJaccard: 0.9` **und** Überschuss über die Ähnlichkeit zum Steptext ≥ `textMargin: 0.25`, bei
   mindestens `textMinTokens: 8` Tokens, nur für Antwortarten aus `textTypes` (Vorgabe:
   `reflection.written`). Das Portal nennt beide Pseudonyme, die Paar-Ähnlichkeit, die Basisähnlichkeit
   zum Steptext und wer zuerst abgegeben hat. Begründung: Abschnitt 0a.2.
   *Gegenhypothese: erlaubte Zusammenarbeit, gemeinsame Formulierung nach einer Lerngruppe, oder eine
   Aufgabe, die kaum andere Formulierungen zulässt.*
2. **Vorhersage exakt gleich der Ausgabe und erst nach dem Lauf geschrieben.** Eine richtige Vorhersage
   *vor* dem Lauf ist das Gegenteil davon und erscheint nicht.
   *Gegenhypothese: die Vorhersage wurde nachgetragen, weil sie vorher vergessen wurde – der Editor
   erzwingt die Reihenfolge nicht.*

**Schwaches** Signal – es gibt nur noch eines:

3. **Schnell bestanden mit hohem Paste-Anteil.** Check ohne vorherigen Fehlschlag, Zeit unter
   `fastPassSeconds: 60`, Paste-Anteil über `pasteShare: 0.8` – **und** zusätzlich: vorher wurde **kein**
   Hinweis der Stufe 2 oder 3 gezeigt **und** der Steptext nennt die Lösung nicht. Fehlt eine dieser beiden
   Bedingungen, wird das Signal verworfen, nicht abgeschwächt. Begründung: Abschnitt 0a.1.
   *Gegenhypothese: Einfügen ist Übernahme aus einem Hinweis oder dem Kursmaterial, kurze Bearbeitungszeit
   ist Vorwissen, oder die Lösung ist in einem anderen Editor entstanden.*

**Zwei schwache Signale heißt: zwei verschiedene Arten.** Gezählt werden Signal*arten*, nicht
Vorkommen. Zehnmal dieselbe Beobachtung ist dieselbe Beobachtung, keine Bestätigung durch eine zweite,
unabhängige Quelle. Da der Paste-Anteil seit der Streichung in Abschnitt 5.5 die **einzige** verbliebene
schwache Signalart ist, folgt daraus unmittelbar: **Der Paste-Anteil kann allein nie zu einer Rückfrage
führen**, so oft er auch auftritt. Genau das verlangt Abschnitt 0a.1.

### 5.4 „Längere Zeit ohne Aktivität" (`dropped`)

Fortschritt < 100 %, mindestens `minStepsOpened: 1` Step geöffnet und seit `inactiveDays: 14` Tagen kein
Ereignis. Sagt nichts über die Gründe.

### 5.5 Entfernt: Aktivität außerhalb einer Session

Ereignisse außerhalb jedes `session.start`/`session.end`-Fensters galten ursprünglich als schwaches
Signal. **Das Merkmal ist gestrichen** – aus der Bewertung und aus der Anzeige der Auffälligkeiten.

**Grund, gemessen an der Störgruppe (Abschnitt 6a):** Es schlug bei **4 von 4** Mitgliedern einer
nachweislich unbeteiligten Gruppe an, also bei 100 %. Der Grund ist strukturell und nicht durch einen
besseren Schwellwert zu beheben: Eine abgestürzte Sitzung ohne `session.end` hinterlässt exakt dieselbe
Spur wie Arbeit außerhalb der Sitzung. Ein Merkmal ohne Trennschärfe trägt keine Information; es stand nur
in der Oberfläche herum, wo eine Lehrperson es überdeuten kann.

Die zugrunde liegenden Ereignisse werden weiterhin erfasst und in der **Tiefenanalyse** als
**Randnotiz** angezeigt – ausdrücklich als „kein Signal" gekennzeichnet, mit dem Hinweis auf die
abgestürzte Sitzung. Sie helfen dort, eine Lücke im Zeitstrahl zu erklären. In keine Bewertung, keine
Flag-Berechnung und keine Liste von Auffälligkeiten gehen sie ein (`analytics.outside_session_events`
wird von `compute_flags` nicht mehr aufgerufen; die Schwellwerte stehen unter `diagnostics`, nicht unter
`integrity`).

Die Spezifikation A5 nennt dieses Merkmal noch als Betrugsindikator; der Messbefund hat Vorrang, die
Spezifikation wird entsprechend nachgezogen.

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

## 6a. Was die Zahlen des Simulators wert sind – und was nicht

`simulate.py` gibt Precision und Recall der Flags gegen die Personas aus, die die Daten erzeugt
haben. **Diese Zahlen sind kein Gütemaß für die Auswertung.** Sie sind zirkulär: derselbe
Regelsatz, der die Muster sucht, hat sie vorher eingebaut. Ein Recall von 1,00 heißt nur, dass
die Auswertung wiederfindet, was der Generator hineingeschrieben hat – über echtes Verhalten von
Studierenden sagt das **nichts**.

Was die Zahlen leisten, ist eng begrenzt:

* Sie sind ein **Regressionstest**. Wenn eine Änderung an den Regeln die eingebauten Muster nicht
  mehr findet, fällt das auf.
* Sie zeigen die **Empfindlichkeit gegenüber der Kohortengröße** (Abschnitt 7).

Was sie **nicht** leisten:

* Keine Aussage über die Trefferquote bei echten Studierenden. Die Personas sind Karikaturen:
  reale Verläufe liegen auf einem Kontinuum, nicht in fünf Schubladen.
* Keine Aussage über die **Grundrate**. Wie häufig Täuschung tatsächlich vorkommt, ist unbekannt;
  ohne Grundrate lässt sich aus einer Precision im Simulator kein positiver Vorhersagewert für
  die Wirklichkeit ableiten.
* Keine Aussage über **Fairness**. Ob die Regeln bestimmte Gruppen systematisch häufiger treffen
  (Nicht-Muttersprachler, Berufstätige mit Vorwissen, Menschen mit schlechter Internetanbindung),
  kann ein selbstgebauter Generator prinzipiell nicht zeigen.

**Belastbare Aussagen brauchen echte Kohorten**: eine Auswertung über mindestens ein
abgeschlossenes Semester, mit einer unabhängig – nicht aus denselben Daten – gewonnenen
Referenz, und mit einer Fehleranalyse nach Gruppen. Bis dahin ist jede Zahl in diesem Abschnitt
eine Aussage über den Simulator, nicht über die Lehre.

### Die Störgruppe: die einzige nicht-zirkuläre Zahl

Deshalb enthält der Simulator eine **Störgruppe** (`distractor`, 10 % der Kohorte). Sie erzeugt
dieselben Oberflächenmerkmale wie Abschreiben, aber aus harmlosen Gründen:

* schnelle, korrekte Bearbeitung beim ersten Versuch (Vorwissen aus dem Beruf),
* Paste-Anteil von 85–95 % (das angebotene Codegerüst aus dem Kursmaterial),
* Reflexionen, die den Steptext zitieren (dieselbe Quelle, nicht voneinander abgeschrieben),
* Ereignisse außerhalb einer Session (abgestürzte Sitzung ohne `session.end`).

Jedes `followup`-Flag, das diese Gruppe einsammelt, wäre im Betrieb eine Rückfrage an eine Person,
die nichts falsch gemacht hat. Gemessen bei 40 Studierenden je Kurs, elf geprüfte Seeds:

| Regelsatz | Störgruppe fälschlich markiert |
|---|---|
| vor dem Review (Paste-Anteil mit absoluten Schwellwerten) | **4 von 4 (100 %) in jedem der drei Kurse** |
| nach 0a.1 und 0a.2, mit Session-Signal | 0 von 4 als Rückfrage, aber **4 von 4** als `notice` |
| heute (zusätzlich Abschnitt 5.5) | **0 von 4 (0 %) überhaupt, in allen elf Seeds** |

Diese Gegenüberstellung ist der eigentliche Beleg dafür, dass die Korrektur etwas gebracht hat –
nicht die Precision gegen die Personas.

Die Störgruppe hat außerdem ein Merkmal zu Fall gebracht: Sie erhielt zunächst durchgehend ein
`notice`, ausgelöst durch die Ereignisse außerhalb der Session – also 4 von 4 bei einer
unbeteiligten Gruppe. Ein Merkmal ohne jede Trennschärfe ist wertlos, und es wurde ersatzlos
gestrichen (Abschnitt 5.5). Seither erhält die Störgruppe **kein** Flag mehr, weder `followup`
noch `notice`.

Die Störgruppe hat außerdem einen echten Fehler im Regelwerk gefunden: Der Abgleich mit dem
Steptext benutzte zunächst Jaccard-Ähnlichkeit. Weil der Steptext um ein Vielfaches länger ist als
eine Antwort, drückt allein der Größenunterschied die Ähnlichkeit gegen null – wörtliches Zitieren
sah dadurch aus wie eigener Text, und die Störgruppe wurde zu 100 % markiert. Gemessen wird
deshalb jetzt die **Containment-Rate** (`analytics.containment`): welcher Anteil der eigenen
Antwort schon im Steptext stand.

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
* **Preis der Korrektur.** Die Regeln aus Abschnitt 0a sind bewusst konservativ. In einem Kurs, dessen
  Material die Lösung nennt (hier: alle 41 Steps), bleibt vom Paste-Anteil nichts übrig, und der
  Ähnlichkeitstest greift nur bei Texten, die weit über dem Steptext liegen. Das Portal findet damit
  **weniger**. Das ist beabsichtigt: ein Verfahren, das system-konformes Verhalten als Auffälligkeit
  meldet, ist schlechter als eines, das schweigt.

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
