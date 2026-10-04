# Abmelden im Firmware-Labor

Das Image bringt einen sichtbaren Abmelde-Weg mit: den Eintrag **„Abmelden“** rechts in der
Statusleiste und den Befehl **„CaDS: Abmelden“** in der Befehlspalette (F1). Beides funktioniert
in allen Betriebsarten ohne Änderung am Portal und ohne Konfiguration.

## Was beim Abmelden passiert

1. Rückfrage „Vom Firmware-Labor abmelden?“ – Abbrechen lässt alles, wie es ist.
2. Alle geänderten Dateien mit Pfad werden gespeichert. Bleibt etwas ungespeichert (unbenannte
   Dateien, Schreibfehler), nennt eine zweite Rückfrage die Dateien; „Trotzdem abmelden“ geht weiter.
3. Das Board wird freigegeben (`cads.probe.release`: ST-Link und serielle Konsole). Lehnt die Probe
   ab, weil gerade geflasht wird, fragt eine dritte Rückfrage, ob der Flash-Vorgang abgebrochen
   werden soll.
4. Der **Browser-Tab selbst** wechselt auf die Abmelde-Adresse. Es öffnet sich kein zweiter Tab,
   die Werkbank bleibt nicht im Hintergrund offen.

## Wohin der Tab geht

Der erste Treffer gilt:

| # | Quelle | Adresse | Betriebsart |
|---|---|---|---|
| a | `CADS_LOGOUT_URL` des Containers | wie angegeben | Sonderfälle |
| b | code-server meldet einen eigenen Logout (nur bei `--auth password`) | `<Einhängepunkt>/logout` | Interimsinstanz mit Kennwort |
| c | sonst | `/logout` auf dem **Host** | hinter dem Portal (`--auth none`) |

Zu c: Hinter dem Portal des praktikum-creator liegt das Labor unter `/u/<id>/` (Traefik entfernt
das Präfix), die Abmelde-Route aber auf Host-Ebene: `/logout` → oauth2-proxy `sign_out` → Keycloak
end-session. Dieselbe Route benutzt der Knopf `#cads-logout-link` des Desktop-Images. Der eigene
Multiuser-Aufbau (`deploy/multiuser/Caddyfile.gate`) hat `/logout` ebenfalls auf Host-Ebene.

`CADS_LOGOUT_URL` ist nur nötig, wenn die Abmelde-Route woanders liegt. Erlaubt sind eine absolute
`http(s)`-URL oder ein Pfad; `/x` bezieht sich auf den Host, nicht auf das Pfadpräfix. Alles andere
(z. B. `javascript:`) wird ignoriert. Der Container schreibt beim Start eine Zeile ins Log:

```
[cads-logout] Abmelde-Adresse: automatisch (code-server-Logout bei Passwort, sonst /logout)
```

## Aufbau

Eine VS-Code-Erweiterung allein kann das nicht: Erweiterungen laufen im Extension Host (Web Worker
oder Serverprozess) ohne DOM und können den Tab nicht umleiten; `vscode.env.openExternal` öffnet nur
einen zweiten Tab neben der weiter offenen Werkbank. code-servers eingebauter Menüpunkt „Sign out“
existiert nur mit `--auth password` und liegt versteckt im Menü. Deshalb zwei Teile:

| Teil | Ort | Aufgabe |
|---|---|---|
| Erweiterung `cads.cads-logout` | `extensions/cads-logout/` (Web-Worker-Host, wie `cads-probe`) | Statusleiste, Befehl, Rückfragen, Speichern, Board freigeben; bittet dann die Seite um die Navigation |
| Seitenskript | `image/logout/cads-logout.js`, per `image/logout/install.sh` beim Image-Bau in code-servers `workbench.html` eingetragen | bestimmt die Abmelde-Adresse und navigiert den Tab |
| Konfiguration | `image/entrypoint.d/20-logout-config.sh` → `cads-logout-config.js` | reicht `CADS_LOGOUT_URL` bei jedem Start an das Seitenskript |

Die beiden sprechen über einen `BroadcastChannel` namens `cads-logout` (gleicher Ursprung):
Erweiterung → `{type:'logout'}`, Seite → `{type:'ack', url}` und Navigation. Antwortet die Seite
nicht binnen 3 s, meldet die Erweiterung das als Fehler, statt still nichts zu tun.

Das Seitenskript ist ein `<script src>` unter `{{BASE}}/_static/…` – code-servers CSP erlaubt
gleichen Ursprung (`'self'`), aber keine Inline-Skripte, und `{{BASE}}` ist code-servers eigener
Platzhalter für den relativen Weg zum Einhängepunkt (funktioniert unter `/u/<id>/` wie unter `/`).

**Rückfallebene:** Erscheint der Statusleisten-Eintrag 20 s nach dem Laden nicht (Erweiterung fehlt
oder ist deaktiviert), zeigt das Seitenskript unten rechts einen eigenen Knopf „Abmelden“. Er fragt
nach und navigiert; speichern und Board freigeben kann er nicht (kein Zugriff auf die VS-Code-API) –
das Verlassen der Seite beendet den Worker und gibt die WebUSB-/WebSerial-Handles damit frei.

## Grenzen

- **Der Container läuft weiter.** Anders als der Desktop (`POST session-end` → revoke-check) hat das
  Firmware-Labor keinen Endpunkt, der die Sitzung beim Launcher beendet; „Abmelden“ beendet die
  Anmeldung, nicht den Container. Das ließe sich nur portal-seitig ergänzen.
- **Alle Tabs desselben Ursprungs** reagieren auf die Abmeldung, nicht nur der, in dem geklickt
  wurde. Die Anmeldung gilt ohnehin für den ganzen Ursprung; ein zweiter Tab mit ungespeicherten
  Dateien zeigt dann die Browser-Rückfrage „Seite verlassen?“.
- **Basis-Image `codercom/code-server:latest`:** Ändert code-server die Gestalt von `workbench.html`,
  bricht `install.sh` den Image-Bau ab, statt ein Image ohne Abmelde-Weg zu liefern.
- Das zweite Image (`images/tutor-lab`) ist nicht angefasst.

## Tests

| Was | Aufruf | Braucht |
|---|---|---|
| Ablauf und Kanal der Erweiterung | `cd extensions/cads-logout && npm ci && npm test` | node |
| Seitenskript, `install.sh`, Entrypoint | `node --test tests/logout/*.test.mjs` | node, sh, python3 |
| Browser, alle Betriebsarten | `node e2e/logout-smoke.mjs` (Kopf der Datei) | laufende code-server-Instanzen, Playwright |

Der Browser-Test stellt für die Portal-Betriebsart einen eigenen Reverse-Proxy vor code-server
(`/u/e2e/` mit entferntem Präfix, Platzhalterseite auf `/logout`) und prüft, dass der Tab auf
`<Host>/logout` landet und die geänderte Datei auf der Platte steht; für die Kennwort-Betriebsart,
dass die Login-Seite erscheint und das Sitzungs-Cookie weg ist. CI (`image.yml`, Jobs `logout-unit`
und `logout-smoke`) fährt ihn gegen das frisch gebaute Image.

Nicht automatisch geprüft: ein echtes Board (WebUSB/WebSerial braucht Hardware) und die echte Kette
hinter `/logout` (oauth2-proxy, Keycloak).
