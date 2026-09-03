# Review Runde 1 — Firmware-Kurs und Tutor-Runtime

**Datum:** 2026-09-03 · **Strang:** `stream-review` · **Material:** `courses/cads-zero-foundations` (41 Steps DE/EN),
`courses/cads-zero-projects` (6 Steps), `extensions/cads-tutor/src`, `docs/SPEC.md` §3.3 + Addendum v1.1, `docs/TUTOR-NOTES.md`.

Drei Personas haben unabhängig voneinander gelesen: **P** = skeptischer Professor für Programmiermethodik,
**S+** = stärkste Studierende, **S−** = schwächste Studierende. Jedes Finding trägt Persona, Schwere, Ort, wörtlichen
Beleg und einen konkreten Änderungsvorschlag. Findings mit Präfix **A** sind im Kurs umsetzbar (dieser Strang),
Findings mit Präfix **B** in der Runtime (Strang `tutor3`), **V** betrifft `scripts/validate-courses.py`.

## Ausgangslage: der Feldbefund

Aus dem echten Betrieb: alle vier real gestellten Fragen drehten sich um `RCC_AHB1ENR` und
`(*(volatile uint32_t *)0x…)`; Erstnutzer fragten „wie soll ich jetzt anfangen?", „was ist der erste Schritt",
„was sehe ich da"; niemand kam über Modul 2 hinaus.

Alle drei Personas kommen unabhängig auf dieselbe Erklärung, und sie ist maschinell belegbar:

```
$ grep -rn "AHB1ENR\|volatile uint32_t" courses/        → 0 Treffer
$ grep -rln "volatile" courses/                          → nur m3-01 (im Listing __asm volatile("wfi"))
$ grep -ril "priorit" courses/                           → 0 Treffer (in einem FreeRTOS-Modul)
$ grep -rl "scaffold\|recallFrom\|misconceptions\|predict" courses/  → 0 Treffer
```

Der Kurs schickt Studierende in M2 in Dateien (`targets/itsboard/hal/hal_io.c`, `core/cads_hal.h`), in denen genau
diese Konstrukte stehen, erklärt sie aber nirgends. Wer fragt, trifft auf einen Tutor, der Orientierungsfragen
mangels Grounding-Treffer abweist (B7) und ohne LLM gar nicht antwortet (B2).

## Strukturmessungen (verifiziert)

| Messung | Wert |
|---|---|
| Steps gesamt (Foundations) | 41 |
| Checks gesamt (Foundations) | 83 |
| davon `question` (LLM-Rubrik) | 35 (42 %) |
| davon `manual` (Selbstbestätigung) | 21 (25 %) |
| Steps ohne automatischen Handlungs-Check | 27 von 41 |
| Steps, deren einzige Aufgabe eine Freitextfrage ist | 7 (m3-05, m4-03, m4-05, m5-04, m7-03, m7-05, m8-03) |
| `socratic`-Trigger je Step | genau 1, mit genau 3 Hints |
| Tasks ohne jeden authored Hinweis (M0–M2) | 17 von 33 |
| `question`-Prompts mit ≥ 3 Teilfragen | 19 von 47 |
| Rubrik/Fließtext-Tokenüberlappung (Median / Max) | 72 % / 86 % |
| Steps mit `scaffold`/`recallFrom`/`misconceptions`/`predict` | 0 |

---

# (A) Kurs-Findings

## A1 — m0-01 beantwortet keine der drei Orientierungsfragen
**Persona:** S− (P zustimmend) · **Schwere:** blocker · **Ort:** `steps/m0-01-welcome.de.md`

**Beleg** — der erste Satz nach dem Lernziel: „Du arbeitest in einer Browser-IDE (VS Code über code-server), die auf
einem Server läuft, während **das Board an deinem eigenen Rechner steckt**."

**Befund:** Der Step sagt kein einziges Mal, welches Fenster welches ist, wohin geklickt wird und woran Erfolg
erkennbar ist. Die einzige Handlungsanweisung steht nach 30 Zeilen Fließtext — hinter dem Punkt, an dem eine
schwache Leserin abbricht. Das ist wörtlich die Feldfrage „was ist der erste Schritt".

**Vorschlag:** Drei Abschnitte **ganz oben**, vor allem Fließtext: „Was du gerade vor dir hast" (Activity Bar,
Tutor-Panel, Editor, Terminal), „Was du als Allererstes tust" (nummeriert, drei Schritte), „Woran du erkennst, dass
es geklappt hat" (grüner Haken, Band „Step erledigt", Knopf *Weiter*). Pflicht laut Auftrag.

## A2 — Das Modul „Memory-mapped I/O" enthält kein Memory-mapped I/O
**Persona:** P, S− (deckungsgleich) · **Schwere:** blocker · **Ort:** `steps/m2-02-mmio-gpio.de.md`, Modul M2

**Beleg** — der einzige Satz des ganzen Moduls zum Thema: „Das ist Memory-mapped I/O: ein Store an eine feste
Adresse im Peripheriebereich verändert Spannungen an echten Pins."

**Befund:** Weder der Cast `(*(volatile uint32_t *)ADDR)`, noch `volatile`, noch die Namenslogik der Register
(Peripherie `RCC` + Bus `AHB1` + Funktion `ENR`), noch die Regel „ohne Taktfreigabe ignoriert eine Peripherie jeden
Schreibzugriff stillschweigend" kommen im Kurs vor. S− merkt an, dass der eine erklärende Satz selbst aus drei
unerklärten Begriffen besteht („Store", „Adresse", „Peripheriebereich"). P nennt es einen Titel, der nicht hält.

**Vorschlag:** Neuer Step `m2-00-mmio-primer` vor `m2-01`, `bloom: understand`, `scaffold: worked`: Adresse →
Zeiger-Cast → `volatile` → Registernamens-Tabelle (Peripherie/Bus/Funktion) → Taktfreigabe, mit gerechnetem
Hex-→-Bit-Beispiel, einer Verständnisfrage und einem `predict`-Check. Pflicht laut Auftrag.

## A3 — Die Antwort der Prüffrage steht wörtlich im Fließtext desselben Steps
**Persona:** P (Messung), S+ (Belege), S− („für mich ist das die Rettung") · **Schwere:** blocker
**Ort:** u. a. `m2-03-buttons`, `m3-03-fault-forensics`, `m5-04-dirty-rect-eval`, `m0-04-flash-console`, `m8-02-golden-images`, `m2-01-memory-map`

**Beleg** (`m8-02`, Rubrik): „jedes abweichende Pixel lag um genau +1 in R/G/B daneben, nur an geglätteten Kanten,
flache Palettenflächen stimmten, kein Rendering-Commit seit Erzeugung der Goldens" — Fließtext: „jedes abweichende
Pixel um genau **+1** in einem oder mehreren von R, G, B daneben lag […] und nur an geglätteten Textkanten, während
jede flache Palettenfläche exakt übereinstimmte. Seit Erzeugung der Goldens war kein renderingrelevanter Commit
gelandet."

**Befund:** Median-Überlappung 72 %, Maximum 86 %. P: „Das ist keine Analyse, das ist Abschrift mit
Umformulierungsaufwand." S−: „Ich scrolle hoch und schreibe ab. Ich habe nichts verstanden und der Step ist grün."
S+: „Copy-Paste-Test." Die deklarierten Bloom-Stufen `analyze`/`evaluate` sind damit unehrlich.

**Vorschlag:** Prüffragen auf neue Daten umstellen: andere CFSR-Signaturen als im Text (m3-03), eine Rechnung statt
eines Zitats (m0-04), zwei konkurrierende Patches unter gegebener Last (m5-04), ein Delta-Histogramm (m8-02).
Auflösende Sätze aus dem Fließtext in die Rubrik verschieben.

## A4 — Hinweis-Stufe 3 ist die Lösung, und sie ist ohne einen einzigen Versuch erreichbar
**Persona:** alle drei · **Schwere:** blocker (Kursseite; Runtime-Hälfte siehe B1) · **Ort:** praktisch alle 41 Steps

**Belege:** `m0-01` Hint 3: „NUCLEO-F429ZI (STM32F429ZI) + ITS-Adapter + Waveshare-4-Zoll-ILI9486-Touch-Shield." —
Rubrik: „Nennt NUCLEO-F429ZI (STM32F429ZI), das ITS-Adapterboard und das Waveshare-4-Zoll-TFT-Touch-Shield."
`m5-01` Hint 3: „Füge einen Aufruf ein: `cads_canvas_fill_rect(x, y, w, h, CadsColorMagenta);`" — Check:
`pattern: "CadsColorMagenta"`. `m7-02` Hint 3 nennt die zu schreibende Codezeile samt Adressliteral.

**Befund:** P nennt die Eskalation einen „Offenlegungsfahrplan", S+ „eine Abkürzung, die die Aufgabe entwertet",
S− „nach drei Klicks steht die Musterlösung da". Der Sonderfall m2-04 ist am deutlichsten: Hint 1 ist das
Inhaltsverzeichnis des Steps, Hint 2 ein wörtliches Zitat daraus, Hint 3 die fehlende Rubrikklausel im Klartext.

**Vorschlag:** Stufe 1 = Fehlerhypothese („woran es meistens liegt"), Stufe 2 = Ort und Verfahren („öffne X, suche
nach Y"), Stufe 3 = die entscheidende Teilinformation, **nie** die vollständige Rubrikantwort und **nie** die
einzusetzende Codezeile. Messbar: Tokenüberlappung `hints[2]` gegen `rubric` < 30 %.

## A5 — 17 von 33 Aufgaben in M0–M2 haben gar keinen Hinweis
**Persona:** S− · **Schwere:** blocker · **Ort:** M0–M2, je ein `socratic`-Eintrag pro Step bei 2–3 Tasks

**Beleg:** Ohne Treffer sind u. a. `m0-02/probe-identity`, `m0-03/host-build`, `m0-04/read-numbers`,
`m2-01/read-ld`, `m2-02/bits-to-ports`, `m2-03/why-invert`, `m2-04/read-safety`.

**Befund:** S− klickt bei `m2-02/bits-to-ports` auf „Hinweis anzeigen" und bekommt „Hinweis 1 von 3", den
generischen Satz „Der Check ist fehlgeschlagen. Lies die Meldung genau" und darunter nichts — obwohl kein Check
fehlgeschlagen ist. „Nach dem zweiten Mal gebe ich auf."

**Vorschlag:** Je Task ein `socratic`-Eintrag; als Regel in `docs/PEDAGOGY-RULES.md` und als Validator-Warnung.

## A6 — Mehrteilige Prüffragen: bis sechs Teilfragen in einem Feld
**Persona:** S− (Zählung), P (Bewertung), S+ · **Schwere:** blocker · **Ort:** 19 von 47 `question`-Prompts

**Belege:** `m2-04/state-rules` (43 Wörter, sechs geforderte Sachverhalte): „nenne die verbindlichen Regeln: welche
Pins nie umkonfiguriert werden dürfen und warum; welche Adapter-Ports nie als Ausgang konfiguriert werden dürfen
und warum; welchen Flash-Adressbereich das Flash-Werkzeug beschreiben darf; und welche zwei Flash-Operationen
rundweg verboten sind." · `m7-05` (79 Wörter, drei nummerierte Teilaufgaben) · `m3-05` (58 Wörter, drei
Fragezeichen) · `m3-03` (49 Wörter, vier Teilfragen).

**Befund:** S− kann keine davon beantworten und weiß nicht, wo sie anfangen soll — sie klickt auf Hinweis. P
ergänzt: bei bis zu zehn Konjunktionsgliedern ist ein binäres `pass/fail` methodisch nicht definiert (siehe B3).

**Vorschlag:** Eine Frage je `question`-Task, Richtwert ≤ 25 Wörter. Mehrteiliges auf mehrere Tasks oder Steps
aufteilen; das verbessert zugleich die Hinweis-Abdeckung (A5).

## A7 — Kein Check verifiziert, dass geänderter Code etwas tut
**Persona:** P, S+ · **Schwere:** blocker · **Ort:** kursweit; exemplarisch `m5-01-canvas-draw`, `m1-04-splash`

**Beleg:** Der Kurs formuliert sein eigenes Abnahmeprinzip in `m0-01`: „Code, der nur kompiliert wurde, zählt nicht
als funktionierend." Es gibt im ganzen Kurs genau **einen** `serialExpect` (`m0-04`, `RESULT: PASS`), und der prüft
den Werksselbsttest, nicht Studierendencode.

**Befund:** `fileMatches` ist ein Regex über den gesamten Dateitext (`src/checks/fileChecks.ts`), ein Kommentar
`/* CadsColorMagenta */` besteht ihn. `symbolInElf` auf `cads_canvas_flush` ist vor jeder Änderung grün.
*Einschränkung des Reviews:* bei `m1-04` ist der `symbolInElf`-Check auf `cads_splash_draw` **kein** Leerlauf — der
Step begründet ihn ausdrücklich mit `--gc-sections`; P's Pauschalurteil trifft dort nicht zu.

**Vorschlag:** Je Coding-Step ein Wirkungs-Check. Der Kurstext nennt an vielen Stellen bereits das passende
Konsolenkommando; daraus lässt sich unmittelbar ein `serialExpect` bauen (m4-01 `k`, m6-01 `u`, m3-03 `E`,
m7-04 `R`, m2-02 `o`). Alle `symbolInElf`-Checks auf vorbestehende Symbole ohne Begründung entfernen.

## A8 — Die `create`-Steps sind diktierte Rezepte
**Persona:** P, S+ · **Schwere:** major · **Ort:** `m5-03-own-app`, `m2-05-explorer-command`, `courses/cads-zero-projects/p1…p6`

**Beleg:** `m5-03` gibt Funktionsrumpf, CMake-Zeile und Menüeintrag vollständig vor; Check: `pattern:
"cads_hello_init"`. `p3`: `fileMatches` auf `"project.option"` in `cads_config.c` — ein Kommentar
`/* project.option */` besteht ihn. `p5` erklärt Sicherheit zur „harten Anforderung" und prüft sie mit einer
Freitextfrage, obwohl `fileNotMatches` im Format existiert.

**Befund:** S+ rechnet vor, dass `void cads_project_app_init(void* d){}` alle automatischen Checks eines
120-Minuten-Projekts besteht. P: geübt wird Anweisungsbefolgung, das ist `apply`, verkauft wird `create`.

**Vorschlag:** `m5-03` ehrlich auf `apply` + `scaffold: worked` stellen; Projekt-Checks auf Substanz umstellen
(`command`-Grep statt `fileMatches`, `fileNotMatches` als harte Sicherheitszusicherung in p5, Host-Test/Golden in
p1/p4, `serialExpect` in p6); `creates:` in allen Projekt-Steps deklarieren.

## A9 — Der Kurs verspricht in Step 1 automatische Checks, die es in 27 von 41 Steps nicht gibt
**Persona:** P · **Schwere:** major · **Ort:** `m0-01-welcome`

**Beleg:** „Jeder Step beginnt mit seinem Lernziel in einem Satz, gibt dir einen kompakten Text und stellt dir dann
ein bis drei Aufgaben mit automatischen Checks."

**Befund:** Der erste Satz, den ein Erstnutzer über die Mechanik liest, ist unzutreffend. Das erklärt die Feldfrage
„was ist der erste Schritt": gesucht wird die angekündigte Aufgabe, gefunden wird ein Häkchen.

**Vorschlag:** A7 umsetzen und den Satz wahr machen; bis dahin Lesesteps als solche kennzeichnen.

## A10 — Front-Matter-`bloom` und Check-`bloom` widersprechen sich in sechs Steps
**Persona:** P · **Schwere:** major · **Ort:** `m0-04`, `m3-01`, `m4-01`, `m4-02`, `m6-04`, `m8-01`

**Beleg:** `m4-01-freertos-tasks`: `bloom: apply` im Front Matter, Task `why-static` mit `bloom: analyze`; der Step
hat sonst nur `{ type: manual }`.

**Befund:** Die Runtime verbucht `question`-Checks unter `task.check.bloom`, alle anderen unter `meta.bloom`
(`src/controller.ts`). Derselbe Step speist die Mastery-Statistik damit auf zwei Stufen, und die deklarierte
Step-Stufe wird nirgends geprüft. Das verletzt Constructive Alignment.

**Vorschlag:** Eine Bloom-Stufe je Step; die Reflexionsfrage darf eine Stufe darüber liegen, aber nicht der Beleg
für die Step-Stufe sein. Validator-Regel: Step deklariert `apply` oder höher ⇒ mindestens ein ausführbarer Check.

## A11 — Kein Step nutzt Worked Examples, Wiederholung, Vorhersage oder Fehlkonzepte
**Persona:** P, S+ · **Schwere:** major · **Ort:** kursweit vs. `docs/SPEC.md` Addendum v1.1 §A1/A2

**Befund:** Das Addendum nennt den Firmware-Kurs ausdrücklich als *Quelle* dieser Erkenntnisse und der Kurs wendet
keine davon auf sich selbst an. Dabei liegen die Kandidaten offen: die Stack-Overflow-Fallstudie wird in `m3-04`,
`m4-05` und `m7-03` dreimal neu erzählt statt einmal gelernt und zweimal abgerufen (`recallFrom`); der Kurs benennt
die typischen Fehlkonzepte selbst („active low"-Irrtum, „INT0..5 sind Taster") statt sie als `misconceptions` zu
triggern; kontraintuitive Fälle wie „DMA aus CCM liefert stumm nichts" sind ideale `predict`-Aufgaben.

**Vorschlag:** `predict` mindestens einmal je Modul; `misconceptions` für die im Text benannten Irrtümer;
`recallFrom` statt Wiedererzählung; `scaffold` worked → faded → independent je Modul.

## A12 — Dreifache Wiedererzählung: PA7 und der Stack-Overflow-Fall
**Persona:** S+ · **Schwere:** major · **Ort:** `m3-05`/`m4-03`/`m7-05` (PA7) und `m3-04`/`m4-05`/`m7-03` (Stack)

**Beleg:** `m3-05`: „`SPI1_MOSI` … und `ETH_RMII_CRS_DV` … sind **derselbe physische Pin, PA7**" — `m4-03`: „sind
derselbe physische Pin, PA7, und `CRS_DV` hat auf dem STM32F429 keinen alternativen Ort" — `m7-05`: „sind beide
PA7, und Carrier-Sense hat auf dem STM32F429 keinen alternativen Ort." Dazu zweimal dieselbe 22,5-ms-Tabelle.
`m3-05` und `m4-03` tragen dasselbe `objectives: [cz.rtos.mutex]`.

**Befund:** Beim dritten Mal ist nichts Neues zu lesen; die Rubrik von `m7-03` ist eine Teilmenge der von `m4-05`.

**Vorschlag:** Fakten einmal, danach `recallFrom`. `m4-03` auf die Scheduler-Seite zuspitzen (Prioritäten,
Blockierzeiten), `m7-03` auf das netzspezifische Argument (Optionsparser, `pbuf`-Kette).

## A13 — M4 heißt „FreeRTOS" und enthält das Wort „Priorität" kein einziges Mal
**Persona:** S+ · **Schwere:** major (inhaltlich blocker für starke Studierende) · **Ort:** Modul M4

**Beleg:** `grep -ril "priorit"` über alle 41 Steps: null Treffer. `m4-03` beschreibt „einen echten **rekursiven
FreeRTOS-Mutex** (`cads_spi_mutex`, genommen mit `xSemaphoreTakeRecursive`)", `m3-05` zitiert `BASEPRI = 0x50`,
ohne zu erklären, was `BASEPRI` maskiert.

**Befund:** Ein RTOS-Modul ohne Prioritäten, Präemption und Prioritätsinversion. Ausgerechnet der zentrale Mutex
des Systems hat in FreeRTOS keine Prioritätsvererbung — der Kurs erzählt die Mutex-Geschichte dreimal und lässt
genau das aus.

**Vorschlag:** Prioritätsinversion als Aufgabe in `m4-03` (Wortlaut liegt vor, S+ V4).

## A14 — Fachbegriffe werden vor ihrer Einführung benutzt (M0–M2: 80+ Begriffe)
**Persona:** S− · **Schwere:** blocker · **Ort:** M0–M2 durchgehend; vollständige Tabelle im Persona-Protokoll

**Belege (Auswahl):** `m0-01` Z. 29 in einem Satz: „Toolchain", „Container", „CMake", „Ninja". `m0-03`: „alles
oberhalb der **HAL** baut für beide Targets" — HAL wird erst sechs Steps später erklärt. `m0-02`: „Vendor-ID
`0x0483`" — Hexadezimalschreibweise wird nie eingeführt, danach folgen `0x08000000`, `0x0301`, `o ff`. `m2-03`:
„das **Komplement des IDR** des Ports, auf acht Bits **maskiert**".

**Befund:** S− steigt in Zeile 29 von Step 1 aus. Ab `m2-02` ist Bit-/Hex-Rechnung mechanisch nötig
(`cads_hal_adapter_outputs(0x0301)`), ab `m2-05` C-Syntax (`switch`/`case`, `static`, Casts) — beides hat der Kurs
nie gelehrt, und `course.json` behauptet `"prerequisites": []`.

**Vorschlag:** Klammer-Definition bei erster Verwendung für die schlimmsten Fälle; `m2-00-mmio-primer` deckt Hex,
Bits und `<<` ab; ehrliche Vorwissens-Angabe in `course.json` und in `m0-01`.

## A15 — Der Kurs sagt nie, *wo* etwas zu tun ist
**Persona:** S− · **Schwere:** blocker · **Ort:** `m0-02`, `m0-03`, `m0-05`, `m2-05`

**Belege:** „Der **Connect-Befehl** öffnet den nativen Geräte-Dialog" (m0-02) — der Befehl heißt tatsächlich
„CaDS Board: Verbinden" und liegt in der Befehlspalette; beides steht in keinem Step. „Führe den Board-Build (Task
**CaDS: Build**) aus" (m0-03) — es gibt keinen Knopf mit dieser Aufschrift. „Sende einmal
`scripts/board_key.py quit`" (m0-05) — Terminal oder Board-Konsole? Das Wort „Terminal" kommt im gesamten deutschen
Kurs nicht vor.

**Befund:** S− steigt in `m0-05` endgültig aus, nachdem sie das Skript zweimal in die Board-Konsole getippt hat.
Der zugehörige Hinweis wiederholt genau den Satz, an dem sie gescheitert ist.

**Vorschlag:** Jede Handlungsanweisung nennt Ort und Weg (Menü, Tastenkürzel, Fenster). Der bereits existierende,
aber abgeschaltete Walkthrough (`extensions/cads-tutor/media/walkthrough/connect.md`) beantwortet genau diese
Fragen und wird von keinem Step verlinkt.

## A16 — 41 Steps, eine einzige lineare Kette
**Persona:** S+ · **Schwere:** major · **Ort:** alle `requires:`-Felder

**Beleg:** `m5-01-canvas-draw`: `requires: [m4-05-stack-sizing]` — während `curriculum.json` für dasselbe Lernziel
nur `"prerequisiteObjectiveIds": ["firmware-reference-hal"]` fordert.

**Befund:** Der Objective-Graph ist ein DAG, die Step-Kette macht daraus eine Perlenschnur. Es gibt keinen Weg,
Vorwissen zu bezeugen; `resetProgress` ist alles-oder-nichts. Zusammen mit B5 (ein LLM-Urteil sperrt den Restkurs)
ist das die zweite strukturelle Erklärung für „niemand kam über Modul 2 hinaus".

**Vorschlag:** `requires` auf die tatsächliche fachliche Abhängigkeit setzen; Projekt-Steps über
`requires` an die fachlich genannten Grundlagen-Steps binden statt an den gesamten Kurs.

## A17 — Fehlende Tiefe, die das Material hergäbe
**Persona:** S+ · **Schwere:** major · **Ort:** `m2-02` (BSRR vs. ODR unter Interrupt), `m2-01`/`m4-01` (warum CCM
für DMA unsichtbar ist: D-Bus statt AHB-Matrix — fünfmal behauptet, nie begründet), `m5-01` (DMA-Ping-Pong,
`cads_hal_display_busy()` nie benutzt), `m6-01` vs. `m4-04` (Sektorlöschzeit ≈ Watchdog-Periode, nie
zusammengeführt), `m7-01` (lwIP ohne eine einzige Zahl), M2/M4 (kein Interrupt-, kein `volatile`-, kein
Ringpuffer-Thema, obwohl `m1-02` die perfekte Vorlage liefert).

**Vorschlag:** Acht ausformulierte Vertiefungsfragen liegen im Persona-Protokoll vor (V1–V8) und sind direkt
übernehmbar.

## A18 — Kein Transfer über dieses eine Board hinaus
**Persona:** P, S+ · **Schwere:** minor · **Ort:** `curriculum.json`, alle 27 Objectives

**Beleg:** Jede `statement` ist gerätespezifisch, z. B. `cz.gpio.mmio`: „drive the adapter's output banks and
on-board LEDs through the HAL". Kein Objective nennt ein zweites Board oder eine Verallgemeinerung.

**Befund:** Für ein Praktikum legitim, für „Der Pflichtkurs" (`course.json`) zu wenig. Das Vehikel für Transfer —
der Simulator und die HAL-Grenze — wird nur zur Rechtfertigung der eigenen Architektur benutzt.

**Vorschlag:** Mindestens ein Transfer-Objective und eine Portierungsaufgabe gegen ein zweites Sim-Target.

## A19 — `courses/cads-zero-projects/course.json` beschreibt ein anderes Produkt
**Persona:** S+ · **Schwere:** minor

**Beleg:** `"… mit automatischen Abnahmekriterien und einer Reflexionsrubrik."` — `modules[].reflection` (SPEC A3)
existiert in keiner `course.json` und wird von der Runtime nicht gelesen.

**Vorschlag:** Satz streichen oder A3 implementieren (B8).

---

# (B) Runtime-Findings — an `tutor3`

## B1 — Drei Klicks auf „Hinweis" liefern die Lösung, ohne jeden Versuch
**Persona:** alle drei · **Schwere:** blocker · **Ort:** `src/controller.ts` (`showHint`), `src/socratic.ts`

**Beleg:** `const failures = Math.max(state.failures, state.hintTier + 1);` und
`hintTierForFailures(failures) => Math.min(Math.max(failures, 1), MAX_HINT_TIER)`. Der Knopf wird bedingungslos
gerendert (`src/webview.ts`), beschriftet „Hinweis *t* von 3" (`src/i18n.ts`).

**Befund:** `state.failures` bleibt 0, wenn nie geprüft wurde; `hintTier` zählt trotzdem hoch. Zusammen mit A4
(Stufe 3 = Lösung) und den 21 `manual`-Checks ist ein Step in unter 30 Sekunden „bestanden". Die Beschriftung
„von 3" macht die Abkürzung explizit — sie sagt dem Studierenden, wie weit es bis zur Antwort ist.

**Vorschlag:** Stufe *n* erst nach *n* dokumentierten Versuchen (fehlgeschlagener Check oder gespeicherte Antwort)
oder nach einer Mindestbearbeitungszeit; die Restanzahl nicht anzeigen; `hintTier` in der Bewertung ausweisen.

## B2 — Ohne LLM ist der gesamte Wissensnachweis Selbstbestätigung
**Persona:** P, S−, S+ · **Schwere:** blocker · **Ort:** `src/checks/runner.ts`, `src/platform.ts`, `docs/TUTOR-NOTES.md`

**Beleg:** `platform.ts`: `if (!this.llm) { return { kind: "manual", … }; }`; `runner.ts` gibt dann bei
`manualConfirmed` `status: "passed"` zurück. TUTOR-NOTES: „der Live-Endpunkt wurde nicht aufgerufen".

**Befund:** 35 `question` + 21 `manual` = 56 von 83 Checks (67 %) erteilt sich der Studierende selbst; der Kurs ist
vollständig durchklickbar, und die Fortschrittsanzeige meldet trotzdem Mastery in Prozent. S− ergänzt: die Meldung
ist englisch („no LLM configured – confirm manually") und erscheint unabhängig von der Spracheinstellung.

**Vorschlag:** Ohne LLM darf `question` nicht `passed` erreichen, sondern `unavailable` bleiben; sichtbare Warnung
im Panel; deutschsprachige Meldung; die `rubric` nach dem Absenden als Selbstkontrolle einblenden.

## B3 — Der LLM-Bewerter bekommt die Textstellen vorgelegt, aus denen abgeschrieben wurde
**Persona:** P · **Schwere:** blocker · **Ort:** `src/platform.ts` (`gradeAnswer`)

**Beleg:** `const grounded = this.engine.ask(\`${prompt} ${rubric}\`);` — die Grounding-Auszüge werden mit Prompt
und Rubrik abgerufen, nicht mit der Studierendenantwort. Prompt-Anweisung: „Be fair and concise", Abschluss
„VERDICT: pass|fail". `minChars` default 20.

**Befund:** Binäres Urteil über Rubriken mit bis zu zehn Konjunktionsgliedern; keine Ankerbeispiele, keine
Selbstkonsistenz, keine Anweisung, wörtliches Zurückspielen als *nicht bestanden* zu werten. Der Check misst
Textnähe.

**Vorschlag:** Rubriken als nummerierte Kriterien mit `met/not met` und Bestehensquorum; Auszüge aus der
*Antwort* ziehen; explizite Anti-Paraphrase-Anweisung; `minChars` je Bloom-Stufe; zwei Durchläufe, Dissens →
`pending`.

## B4 — Ein Häkchen erzeugt `independent_success` und treibt eine Prozentzahl
**Persona:** P · **Schwere:** major · **Ort:** `src/controller.ts` (`recordLearningEvent`), `src/progressView.ts`

**Beleg:** `outcome: status === "passed" ? (hintTier > 0 ? "assisted_success" : "independent_success") : "failure"`;
Anzeige `pct >= 85 ? "star-full" : …`. Außerdem wird nur `meta.objectives[0]` gespeist.

**Vorschlag:** `manual` und LLM-lose `question` erzeugen keine Mastery-Ereignisse (höchstens `self_report` mit
Gewicht 0); Prozentzahl erst ab einer Mindestzahl automatisch verifizierter Ereignisse; alle Objectives speisen.

## B5 — Ein einziges LLM-Urteil sperrt den gesamten Restkurs
**Persona:** P, S+ · **Schwere:** major · **Ort:** `src/session.ts` (`isStepUnlocked`), `src/controller.ts`

**Befund:** `m2-01` hat als einzigen echten Nachweis eine Freitextfrage. Ein `fail` sperrt alles ab M2; es gibt
keinen alternativen Nachweis und keinen Umweg. Zusammen mit A16 die technische Erklärung des Feldbefunds.

**Vorschlag:** `question` nie als einziges Freischaltkriterium; „weiter trotzdem"-Pfad nach *n* Fehlversuchen
(Vermerk bleibt in der Buchhaltung); `requires` als DAG.

## B6 — Steps ohne Tasks gelten als erledigt, sobald sie geöffnet wurden
**Persona:** P · **Schwere:** major · **Ort:** `docs/TUTOR-NOTES.md`

**Beleg:** „Step ohne Tasks | gilt als erledigt, sobald er geöffnet wurde | sonst würde er den Kurs blockieren"

**Vorschlag:** Status „gesehen" statt „erledigt"; ein Step ohne Nachweis schaltet nichts frei. Blockiert das den
Kurs, ist das ein Kursfehler, den man sehen will.

## B7 — Der Tutor weist genau die Anfängerfrage ab, die im Feld gestellt wurde
**Persona:** P, S− · **Schwere:** major · **Ort:** `src/i18n.ts`, `src/platform.ts`, `docs/TUTOR-NOTES.md`

**Beleg:** „Das liegt außerhalb des indizierten Referenzmaterials dieses Kurses – formuliere um oder frag zum
aktuellen Step." · TUTOR-NOTES: „BM25-Schwelle 8.0 … kurze Fragen („Wie flashe ich?") werden abgelehnt".

**Befund:** „Wie soll ich jetzt anfangen?" enthält keine indizierbaren Fachbegriffe. Der Tutor verlangt vom
Ratlosen, seine Frage umzuformulieren — er hilft denen, die schon können. S− ergänzt: der Text nach dem letzten
Hinweis lautet „Keine weiteren Hinweise – **stell dem Tutor eine konkrete Frage**", und genau dieser Weg ist ohne
LLM tot.

**Vorschlag:** Prozedurale Meta-Fragen vor dem Grounding abfangen und deterministisch mit aktuellem Step, erster
Aufgabe und nächstem Klick beantworten (kein LLM, kein BM25 nötig); bei ungegroundeter Frage mit Step-Kontext
erneut grounden; ohne LLM nicht auf „Frag den Tutor" verweisen.

## B8 — Das eigene Addendum v1.1 ist in der Runtime nicht implementiert
**Persona:** P, S+ · **Schwere:** major · **Ort:** `src/schema.ts`

**Beleg:** `schema.ts` kennt `board, task, build, fileMatches, fileNotMatches, symbolInElf, flash, serialExpect,
debugStop, question, manual, all, any` — weder `command`, `testSuite`, `predict` noch die Felder `scaffold`,
`recallFrom`, `misconceptions`, `modules[].reflection`.

**Befund:** Kursautoren *können* A11 nicht beheben. `scripts/validate-courses.py` kennt `command`, `testSuite` und
`predict` bereits — Validator und Runtime laufen auseinander.

**Vorschlag:** Reihenfolge nach didaktischem Ertrag: `predict` → `misconceptions` → `command`/`testSuite` →
`scaffold`/`recallFrom` → `reflection`. Bis dahin unbekannte Front-Matter-Felder mit Warnung durchlassen.

## B9 — Fehlermeldungen sind englisch und technisch; generische Hinweise sind inhaltsleer
**Persona:** S− · **Schwere:** major · **Ort:** `src/checks/runner.ts`, `src/checks/fileChecks.ts`, `src/i18n.ts`

**Beleg:** `pattern /${pattern}/ not found in ${file}` · `symbol ${spec.symbol} not defined in ${spec.elf}` ·
generischer Hinweis: „Der Check ist fehlgeschlagen. Lies die Meldung genau – welche Datei oder welches Symbol nennt
sie?"

**Befund:** S−: „Ich weiß nicht, was ein pattern ist, was die Schrägstriche bedeuten und ob das ein Fehler von mir
oder vom Programm ist." Der generische Hinweis verweist auf eine Meldung, die sie nicht lesen kann, und kennt den
bereits vorhandenen `links:`-Block des Steps nicht.

**Vorschlag:** Deutsche, handlungsorientierte Texte für die fünf häufigsten Fälle; Stufe 3 verlinkt konkret auf den
ersten `links:`-Eintrag statt ihn zu beschreiben.

## B10 — Drei Knöpfe mit widersprüchlicher Bedeutung; Aufgaben stehen ganz unten
**Persona:** S− · **Schwere:** major · **Ort:** `src/webview.ts`

**Befund:** Bei `question` ohne LLM erscheinen gleichzeitig „Antwort abgeben", „Als erledigt markieren" und
„Hinweis anzeigen"; S− lernt, dass der zweite Knopf der richtige ist. Die Aufgabenliste steht im HTML nach dem
gesamten Fließtext — bei `m2-04` nach 47 Zeilen.

**Vorschlag:** „Als erledigt markieren" erst nach dem Absenden einer Antwort einblenden und umbenennen; oben eine
Kurzfassung „Was du hier tust" mit Sprunglink zu den Aufgaben.

## B11 — Der Walkthrough, der genau diese Fragen beantwortet, ist abgeschaltet
**Persona:** S− · **Schwere:** major · **Ort:** `extensions/cads-tutor/media/walkthrough/*.md`, `image/settings/user-settings.json`

**Beleg:** `connect.md`: „**Command Palette → CaDS Board: Connect** … Der Browser fragt nach dem USB-Gerät –
*STM32 STLink* auswählen." — dagegen `"workbench.welcomePage.walkthroughs.openOnInstall": false` und
`"workbench.startupEditor": "none"`.

**Vorschlag:** Walkthrough aus `m0-01`/`m0-02` per `command:`-URL verlinken oder `openOnInstall` für dieses Image
aktivieren.

## B12 — Board- und LLM-Pfade sind nie gegen echte Hardware bzw. ein echtes Modell gelaufen
**Persona:** S− · **Schwere:** major (Risiko) · **Ort:** `docs/TUTOR-NOTES.md`

**Befund:** Genau die Checks, an denen M0 hängt (`board: connected`, `flash`, `serialExpect`), sind mit einem Fake
getestet. Schlägt einer falsch fehl, folgt eine englische Meldung (B9), kein Hinweis (A5) und keine Fragemöglichkeit
(B2/B7).

**Vorschlag:** Vor dem nächsten Kursdurchlauf einen Durchstich `m0-01` → `m0-05` an echter Hardware **mit
deaktiviertem LLM** protokollieren — das ist exakt die Konfiguration der Studierenden.

---

# (V) Validator-Findings — `scripts/validate-courses.py`

## V1 — Verschachtelte Checks in `all`/`any` werden nie geprüft
**Schwere:** major (dieser Strang behebt es)

**Beleg:** `iter_check_paths()` steigt über `check.get("all")` / `check.get("any")` ab; die Runtime
(`src/schema.ts`) legt Unter-Checks jedoch unter `checks:` ab. Folge: kein einziger Unter-Check eines Komposits
wird validiert.

**Nachweis:** `cads_project_app_init`, `cads_project_nettool`, `cads_project_driver` stehen nicht in
`build/itsboard/cads-zero.elf` und sind in keinem Step unter `creates:` deklariert — der Validator meldet trotzdem
`RESULT: PASS`.

**Vorschlag:** `checks` als Schlüssel ergänzen (abwärtskompatibel beide lesen); `creates:` in den Projekt-Steps
nachtragen.

## V2 — Fehlende Regeln, die die Findings dieses Reviews maschinell verhindern würden
**Schwere:** minor · Vorschläge für den Validator-Strang:

1. Step mit `bloom: apply` oder höher ⇒ mindestens ein ausführbarer Check (A10).
2. Rubrik/Fließtext-Tokenüberlappung > 50 % ⇒ Warnung, > 70 % ⇒ Fehler (A3).
3. `hints[2]`/`rubric`-Überlappung > 30 % ⇒ Warnung (A4).
4. Jeder Task braucht einen `socratic`-Trigger (A5).
5. `question`-Prompt mit ≥ 3 Fragezeichen oder > 40 Wörtern ⇒ Warnung (A6).
6. Front-Matter-`bloom` ≠ Check-`bloom` ⇒ Warnung (A10).

---

# Umsetzungsplan dieses Strangs (Runde 1 → Runde 2)

| Finding | Umsetzung in diesem Strang |
|---|---|
| A1 | `m0-01` DE/EN: Orientierungsabschnitte an den Anfang, Glossar der M0-Wörter, ehrliche Vorwissensangabe |
| A2 | neuer Step `m2-00-mmio-primer` DE/EN, neues Objective, `course.json`- und `requires`-Ketten |
| A3 | Prüffragen auf neue Daten in den am stärksten überlappenden Steps |
| A4 | Hinweis-Stufen als Hypothese → Verfahren → Teilinformation umgeschrieben |
| A5 | `socratic`-Trigger je Task in M0–M2 |
| A6 | mehrteilige Prompts aufgeteilt |
| A7 | `serialExpect`/`command` statt `manual`, wo der Text das Kommando bereits nennt |
| A8 | Projekt-Checks auf Substanz, `creates:` nachgetragen |
| A9 | Versprechen in `m0-01` korrigiert |
| A10 | eine Bloom-Stufe je Step |
| A11 | `scaffold`, `recallFrom`, `misconceptions`, `predict` eingeführt |
| A12/A13/A17 | Wiederholung durch `recallFrom` ersetzt, Vertiefungsfragen ergänzt |
| A14/A15 | Begriffe bei erster Verwendung erklärt, Ortsangaben ergänzt |
| B1–B12 | an `tutor3` gemeldet, nicht in diesem Strang umgesetzt |
| V1 | Validator-Fix in diesem Strang |
