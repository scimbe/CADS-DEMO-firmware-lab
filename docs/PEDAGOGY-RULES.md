# Regelwerk: Kursgestaltung und Tutor-Verhalten

**Stand:** 2026-09-03 · **Gilt für:** alle Kurs-Packs unter `courses/` und für das Verhalten der Extension
`extensions/cads-tutor` · **Grundlage:** [`SPEC.md`](SPEC.md) §3.3 und Addendum v1.1, sowie die zwei
Review-Runden in [`review/round-1-firmware.md`](review/round-1-firmware.md) und
[`review/round-2-firmware.md`](review/round-2-firmware.md).

Diese Regeln sind verbindlich. Jede trägt die **Herkunft** — das Finding, aus dem sie entstanden ist —, damit
niemand sie für Geschmack hält und damit sie widerlegbar bleibt: wer eine Regel ändern will, muss zeigen, dass das
Finding nicht mehr gilt. Regeln, die maschinell prüfbar sind, tragen am Ende den Vermerk **[Validator]**.

Die Findings kamen aus einem Review mit drei Personas — einem skeptischen Professor für Programmiermethodik, der
stärksten und der schwächsten denkbaren Studierenden — am realen Firmware-Kurs, dessen Feldbefund lautete: alle
vier je gestellten Fragen drehten sich um ein Register und eine Zeigerschreibweise, die der Kurs nirgends erklärte,
und niemand kam über Modul 2 hinaus.

---

## 1. Aufbau eines Steps

**R1.1 — Die ersten fünf Zeilen sagen, was zu tun ist.** Ein Step beginnt mit dem Lernziel in einem Satz und
nennt unmittelbar danach die konkrete Handlung. Alles, was nur im mittleren Fließtext steht, gilt als ungelesen.
*Herkunft: S− liest nach fünf bis acht Zeilen nicht weiter; die einzige Handlungsanweisung von `m0-01` stand nach
30 Zeilen (Runde 1, A1).*

**R1.2 — Der erste Step eines Kurses beantwortet drei Fragen, in dieser Reihenfolge:** Was sehe ich auf dem
Bildschirm? Was tue ich als Allererstes? Woran erkenne ich, dass es geklappt hat? Vor jedem Fließtext, mit
benannten Fensterbereichen und einem nummerierten ersten Schritt.
*Herkunft: die real gestellten Fragen „wie soll ich jetzt anfangen", „was ist der erste Schritt", „was sehe ich
da" (Runde 1, A1).*

**R1.3 — Jede Handlungsanweisung nennt den Ort.** Fenster, Menüweg oder Tastenkürzel, und bei einem Kommando, ob
es in ein Terminal oder in eine Geräte-Konsole gehört. „Führe den Task X aus" ohne Ortsangabe ist ein Fehler.
*Herkunft: S− stieg an `scripts/board_key.py quit` aus, weil sie es in die falsche Konsole tippte; das Wort
„Terminal" kam im gesamten deutschen Kurs nicht vor (Runde 1, A15). In Runde 2 fehlte die Ortsangabe ab M3 wieder
in 18 von 27 Steps — die Regel muss für den ganzen Kurs gelten, nicht nur für das Einstiegsmodul.*

**R1.4 — Ein Step wächst nicht unbegrenzt.** Mehr Erklärung ist nicht automatisch besser: was hinter dem
Leseabbruch liegt, wirkt nicht. **Richtwert 600 Wörter, harte Grenze 900.** Darüber gehört der Step geteilt oder
gekürzt, und die Regel, an der die meisten scheitern, gehört in jedem Fall nach vorn — nicht hinter neunzig Zeilen
Herleitung.
Die harte Grenze ist bewusst höher als der Richtwert: viele Steps dieses Kurses liegen über 600 Wörtern, und für
die meisten ist das vertretbar, weil sie eine Fallstudie tragen. Vertretbar ist es nicht mehr, wenn ein Step zwei
Themen behandelt oder wenn seine Aufgaben von Abschnitten getragen werden, die hinter dem Leseabbruch liegen — dann
wird geteilt. Genau das war beim MMIO-Primer der Fall: 1386 Wörter, drei Themen, und alle drei Aufgaben hinter dem
Leseabbruch; er ist jetzt in drei Steps von 450 bis 580 Wörtern geteilt, jeder mit einem Thema und einer Aufgabe.

**Gemessen wird die Prosa der deutschen Fassung**, ohne Bildunterschriften, Codeblöcke und Kommentare — das ist,
was ein Studierender tatsächlich liest. Die englische Fassung derselben Inhalte fällt regelmäßig etwa ein Zehntel
länger aus; ihr gilt dieselbe Grenze plus diese zehn Prozent (DE 900, EN 990).

**Nicht mitgezählt wird der `::: do`-Anleitungsblock samt seiner `> expect:`- und `> recover:`-Zeilen.** Er ist
eine abzuarbeitende Karte, kein Fließtext, und A9.1 hat ihn eingeführt, um die Leselast zu *senken*; ihn
mitzuzählen würde ausgerechnet die ausführliche Wiederanlauf-Anleitung bestrafen, die R11a.2 verlangt. Gezählt
wird damit genau der Text, den auch A9.1-Regel 4 prüft — dieselbe Definition, eine Quelle.

**Ausnahmen tragen ihren Grund** (`EXCEPT_R14` im Validator, nach dem Muster von `EXCEPT_R42`). **R1.4a — Ein
Eintrag ohne Grund ist ein Fehler**, keine Ausnahme: sonst ist die harte Grenze nur eine stumm geschaltete
Warnung. Ein ausgenommener Step warnt weiter, aber mit seinem Grund daneben — er soll sichtbar bleiben, damit man
ihn bestreiten kann. Aktuell drei Einträge, alle deutsch, alle im Firmware-Kurs, alle höchstens 2,8 % darüber:
`m3-05-spi-mutex`, `m4-03-mutex-spi-bus`, `m8-03-clean-room-pr`. In allen drei besteht der Überhang aus
Abrufmaterial — genau dem, was „nachgewiesen" von 6 auf 24 von 40 Lernzielen gehoben hat. Diese Abschnitte für
eine Zahl zu kürzen, tauschte einen gemessenen Gewinn gegen einen Zähler. Das Argument hinter R1.4 greift dort
auch nicht: Die Aufgaben stehen im Front Matter, das Panel zeigt sie unabhängig davon, wie weit gescrollt wurde.

**Gemessen wird im Validator** (`prose_word_count`), nicht von Hand. *Anlass: Am 07.09.2026 maßen zwei Sitzungen
denselben Rust-Step als 818 und als 1051 Wörter — allein, weil diese Definition nirgends stand und nirgends
geprüft wurde. Eine harte Grenze, die jeder anders zählt, ist keine Grenze.*
*Herkunft: `m0-01` wuchs von 399 auf 1009 Wörter, der Primer auf 1435; S− las in beiden nur den Anfang, und die
Abschnitte, die alle drei Aufgaben tragen, lagen dahinter (Runde 2).* **[Validator]**

**R1.5 — Ein Step hat ein bis drei Aufgaben.** Mehr macht ihn unübersichtlich und erzeugt eine
Validator-Warnung.
**[Validator]**

---

## 2. Ehrlichkeit der Bloom-Stufen

**R2.1 — Die deklarierte Stufe muss durch einen Check belegt sein, der sie misst.** `apply` verlangt eine
ausgeführte Handlung, `analyze` eine Zerlegung neuer Daten, `evaluate` ein begründetes Urteil über einen offenen
Fall. Eine Freitextfrage allein belegt niemals `apply` oder höher.
*Herkunft: alle drei `evaluate`-Steps des Firmware-Kurses waren Referate, deren Kriterium, Urteil und
Revisionsbedingung im Fließtext standen (Runde 1, A3).*

**R2.2 — Eine Stufe je Step.** Die Reflexionsfrage am Ende darf eine Stufe höher liegen als der Step, aber sie
darf nicht der Beleg für die Step-Stufe sein. Widersprechen sich Front-Matter-`bloom` und Check-`bloom` ohne diese
Begründung, ist es ein Fehler.
*Herkunft: sechs Steps deklarierten zwei verschiedene Stufen, und die Runtime verbuchte denselben Step je nach
Check-Typ auf beiden (Runde 1, A10).* **[Validator]**

**R2.3 — Wer die Lösung diktiert, schreibt nicht `create`.** Ein Step, der Funktionsnamen, Dateiort und
Codegerüst vorgibt, ist ein Worked Example auf `apply` mit `scaffold: worked` — das ist didaktisch richtig und
verdient einen ehrlichen Namen. `create` verlangt, dass die Studierende aus Zwängen eine eigene Struktur bildet.
*Herkunft: `m5-03` gab Funktionsrumpf, CMake-Zeile und Menüeintrag vollständig vor und deklarierte `create`
(Runde 1, A8).*

---

## 3. Check-Design und Negativprobe

**R3.1 — Jeder Check muss fehlschlagen können.** Für jeden Check ist zu zeigen: er ist **rot** auf einem
unveränderten Ausgangszustand und **grün** nach der verlangten Leistung. Ein Check, der immer besteht, ist
wertlos. Beide Läufe gehören ins Protokoll der Änderung.
*Herkunft: `symbolInElf` auf vorbestehende Symbole war strukturell grün; sechs `command`-Checks bestanden den
leeren Checkout, einer davon mit `bloom: create` (Runde 1, A7; Runde 2, R2-10).*

**R3.2 — Ein Check prüft Wirkung, nicht Text.** Ein Regex über den Quelltext besteht auch als Kommentar. Wo eine
Wirkung beobachtbar ist — eine Konsolenausgabe, ein Testlauf, ein Symbol in einer Objektdatei — ist sie dem
Textvergleich vorzuziehen. Wo nur Text geht, muss der Text mindestens durch den Präprozessor laufen, damit
Kommentare nicht zählen.
*Herkunft: ein zweizeiliger Stub mit einer Kommentarzeile bestand alle automatischen Checks eines
120-Minuten-Projekts (Runde 2, R2-8).*

**R3.3 — Der Titel eines Checks sagt, was er wirklich zusichert.** „Du hast X gefunden" darf nicht über einem
Check stehen, der nur belegt, dass eine Datei existiert. Solche Invarianten sind wertvoll, gehören aber als
*Zusicherung* benannt, nicht als Aufgabe.
*Herkunft: sechs Checks mit Leistungstiteln, die auf dem unveränderten Baum grün waren (Runde 2, R2-10).*

**R3.4 — Der Kurs behauptet nichts über seine Prüfung, das nicht stimmt.** Eine falsche Zusicherung („ein
Kommentar besteht ihn nicht") ist schlimmer als eine schwache Prüfung, weil sie das Vertrauen in alle anderen
Zusicherungen mit erledigt.
*Herkunft: `m5-01` und `m1-04` behaupteten genau das, und ein auskommentierter Aufruf bestand beide (Runde 2,
R2-9).*

**R3.5 — Eine Aufgabe steht nie allein auf einem LLM-Urteil, wenn sie etwas freischaltet.** Freitextbewertung
ist nicht reliabel genug, um eine Kette zu sperren. Jeder freischaltende Step braucht mindestens einen
deterministischen Check.
*Herkunft: `m2-01` hatte als einzigen Nachweis eine Freitextfrage und sperrte bei einem `fail` den gesamten
Restkurs — die technische Erklärung dafür, dass niemand über Modul 2 hinauskam (Runde 1, B5).*

**R3.6 — Der Kurs benutzt keinen Check-Typ, den die Runtime nicht kennt.** Tut er es doch, muss das sichtbar
sein: die Runtime verwirft heute den ganzen Step, und der Studierende bekommt wortlos einen kürzeren Kurs.
*Herkunft: 28 von 48 Steps waren mit der ausgelieferten Runtime nicht ladbar, während der Validator PASS meldete
(Runde 2, R2-1).* **[Validator]**

---

## 4. Fragen und Rubriken

**R4.1 — Eine Frage je Aufgabe.** Richtwert höchstens 25 Wörter, höchstens ein Fragezeichen. Was mehr verlangt,
wird auf mehrere Aufgaben verteilt oder gekürzt.
*Herkunft: 19 von 47 Prompts hatten drei oder mehr Teilfragen, der schlimmste sechs; S− konnte keinen davon
beantworten und klickte auf Hinweis (Runde 1, A6).* **[Validator]**

**R4.2 — Die Antwort steht nicht im Steptext.** Eine Prüffrage verlangt eine Ableitung, eine Rechnung oder eine
Diagnose an neuen Daten. Wird ein auflösender Satz in die Rubrik verschoben, ist er aus dem Fließtext zu
**entfernen** — sonst hat sich nichts geändert. Messgröße: die inhaltstragenden Tokens der Rubrik überlappen zu
weniger als **40 %** mit dem Fließtext desselben Steps, bei `analyze` und `evaluate` zu weniger als **28 %**;
maßgeblich ist die Stufe des **Checks**, nicht die des Steps, denn die Rubrik bewertet die Antwort auf den Check.

*Warum 28/40 und nicht mehr 35/50 (Kalibrierung 2026-09-06):* Die Messgröße rechnet seit demselben Tag
genauer — Anleitungsblöcke, Markdown-Linkziele und Bezeichner (alles, was der Rumpf in Backticks oder
Codeblöcke setzt, plus erwartete Testnamen) zählen nicht mehr als geteilte Prosa. Eine Rubrik über `Copy`,
`E0507` oder `Number.isNaN` kann diese Wörter nicht vermeiden, sie **sind** ihr Gegenstand. Dadurch fällt der
Wert um den Median-Faktor 0,851 — **eine neue Größe gegen die alte Schwelle zu halten hätte die Regel
stillschweigend gelockert:** von vierzehn bekannten echten Befunden wären fünf durchgefallen. 28/40 ist das
Paar, bei dem alle vierzehn wieder anschlagen; `scripts/pedagogy-metrics.py --selftest` hält genau das fest und
läuft als fünfte Zeile in `validate-all-courses.sh` mit. **Wer die Rechnung ändert, ändert die Grenze mit** —
der Selbsttest schlägt sonst an, und das ist seine Aufgabe.

*Und was die Zahl nicht kann:* Sie unterscheidet nicht, ob ein Rumpf die Antwort **aussagt** oder die Frage mit
denselben Substantiven **stellt**. Zwölf Rümpfe, die ihre eigene Frage beantworteten, hat Lesen gefunden und
diese Größe keinen einzigen; ein umgeschriebener Rumpf misst danach exakt wie davor. Sie sortiert Kandidaten
vor, sie urteilt nicht.
*Herkunft: gemessene Überlappung von 72 % im Median, 86 % im Maximum; S−: „Ich scrolle hoch und schreibe ab. Ich
habe nichts verstanden und der Step ist grün." (Runde 1, A3).* **[Validator]**

**R4.2a — Ausnahme an den unteren Bloom-Stufen: benannte Artefakte.** Bei einem Check der Stufe `remember`
oder `understand` — maßgeblich ist `check.bloom`, ersatzweise die Stufe des Steps —, dessen Rubrik das **Benennen
von Artefakten** bewertet, die der Step selbst gezeigt hat (eine Fehlermeldung, die Datei aus dem Stacktrace, eine
ausgegebene Zahl, die beiden Seiten eines Diffs), gilt die Grenze gegen den Fließtext nicht. Diese Artefakte
stehen im Steptext, weil der Step sie gezeigt hat. Eine Rubrik, die sie umschreibt statt sie zu benennen, wird
vage — und im Rückfallweg ohne Sprachmodell liest die Studierende die Rubrik als Selbstkontrolle, wo eine vage
Rubrik schlechter ist als eine überlappende. Die Ausnahme gilt **nicht** für eine Rubrik, die einen Sachverhalt
erklärt, den der Fließtext ebenfalls erklärt; das bleibt ein Befund, auch auf `understand`.
Jede Ausnahme steht mit ihrem Grund in `scripts/pedagogy-metrics.py` (`EXCEPT_R42`) und wird von dort gezählt und
ausgewiesen. Ohne hingeschriebenen Grund keine Ausnahme: eine Ausnahme ohne Grund ist ein stillgelegter Befund.
Betroffen in `javascript-foundations`: `m0-02-first-run/what-i-see` (63,0 %), `m0-03-read-a-test/read-the-diff`
(51,7 %).
*Herkunft: acht Rubriken des JavaScript-Kurses lagen über der Grenze. Zwei prüfen Artefakte und sind ausgenommen;
die übrigen sechs erklären einen Sachverhalt, den ihr Fließtext ebenfalls erklärt, und bleiben Befunde. Eine
Regel, die man aus gutem Grund achtmal bricht, ist falsch formuliert — aber der Grund trägt nur dort, wo die
Rubrik nichts erklärt, sondern etwas wiedererkennt.* **[Validator]**

**R4.3 — Der Prompt kündigt den Umfang an, den die Rubrik verlangt.** Nicht als Fragenkette, sondern als
Umfangsangabe: „drei Fälle, je ein Satz, plus ein Satz zur Einordnung". Die Studierende sieht die Rubrik nicht;
eine Anforderung, die nur dort steht, ist keine.
*Herkunft: nach der Aufteilung der Prompts wanderte die Mehrteiligkeit in die Rubriken — Median 72 Wörter, 39 %
mit hartem Ausschlusskriterium (Runde 2, R2-11).*

**R4.4 — Eine Rubrik nennt, was sie **nicht** akzeptiert.** Der häufigste Irrweg gehört ausdrücklich als „besteht
nicht" hinein. Das schützt korrekt rechnende Studierende davor, an einer schludrigen Musterlösung zu scheitern.
*Herkunft: die Watchdog-Rubrik hielt eine falsche Zahl für „genauer" und hätte jeden bestraft, der richtig rechnet
(Runde 2, R2-5).*

---

## 5. Hinweis-Stufen

**R5.1 — Drei Stufen, mit fester Bedeutung.** Stufe 1 ist eine **Fehlerhypothese als Frage** („woran es meistens
liegt"). Stufe 2 nennt **Ort und Verfahren** („öffne X, such nach Y"). Stufe 3 gibt die **entscheidende
Teilinformation** — niemals die vollständige Rubrikantwort und niemals die einzusetzende Codezeile. Messgröße: die
Überlappung von Stufe 3 mit der Rubrik liegt unter 30 %.
*Herkunft: Stufe 3 war in fast jedem Step die Antwort; in `m2-04` war Stufe 1 das Inhaltsverzeichnis, Stufe 2 ein
Zitat daraus und Stufe 3 die halbe Rubrik — eine Eskalation, die nur die Lösung verzögert (Runde 1, A4).*
**[Validator]**

**R5.2 — Stufe 1 klärt die Bedienung, wenn die Aufgabe eine Bedienhandlung ist.** Ein Hinweis, der denselben
Satz wiederholt, an dem die Studierende gescheitert ist, hilft nicht.
*Herkunft: der Hinweis zu `m0-05` sagte wörtlich noch einmal, was im Text stand, plus zwei neue Fachbegriffe
(Runde 1, A9).*

**R5.3 — Jede Aufgabe hat ihre eigene Hinweisleiter.** Ein Trigger je Step bei zwei bis drei Aufgaben lässt die
Mehrheit ohne Hilfe: der Knopf ist da, der Kasten bleibt leer.
*Herkunft: 17 von 33 Aufgaben in M0–M2 hatten keinen Hinweis (Runde 1, A5).* **[Validator]**

**R5.4 — Der Hinweis setzt nichts voraus, was der Kurs nicht eingeführt hat.** Insbesondere keine Werkzeuge,
Pfade oder Schreibweisen, die erst später erklärt werden.
*Herkunft: Hinweise verwiesen auf „den MEMORY-Block des Linkerskripts" und auf `board_key.py`, beides für S−
unbekannt (Runde 1, A9).*

**R5.5 — Hinweise kosten etwas (Runtime).** Stufe *n* wird erst nach *n* dokumentierten Versuchen freigegeben,
und die Zahl der verbleibenden Hinweise wird nicht angezeigt.
*Herkunft: `showHint` zählt `hintTier` auch ohne Fehlversuch hoch; drei Klicks ohne jeden Versuch lieferten die
Lösung, und die Beschriftung „Hinweis 1 von 3" sagte zusätzlich, wie weit es bis dahin ist (Runde 1, B1).*

---

## 6. Fehlkonzepte

**R6.1 — Benennt der Kurs einen typischen Irrtum, gehört er als `misconceptions`-Trigger ins Front Matter, nicht
in den Fließtext.** Ein Fehlkonzept, das erzählt statt abgefangen wird, wirkt nicht.
*Herkunft: der Kurs benannte den „active low"-Irrtum und „INT0..5 sind Taster" selbst und nutzte keinen einzigen
Trigger (Runde 1, A11).*

**R6.2 — Ein `misconceptions`-Muster ist eine reale Ausgabe.** Compilerfehler, Linkerfehler, Konsolenmeldung,
Testausgabe — belegt aus dem Projekt, nie erfunden. Ein Muster, das nie feuert, ist Dekoration.

---

## 7. Scaffolding, Wiederholung, Vorhersage, Reflexion

**R7.1 — `scaffold` steigt je Modul: `worked` → `faded` → `independent`.** Vor der ersten eigenständigen Aufgabe
steht ein vollständig vorgemachtes Beispiel. Die Stufe wird nicht gesetzt, sondern eingelöst.
*Herkunft: kein Step nutzte `scaffold`; `m2-05` verlangte eine eigene C-Funktion, nachdem der Kurs genau eine
Wortersetzung geübt hatte (Runde 1, A11, A14).*

**R7.2 — Wo Vorwissen nötig ist, wird ein Skelett zum Kopieren gegeben.** Die Syntax darf nicht die Hürde sein,
die Sache soll es sein. Jeder Teil des Skeletts nennt eindeutig seinen Ort und den Weg dorthin.
*Herkunft: `m2-05` war S−'s letzter Ausstiegspunkt; in Runde 2 reichte ihr das Skelett für Teil 2, nicht für Teil
1 und 3, weil die Ortsangaben mehrdeutig waren.*

**R7.3 — Eine Tatsache wird einmal erzählt und danach abgefragt.** Wiederholt ein späterer Step einen früheren
Sachverhalt, trägt er `recallFrom` und kürzt die Wiedererzählung auf einen Verweissatz.
*Herkunft: die Stack-Overflow-Fallstudie stand dreimal fast wörtlich im Kurs, der PA7-Konflikt ebenfalls (Runde 1,
A12).*

**R7.4 — Wer kürzt, zieht die Zeiger nach.** Ein `recallFrom`-Umbau ist erst fertig, wenn jeder Verweis auf den
gekürzten Absatz auf sein neues Ziel zeigt.
*Herkunft: `m7-05` verwies nach dem Umbau auf eine Tabelle, die aus `m3-05` entfernt worden war, und auf eine
Datei, in der sie nie stand (Runde 2, R2-7).*

**R7.5 — Mindestens eine `predict`-Aufgabe je Modul, und ihre Antwort steht nicht im Steptext.** Die Vorhersage
muss vor der Enthüllung geschrieben werden, und die Enthüllung muss die gesuchte Information tatsächlich
enthalten. Das ist zu prüfen, indem man den `then`-Befehl ausführt und seine Ausgabe gegen die Rubrik hält.
*Herkunft: der erste `predict` des Kurses fragte nach einer Zahl, die viermal darüberstand, und sein
Enthüllungsbefehl zeigte sie nicht; zwei weitere zeigten den Satz nicht, den ihre Rubrik zitierte (Runde 2, R2-2,
R2-7).*

**R7.6 — Eine Modul-Reflexion, die im Kurstext versprochen wird, muss existieren und gelesen werden.**
*Herkunft: `course.json` versprach „eine Reflexionsrubrik", die es nirgends gab (Runde 1, A19).*

---

## 8. Sprache für schwache Studierende

**R8.1 — Jeder Fachbegriff wird bei seiner ersten Verwendung erklärt, in einem Halbsatz, im Fluss.** Nicht als
Glossarblock am Ende, den niemand liest. Das gilt auch für Begriffe, die selbstverständlich wirken: Firmware,
flashen, Register, Bus, Terminal, Fault, Symbol, Offset, Nebenläufigkeit.
*Herkunft: in M0–M2 wurden über achtzig Begriffe vor ihrer Einführung benutzt; im ersten Absatz von Step 1 standen
vier in einem Satz (Runde 1, A14).* 

**R8.2 — Ein Kurs, der Vorwissen verlangt, sagt das im Manifest und im ersten Step.** `"prerequisites": []` bei
einem Kurs, der ab Modul 2 C-Kenntnisse braucht, ist eine Falschaussage.
*Herkunft: Runde 1, A14; die Angabe steht inzwischen in `m0-01`, im Manifest noch nicht.*

**R8.3 — Fehlermeldungen und Statusmeldungen erscheinen in der Kurssprache und sagen, was zu tun ist.**
„pattern /X/ not found in Y" ist für die Zielgruppe keine Information.
*Herkunft: Runde 1, B9.*

**R8.4 — Ein Schritt, der schiefgehen kann, sagt im selben Atemzug, was dann zu tun ist.** Beispiel: ein frisch
geflashtes Board überhört einzelne Buchstaben — das gehört neben die Aufgabe und in die Hinweisleiter, nicht in
eine Fußnote.
*Herkunft: in Runde 2 war das die von S− am deutlichsten gelobte Verbesserung.*

**R8.5 — Steht im Prüftext `send:`, sendet die Runtime.** Dann darf der Aufgabentext nicht „sende X" sagen,
sondern muss sagen, dass der Prüfknopf das selbst tut und die Studierende nur mitliest.
*Herkunft: Runde 2; S− wusste nicht, ob sie tippen, warten oder klicken soll.*

---

## 9. Herausforderung für starke Studierende

**R9.1 — Jeder Step, der eine Tatsache behauptet, bietet die Frage nach ihrer Ursache an.** „CCM ist für DMA
unsichtbar" fünfmal zu wiederholen, ohne je zu sagen, dass es am Datenbus des Kerns statt an der Bus-Matrix hängt,
langweilt die eine Hälfte und lehrt die andere nichts.
*Herkunft: Runde 1, A9/A17 der starken Studierenden.*

**R9.2 — Wo das Material Tiefe hergibt, wird sie abgefragt, nicht nur erwähnt.** Ein Nebensatz über ein
DMA-Ping-Pong, eine Mutex-Geschichte ohne Prioritäten, ein Netzstack ohne eine einzige Zahl: das sind
verschenkte Aufgaben.
*Herkunft: Runde 1, A13/A17; „Priorität" kam in einem FreeRTOS-Modul kein einziges Mal vor.*

**R9.3 — Es muss einen Weg geben, Vorwissen zu bezeugen.** Eine strikt lineare Kette aus vierzig Gliedern zwingt
Fortgeschrittene durch Stunden Wartezeit und hat keinen didaktischen Zweck. `requires` bildet die fachliche
Abhängigkeit ab, nicht die Lesereihenfolge; je Modul sollte eine bestandene Modulprüfung die Kette überspringen
können.
*Herkunft: Runde 1, A16; in Runde 2 unverändert offen.*

**R9.4 — Wer über Nebenläufigkeit lehrt, lässt sie herstellen.** Lesen über Prioritäten, Präemption und
Prioritätsinversion ersetzt keinen Handgriff am laufenden System.
*Herkunft: Runde 2, Schlusswort der starken Studierenden.*

---

## 10. Arbeitsteilung und Nahtstellen

**R10.1 — Eine Zahl gehört an eine Stelle.** Wandert sie in einen zweiten Step, wandert der Fehler mit. Zahlen
werden referenziert, nicht kopiert; wo kopiert werden muss, gehört die Quelle daneben.
*Herkunft: von acht in Runde 2 neu entstandenen Sachfehlern lagen sieben an Nahtstellen — eine Zahl, die von einem
Step in den nächsten wanderte; ein Verweis, dessen Ziel gekürzt wurde; eine Rubrik, deren Fließtext jemand anderes
schrieb.*

**R10.2 — Jede Zahl und jeder Pfad wird an der Quelle geprüft, auch wenn sie schon im Kurs stehen.** Ein
Kommentar im Projektquelltext ist keine Autorität: die Watchdog-Periode war dort falsch gerechnet und wanderte
ungeprüft in eine Musterlösung.
*Herkunft: Runde 2, R2-5.*

**R10.3 — DE und EN werden zusammen geändert, nie nacheinander.** Nach jeder Änderung wird geprüft, dass beide
Fassungen dieselben Abschnitte und dieselben Aufgaben tragen.
*Herkunft: der englische `m2-02`-Text blieb auf dem Stand vor der Überarbeitung zurück und verriet dabei die
Antwort auf die neue Aufgabe (Runde 2, R2-4).* **[Validator]**

**R10.4 — Was gemessen wird, wird besser; was nicht gemessen wird, kann schlechter werden.** Wer eine Kennzahl
zum Ziel macht, prüft in derselben Runde, ob die Anforderung nur den Ort gewechselt hat.
*Herkunft: der schärfste methodische Satz des Professors in Runde 2 — die Prompts wurden kurz, indem die
Anforderung in die unsichtbare Rubrik wanderte.*

---

## 11. Grenzen des Tutors und Ehrlichkeit gegenüber Lehrenden

**R11.1 — Ein Häkchen ist kein Wissen.** `manual`-Checks und Freitextfragen ohne Bewerter dürfen keine
Mastery-Ereignisse erzeugen und nicht in eine Fortschrittszahl eingehen. Wo sie angezeigt werden, wird
ausgewiesen, wie viele der zugrundeliegenden Ereignisse selbstberichtet sind.
*Herkunft: ein Klick erzeugte `independent_success` und trieb eine Prozentzahl mit goldenem Stern ab 85 %
(Runde 1, B4).*

**R11.2 — Ohne Bewerter gilt eine Freitextaufgabe als nicht nachgewiesen, nicht als bestanden.** Und das Panel
sagt es sichtbar.
*Herkunft: ohne LLM erteilte sich die Studierende zwei Drittel aller Checks selbst, und der Kurs war vollständig
durchklickbar (Runde 1, B2).*

**R11.3 — Ein Step ohne Nachweis heißt „gesehen", nicht „erledigt", und schaltet nichts frei.** Blockiert das
den Kurs, ist das ein Kursfehler, den man sehen will — kein Fehler, den die Runtime wegdefiniert.
*Herkunft: Runde 1, B6.*

**R11.4 — Der Tutor beantwortet Orientierungsfragen ohne Grounding.** „Wie fange ich an", „was soll ich tun",
„was sehe ich da" werden vor der Suche abgefangen und deterministisch mit dem aktuellen Step, seiner ersten
Aufgabe und dem nächsten Klick beantwortet. Ein Tutor, der Orientierungsfragen abweist und Fachfragen beantwortet,
hilft nur denen, die schon können.
*Herkunft: genau diese drei Fragen wurden im Feld gestellt und mit „formuliere um" zurückgewiesen (Runde 1, B7).*

**R11.5 — Der Bewerter ist kalibriert, bevor er bewertet.** Rubriken als nummerierte Kriterien mit `met`/`not
met` und Bestehensquorum; die Grounding-Auszüge werden aus der **Antwort** gezogen, nicht aus Prompt und Rubrik;
wörtliches Zurückspielen des Steptextes gilt ausdrücklich als nicht bestanden. Vor produktivem Einsatz: eine
Kalibrierungsmenge realer Antworten gegen zwei Fachurteile, und die Falsch-Positiv-Probe „der Steptext als Antwort
muss durchfallen".
*Herkunft: Runde 1, B3; der Bewerter bekam die Textstellen vorgelegt, aus denen abgeschrieben wurde.*

**R11.6 — Auffälligkeitsanalysen bestrafen kein Verhalten, das das System selbst anbietet.** Solange ein
Hinweis eine Codezeile ausliefert, ist eine Paste-Quote kein Betrugsindikator. Textähnlichkeit zwischen
Studierenden wird gegen den Steptext bereinigt, bevor sie gemeldet wird. Flags sind kriteriumsbezogen, nie
Quantile, und kein Flag wird ohne menschliche Prüfung einem Namen zugeordnet.
*Herkunft: Runde 1, B9 des Professors zu SPEC §A5.*

**R11.7 — Was der Tutor nicht kann, steht in der Dokumentation, bevor jemand ihn einsetzt.** Ungetestete
Hardware-Pfade, ein nie aufgerufener LLM-Endpunkt und ein nicht implementierter Spezifikationsteil gehören
benannt, nicht angedeutet.
*Herkunft: `docs/TUTOR-NOTES.md` macht das vorbildlich; genau deshalb war der Befund überhaupt auffindbar.*

---

## 11a. Nutzerführung, Anleitungen, Kompetenznachweis (2026-09-06)

Belege: [`research/nutzerfuehrung-evidenz.md`](research/nutzerfuehrung-evidenz.md), Format:
[`SPEC.md`](SPEC.md) A9. Jede Regel nennt den Befund (E…) und das Kriterium (K…), an dem sie gemessen wird.

**R11a.1 — Eine Handlung, ein Block.** Jede Bedienanweisung steht in einem `::: do`-Block mit genau einer
Handlung. Zwei Handlungen sind zwei Blöcke. *E5, Google/Microsoft Style Guide; K2.* **[Validator]**

**R11a.2 — Kein Bedienweg ohne erwartetes Ergebnis.** Jeder Block sagt, woran die Studierende erkennt, dass es
geklappt hat, und was sie tut, wenn nicht. Ein Block ohne `expect:`/`recover:` ist unfertig.
*E5: minimalistische Materialien mit Fehlerbehebung halbierten die Bearbeitungszeit; K3.* **[Validator]**

**R11a.2b — Ein `recover` nennt das Zeichen, an dem der Wiederanlauf erkennbar ist.** Nicht nur „führ das
aus", sondern auch, was dann zu sehen ist. Ohne dieses Zeichen ist die Rettung eine zweite Sackgasse hinter der
ersten: Die Studierende hat keine Möglichkeit zu unterscheiden, ob der Ausweg gewirkt hat oder still ins Leere
lief.
*Herkunft: PB-03/PB-04 (07.09.2026). Zwölf `recover`-Zeilen schickten Studierende zu `board_key.py quit`; das
Skript fand im Container nie ein Gerät und tat nichts. Weil keine Zeile sagte, was zu sehen sein müsste, blieb
der Unterschied zwischen „lief durch" und „lief ins Leere" zwei Wochen unsichtbar — bis ein Durchgang an echter
Hardware ihn zeigte.* **[Lesen, nicht Validator: ob ein Zeichen echt ist, entscheidet keine Kennzahl.]**

**R11a.2a — Ein `recover` beschreibt einen Fehlschlag, den dieser Befehl wirklich erzeugen kann.** Die Zeile
nennt das Bild, das die Studierende **tatsächlich** sieht, wenn sie den beschriebenen Fehlgriff macht — nicht
ein plausibles Bild aus einem verwandten Fall. Prüfbar ist das nur, indem man den Fehlgriff einmal begeht.
*Herkunft: Der Block `cargo --version` im ersten Rust-Schritt versprach `could not find Cargo.toml`, falls das
`cd` fehlt. `cargo --version` braucht kein `Cargo.toml`: In beiden Ordnern kommt dieselbe Ausgabe mit Exit 0,
der versprochene Fehler tritt nie ein. Gefunden im Betriebsdurchgang am 2026-09-07, nicht von einer Prüfung —
der Validator sieht, **dass** ein `recover` dasteht, nicht **ob** es eintreten kann.*

**R11a.3 — Bedienwege werden nicht erfunden.** Task-, Kommando- und Palettennamen im Kurstext müssen wörtlich
aus einer Prüfung, aus `tasks.json` oder aus der Befehlsliste der Extension stammen. *A8.3, E1; K4.* **[Validator]**

**R11a.4 — Die Fehlermeldung spricht Kurssprache.** Scheitert eine Prüfung, steht zuerst ein Satz in der Sprache
des Kurses, der die wahrscheinliche Ursache benennt — bevorzugt aus den `misconceptions` des Steps —, danach
erst die Werkzeugausgabe. *E3, E4; K5.*

**R11a.5 — Immer genau eine nächste Handlung, immer sichtbar.** Das Panel zeigt in der Kopfzeile Ort und
Fortschritt und darunter die eine nächste Handlung; es gibt nie zwei primäre Schaltflächen.
*E6, NN/g „Sichtbarkeit des Systemzustands"; K1.*

**R11a.6 — Bild und Text zeigen dieselbe Nummer.** Bildschirmfotos tragen nummerierte Marken; der Text verweist
auf die Nummer statt auf „oben rechts". *E6 räumliche Kontiguität.*

**R11a.7 — Jedes Lernziel kehrt zeitversetzt wieder.** Zu jedem Lernziel gibt es mindestens einen Abruf in einem
späteren Modul. *E7: Praxis-Test und verteilte Wiederholung sind die zwei wirksamsten Verfahren; K8.* **[Validator]**

**R11a.7 Ausnahme — Lernziele des letzten Moduls.** Trägt ein Lernziel **ausschließlich** das letzte Modul
eines Kurses, ist R11a.7 dort nicht erfüllbar: es gibt kein späteres Modul, aus dem abgerufen werden könnte.
Das ist keine Lücke, sondern eine Eigenschaft der Kursform, und A9.2 sagt es selbst — *nachgewiesen* verlangt
einen Abrufbeleg aus einem späteren Modul und kann definitionsgemäß erst später eintreten. Ein Projektlernziel
bleibt daher bei **geübt**, und das ist die richtige Stufe für es: das Werkstück ist gebaut, aber noch nicht
nach Abstand wieder abgerufen. Die Messung meldet solche Lernziele getrennt (nicht als Lücke), und wer die
Ausnahme aufheben will, hängt ein Modul hinter das Projekt statt einen Zeiger ins Leere.
*Belegt: `rust-project-cli` wird nur von m7-01 und m7-02 getragen, `cads-zero-projects` besteht ausschließlich
aus solchen Lernzielen — sechs von sechs (2026-09-06).*

**R11a.7a — Kein stummer Zeiger.** Ein `recallFrom` darf nur auf einen Step zeigen, der eine `question`-Aufgabe
hat, und der Rumpf des zurückverweisenden Steps muss den Verweis auch erwähnen. Grund: die Abrufkarte wird aus
den `question`-Aufgaben des abgeschlossenen Zielschritts gebaut — ein Zeiger auf einen Step ohne solche Aufgabe
erzeugt gar nichts, sieht in den Daten aber wie erfüllte Abdeckung aus. Ein Abruf innerhalb desselben Moduls
zählt nicht als zeitversetzt. *Herkunft: Prüfung der Abrufabdeckung im JavaScript-Pack, 2026-09-06.* **[Validator]**

**R11a.7b — Der englische Kurs zitiert die Bedienelemente so, wie sie auf dem Bildschirm stehen — auch wenn
sie deutsch sind.** Die Befehle der Board-Erweiterung tragen feste deutsche Titel (`CaDS Board: Konsole öffnen`,
`CaDS Board: Anhalten`) und sind **nicht** übersetzbar hinterlegt; die Tutor-Erweiterung dagegen hat
`package.nls.json`. Solange für code-server kein deutsches Sprachpaket verfügbar ist, läuft die Oberfläche
englisch, die Board-Befehle bleiben aber deutsch. Wer in den englischen Kurstexten die deutschen Titel durch
englische ersetzt, macht sie falsch: die Studierende fände den Eintrag nicht mehr. Umgekehrt gilt: Wer der
Board-Erweiterung Übersetzungen gibt, muss im selben Zug **beide** Kursfassungen nachziehen und das Sprachpaket
klären — sonst bricht der deutsche Kurs, der heute korrekt die deutschen Titel nennt.
*Herkunft: 34 deutsche Wörter in englischen Kursrümpfen, geprüft 2026-09-06 — bis auf einen zerstörten
Transliterationsrest waren alle korrekte Zitate echter Bedienelemente.*

**R11a.7c — Lernziele des letzten Moduls sind keine Lücke.** Ein Lernziel, das nur das letzte Modul eines
Kurses tragt, kann definitionsgemäß nicht zeitversetzt abgerufen werden — es gibt kein späteres Modul. Solche
Ziele werden als *terminal* ausgewiesen, nicht als Lücke gemeldet, und bleiben auf der Stufe „geübt"; A9.2 sagt
selbst, dass „nachgewiesen" erst später eintreten kann. Gemessen: `rust-project-cli` ist ein solcher Fall, und
`cads-zero-projects` besteht **vollständig** aus ihnen (0 von 6) — ein Projektpack hat konstruktionsbedingt kein
späteres Modul. Die Ausnahme gilt nur für diese Klasse; jede andere unbelegte Abdeckung bleibt eine Lücke.
*Herkunft: Abrufmessung über alle vier Packs, 2026-09-06.* **[Validator]**

**R11a.7d — Ein Vorhersage-Step druckt seine eigene Antwort nicht.** Der Rumpf eines Steps mit einer
`predict`-Aufgabe darf **das Literal nicht enthalten, das dessen `then`-Prüfung erwartet** (`expectStdout`,
`expectStderr`, erwarteter Fehlercode). Die Laufzeit hält die Enthüllung eigens zurück, bis eine Vorhersage
geschrieben ist — ein Kurstext, der sie darüber abdruckt, hebelt genau diese Sperre aus.
*Herkunft: Prüfung aller `predict`-Steps am 2026-09-06 — sechs von neun im Rust-Pack druckten die gesuchte
Antwort, zwei davon wörtlich („Die Antwort lautet:"), und **zwei Fälle hatte ein sorgfältiger Lesedurchgang
freigegeben**; der Literalvergleich fand sie. Herausgenommen wird nur das Ergebnis, nie der Mechanismus, aus
dem die Studierende es ableitet.* **[Validator]**

**R11a.7e — Eine Vorhersage braucht eine bestimmte Enthüllung.** Die `then`-Prüfung einer `predict`-Aufgabe
muss etwas Bestimmtes erwarten (`expectStdout`/`expectStderr` oder einen benannten Fehler). Ohne das kann
niemand prüfen, ob die Enthüllung zeigt, wonach gefragt wurde — und R11a.7d ist dort nicht anwendbar.
*Herkunft: alle zwölf `predict`-Aufgaben in `cads-zero-foundations` erwarten nichts Bestimmtes; die Null in der
Leckmessung bedeutet dort „nicht prüfbar", nicht „sauber".* **[Validator]**

**R11a.8 — Selbstauskunft ist kein Nachweis.** Ohne Sprachmodell bestätigte Antworten zählen als `selfReported`
und tragen nichts zur Kompetenzstufe bei; sie schalten nichts frei. *E8; K7.*

**R11a.8a — Ob ein Versuch bewertet wurde, entscheidet der Versuch, nicht die Konfiguration.** Die Marke
`selfReported` folgt aus dem **einzelnen Prüflauf** (`graded`: hat das Modell in diesem Versuch ein Urteil
geliefert?), nie aus einem statischen „ist ein Sprachmodell eingerichtet".
*Herkunft: Mit dem Überlast-Rückfall (429 oder Zeitüberschreitung → Selbstkontrolle) blieb „eingerichtet" wahr,
während dieser eine Versuch unbewertet blieb — eine selbst bestätigte Antwort wäre als geprüfter Nachweis in die
Kompetenzstufe eingegangen. Vor dem Rückfall war die Kopplung zufällig richtig, weil Selbstkontrolle nur ohne
Sprachmodell vorkam; der Rückfall hat sie stillschweigend gebrochen. Gefunden 2026-09-07 auf Nachfrage, nicht
von einer Prüfung.*

**R11a.8b — Was das Panel beim ersten Zeichnen zeigt, muss es auch beim Nachziehen zeigen.** Jedes Feld einer
Aufgabenansicht, das sich im Laufe eines Schritts ändern kann — Schaltflächen, Selbstkontrollkasten, Typ- und
Belegabzeichen, Hinweis, Ursache —, wird bei **jeder** Aktualisierung neu gerendert und mitgeschickt, nicht nur
beim ersten Aufbau der Seite. Was die Teilaktualisierung auslässt, friert für die Studierende ein, ohne dass
irgendetwas rot wird.
*Herkunft: Der Selbstkontroll-Rückfall war im Zustand korrekt und blieb trotzdem unsichtbar, weil der
Aktualisierungspfad nur Symbol, Meldung, Ursache und Hinweis austauschte; Schaltflächen und Rubrikkasten wurden
seit dem ersten Rendern nie wieder angefasst. Dasselbe Muster traf das „selbst eingeschätzt"-Abzeichen. Beide
Male schwieg jeder Test, weil sie das Rendern prüfen und nicht das Nachziehen. Gefunden 2026-09-07 im
Live-Durchgang, nachdem derselbe Weg zwei Tage lang als vorhanden geführt worden war.*

**R11a.8c — Angereichert wird nur, wenn die nackte Frage nicht grundet.** Der Fragetext einer Studierendenfrage
ist zugleich die Suchanfrage in den Kursquellen; jede Ergänzung verschiebt also, **welche** Stellen gefunden
werden. Ergänzt wird deshalb erst, **nachdem** die unveränderte Frage nichts gefunden hat — nie vorsorglich und
nie nach einer Wortzahl.
*Herkunft: 40 gemessene Fälle über zwei Kurse, beide Sprachen (2026-09-07). Die Vermutung „unter N Wörtern
anreichern" war falsch: Auch lange, gut formulierte Fragen verlieren durch eine Ergänzung Treffer, die sie ohne
sie hatten — „why do I get a promise object back instead of the actual value" (13 Wörter) verliert die
zugehörige Übungsdatei aus den ersten drei Treffern, ohne dass Besseres nachrückt. Findet die nackte Frage
dagegen nichts, kann eine Ergänzung nichts verdrängen und ist reiner Gewinn. Die bestehende Architektur trug
diesen Auslöser bereits — gemessen wurde, bevor gebaut wurde.*

**R11a.8d — Ein Treffer ist noch keine Grundlage.** Die Prüfung, ob eine gefundene Stelle die Frage
**inhaltlich** trägt, gilt für **jeden** Weg, der ein Zitat erzeugt — nicht nur für den, der die Frage vorher
angereichert hat.
*Herkunft: Mit der Indexierung der Kursrümpfe grundete die Frage „wie stelle ich einen Kuchenteig her" über
reine Funktionswort-Überlappung im echten Kurstext — vorher unmöglich, weil der Kurstext gar nicht im Index
war. Die Stützprüfung lief bis dahin nur auf dem Anreicherungspfad; der Primärpfad und die reine
Zitatsuche waren ungeschützt. Gefunden 2026-09-07 durch zwei Kontrollfragen, deren Antwort absichtlich
nirgends im Kurs steht — sie kosten nichts und sind das billigste Mittel gegen ein zu weites Netz.*

**R11a.9 — Keine Punktewährung.** Keine XP, keine Level, keine Serien, keine Ligen, keine Rangliste, kein
Zeitdruck. Anerkennung entsteht über Kompetenzstufe, Kannkarte und Nachweisheft.
*E9: Belohnungs- und Statusmechanik wirkt deutlich schwächer als Herausforderung und bedeutsames Ziel;
Gamifizierung wirkt kaum auf Kompetenz. Marktbeleg: dokumentierte XP-Kritik bei boot.dev; K9.* **[Validator]**

**R11a.10 — Ein Abzeichen ohne Beleg wird nicht vergeben.** Jeder Eintrag im Nachweisheft trägt Lernziel, Stufe,
Datum, Belegart und Schritt-ID. *E10, Open Badges 3.0; K10.*

## 12. Was der Validator prüfen soll

Diese Regeln sind maschinell entscheidbar. Umgesetzt ist bisher nur die letzte; die übrigen sind der Auftrag an
den Validator-Strang.

| Regel | Prüfung |
|---|---|
| R2.2 | Front-Matter-`bloom` ≠ Check-`bloom` ohne Reflexionsbegründung ⇒ Warnung |
| R2.1 | Step mit `bloom: apply` oder höher ohne ausführbaren Check ⇒ Warnung |
| R4.2 | Rubrik/Fließtext-Überlappung geteilter Prosa > 40 % (bzw. > 28 % bei `analyze`/`evaluate`, nach Check-Bloom) ⇒ Befund |
| R4.2a | Eintrag in `EXCEPT_R42` ohne Grund, oder Ausnahme oberhalb `understand` ⇒ Fehler |
| R4.1 | Prompt mit ≥ 2 Fragezeichen oder > 40 Wörtern ⇒ Warnung (**umgesetzt**) |
| R5.1 | Überlappung `hints[2]` mit der Rubrik > 30 % ⇒ Warnung |
| R5.3 | Task ohne `socratic`-Eintrag ⇒ Warnung |
| R7.5 | Modul ohne `predict` ⇒ Warnung |
| R10.3 | DE/EN mit ungleicher Abschnitts- oder Aufgabenmenge ⇒ Fehler |
| R1.5 | mehr als drei Tasks je Step ⇒ Warnung (**umgesetzt**) |
| R1.4 | Fließtext über 900 Wörter (EN 990), ohne `::: do`-Blöcke ⇒ Warnung (**umgesetzt**) |
| R3.6 | Check-Typ nicht in `extensions/cads-tutor/src/types.ts` ⇒ Warnung (**umgesetzt**) |

Zusätzlich empfohlen, weil beide Runden es gebraucht hätten: eine Warnung für jeden Backtick-Pfad im Fließtext,
der im Projekt-Root nicht existiert und in keinem `creates:` steht — das hätte vier tote Verweise gefunden.

---

# English summary

Binding rules for course packs and tutor behaviour. Each rule traces to the review finding it came from; the full
German text above carries those references. Rules marked **[V]** are machine-checkable.

**Step shape.** The first five lines say what to do; anything buried in prose counts as unread. A course's first
step answers three questions before any prose: what am I looking at, what do I do first, how do I know it worked.
Every instruction names the place — window, menu path, shortcut, and for a command whether it belongs in a terminal
or a device console. Steps do not grow without limit: aim for 600 words, hard ceiling 900. Past that, split or cut, and
in any case move the rule people trip over to the front **[V]**. One to three tasks per step **[V]**.

**Honest Bloom levels.** The declared level must be evidenced by a check that measures it; a free-text question
alone never evidences `apply` or above. One level per step — a closing reflection may sit one level higher, but it
may not be the evidence **[V]**. A step that dictates the function name, the file and the skeleton is a worked
example at `apply`, not `create`.

**Check design.** Every check must be able to fail: show it red on an untouched checkout and green after the work,
and record both runs. Prefer observable effect over text matching; a regex over source passes as a comment, so run
the source through the preprocessor when only text will do. A check's title states what it really assures. Never
claim a property your check does not have. A step that unlocks others never rests on an LLM verdict alone. And
never use a check type the runtime does not implement without making that visible — today it drops the entire step
**[V]**.

**Questions and rubrics.** One question per task, about 25 words, one question mark **[V]**. The answer must not
be in the step text: rubric/body token overlap under 50 %, under 35 % for `analyze` and `evaluate`; when a
resolving sentence moves into the rubric, delete it from the body **[V]**. The prompt announces the scope the
rubric demands, since students never see the rubric. Rubrics name what they reject, so a careful answer is not
failed by a sloppy model answer.

**Hint ladders.** Three tiers with fixed meaning: a failure hypothesis as a question, then place and procedure,
then the decisive partial fact — never the full rubric answer, never the line of code. Overlap of tier 3 with the
rubric under 30 % **[V]**. Tier 1 addresses operation when the task is an operation. Every task has its own ladder
**[V]**. Hints assume nothing the course has not introduced, and they cost something: tier *n* only after *n*
recorded attempts, with the remaining count hidden.

**Misconceptions, scaffolding, recall, prediction.** A named misconception belongs in `misconceptions`, not in
prose, and its pattern must be a real output. `scaffold` rises per module, worked to faded to independent, and is
earned rather than declared. Where prior knowledge is assumed, hand over a skeleton so syntax is not the obstacle.
Tell a fact once and recall it afterwards with `recallFrom` — and when you shorten a passage, fix every pointer to
it. At least one `predict` per module, with an answer that is not in the step text and a reveal that actually
contains what the rubric quotes.

**Language for the weakest reader.** Define every technical term at first use, in half a sentence, in the flow.
State required prior knowledge in the manifest and in the first step. Error messages come in the course language
and say what to do. A step that can go wrong says in the same breath what to do then. If the check carries `send:`,
the runtime sends — so do not tell the student to send it.

**Challenge for the strongest.** Offer the cause behind every asserted fact. Where the material has depth, assess
it rather than mention it. Provide a way to evidence prior knowledge instead of sitting through a forty-link
chain. Where you teach concurrency, let them build some.

**Seams.** Division of labour produces errors at the joins: seven of eight factual errors introduced by the rework
sat exactly there. A number lives in one place and is referenced, not copied. Verify every number and path at the
source, including ones already in the course — a comment in the project's own code is not an authority. Change the
German and English halves together, never one after the other **[V]**. And remember that what you measure
improves while what you do not measure can decay: when you make a metric a target, check in the same round whether
the requirement merely moved somewhere less visible.

**Limits, stated to teachers.** A tick is not knowledge: self-confirmed tasks produce no mastery events and no
progress percentage. Without a grader, a free-text task is unproven, not passed, and the panel says so. A step
without evidence is "seen", not "done", and unlocks nothing. The tutor answers orientation questions
deterministically, without grounding — a tutor that rejects "how do I start?" and answers expert questions helps
only those who already can. Calibrate the grader before it grades, and prove that the step text submitted as an
answer fails. Anomaly analytics never punish behaviour the system itself offers, never use quantile flags, and
never attach a flag to a name without human review. Whatever the tutor cannot do belongs in the documentation
before anyone deploys it.
