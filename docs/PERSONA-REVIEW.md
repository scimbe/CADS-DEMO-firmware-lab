# Persona-Kursdurchsicht — Auftrag und Zuschnitt

Drei Personas lesen und *bedienen* die Kurse gegen ihre jeweilige Absicht: **kritischer Dozent**,
**fehleranfälliger Student**, **Mogler**. Der Auftrag kommt vom Operator; dieses Dokument legt fest,
was ein Befund ist, wo gemessen wird und wann Schluss ist.

Grund für einen eigenen Zuschnitt: Alle vier echten Fehler des 07.09.2026 — totes Panel, abgelehnte
Orientierungsfrage, nie gesetzter Selbstkontroll-Pfad, eingefrorene Teilaktualisierung — waren in
jedem Test grün und fielen erst beim Bedienen auf. Eine Durchsicht, die nur liest, findet genau diese
Klasse nicht wieder.

## 0. Was ein Befund ist

Ein Befund nennt **Step-Id, Persona, die ausgeführte Handlung, das beobachtete Ergebnis** und
entweder die verletzte Regel oder einen Regelvorschlag. Ohne ausgeführte Handlung ist es ein
Verdacht, kein Befund; Verdachte gehören in eine eigene Liste und werden nicht gezählt.

Zwei Regeln aus der bisherigen Arbeit gelten weiter:

- **Exakte Prüfungen wandern in den Validator, unscharfe sortieren nur vor.** Auf der Rubrikseite fand
  Lesen zwölf Fälle und die Kennzahl null. Jeder Befund endet mit der Frage: Lässt sich das exakt
  prüfen? Wenn ja, ist der Validator-Patch Teil des Befunds.
- **Eine Definition, eine Implementierung.** Wo zwei Sitzungen dieselbe Datei verschieden messen
  können, fehlt eine Definition (siehe R1.4, 07.09.2026: 818 gegen 1051 Wörter).

## 1. Wo gemessen wird

**Nicht gegen die Laborinstanz.** Der Operator testet dort selbst; ein zweiter Bediener verfälscht
seine Beobachtungen und seine unsere. Für alles, was ausgeführt werden muss, gilt ein
Wegwerf-Container aus demselben Abbild, eigener Name, eigenes Volume, abgebaut nach der Messung
(`CLAUDE.md`, „Aufräumen gehört zur Messung").

Das Sprachmodell ist der Engpass (~5,1 s je Anfrage seriell, Kipppunkt bei ~10 gleichzeitig). Was
ohne Modell messbar ist, wird ohne Modell gemessen; die modellabhängigen Fälle werden gesammelt und
in einem Block gefahren, nicht verstreut.

## 2. Die Oberfläche, gezählt

116 Steps in vier Paketen tragen (englische Fassung, verschachtelte Prüfungen mitgezählt):

| Prüftyp | Anzahl | Persona, für die er interessant ist |
|---|---:|---|
| `question` | 126 | Mogler (Antwort beschaffen), Dozent (trägt der Nachweis?) |
| `command` | 57 | Mogler (besteht trivial?), Student (Wiederanlauf) |
| `testSuite` | 56 | Mogler (Test statt Code ändern) |
| `predict` | 30 | Mogler (nach der Enthüllung „vorhersagen") |
| `serialExpect`/`flash`/`board`/`debugStop` | 16 | nur mit Hardware, zurückgestellt |

Vollständigkeit ist nicht das Ziel; die Reihenfolge unten ist es.

## 3. Der Mogler

**Absicht:** die Prüfung bestehen, ohne die Arbeit zu tun. Er ist zuerst dran, weil er den
Kompetenzbegriff direkt angreift: Jede Lücke hier macht ein „nachgewiesen" wertlos, und genau darauf
stützt sich das Nachweisheft.

Zu prüfen, in dieser Reihenfolge:

1. **Antwort aus dem Tutor selbst.** Frag-den-Tutor öffnen, die Frage der `question`-Aufgabe fast
   wörtlich stellen, die Antwort in das Antwortfeld kopieren, bewerten lassen. Besteht sie? Das ist
   der schärfste Fall: Der Kurs liefert dem Mogler sein Werkzeug mit.
2. **Antwort aus dem Steptext.** R4.2 misst die Überlappung von Rubrik und Fließtext bereits; hier
   wird sie *bedient* — die naheliegendste Textstelle abschreiben und bewerten lassen.
3. **Test statt Code.** Bei `testSuite`: den Test abschwächen, löschen, `#[ignore]`/`it.skip`
   setzen, leer bestehen lassen. Merkt die Prüfung es?
4. **Trivial bestehende Befehle.** Bei `command`: Besteht die Prüfung auch, wenn die eigentliche
   Arbeit nicht getan wurde? (Ein Muster, das auf jede Ausgabe passt, ist kein Nachweis.)
5. **Vorhersage nach der Enthüllung.** Bei `predict`: erst laufen lassen, dann „vorhersagen".
   R11a.7d/e schließen den Text aus, nicht die Bedienreihenfolge — hält das Panel wirklich zurück?

**Ende:** alle fünf Wege an je drei Steps je Sprachkurs, plus jeder Weg, der einmal funktioniert
hat, an allen Steps desselben Typs. Ein funktionierender Weg ist ein Befund für die *Klasse*, nicht
für den einen Step.

## 4. Der fehleranfällige Student

**Absicht:** Er tut genau, was dasteht — und liest jede Mehrdeutigkeit falsch herum. Das ist der
ursprüngliche Auftrag „Ausschluss potentieller Missverständnisse bei Anleitungen".

1. **Der Wiederanlauf muss wiederanlaufen.** Den in `> expect:` beschriebenen Fehlerfall *herstellen*,
   dann `> recover:` befolgen. Kommt man zurück? R11a.2a verlangt einen herstellbaren Fehler; hier
   wird geprüft, ob die Rückkehr auch stimmt. Zuerst die `::: do`-Blöcke mit `command=` und `task=`
   (ausführbar, also prüfbar), zuerst die Module m0 aller drei Kurse.
2. **Zwei Lesarten.** Jede Anweisung, die zwei Handlungen zulässt, wird in der *falschen* Lesart
   ausgeführt. Sagt der Tutor dann etwas Brauchbares, oder bleibt der Student stehen?
3. **Der Ort fehlt.** R1.3: Jedes benannte Bedienelement muss verortet sein. Der Fund des Operators
   in Rust m0-02 („Klicke auf Terminal, Problems, Output" ohne Ort) ist die Vorlage; gesucht wird die
   Klasse, nicht der Einzelfall.
4. **Die Sackgasse.** Nach drei Fehlversuchen an derselben Aufgabe: Bietet der Tutor einen Ausweg,
   oder wiederholt er sich? Der Selbstkontroll-Pfad (ohne Modell) gehört ausdrücklich dazu.

**Ende:** alle m0-Module vollständig, danach jeder Step mit `command`- oder `testSuite`-Prüfung in
Rust und JavaScript.

## 5. Der kritische Dozent

**Absicht:** Er muss die Bewertung vor einem Prüfungsausschuss vertreten. Er liest, er bedient nicht.

1. **Trägt der Nachweis das Lernziel?** Für jedes Lernziel, das „nachgewiesen" erreichen kann: die
   Belege ansehen, die dorthin führen. Würde ein Dozent sie akzeptieren? Gemessen liegt „nachgewiesen"
   realistisch bei 14 von 40 (Firmware), 9 von 18 (Rust), 6 von 13 (JS) — diese Fälle zuerst.
2. **Bloom-Stufe gegen Prüftyp.** Ein `command` weist kein „analyze" nach. Wo die Stufe der Prüfung
   unter der des Lernziels liegt, ist entweder die Stufe oder die Prüfung falsch.
3. **Ohne Modell bleibt was übrig?** Ohne Sprachmodell erreicht „nachgewiesen" überall 0. Der Dozent
   beurteilt, was das Nachweisheft in diesem Zustand noch behaupten darf — die Formulierung, nicht
   die Technik.
4. **Sagt der Kurs, was er bewertet?** Die neue Seite „Wie der Tutor deine Arbeit bewertet" gegen das
   tatsächliche Verhalten lesen. Eine Zusage, die das System nicht hält, ist der teuerste Befund von
   allen.

**Ende:** die unter 1 genannten Lernziele vollständig, der Rest stichprobenhaft.

## 6. Bericht

Eine Tabelle je Persona in `docs/research/persona-befunde.md`: Step-Id, Handlung, Beobachtung,
Regel oder Regelvorschlag, Schweregrad (blockiert / verfälscht die Bewertung / kosmetisch), und die
Spalte **„exakt prüfbar?"** mit dem Validator-Patch, wo die Antwort ja ist.

Was aus der Durchsicht als Regel hervorgeht, gehört in `docs/PEDAGOGY-RULES.md` mit seiner Herkunft —
wer sie kippen will, muss den Befund widerlegen.
