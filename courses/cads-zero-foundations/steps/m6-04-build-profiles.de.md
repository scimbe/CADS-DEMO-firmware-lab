---
id: m6-04-build-profiles
title: Build-Profile
bloom: analyze
objectives: [cz.storage.profiles]
requires: [m6-03-config-option]
estimatedMinutes: 15
scaffold: independent
links:
  - { step: m7-01-lwip-netif }
  - { file: "scripts/check_profile.py", line: 1 }
  - { doc: "docs/reference/config-file.md" }
  - { file: "profiles/minimal.profile", line: 13 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/check_profile.py, profiles/minimal.profile, docs/explanation/config-design.md, apps/bringup/explorer_app_demo.c]
misconceptions:
  - { pattern: "unrecognised line|unknown app", question: { en: "The checker rejected a line before it ever looked at the image. What shape does it accept, and which names?", de: "Der Prüfer hat eine Zeile abgelehnt, bevor er das Image überhaupt ansah. Welche Form akzeptiert er, und welche Namen?" }, hints: [ { en: "Only lines of the form app.<name> = on|off are accepted, and only for the apps CMake knows about.", de: "Nur Zeilen der Form app.<name> = on|off werden akzeptiert, und nur für die Apps, die CMake kennt." }, { en: "The error line prints the file and line number; compare that line against profiles/minimal.profile character by character.", de: "Die Fehlerzeile nennt Datei und Zeilennummer; vergleich diese Zeile Zeichen für Zeichen mit profiles/minimal.profile." }, { en: "A typo is a hard error on purpose - the alternative would be quietly building an image you did not ask for.", de: "Ein Tippfehler ist mit Absicht ein harter Fehler - die Alternative wäre, stillschweigend ein Image zu bauen, das du nicht wolltest." } ] }
  - { pattern: "FAIL: this profile needs", question: { en: "Your profile passes the grammar and fails the model. What resource did the checker count, and against what?", de: "Dein Profil besteht die Grammatik und scheitert am Modell. Welche Ressource hat der Prüfer gezählt, und wogegen?" }, hints: [ { en: "It counted something in the sources of the apps you switched on, not the number of apps.", de: "Er hat etwas in den Quellen der eingeschalteten Apps gezählt, nicht die Anzahl der Apps." }, { en: "An app the profile omits defaults to ON, so a profile that turns nothing off is the full image.", de: "Eine App, die das Profil auslässt, ist standardmäßig ON, ein Profil, das nichts abschaltet, ist also das volle Image." }, { en: "Switch apps off until the count fits, and note which app cost the most slots - that number is a design fact about it.", de: "Schalte Apps ab, bis die Zahl passt, und merk dir, welche App die meisten Plätze kostete - diese Zahl ist eine Entwurfsaussage über sie." } ] }
tasks:
  - id: checked
    title: Prüfe das mitgelieferte Minimal-Profil
    check: { type: command, cwd: ".", command: "python3 scripts/check_profile.py profiles/minimal.profile", expectExitCode: 0, bloom: analyze }
  - id: own-profile
    title: Schreibe ein eigenes Profil und lass es prüfen
    check: { type: command, cwd: ".", command: "test -f profiles/lab.profile && python3 scripts/check_profile.py profiles/lab.profile", expectExitCode: 0, bloom: analyze }
  - id: capacity-catch
    title: Was die Kapazitätsprüfung abfängt
    check: { type: question, prompt: { en: "What does the view-registry capacity check catch that a syntax check never could?", de: "Was fängt die View-Registry-Kapazitätsprüfung ab, was eine Syntaxprüfung nie könnte?" }, rubric: "Sie zählt die echten cads_view_dispatcher_add()-Aufrufstellen in den Quellen der eingeschalteten Apps und vergleicht die Summe mit CADS_APP_DEMO_VIEW_CAPACITY. Der Grund, warum das nötig ist: jenseits der Kapazität liefert das Hinzufügen false, jeder Aufrufer verwirft den Rückgabewert mit (void), und die überzähligen Views existieren schlicht nie - eine tote Menüzeile, nirgends eine Fehlermeldung, weder beim Bauen noch zur Laufzeit. Eine Syntaxprüfung könnte das nie sehen, weil der Fehler nicht in der Datei steht, sondern im Image, das sie erzeugen würde. Nennt die stumme Natur des Fehlers; eine Antwort, die nur zu viele Apps sagt, besteht nicht.", bloom: analyze }
socratic:
  - { trigger: "task:checked:failed", question: { en: "This profile ships with the project and is known good. So is the checker complaining about the file, or about your environment?", de: "Dieses Profil wird mitgeliefert und ist bekannt gut. Beschwert sich der Prüfer also über die Datei oder über deine Umgebung?" }, hints: [ { en: "Run it from the project root; the script resolves the apps and the capacity source relative to it.", de: "Führ es aus dem Projektwurzelverzeichnis aus; das Skript löst Apps und Kapazitätsquelle relativ dazu auf." }, { en: "It reads the capacity out of a source file - if that read fails it says so instead of guessing a number.", de: "Es liest die Kapazität aus einer Quelldatei - schlägt das fehl, sagt es das, statt eine Zahl zu raten." }, { en: "A failure here is environmental, so fix the environment before touching any profile.", de: "Ein Fehler hier ist umgebungsbedingt, repariere also die Umgebung, bevor du ein Profil anfasst." } ] }
  - { trigger: "task:own-profile:failed", question: { en: "Your own profile has to pass two different gates. Which of the two rejected it - the grammar or the image model?", de: "Dein eigenes Profil muss zwei verschiedene Tore passieren. Welches der beiden hat es abgelehnt - die Grammatik oder das Image-Modell?" }, hints: [ { en: "The file has to exist at profiles/lab.profile and hold at least one line; an empty file is the full image.", de: "Die Datei muss unter profiles/lab.profile liegen und mindestens eine Zeile enthalten; eine leere Datei ist das volle Image." }, { en: "Copy profiles/minimal.profile as a starting point and change which apps are on, rather than inventing the syntax.", de: "Nimm profiles/minimal.profile als Ausgangspunkt und ändere, welche Apps an sind, statt die Syntax zu erfinden." }, { en: "Read the two verdict lines it prints: one is about the grammar, the other about how many view slots your selection needs.", de: "Lies die zwei Urteilszeilen, die es druckt: die eine betrifft die Grammatik, die andere, wie viele View-Plätze deine Auswahl braucht." } ] }
  - { trigger: "question:capacity-catch:weak", question: { en: "Suppose a profile enables one app too many. What does the firmware do, and what would a user see?", de: "Angenommen, ein Profil schaltet eine App zu viel ein. Was tut die Firmware dann, und was sähe ein Nutzer?" }, hints: [ { en: "The failure has no error path in the firmware at all - look at the return value of the registration call and what callers do with it.", de: "Der Fehler hat in der Firmware gar keinen Fehlerpfad - sieh dir den Rückgabewert des Registrierungsaufrufs an und was die Aufrufer damit tun." }, { en: "A syntax check can only see the file. This check reads the sources of the apps the file switches on.", de: "Eine Syntaxprüfung sieht nur die Datei. Diese Prüfung liest die Quellen der Apps, die die Datei einschaltet." }, { en: "Say where the failure would otherwise surface: on a laptop, in CI, or in front of a panel with a dead menu row.", de: "Sag, wo der Fehler sonst auftauchen würde: auf einem Laptop, in CI oder vor einem Panel mit einer toten Menüzeile." } ] }
---
## Lernziel

Wähle mit einem Build-Profil aus, welche Apps in ein Image kommen, und verstehe, warum diese Entscheidung in einer anderen Datei lebt als die Laufzeitkonfiguration.

## Feature-Auswahl zur Configure-Zeit

Ein Build-Profil ist eine Textdatei aus `app.<name> = on|off`-Zeilen in `profiles/`, die CMake einmal zur Configure-Zeit liest. Es legt fest, welche optionalen Apps überhaupt ins Image kompiliert werden; `desktop` und die Menü-Shell werden immer gebaut und sind keine Profilschlüssel. Die neun bekannten Apps sind `settings`, `about`, `gpio`, `netinfo`, `filebrowser`, `game`, `netiperf`, `nettools` und `active`, abgebildet auf die `CADS_APP_*`-CMake-Optionen. Ein unbekannter App-Name oder eine fehlerhafte Zeile ist ein harter Configure-Fehler — ein Tippfehler darf nicht stillschweigend das falsche Image bauen.

Zwei Profile werden mitgeliefert. `profiles/full.profile` schaltet alles ein, dasselbe wie das Weglassen von `CADS_PROFILE`. `profiles/minimal.profile` behält nur `settings` — absichtlich, weil Settings selbst auf einem abgespeckten Image der einzige Weg zur Touch-Kalibrierung und zum Config-Reload ist. Ein kleineres Image hat mehr RAM-Reserve und weniger Angriffsfläche.

```bash
cmake -S . -B build/itsboard -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi-gcc.cmake \
    -DCADS_PROFILE=profiles/minimal.profile
cmake --build build/itsboard
```

Mit aktivem Profil ist es **maßgeblich** für die Apps, die es nennt: Es setzt diese Cache-Variablen mit FORCE, sodass das Bearbeiten oder Wechseln eines Profils in einem bestehenden Build-Verzeichnis beim nächsten Configure wirkt, und ein `-DCADS_APP_X=` auf der Kommandozeile es nicht überstimmt. Ohne Profil überschreibt `-D` wie gewohnt den eingebauten `ON`-Default.

## Warum nicht in /config.txt einfalten

Beide Dateien sehen gleich aus, und sie zusammenzulegen ist die naheliegende Ersparnis. Es ist zugleich ein Kategorienfehler (`docs/explanation/config-design.md`): `/config.txt` liest die **Firmware, beim Booten, auf dem Board**; ein Profil liest **CMake, zur Configure-Zeit, auf der Platte des Entwicklers**. Ein Techniker im Feld, der eine Netzwerkadresse bearbeitet, darf nicht den Netzwerkstack entfernen können; ein Build-Server, der ein minimales Image wählt, darf kein laufendes Board brauchen. Die Trennung ist eine Blast-Radius-Entscheidung, keine Ordnungsliebe.

## Prüfen, bevor du einen Build ausgibst

```bash
scripts/check_profile.py profiles/minimal.profile          # Syntax + Kapazität
scripts/check_profile.py profiles/minimal.profile --build  # + echter Build + RAM-Check
```

Es druckt zwei Urteile, und sie prüfen Verschiedenes. Das erste betrifft die **Grammatik**: eine Zeile, die nicht der Form `app.<name> = on|off` entspricht oder einen unbekannten App-Namen nennt, ist ein Tippfehler und wird in Millisekunden abgefangen statt nach einem langsameren Configure.

Das zweite Urteil betrifft nicht die Datei, sondern das **Image, das die Datei erzeugen würde**. Der Prüfer öffnet dazu die Quellen der eingeschalteten Apps und zählt darin etwas ab, das er gegen `CADS_APP_DEMO_VIEW_CAPACITY` in `apps/bringup/explorer_app_demo.c` hält — dieselbe Kapazität, deren Verhalten an der Grenze du in M5-02 vorhergesagt hast. Genau dieser Bug wurde zweimal ausgeliefert, bevor er verstanden war; deshalb gibt es die Prüfung. Was sie genau zählt und warum eine Syntaxprüfung es nie sehen könnte, ist die dritte Aufgabe dieses Steps.

## Deine Aufgabe

Führe zuerst `python3 scripts/check_profile.py profiles/minimal.profile` aus und lies beide Urteilszeilen. Schreibe dann ein eigenes Profil `profiles/lab.profile` — deine Auswahl, aber begründet: welche Apps braucht ein Laborimage wirklich? — und lass es von demselben Prüfer abnehmen. Wenn du Zeit hast, ergänze `--build` und lies die RAM-Budget-Zeile, die es erzeugt. Beantworte zuletzt die Frage, was die Kapazitätsprüfung abfängt. Das nächste Modul verlässt den Speicher in Richtung Netzwerk.
