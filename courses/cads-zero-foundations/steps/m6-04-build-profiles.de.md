---
id: m6-04-build-profiles
title: Build-Profile
bloom: apply
objectives: [cz.storage.profiles]
requires: [m6-03-config-option]
estimatedMinutes: 12
links:
  - { step: m7-01-lwip-netif }
  - { file: "scripts/check_profile.py", line: 1 }
  - { doc: "docs/reference/config-file.md" }
  - { file: "profiles/minimal.profile", line: 13 }
sources: [docs/reference/config-file.md, docs/how-to/configure.md, scripts/check_profile.py, profiles/minimal.profile, docs/explanation/config-design.md]
tasks:
  - id: checked
    title: Prüfe das Minimal-Profil mit check_profile.py
    check: { type: manual }
  - id: why-two-files
    title: Warum Profile eine eigene Datei sind, und was die Kapazitätsprüfung abfängt
    check: { type: question, prompt: { en: "Both /config.txt and a *.profile are key = value text. Why does the project keep them as two separate files, and what does check_profile.py's view-registry capacity check catch that a plain syntax check never would?", de: "Sowohl /config.txt als auch ein *.profile sind key = value-Text. Warum hält das Projekt sie als zwei getrennte Dateien, und was fängt die View-Registry-Kapazitätsprüfung von check_profile.py ab, was eine reine Syntaxprüfung nie könnte?" }, rubric: "Verschiedene Zeitskalen und Akteure: /config.txt liest die Firmware beim Booten auf dem Board, ein Profil liest CMake zur Configure-Zeit auf dem Entwicklerrechner; ein Zusammenlegen ließe einen Feld-Edit ein Feature entfernen oder einen Build ein laufendes Board brauchen - eine Blast-Radius-Entscheidung. Die Kapazitätsprüfung zählt die cads_view_dispatcher_add()-Aufrufstellen der aktivierten Apps gegen CADS_APP_DEMO_VIEW_CAPACITY (28), weil jenseits der Kapazität add false liefert, jeder Aufrufer es mit (void) verwirft und die überzähligen Views stillschweigend nie existieren - eine tote Menüzeile ohne Fehler, ein Bug, der zweimal ausgeliefert wurde.", bloom: analyze }
socratic:
  - { trigger: "task:checked:failed", question: { en: "check_profile.py refused the file. Is it complaining about the grammar of a line, or about the image the profile would produce?", de: "check_profile.py hat die Datei abgelehnt. Beschwert es sich über die Grammatik einer Zeile oder über das Image, das das Profil erzeugen würde?" }, hints: [ { en: "Only lines of the form app.<name> = on|off are accepted, and only for the nine apps CMake knows.", de: "Nur Zeilen der Form app.<name> = on|off werden akzeptiert, und nur für die neun Apps, die CMake kennt." }, { en: "An app the profile omits defaults to ON - the checker models the same image CMake will build.", de: "Eine App, die das Profil auslässt, ist standardmäßig ON - der Prüfer modelliert dasselbe Image, das CMake bauen wird." }, { en: "Run it on profiles/minimal.profile first; that one is known good, so a failure there points at your environment, not the file.", de: "Führe es zuerst auf profiles/minimal.profile aus; das ist bekannt gut, ein Fehler dort zeigt also auf deine Umgebung, nicht auf die Datei." } ] }
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

Die Syntaxprüfung fängt einen Tippfehler in Millisekunden ab statt nach einem langsameren Configure. Die Prüfung, die sich ihren Platz verdient, ist die zweite: Sie zählt die echten `cads_view_dispatcher_add()`-Aufrufstellen in den Quellen der aktivierten Apps und vergleicht die Summe mit `CADS_APP_DEMO_VIEW_CAPACITY` (28, in `apps/bringup/explorer_app_demo.c`). Dieser Fehler ist in der Firmware *stumm* — jenseits der Kapazität liefert das Hinzufügen `false`, jeder Aufrufer verwirft es mit `(void)`, und die überzähligen Views existieren schlicht nie: eine tote Menüzeile, nirgends ein Fehler. Genau dieser Bug wurde zweimal ausgeliefert, bevor er verstanden war, weshalb ein Profil, das ihn wieder einführen würde, auf deinem Laptop scheitert statt vor einem Panel.

## Deine Aufgabe

Führe `scripts/check_profile.py profiles/minimal.profile` aus und lies beide Urteile; wenn du Zeit hast, ergänze `--build` und lies die RAM-Budget-Zeile, die es erzeugt. Beantworte dann die Frage, warum die beiden Dateien getrennt sind und was die Kapazitätsprüfung abfängt. Das nächste Modul verlässt den Speicher in Richtung Netzwerk.
